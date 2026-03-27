import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { 
    Send, Loader2, User, Bot, Sparkles, MessageCircle, 
    Plus, History, Maximize2, Hash, FileText, BarChart2,
    PieChart, Zap, X, AlertCircle, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';



const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copiato negli appunti");
};

const SeoChatTab = ({ clientId, getAuthHeaders, client, compact = false, addToQueue, onRequestStrategicAnalysis }) => {
    const [sessions, setSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (clientId) fetchSessions();
    }, [clientId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true);
            const res = await axios.get(`${API}/chat/sessions?client_id=${clientId}`, { headers: getAuthHeaders() });
            const data = res.data.sessions || res.data;
            setSessions(data);
            if (data.length > 0 && !currentSession) {
                handleSelectSession(data[0]);
            }
        } catch (e) {
            console.error("Error fetching sessions", e);
        } finally {
            setLoadingSessions(false);
        }
    };

    const fetchMessages = async (sessionId) => {
        try {
            const res = await axios.get(`${API}/chat/sessions/${sessionId}/messages`, { headers: getAuthHeaders() });
            setMessages(res.data);
            setShowSidebar(false);
        } catch (e) {
            toast.error("Errore caricamento messaggi");
        }
    };

    const handleSelectSession = async (session) => {
        if (!session?.id) return;
        setCurrentSession(session);
        await fetchMessages(session.id);
    };

    const handleNewSession = async () => {
        try {
            const res = await axios.post(`${API}/chat/sessions`, { client_id: clientId }, { headers: getAuthHeaders() });
            setSessions([res.data, ...sessions]);
            setCurrentSession(res.data);
            setMessages([]);
            setShowSidebar(false);
        } catch (e) {
            toast.error("Errore creazione sessione");
        }
    };

    const handleQuickAction = (action) => {
        if (action.label === "Analisi Strategica" && onRequestStrategicAnalysis) {
            onRequestStrategicAnalysis();
            return;
        }
        setInput(action.text);
    };

    const handleSendMessage = async (e, overrideContent = null) => {
        if (e) e.preventDefault();
        const content = overrideContent || input;
        if (!content.trim() || !currentSession?.id || loading) return;

        const userMsg = { role: 'user', content: content, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        if (!overrideContent) setInput('');
        setLoading(true);

        try {
            const url = `${API}/chat/message`;
            const payload = { 
                client_id: clientId, 
                session_id: currentSession.id, 
                content: content 
            };
            
            const res = await axios.post(url, payload, { headers: getAuthHeaders() });
            const aiMsg = res.data;
            setMessages(prev => [...prev, aiMsg]);

            // Auto-trigger read-only actions
            const rawActionMatch = aiMsg.content.match(/\[ACTION:\s*({.*})\s*\]/s);
            if (rawActionMatch) {
                try {
                    const actionData = JSON.parse(rawActionMatch[1]);
                    const autoTypes = ['GET_WP_POST', 'SEARCH_WP', 'GET_SITEMAP'];
                    if (autoTypes.includes(actionData.type)) {
                        // Small delay for natural feel
                        setTimeout(() => {
                            handleExecuteAction(actionData, messages.length + 1);
                        }, 600);
                    }
                } catch (e) { console.error("Auto-action parse error:", e); }
            }
        } catch (e) {
            toast.error("Errore esperto SEO");
            console.error("Chat error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteAction = async (action, messageIndex) => {
        // Optimistic update of the message to show loading in the card
        setMessages(prev => {
            const copy = [...prev];
            if (copy[messageIndex]) {
                copy[messageIndex] = { ...copy[messageIndex], executionLoading: true };
            }
            return copy;
        });

        try {
            const res = await axios.post(`${API}/chat/action/execute`, { ...action, client_id: clientId }, { headers: getAuthHeaders() });
            
            toast.success(res.data.message || "Azione eseguita con successo");
            
            setMessages(prev => {
                const copy = [...prev];
                if (copy[messageIndex]) {
                    copy[messageIndex] = { 
                        ...copy[messageIndex], 
                        executionLoading: false, 
                        executed: true,
                        executionResult: res.data 
                    };
                }
                return copy;
            });

            // If it's a data-gathering action, automatically send results back to the AI
            const autoFollowUpTypes = ['GET_WP_POST', 'SEARCH_WP', 'GET_SITEMAP'];
            if (autoFollowUpTypes.includes(action.type)) {
                const resultsSummary = action.type === 'GET_WP_POST' 
                    ? `CONTENUTO RECUPERATO: ${JSON.stringify(res.data.post?.content?.rendered || res.data.post)}`
                    : `RISULTATI RECUPERATI: ${JSON.stringify(res.data.results || res.data.urls)}`;
                
                handleSendMessage(null, `[SYSTEM_RESULT] ${resultsSummary}\n\nAnalizza questi dati e procedi con la richiesta originale.`);
            }
        } catch (e) {
            toast.error("Errore durante l'esecuzione dell'azione");
            console.error("Action execution error:", e);
            setMessages(prev => {
                const copy = [...prev];
                if (copy[messageIndex]) {
                    copy[messageIndex] = { ...copy[messageIndex], executionLoading: false };
                }
                return copy;
            });
        }
    };

    const renderMessageContent = (content, msgIndex) => {
        if (typeof content === 'string') {
            // Parse ACTION first - greedy match for nested JSON
            const actionMatch = content.match(/\[ACTION:\s*({.*})\s*\]/s);
            let displayContent = content;
            let actionData = null;

            if (actionMatch) {
                try {
                    actionData = JSON.parse(actionMatch[1]);
                    displayContent = content.replace(actionMatch[0], '').trim();
                } catch (e) {
                    console.error("Failed to parse action JSON", e);
                }
            }

            // Simple parsing for bold **text**
            const parts = displayContent.split(/(\*\*.*?\*\*)/g);
            return (
                <div className="space-y-4">
                    <div className="whitespace-pre-wrap">
                        {parts.map((p, i) => {
                            if (p.startsWith('**') && p.endsWith('**')) {
                                return <strong key={i} className="font-extrabold text-slate-900">{p.slice(2, -2)}</strong>;
                            }
                            return p;
                        })}
                    </div>

                    {actionData && (
                        <Card className="mt-4 border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600">
                                        {actionData.type === 'PUBLISH_ARTICLE' ? 'Pubblicazione Immediata' : 
                                         actionData.type === 'SEARCH_WP' ? 'Ricerca Contenuto WP' :
                                         actionData.type === 'GET_WP_POST' ? 'Analisi Articolo WordPress' :
                                         actionData.type === 'GET_SITEMAP' ? 'Esplorazione Sitemap' :
                                         actionData.type === 'TRIGGER_FRESHNESS' ? 'Ottimizzazione Freshness' :
                                         actionData.type === 'CREATE_ARTICLE' ? 'Suggerimento Articolo' : 'Suggerimento Ottimizzazione'}
                                    </span>
                                </div>
                                {messages[msgIndex]?.executed && (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] font-bold uppercase px-1">
                                        Eseguito
                                    </Badge>
                                )}
                            </div>
                            <div className="p-4 space-y-3">
                                {(actionData.type === 'CREATE_ARTICLE' || actionData.type === 'PUBLISH_ARTICLE') && (
                                    <div className="space-y-2">
                                        <div className="text-[11px] font-bold text-slate-900">{actionData.payload.title}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {actionData.payload.keywords?.map((kw, idx) => (
                                                <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[8px] font-medium border-none px-1.5 py-0">
                                                    #{kw}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {actionData.type === 'FIX_CONTENT' && (
                                    <div className="space-y-2">
                                        {actionData.payload.title && (
                                            <div className="text-[10px] font-bold text-slate-800 bg-slate-100 p-1.5 rounded border border-slate-200">
                                                TITOLO: {actionData.payload.title}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-600 italic">
                                            {actionData.payload.suggestion || "Aggiornamento contenuto..."}
                                        </div>
                                        {actionData.payload.wordpress_post_id && (
                                            <Badge variant="outline" className="text-[8px] border-slate-200 text-slate-400">
                                                ID: {actionData.payload.wordpress_post_id}
                                            </Badge>
                                        )}
                                        {actionData.payload.url && !actionData.payload.wordpress_post_id && (
                                            <Badge variant="outline" className="text-[8px] border-amber-200 text-amber-600 bg-amber-50">
                                                Target: {actionData.payload.url.replace(/^https?:\/\//, '')}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {actionData.type === 'GET_SITEMAP' && (
                                    <div className="text-[10px] text-slate-600 truncate">
                                        Analizza: <strong>{actionData.payload.url || "Sitemap predefinita"}</strong>
                                    </div>
                                )}

                                {actionData.type === 'SEARCH_WP' && (
                                    <div className="text-[10px] text-slate-600">
                                        Cerca <strong>"{actionData.payload.query}"</strong> tra le {actionData.payload.wp_type === 'page' ? 'pagine' : 'articoli'} del sito.
                                    </div>
                                )}

                                {actionData.type === 'GET_WP_POST' && (
                                    <div className="text-[10px] text-slate-600 truncate">
                                        Analizza: <strong>{actionData.payload.url || actionData.payload.post_id}</strong>
                                    </div>
                                )}

                                {actionData.type === 'TRIGGER_FRESHNESS' && (
                                    <div className="text-[10px] text-slate-600 truncate">
                                        Target: <strong>{actionData.payload.url}</strong>
                                    </div>
                                )}

                                <Button 
                                    size="sm"
                                    disabled={messages[msgIndex]?.executed || messages[msgIndex]?.executionLoading}
                                    onClick={() => handleExecuteAction(actionData, msgIndex)}
                                    className={`w-full h-8 text-[10px] font-bold uppercase tracking-tight gap-2 transition-all ${
                                        messages[msgIndex]?.executed 
                                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100' 
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {messages[msgIndex]?.executionLoading ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : messages[msgIndex]?.executed ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                        <Zap className="w-3 h-3" />
                                    )}
                                    {messages[msgIndex]?.executionLoading ? 'Esecuzione...' : 
                                     messages[msgIndex]?.executed ? 'Azione Completata' : 
                                     actionData.type === 'PUBLISH_ARTICLE' ? 'Pubblica ORA su WP' :
                                     actionData.type === 'SEARCH_WP' ? 'Cerca Ora' :
                                     actionData.type === 'GET_WP_POST' ? 'Leggi Articolo' :
                                     actionData.type === 'GET_SITEMAP' ? 'Leggi Sitemap' :
                                     actionData.type === 'TRIGGER_FRESHNESS' ? 'Attiva Freshness' :
                                     actionData.type === 'CREATE_ARTICLE' ? 'Crea Bozza Ora' : 'Applica Modifica'}
                                </Button>
                                {messages[msgIndex]?.executed && messages[msgIndex]?.executionResult?.results && (
                                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Risultati trovati:</div>
                                        {messages[msgIndex].executionResult.results.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border border-slate-100 shadow-sm">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-bold truncate text-slate-800">{r.title}</div>
                                                    <div className="text-[8px] text-slate-400 truncate">{r.link}</div>
                                                </div>
                                                <Badge className="bg-slate-900 text-white text-[8px] font-mono shrink-0">ID: {r.id}</Badge>
                                            </div>
                                        ))}
                                        {messages[msgIndex].executionResult.results.length === 0 && (
                                            <div className="text-[10px] text-slate-400 italic py-1">Nessun risultato trovato.</div>
                                        )}
                                    </div>
                                )}

                                {messages[msgIndex]?.executed && messages[msgIndex]?.executionResult?.urls && (
                                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Pagine trovate ({messages[msgIndex].executionResult.urls.length}):</div>
                                        <ScrollArea className="h-24 px-1">
                                            {messages[msgIndex].executionResult.urls.slice(0, 50).map((u, i) => (
                                                <div key={i} className="text-[9px] text-slate-600 p-1 border-b border-white hover:bg-white cursor-pointer truncate" onClick={() => copyToClipboard(u)}>
                                                    {u.replace(/^https?:\/\//, '')}
                                                </div>
                                            ))}
                                            {messages[msgIndex].executionResult.urls.length > 50 && (
                                                <div className="text-[8px] text-slate-400 italic pt-1">...e altre {messages[msgIndex].executionResult.urls.length - 50} pagine.</div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            );
        }
        if (typeof content === 'object' && content !== null) {
            // If it's an object (likely a JSON response that the backend sent as raw object), stringify it nicely
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-[9px] font-bold w-fit uppercase">
                        <AlertCircle className="w-2.5 h-2.5" /> Complex Response
                    </div>
                    <pre className="text-[9px] bg-slate-100 p-2 rounded-lg overflow-x-auto">
                        {JSON.stringify(content, null, 2)}
                    </pre>
                </div>
            );
        }
        return <div className="italic text-slate-400">Messaggio vuoto o non valido</div>;
    };

    const quickActions = [
        { label: "Analisi Strategica", icon: Zap, text: "Esegui un'analisi strategica completa." },
        { label: "Analisi GSC", icon: BarChart2, text: "Analizza i miei dati Search Console degli ultimi 28 giorni." },
        { label: "Idea Articolo", icon: Sparkles, text: "Suggeriscimi un idea di articolo basata sui dati GSC." },
    ];

    return (
        <div className="flex w-full h-full animate-in fade-in duration-500 overflow-hidden bg-white">
            {/* Sidebar - Sessions */}
            {showSidebar && (
                <div className="absolute inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col shadow-xl">
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chat History</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)} className="h-6 w-6">
                            <X className="w-3 h-3 text-slate-400" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {sessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSelectSession(s)}
                                    className={`w-full text-left p-3 rounded-xl transition-all ${currentSession?.id === s.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    <div className="text-[10px] font-bold truncate uppercase tracking-tight">{s.title || "Nuova Sessione"}</div>
                                    <div className={`text-[9px] truncate opacity-60 ${currentSession?.id === s.id ? 'text-slate-300' : ''}`}>{s.last_message || "Inizia chat..."}</div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative h-full min-w-0">
                {/* Minimal Header */}
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)} className="h-7 w-7 text-slate-400">
                            <History className="w-3.5 h-3.5" />
                        </Button>
                        <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                            <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">Strategist AI</span>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none px-1 py-0 text-[8px] font-bold uppercase">Active</Badge>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleNewSession} className="h-7 w-7 text-slate-400">
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-4">
                    <div className="space-y-5 max-w-full">
                        {messages.length === 0 && (
                            <div className="py-10 text-center space-y-4">
                                <Sparkles className="w-6 h-6 text-slate-200 mx-auto" />
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Pronto per l'analisi strategica</p>
                            </div>
                        )}
                        
                        {(messages || []).map((m, idx) => (
                            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`h-6 w-6 rounded-md shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'}`}>
                                        {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed transition-all ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 font-medium'}`}>
                                        {renderMessageContent(m.content, idx)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[90%]">
                                    <div className="h-6 w-6 rounded-md bg-slate-900 flex items-center justify-center text-white">
                                        <Bot className="w-3 h-3" />
                                    </div>
                                    <div className="p-3 rounded-2xl bg-slate-50 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin text-slate-300" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Processing...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-50">
                    <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar scroll-smooth">
                        {quickActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickAction(action)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300 transition-all whitespace-nowrap font-bold uppercase text-[8.5px] tracking-tight shrink-0"
                            >
                                <action.icon className="w-2.5 h-2.5" />
                                {action.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="relative">
                        <Input
                            placeholder="Domanda allo Strategist..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={!currentSession || loading}
                            className="h-9 text-[11px] pl-4 pr-10 bg-slate-50 border-slate-100 rounded-lg focus-visible:ring-slate-900/5 focus-visible:border-slate-300 transition-all shadow-none"
                        />
                        <Button 
                            type="submit" 
                            disabled={!currentSession || loading || !input.trim()}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md bg-slate-900 hover:bg-slate-800 text-white p-0 shadow-none"
                        >
                            <Send className="w-3 h-3" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SeoChatTab;
