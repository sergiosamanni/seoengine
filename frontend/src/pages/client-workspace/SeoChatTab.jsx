import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { 
    Send, Loader2, User, Bot, Sparkles, MessageCircle, 
    Plus, History, Maximize2, Hash, FileText, BarChart2,
    PieChart, Zap, X, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';



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
            const res = await axios.get(`${API}/clients/${clientId}/chat/sessions`, { headers: getAuthHeaders() });
            const data = Array.isArray(res.data) ? res.data : [];
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

    const handleSelectSession = async (session) => {
        if (!session?.id) return;
        setCurrentSession(session);
        try {
            const res = await axios.get(`${API}/clients/${clientId}/chat/sessions/${session.id}/messages`, { headers: getAuthHeaders() });
            setMessages(Array.isArray(res.data) ? res.data : []);
            setShowSidebar(false);
        } catch (e) {
            toast.error("Errore caricamento messaggi");
        }
    };

    const handleNewSession = async () => {
        try {
            const res = await axios.post(`${API}/clients/${clientId}/chat/sessions`, { title: `Chat ${new Date().toLocaleDateString()}` }, { headers: getAuthHeaders() });
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

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || !currentSession?.id || loading) return;

        const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        const textToSend = input;
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${API}/clients/${clientId}/chat/sessions/${currentSession.id}/message`, { content: textToSend }, { headers: getAuthHeaders() });
            setMessages(prev => [...prev, res.data]);
        } catch (e) {
            toast.error("Errore esperto SEO");
            console.error("Chat error:", e);
        } finally {
            setLoading(false);
        }
    };

    const renderMessageContent = (content) => {
        if (typeof content === 'string') {
            // Semplice parsing per il grassetto **testo**
            const parts = content.split(/(\*\*.*?\*\*)/g);
            return (
                <div className="whitespace-pre-wrap">
                    {parts.map((p, i) => {
                        if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={i} className="font-extrabold text-slate-900">{p.slice(2, -2)}</strong>;
                        }
                        return p;
                    })}
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
                                        {renderMessageContent(m.content)}
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
