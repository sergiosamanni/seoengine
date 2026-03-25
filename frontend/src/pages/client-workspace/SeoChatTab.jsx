import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Send, Loader2, User, Bot, Sparkles, MessageCircle, 
    Plus, History, Maximize2, Hash, FileText, BarChart2 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const SeoChatTab = ({ clientId, getAuthHeaders, client }) => {
    const [sessions, setSessions] = useState([]);
    const [currentSession, setCurrentSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchSessions();
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
            setSessions(res.data);
            if (res.data.length > 0 && !currentSession) {
                handleSelectSession(res.data[0]);
            }
        } catch (e) {
            console.error("Error fetching sessions", e);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleSelectSession = async (session) => {
        setCurrentSession(session);
        try {
            const res = await axios.get(`${API}/clients/${clientId}/chat/sessions/${session.id}/messages`, { headers: getAuthHeaders() });
            setMessages(res.data);
        } catch (e) {
            toast.error("Errore nel caricamento della cronologia");
        }
    };

    const handleNewSession = async () => {
        try {
            const res = await axios.post(`${API}/clients/${clientId}/chat/sessions`, { title: `Nuova Chat ${new Date().toLocaleDateString()}` }, { headers: getAuthHeaders() });
            setSessions([res.data, ...sessions]);
            setCurrentSession(res.data);
            setMessages([]);
        } catch (e) {
            toast.error("Errore nella creazione della sessione");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !currentSession || loading) return;

        const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
        setMessages([...messages, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${API}/clients/${clientId}/chat/sessions/${currentSession.id}/message`, { content: input }, { headers: getAuthHeaders() });
            setMessages(prev => [...prev, res.data]);
        } catch (e) {
            toast.error("L'esperto SEO ha avuto un problema. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "Come sta andando il posizionamento?",
        "Dammi 3 idee per nuovi articoli",
        "Qual è la mia keyword con più impression?",
        "Suggerisci miglioramenti per la KB"
    ];

    return (
        <div className="flex h-[700px] gap-6 animate-in fade-in duration-500">
            {/* Sidebar - Sessions */}
            <Card className="w-80 bg-white/50 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Conversazioni</h3>
                    <Button variant="ghost" size="icon" onClick={handleNewSession} className="h-8 w-8 rounded-lg hover:bg-slate-100">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                        {loadingSessions ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-8 text-[10px] text-slate-400 font-medium">Nessuna chat iniziata</div>
                        ) : sessions.map(s => (
                            <button
                                key={s.id}
                                onClick={() => handleSelectSession(s)}
                                className={`w-full text-left p-4 rounded-2xl transition-all group ${currentSession?.id === s.id ? 'bg-slate-900 shadow-lg shadow-slate-200' : 'hover:bg-slate-50'}`}
                            >
                                <div className={`text-[11px] font-bold truncate ${currentSession?.id === s.id ? 'text-white' : 'text-slate-700'}`}>
                                    {s.title}
                                </div>
                                <div className={`text-[10px] mt-1 truncate font-medium ${currentSession?.id === s.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                    {s.last_message || "Inizia a parlare..."}
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* Main Chat Area */}
            <Card className="flex-1 bg-white/40 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/30 overflow-hidden flex flex-col relative">
                {/* Chat Header */}
                <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                Esperto SEO AI
                                <Badge className="bg-blue-50 text-blue-600 border-none px-2 py-0 text-[10px] font-black uppercase tracking-tighter">Pro Context</Badge>
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold tracking-tight">Analisi GSC & Knowledge Base attiva</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200 px-3 py-1 bg-white">
                            Modello: AI Strategist Pro
                        </Badge>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Ciao! Sono il tuo consulente SEO.</h3>
                                    <p className="text-[11px] text-slate-500 max-w-xs mt-1">Chiedimi qualsiasi cosa sui tuoi dati GSC, contenuti o strategie future.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-w-md w-full mt-4">
                                    {suggestions.map((s, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setInput(s)}
                                            className="text-[10px] p-3 rounded-xl border border-slate-100 bg-white/50 hover:bg-white hover:border-blue-200 transition-all text-left font-semibold text-slate-600 shadow-sm"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {messages.map((m, idx) => (
                            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${m.role === 'user' ? 'bg-slate-100' : 'bg-blue-600 text-white'}`}>
                                        {m.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`p-4 rounded-2xl text-[12px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium'}`}>
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                        {m.metadata?.context_used && (
                                            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-500/70">
                                                    <Hash className="w-3 h-3" /> GSC DATA
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500/70">
                                                    <FileText className="w-3 h-3" /> KB MATCH
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex gap-3 max-w-[85%]">
                                    <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white border border-slate-100 rounded-tl-none flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analisi dati in corso...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-6 pt-2">
                    <form onSubmit={handleSendMessage} className="relative group">
                        <div className="absolute inset-x-0 -top-8 flex justify-center opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <div className="bg-slate-900 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-xl">
                                L'esperto sta ascoltando...
                            </div>
                        </div>
                        <Input
                            placeholder="Chiedi all'esperto SEO..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={!currentSession || loading}
                            className="h-14 bg-white/80 border-slate-200/60 pl-14 pr-16 rounded-2xl focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 focus-visible:border-blue-500 selection:bg-blue-100 transition-all text-sm font-medium placeholder:text-slate-400"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={!currentSession || loading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-slate-900 hover:bg-blue-700 transition-all shadow-lg active:scale-90"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                    <p className="text-center text-[10px] text-slate-400 mt-4 font-semibold tracking-tight uppercase tracking-[0.2em] opacity-50">
                        Integrazione Intelligente • SEO Strategist v2.0
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default SeoChatTab;
