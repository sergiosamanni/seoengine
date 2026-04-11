import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { 
    Send, Loader2, User, Bot, Sparkles, MessageCircle, 
    Plus, History, Maximize2, Hash, FileText, BarChart2,
    PieChart, Zap, X, AlertCircle, CheckCircle2, ArrowRight, ExternalLink
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

            // Auto-trigger read-only actions (supports multiple actions)
            const actionsFound = extractActions(aiMsg.content);
            if (actionsFound.length > 0) {
                const autoTypes = ['GET_WP_POST', 'SEARCH_WP', 'GET_SITEMAP'];
                let delay = 600;
                
                for (const act of actionsFound) {
                    try {
                        let jsonStr = act.json;
                        const firstBrace = jsonStr.indexOf('{');
                        const lastBrace = jsonStr.lastIndexOf('}');
                        if (firstBrace !== -1 && lastBrace !== -1) {
                            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                        }

                        const actionData = JSON.parse(jsonStr);
                        if (autoTypes.includes(actionData.type)) {
                            // Sequential trigger with slight offset for readability
                            setTimeout(() => {
                                handleExecuteAction(actionData, messages.length + 1);
                            }, delay);
                            delay += 1500; // Increase delay for subsequent actions
                        }
                    } catch (e) { 
                        const fixed = fixJson(act.json);
                        try {
                            const data = JSON.parse(fixed);
                            if (autoTypes.includes(data.type)) {
                                setTimeout(() => handleExecuteAction(data, messages.length + 1), delay);
                                delay += 1500;
                            }
                        } catch(e2) { console.error("Auto-action parse error after fix:", e2); }
                    }
                }
            }
        } catch (e) {
            toast.error("Errore esperto SEO");
            console.error("Chat error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteAction = async (action, messageIndex, actionIdx = 0) => {
        // Optimistic update for specific action
        setMessages(prev => {
            const copy = [...prev];
            if (copy[messageIndex]) {
                const loading = copy[messageIndex].loadingActions || {};
                copy[messageIndex] = { 
                    ...copy[messageIndex], 
                    loadingActions: { ...loading, [actionIdx]: true } 
                };
            }
            return copy;
        });

        const executePromise = axios.post(`${API}/chat/action/execute`, { ...action, client_id: clientId }, { headers: getAuthHeaders() });

        toast.promise(executePromise, {
            loading: (
                <div className="flex flex-col gap-1">
                    <span className="font-bold">Esecuzione in background...</span>
                    <span className="text-xs text-slate-500">Stiamo applicando le modifiche su WordPress.</span>
                </div>
            ),
            success: (data) => {
                const res = data.data;
                const targetUrl = action.payload?.url;
                
                if (action.type === 'FIX_CONTENT' || action.type === 'PUBLISH_ARTICLE') {
                    return (
                        <div className="flex flex-col gap-2 w-full">
                            <span className="font-bold">Modifica applicata con successo!</span>
                            <span className="text-xs text-slate-500">{res.message || "I contenuti sono online."}</span>
                            {targetUrl && (
                                <a 
                                    href={targetUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="mt-1 text-xs text-blue-500 hover:text-blue-600 underline flex items-center gap-1 bg-blue-50 p-2 rounded-lg border border-blue-100 w-fit"
                                >
                                    <ExternalLink className="w-3 h-3" /> Visualizza la pagina live
                                </a>
                            )}
                        </div>
                    );
                }
                return res.message || "Azione completata con successo";
            },
            error: (err) => {
                return err.response?.data?.detail || "Errore durante l'esecuzione dell'azione";
            }
        });

        try {
            const res = await executePromise;
            
            setMessages(prev => {
                const copy = [...prev];
                if (copy[messageIndex]) {
                    const executed = copy[messageIndex].executedActions || {};
                    const loading = copy[messageIndex].loadingActions || {};
                    const results = copy[messageIndex].resultsActions || {};
                    
                    copy[messageIndex] = { 
                        ...copy[messageIndex], 
                        loadingActions: { ...loading, [actionIdx]: false },
                        executedActions: { ...executed, [actionIdx]: true },
                        resultsActions: { ...results, [actionIdx]: res.data }
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
            setMessages(prev => {
                const copy = [...prev];
                if (copy[messageIndex]) {
                    const loading = copy[messageIndex].loadingActions || {};
                    copy[messageIndex] = { 
                        ...copy[messageIndex], 
                        loadingActions: { ...loading, [actionIdx]: false } 
                    };
                }
                return copy;
            });
        }
    };

    const fixJson = (raw) => {
        let fixed = "";
        let inString = false;
        let escapeNext = false;
        for (let i = 0; i < raw.length; i++) {
            const c = raw[i];
            if (escapeNext) { fixed += c; escapeNext = false; continue; }
            if (c === '\\') { fixed += c; escapeNext = true; continue; }
            if (c === '"') { inString = !inString; fixed += c; continue; }
            if (inString && c === '\n') { fixed += '\\n'; continue; }
            if (inString && c === '\r') { fixed += '\\r'; continue; }
            if (inString && c === '\t') { fixed += '\\t'; continue; }
            fixed += c;
        }
        return fixed;
    };

    const extractActions = (str) => {
        const chunks = [];
        let pos = 0;
        if (!str || typeof str !== 'string') return chunks;
        
        while ((pos = str.indexOf('[ACTION:', pos)) !== -1) {
            let start = pos;
            let bracketLevel = 0;
            let inString = false;
            let escape = false;
            let end = -1;
            
            for (let i = start; i < str.length; i++) {
                const char = str[i];
                if (escape) { escape = false; continue; }
                if (char === '\\') { escape = true; continue; }
                if (char === '"') { inString = !inString; continue; }
                if (!inString) {
                    if (char === '[') bracketLevel++;
                    if (char === ']') {
                        bracketLevel--;
                        if (bracketLevel === 0) {
                            end = i;
                            break;
                        }
                    }
                }
            }
            
            if (end !== -1) {
                const fullAction = str.substring(start, end + 1);
                chunks.push({
                    full: fullAction,
                    json: fullAction.replace('[ACTION:', '').replace(/\]$/, '').trim()
                });
                pos = end + 1;
            } else {
                pos += 8;
            }
        }
        return chunks;
    };

    const renderMessageContent = (content, msgIndex) => {
        if (typeof content === 'string') {
            // Support multiple ACTIONS in one message
            const actionChunks = extractActions(content);
            let displayContent = content;
            let actions = [];

            actionChunks.forEach((chunk) => {
                let jsonStr = chunk.json;
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                }

                try {
                    // Try naive parsing first
                    const data = JSON.parse(jsonStr);
                    actions.push(data);
                    displayContent = displayContent.replace(chunk.full, '').trim();
                } catch (e1) {
                    try {
                        const fixed = fixJson(jsonStr);
                        const data = JSON.parse(fixed);
                        actions.push(data);
                        displayContent = displayContent.replace(chunk.full, '').trim();
                    } catch (e2) {
                        console.error("Failed to parse action JSON even after fix:", e2);
                    }
                }
            });

            // Simple parsing for bold **text**
            const parts = displayContent.split(/(\*\*.*?\*\*)/g);
            
            // Truncate very long conversational text (especially if it contains accidental HTML dumps)
            const isVeryLong = displayContent.length > 500;
            
            return (
                <div className="space-y-4">
                    <div className="whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {parts.map((p, i) => {
                            if (p.startsWith('**') && p.endsWith('**')) {
                                return <strong key={i} className="font-extrabold text-slate-900">{p.slice(2, -2)}</strong>;
                            }
                            // If it's the text parts, and it's very long, maybe we should limit it or wrap it
                            return p;
                        })}
                        {isVeryLong && (
                            <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-2">
                                <AlertCircle className="w-3 h-3" />
                                <span>Il testo completo è molto lungo. Controlla le azioni suggerite qui sotto per i dettagli tecnici.</span>
                            </div>
                        )}
                    </div>

                    {actions.map((actionData, actionIdx) => (
                        <Card key={actionIdx} className="mt-4 border-slate-200 bg-white shadow-sm overflow-hidden">
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
                                {messages[msgIndex]?.executedActions?.[actionIdx] && (
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
                                    <div className="text-[10px] text-slate-600 break-all">
                                        Analizza: <strong>{actionData.payload.url || "Sitemap predefinita"}</strong>
                                    </div>
                                )}

                                {actionData.type === 'SEARCH_WP' && (
                                    <div className="text-[10px] text-slate-600">
                                        Cerca <strong>"{actionData.payload.query}"</strong> tra {actionData.payload.wp_type === 'page' ? 'le pagine' : 'gli articoli'}.
                                    </div>
                                )}

                                {actionData.type === 'GET_WP_POST' && (
                                    <div className="text-[10px] text-slate-600 break-all">
                                        Analizza: <strong>{actionData.payload.url || actionData.payload.post_id}</strong>
                                    </div>
                                )}

                                {actionData.type === 'TRIGGER_FRESHNESS' && (
                                    <div className="text-[10px] text-slate-600 break-all">
                                        Target: <strong>{actionData.payload.url}</strong>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button 
                                        size="sm"
                                        disabled={messages[msgIndex]?.executedActions?.[actionIdx] || messages[msgIndex]?.loadingActions?.[actionIdx]}
                                        onClick={() => handleExecuteAction(actionData, msgIndex, actionIdx)}
                                        className={`flex-1 h-8 text-[10px] font-bold uppercase tracking-tight gap-2 transition-all ${
                                            messages[msgIndex]?.executedActions?.[actionIdx] 
                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100' 
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        {messages[msgIndex]?.loadingActions?.[actionIdx] ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : messages[msgIndex]?.executedActions?.[actionIdx] ? (
                                            <CheckCircle2 className="w-3 h-3" />
                                        ) : (
                                            <Zap className="w-3 h-3" />
                                        )}
                                        {messages[msgIndex]?.loadingActions?.[actionIdx] ? 'Esecuzione...' : 
                                         messages[msgIndex]?.executedActions?.[actionIdx] ? 'Azione Completata' : 
                                         actionData.type === 'PUBLISH_ARTICLE' ? 'Pubblica ORA su WP' :
                                         actionData.type === 'SEARCH_WP' ? 'Cerca Ora' :
                                         actionData.type === 'GET_WP_POST' ? 'Leggi Articolo' :
                                         actionData.type === 'GET_SITEMAP' ? 'Leggi Sitemap' :
                                         actionData.type === 'TRIGGER_FRESHNESS' ? 'Attiva Freshness' :
                                         actionData.type === 'CREATE_ARTICLE' ? 'Crea Bozza Ora' : 'Applica Modifica'}
                                    </Button>

                                    {actionData.type === 'FIX_CONTENT' && (actionData.payload.new_content || actionData.payload.content) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const htmlContent = actionData.payload.new_content || actionData.payload.content;
                                                navigator.clipboard.writeText(htmlContent);
                                                toast.success("HTML copiato! Incollalo in WP se l'aggiornamento automatico fallisce.");
                                            }}
                                            className="h-8 px-3 border-slate-200 text-slate-500 hover:bg-slate-50"
                                            title="Copia HTML manuale"
                                        >
                                            <FileText className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>

                                {messages[msgIndex]?.executedActions?.[actionIdx] && messages[msgIndex]?.resultsActions?.[actionIdx] && (
                                    <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-center gap-2 text-emerald-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">Successo!</span>
                                        </div>
                                        {messages[msgIndex].resultsActions[actionIdx].message && (
                                            <div className="text-[10px] text-emerald-600 leading-tight">
                                                {messages[msgIndex].resultsActions[actionIdx].message}
                                            </div>
                                        )}
                                        {messages[msgIndex].resultsActions[actionIdx].results && (
                                            <div className="space-y-1 mt-1">
                                                {messages[msgIndex].resultsActions[actionIdx].results.map((r, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-white rounded border border-emerald-100 shadow-sm">
                                                        <div className="min-w-0">
                                                            <div className="text-[9px] font-bold truncate text-slate-800">{r.title}</div>
                                                            <div className="text-[7px] text-slate-400 truncate">{r.link || r.url}</div>
                                                        </div>
                                                        <Badge className="bg-emerald-600 text-white text-[7px] font-mono shrink-0 py-0 h-3">ID: {r.id}</Badge>
                                                    </div>
                                                ))}
                                                {messages[msgIndex].resultsActions[actionIdx].results.length === 0 && (
                                                    <div className="text-[9px] text-emerald-400 italic py-1 text-center font-medium">Nessun risultato trovato.</div>
                                                )}
                                            </div>
                                        )}
                                        {messages[msgIndex].resultsActions[actionIdx].urls && (
                                            <ScrollArea className="h-24 px-1 bg-white rounded border border-emerald-50 mt-1">
                                                {messages[msgIndex].resultsActions[actionIdx].urls.slice(0, 50).map((u, i) => (
                                                    <div key={i} className="text-[9px] text-emerald-600 p-1 border-b border-white hover:bg-emerald-50 cursor-pointer truncate" onClick={() => copyToClipboard(u)}>
                                                        {u.replace(/^https?:\/\//, '')}
                                                    </div>
                                                ))}
                                                {messages[msgIndex].resultsActions[actionIdx].urls.length > 50 && (
                                                    <div className="text-[8px] text-emerald-400 italic pt-1">...e altre {messages[msgIndex].resultsActions[actionIdx].urls.length - 50} pagine.</div>
                                                )}
                                            </ScrollArea>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            );
        }
        if (typeof content === 'object' && content !== null) {
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
                                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed transition-all min-w-0 ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 font-medium'}`} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                        <textarea
                            placeholder="Domanda allo Strategist... (Shift+Invio per inviare)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            disabled={!currentSession || loading}
                            rows={1}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            className="w-full min-h-[36px] max-h-[120px] text-[11px] pl-4 pr-10 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:ring-1 focus:ring-slate-900/5 focus:border-slate-300 transition-all shadow-none resize-none outline-none"
                            style={{ lineHeight: '1.5' }}
                        />
                        <Button 
                            type="submit" 
                            disabled={!currentSession || loading || !input.trim()}
                            className="absolute right-1 bottom-1.5 h-7 w-7 rounded-md bg-slate-900 hover:bg-slate-800 text-white p-0 shadow-none"
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
