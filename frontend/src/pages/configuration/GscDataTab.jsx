import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  BarChart3, Loader2, RefreshCw, ExternalLink, TrendingUp, Sparkles,
  MousePointerClick, Eye, Target, AlertTriangle, CheckCircle2, Globe, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, LineChart, Line 
} from 'recharts';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const GscTrendChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    // Formattazione data YYYYMMDD -> DD/MM
    const chartData = data.map(d => ({
        ...d,
        formattedDate: `${d.date.substring(6,8)}/${d.date.substring(4,6)}`
    }));

    return (
        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden p-4 bg-white">
            <div className="flex items-center justify-between mb-2 px-1">
                <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Andamento Traffico</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Click e Impressioni</p>
                </div>
            </div>
            <div className="h-[180px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="formattedDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 9, fontWeight: 800, fill: '#cbd5e1'}}
                            minTickGap={40}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 9, fontWeight: 800, fill: '#cbd5e1'}}
                        />
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}}
                            itemStyle={{padding: '0'}}
                            labelStyle={{marginBottom: '4px', color: '#64748b'}}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="clicks" 
                            name="Click" 
                            stroke="#6366f1" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorClicks)" 
                            animationDuration={1500}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="impressions" 
                            name="Impressioni" 
                            stroke="#10b981" 
                            strokeWidth={2} 
                            fill="transparent" 
                            strokeDasharray="5 5"
                            animationDuration={2000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

const GscPositionChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    
    const chartData = data.map(d => ({
        ...d,
        formattedDate: `${d.date.substring(6,8)}/${d.date.substring(4,6)}`
    }));

    return (
        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden p-4 bg-white">
            <div className="flex items-center justify-between mb-2 px-1">
                <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Posizionamento Medio</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Trend Ranking</p>
                </div>
            </div>
            <div className="h-[180px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="formattedDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 9, fontWeight: 800, fill: '#cbd5e1'}}
                            minTickGap={40}
                        />
                        <YAxis 
                            reversed 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 9, fontWeight: 800, fill: '#cbd5e1'}}
                            domain={['dataMin - 1', 'dataMax + 1']}
                        />
                        <Tooltip 
                            contentStyle={{borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}}
                            itemStyle={{padding: '0'}}
                            labelStyle={{marginBottom: '4px', color: '#64748b'}}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="position" 
                            name="Posizione" 
                            stroke="#f43f5e" 
                            strokeWidth={3} 
                            dot={false}
                            animationDuration={2500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export const GscDataTab = ({ clientId, getAuthHeaders, client, addToQueue }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [days, setDays] = useState('28');
    const [gscConnected, setGscConnected] = useState(false);
    
    const [sitemapLoading, setSitemapLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiStrategy, setAiStrategy] = useState(null);

    const submitSitemap = async () => {
        if (!data || !clientId) return;
        setSitemapLoading(true);
        
        // Use configured sitemap_url or fallback to /sitemap.xml
        const configuredSitemap = client?.configuration?.seo?.sitemap_url;
        const sitemapUrl = configuredSitemap || `${client?.configuration?.gsc?.site_url?.replace(/\/$/, '')}/sitemap.xml`;
        
        try {
            await axios.post(`${API}/clients/${clientId}/gsc/submit-sitemap`, { sitemap_url: sitemapUrl }, {
                headers: getAuthHeaders()
            });
            toast.success("Sitemap inviata con successo!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Errore nell'invio della sitemap");
        } finally {
            setSitemapLoading(false);
        }
    };

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const resp = await axios.get(`${API}/clients/${clientId}/gsc-data?days=${days}`, {
                headers: getAuthHeaders()
            });
            setData(resp.data);
            setGscConnected(true);
            setAiStrategy(null); 
        } catch (error) {
            if (error.response?.status === 401) {
                setGscConnected(false);
                toast.error('Sessione GSC scaduta. Riconnettiti nella scheda Configurazione.');
            } else {
                setGscConnected(false);
                // Silence common 400s if not connected
                if (error.response?.status !== 400) toast.error('Errore caricamento dati GSC');
            }
        } finally {
            setLoading(false);
        }
    }, [clientId, days, getAuthHeaders]);

    useEffect(() => {
        if (clientId) fetchData();
    }, [clientId, fetchData]);

    const handleApplySuggestion = (sugg) => {
        if(addToQueue) {
            addToQueue(`[STRATEGIA] ${sugg.keyword} - ${sugg.title}`);
        }
    };

    const requestAiStrategy = async () => {
        if(!data) return;
        setAiLoading(true);
        setAiStrategy(null);
        try {
            const resp = await axios.post(`${API}/clients/${clientId}/gsc-strategic-suggestions`, { gsc_data: data }, {
                headers: getAuthHeaders()
            });
            setAiStrategy(resp.data.suggestions || []);
            toast.success("Strategia AI elaborata!");
        } catch (error) {
            toast.error("Errore nell'elaborazione strategica AI");
        } finally {
            setAiLoading(false);
        }
    };

    if (!clientId) return null;

    if (!gscConnected && !loading) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Google Search Console non connesso</h3>
                    <p className="text-slate-500 max-w-lg mx-auto mb-6">
                        Connetti il tuo account Google nella scheda **Configurazione** per visualizzare i dati di performance e posizionamento.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header Section Compact */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 px-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tighter uppercase leading-tight">Performance di Ricerca</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{client?.nome} — Real-time Google Data</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={days} onValueChange={(v) => setDays(v)}>
                      <SelectTrigger className="w-[140px] h-8 rounded-lg border-slate-200 bg-slate-100/50 font-bold text-[10px] uppercase tracking-wider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-slate-100 shadow-xl">
                        <SelectItem value="7" className="text-[10px] font-bold">Ultimi 7 giorni</SelectItem>
                        <SelectItem value="28" className="text-[10px] font-bold">Ultimi 28 giorni</SelectItem>
                        <SelectItem value="90" className="text-[10px] font-bold">Ultimi 3 mesi</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 rounded-lg px-3 border-slate-200 font-bold text-[9px] uppercase tracking-widest hover:bg-slate-50">
                      <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Sincronizza
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] animate-pulse">Sincronizzazione Google...</p>
                </div>
            ) : data ? (
                <>
                    {/* STATS GRID COMPACT */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Click totali', value: data.totals?.total_clicks, icon: MousePointerClick, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100/50' },
                            { label: 'Impressioni', value: data.totals?.total_impressions, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100/50' },
                            { label: 'CTR medio', value: `${data.totals?.avg_ctr}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50/50', border: 'border-amber-100/50' },
                            { label: 'Pos. media', value: data.totals?.avg_position, icon: Target, color: 'text-rose-500', bg: 'bg-rose-50/50', border: 'border-rose-100/50' },
                        ].map(s => (
                            <Card key={s.label} className={`border-none ${s.bg} shadow-sm overflow-hidden relative group h-20`}>
                                <div className={`absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                    <s.icon className="w-16 h-16" />
                                </div>
                                <CardContent className="p-4 relative flex flex-col justify-between h-full">
                                    <div className="flex items-center gap-1.5 opacity-60">
                                        <s.icon className={`w-3 h-3 ${s.color}`} />
                                        <span className="text-[8.5px] text-slate-500 uppercase tracking-widest font-black">{s.label}</span>
                                    </div>
                                    <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">{s.value?.toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* TREND CHARTS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <GscTrendChart data={data.chart_data} />
                        <GscPositionChart data={data.chart_data} />
                    </div>

                    {/* AI STRATEGY BANNER COMPACT */}
                    <Card className="border-indigo-100 bg-gradient-to-r from-indigo-700 to-indigo-900 shadow-lg shadow-indigo-100 rounded-2xl overflow-hidden">
                        <CardHeader className="p-4 flex flex-row items-center justify-between border-none space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-black text-white tracking-tighter uppercase">Consulto Strategico AI</CardTitle>
                                    <CardDescription className="text-indigo-100/70 font-medium text-[10px]">Trend di Google, suggerimenti automatici e ottimizzazioni.</CardDescription>
                                </div>
                            </div>
                            <Button 
                                onClick={requestAiStrategy} 
                                disabled={aiLoading} 
                                className="bg-white hover:bg-slate-50 text-indigo-700 shadow-md font-black uppercase tracking-widest text-[9px] h-9 px-5 rounded-xl border-none active:scale-95"
                            >
                                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                                Analizza Dati
                            </Button>
                        </CardHeader>
                        {aiStrategy && (
                            <CardContent className="p-6 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    {aiStrategy.map((s, idx) => (
                                        <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl flex items-center justify-between group/item hover:bg-white/10 transition-colors">
                                            <div className="min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={s.type === 'new_article' ? "bg-emerald-400/20 text-emerald-300 border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4" : "bg-amber-400/20 text-amber-300 border-none text-[8px] font-black uppercase tracking-widest px-1.5 h-4"}>
                                                        {s.type === 'new_article' ? 'Nuovo' : 'Ottimizzazione'}
                                                    </Badge>
                                                    <span className="font-mono text-[10px] text-white/40 font-bold tracking-tighter truncate max-w-[150px]">{s.keyword}</span>
                                                </div>
                                                <h4 className="font-bold text-white text-sm tracking-tight mb-1">{s.title}</h4>
                                                <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{s.reason}</p>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleApplySuggestion(s)} 
                                                variant="outline" 
                                                className="bg-white/10 border-white/10 text-white hover:bg-white hover:text-indigo-900 rounded-xl font-black uppercase tracking-widest text-[9px] h-9 h-9 transition-all"
                                            >
                                                Applica
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        )}
                        {!aiStrategy && <div className="h-4" />}
                    </Card>

                    {/* DATA TABLES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* KEYWORDS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Target className="w-4 h-4 text-indigo-500" /> Top Keyword
                                </h4>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] font-black border-none px-2 h-5">
                                    {data.keywords?.length || 0} POSIZIONATE
                                </Badge>
                            </div>
                            <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[480px]">
                                        <table className="w-full text-sm border-separate border-spacing-0">
                                            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-50">
                                                <tr className="text-slate-400 text-[9px] text-left uppercase font-black tracking-widest">
                                                    <th className="py-4 px-6 border-b border-slate-50">Keyword</th>
                                                    <th className="py-4 px-4 border-b border-slate-50 text-right">Click</th>
                                                    <th className="py-4 px-4 border-b border-slate-50 text-right">CTR</th>
                                                    <th className="py-4 px-6 border-b border-slate-50 text-right">Pos.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data.keywords || []).map((kw, i) => (
                                                    <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-6 border-b border-slate-50 font-bold text-slate-700 text-xs">
                                                            {kw.keyword}
                                                        </td>
                                                        <td className="py-3 px-4 border-b border-slate-50 text-right text-indigo-600 font-black text-xs">
                                                            {kw.clicks}
                                                        </td>
                                                        <td className="py-3 px-4 border-b border-slate-50 text-right text-slate-400 font-bold text-[10px]">
                                                            {kw.ctr}%
                                                        </td>
                                                        <td className="py-3 px-6 border-b border-slate-50 text-right">
                                                            <div className="flex justify-end">
                                                                <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black border shadow-sm ${
                                                                    kw.position <= 3 ? 'bg-emerald-500 border-emerald-400 text-white' : 
                                                                    kw.position <= 10 ? 'bg-amber-500 border-amber-400 text-white' : 
                                                                    'bg-slate-50 border-slate-200 text-slate-500'
                                                                }`}>
                                                                    {kw.position}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* PAGES */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-emerald-500" /> Top Pagine
                                </h4>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] font-black border-none px-2 h-5">
                                    {data.pages?.length || 0} CON TRAFFICO
                                </Badge>
                            </div>
                            <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[480px]">
                                        <table className="w-full text-sm border-separate border-spacing-0">
                                            <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-50">
                                                <tr className="text-slate-400 text-[9px] text-left uppercase font-black tracking-widest">
                                                    <th className="py-4 px-6 border-b border-slate-50">URL</th>
                                                    <th className="py-4 px-6 border-b border-slate-50 text-right">Click</th>
                                                    <th className="py-4 px-6 border-b border-slate-50 text-right">Pos. Media</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data.pages || []).map((pg, i) => (
                                                    <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-6 border-b border-slate-50">
                                                            <a href={pg.page} target="_blank" rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-2 group/link text-xs max-w-[200px] truncate">
                                                                {pg.page.replace(/https?:\/\/[^/]+/, '') || '/'}
                                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                            </a>
                                                        </td>
                                                        <td className="py-3 px-6 border-b border-slate-50 text-right text-emerald-600 font-black text-xs">
                                                            {pg.clicks}
                                                        </td>
                                                        <td className="py-3 px-6 border-b border-slate-50 text-right">
                                                            <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 italic">
                                                                {pg.position}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* INDEXING TOOLS SECTION */}
                    <div className="mt-8">
                        <div className="flex items-center gap-3 mb-4 px-2">
                             <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Strumenti di Indicizzazione</h4>
                        </div>
                        <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-900 mb-1 tracking-tight">Invia Sitemap a Google</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-md">
                                            Notifica Google che la tua sitemap è stata aggiornata. Il sistema userà l'URL predefinito 
                                            <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1">/sitemap.xml</span>
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={submitSitemap} 
                                        disabled={sitemapLoading || !data}
                                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-[9px] h-10 px-6"
                                    >
                                        {sitemapLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Send className="w-3 h-3 mr-2" />}
                                        Invia Sitemap Ora
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <BarChart3 className="w-12 h-12 text-slate-100 mb-6" />
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Nessun dato disponibile</h3>
                    <p className="text-sm text-slate-400 max-w-sm text-center">
                        Non è stato possibile recuperare dati organici per questo periodo. Verifica la connessione a GSC.
                    </p>
                </div>
            )}
        </div>
    );
};

export default GscDataTab;
