import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '../../components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/dialog';
import {
  BarChart3, Loader2, RefreshCw, ExternalLink, TrendingUp, Sparkles,
  MousePointerClick, Eye, Target, Globe, Send,
  Zap, ChevronRight, LayoutDashboard, Search, MessageSquare, PanelRightClose, PanelRightOpen,
  ChevronDown, ChevronUp, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';

// Components
import SeoChatTab from '../client-workspace/SeoChatTab';



export const GscDataTab = ({ clientId, getAuthHeaders, client, addToQueue }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [days, setDays] = useState('28');
    const [gscConnected, setGscConnected] = useState(false);
    
    // Limits for gradual expansion
    const [kwLimit, setKwLimit] = useState(25);
    const [pgLimit, setPgLimit] = useState(25);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Sorting State
    const [kwSort, setKwSort] = useState({ field: 'clicks', order: 'desc' });
    const [pgSort, setPgSort] = useState({ field: 'clicks', order: 'desc' });
    
    const [sitemapLoading, setSitemapLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const submitSitemap = async () => {
        if (!data || !clientId) return;
        setSitemapLoading(true);
        const configuredSitemap = client?.configuration?.seo?.sitemap_url;
        const sitemapUrl = configuredSitemap || `${client?.configuration?.gsc?.site_url?.replace(/\/$/, '')}/sitemap.xml`;
        
        try {
            await axios.post(`${API}/clients/${clientId}/gsc/submit-sitemap`, { sitemap_url: sitemapUrl }, {
                headers: getAuthHeaders()
            });
            toast.success("Sitemap inviata");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Errore");
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
            setKwLimit(25);
            setPgLimit(25);
        } catch (error) {
            setGscConnected(false);
            if (error.response?.status !== 400 && error.response?.status !== 401) {
                toast.error('Errore caricamento dati GSC');
            }
        } finally {
            setLoading(false);
        }
    }, [clientId, days, getAuthHeaders]);

    useEffect(() => {
        if (clientId) fetchData();
    }, [clientId, fetchData]);

    // Sorting logic for Keywords
    const sortedKeywords = useMemo(() => {
        if (!data?.keywords) return [];
        return [...data.keywords].sort((a, b) => {
            const valA = a[kwSort.field];
            const valB = b[kwSort.field];
            if (kwSort.order === 'asc') return valA - valB;
            return valB - valA;
        });
    }, [data?.keywords, kwSort]);

    // Sorting logic for Pages
    const sortedPages = useMemo(() => {
        if (!data?.pages) return [];
        return [...data.pages].sort((a, b) => {
            const valA = a[pgSort.field];
            const valB = b[pgSort.field];
            if (pgSort.order === 'asc') return valA - valB;
            return valB - valA;
        });
    }, [data?.pages, pgSort]);

    const handleKwSort = (field) => {
        setKwSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handlePgSort = (field) => {
        setPgSort(prev => ({
            field,
            order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };

    const requestAiStrategy = async () => {
        if(!data) return;
        setAiLoading(true);
        try {
            await axios.post(`${API}/clients/${clientId}/gsc-strategic-suggestions`, { gsc_data: data }, {
                headers: getAuthHeaders()
            });
            toast.success("Analisi Completata");
        } catch (error) {
            toast.error("Errore analisi AI");
        } finally {
            setAiLoading(false);
        }
    };

    if (!clientId) return null;

    if (!gscConnected && !loading) {
        return (
            <Card className="border-slate-100 shadow-none">
                <CardContent className="py-12 text-center">
                    <BarChart3 className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-900 mb-1">GSC non connesso</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                        Connetti il tuo account nella scheda Configurazione.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const SortIcon = ({ field, currentSort }) => {
        if (currentSort.field !== field) return <ArrowUpDown className="w-2.5 h-2.5 ml-1 opacity-30" />;
        return currentSort.order === 'asc' ? <ArrowUp className="w-2.5 h-2.5 ml-1 text-slate-900" /> : <ArrowDown className="w-2.5 h-2.5 ml-1 text-slate-900" />;
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-full p-2 relative">
            
            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <Select value={days} onValueChange={(v) => setDays(v)}>
                        <SelectTrigger className="w-[140px] h-8 text-[11px] border-slate-100 bg-white/50 shadow-none focus:ring-slate-100 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-slate-100 text-[11px]">
                            <SelectItem value="7">Ultimi 7 giorni</SelectItem>
                            <SelectItem value="28">Ultimi 28 giorni</SelectItem>
                            <SelectItem value="90">Ultimi 3 mesi</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={fetchData} 
                        disabled={loading} 
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        onClick={requestAiStrategy}
                        disabled={aiLoading || !data}
                        variant="outline"
                        className="h-8 text-[10px] border-slate-100 bg-white rounded-lg px-3 flex items-center gap-2 hover:bg-slate-50"
                    >
                        {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> }
                        ANALISI STRATEGICA
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-4">Caricamento dati...</p>
                </div>
            ) : data ? (
                <ScrollArea className="flex-1">
                    <div className="space-y-6 pr-1 max-w-5xl">
                        {/* STATS */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Click', value: data.totals?.total_clicks, icon: MousePointerClick, color: 'text-slate-600' },
                                { label: 'Impressions', value: data.totals?.total_impressions, icon: Eye, color: 'text-slate-600' },
                                { label: 'CTR', value: `${data.totals?.avg_ctr}%`, icon: TrendingUp, color: 'text-slate-600' },
                                { label: 'Posiz.', value: data.totals?.avg_position, icon: Target, color: 'text-slate-600' },
                            ].map(s => (
                                <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{s.label}</span>
                                    <span className="text-xl font-semibold text-slate-900 tracking-tight">{s.value?.toLocaleString() || 0}</span>
                                </div>
                            ))}
                        </div>

                        {/* TABLES */}
                        <Accordion type="single" collapsible defaultValue="keywords" className="space-y-3">
                            <AccordionItem value="keywords" className="border-none">
                                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                                    <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-slate-50/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Target className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight">Top Keywords</span>
                                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-slate-200 text-slate-400 bg-transparent">{data.keywords?.length || 0}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0 border-t border-slate-50">
                                        <div className="px-0">
                                            <table className="w-full text-[11px]">
                                                <thead>
                                                    <tr className="text-slate-400 text-left border-b border-slate-50">
                                                        <th className="py-2.5 px-4 font-medium uppercase tracking-wider">Keyword</th>
                                                        <th 
                                                            className="py-2.5 px-4 font-medium uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors"
                                                            onClick={() => handleKwSort('clicks')}
                                                        >
                                                            <div className="flex items-center justify-end">Click <SortIcon field="clicks" currentSort={kwSort} /></div>
                                                        </th>
                                                        <th 
                                                            className="py-2.5 px-4 font-medium uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors"
                                                            onClick={() => handleKwSort('position')}
                                                        >
                                                            <div className="flex items-center justify-end">Pos. <SortIcon field="position" currentSort={kwSort} /></div>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {sortedKeywords.slice(0, kwLimit).map((kw, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="py-2 px-4 text-slate-700 font-medium">{kw.keyword}</td>
                                                            <td className="py-2 px-4 text-right text-slate-900 font-semibold">{kw.clicks}</td>
                                                            <td className="py-2 px-4 text-right">
                                                                <span className={`inline-block w-6 text-center rounded text-[9px] font-bold ${kw.position <= 3 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                                                    {kw.position}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            
                                            {data.keywords?.length > kwLimit && (
                                                <Button 
                                                    variant="ghost" 
                                                    className="w-full py-2 h-auto text-[10px] font-bold text-slate-400 uppercase border-t border-slate-50 hover:bg-slate-50"
                                                    onClick={() => setKwLimit(prev => prev + 25)}
                                                >
                                                    <div className="flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Carica altri 25 ({kwLimit}/{data.keywords.length})</div>
                                                </Button>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>

                            <AccordionItem value="pages" className="border-none">
                                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                                    <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-slate-50/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight">Top Pages</span>
                                            <Badge variant="outline" className="text-[9px] px-1.5 h-4 border-slate-200 text-slate-400 bg-transparent">{data.pages?.length || 0}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-0 border-t border-slate-50">
                                        <div className="px-0">
                                            <table className="w-full text-[11px]">
                                                <thead>
                                                    <tr className="text-slate-400 text-left border-b border-slate-50">
                                                        <th className="py-2.5 px-4 font-medium uppercase tracking-wider">Path</th>
                                                        <th 
                                                            className="py-2.5 px-4 font-medium uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors"
                                                            onClick={() => handlePgSort('clicks')}
                                                        >
                                                            <div className="flex items-center justify-end">Click <SortIcon field="clicks" currentSort={pgSort} /></div>
                                                        </th>
                                                        <th 
                                                            className="py-2.5 px-4 font-medium uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors"
                                                            onClick={() => handlePgSort('position')}
                                                        >
                                                            <div className="flex items-center justify-end">Pos. <SortIcon field="position" currentSort={pgSort} /></div>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {sortedPages.slice(0, pgLimit).map((pg, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="py-2 px-4 truncate max-w-[200px]">
                                                                <a href={pg.page} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900">
                                                                    {pg.page.replace(/https?:\/\/[^/]+/, '') || '/'}
                                                                </a>
                                                            </td>
                                                            <td className="py-2 px-4 text-right text-slate-900 font-semibold">{pg.clicks}</td>
                                                            <td className="py-2 px-4 text-right">
                                                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 rounded">
                                                                    {pg.position}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            
                                            {data.pages?.length > pgLimit && (
                                                <Button 
                                                    variant="ghost" 
                                                    className="w-full py-2 h-auto text-[10px] font-bold text-slate-400 uppercase border-t border-slate-50 hover:bg-slate-50"
                                                    onClick={() => setPgLimit(prev => prev + 25)}
                                                >
                                                    <div className="flex items-center gap-1"><ChevronDown className="w-3 h-3" /> Carica altri 25 ({pgLimit}/{data.pages.length})</div>
                                                </Button>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>
                        </Accordion>

                        {/* Indexing Trigger */}
                        <div className="bg-slate-950 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-center md:text-left">
                                <h4 className="text-white text-sm font-semibold mb-1">Index Request</h4>
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Invia la tua sitemap per accelerare l'indicizzazione.</p>
                            </div>
                            <Button 
                                onClick={submitSitemap} 
                                disabled={sitemapLoading}
                                className="bg-white hover:bg-slate-100 text-slate-950 rounded-lg text-xs font-bold h-9 px-6 transition-all"
                            >
                                {sitemapLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                                SUBMIT XML
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            ) : null}

            {/* FLOATING CHAT */}
            <div className="fixed bottom-8 right-8 z-40">
                <Button 
                    onClick={() => setIsChatOpen(true)}
                    className="h-14 w-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-400 flex items-center justify-center group transform transition-all hover:scale-105 active:scale-95"
                >
                    <div className="relative">
                        <MessageCircle className="w-6 h-6" />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    </div>
                </Button>
            </div>

            <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogHeader className="hidden">
                        <DialogTitle>Strategist AI</DialogTitle>
                        <DialogDescription>Chiedi consiglio all'esperto SEO.</DialogDescription>
                    </DialogHeader>
                    <SeoChatTab 
                        clientId={clientId} 
                        getAuthHeaders={getAuthHeaders} 
                        client={client} 
                        compact={true} 
                        addToQueue={addToQueue}
                        onRequestStrategicAnalysis={requestAiStrategy}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GscDataTab;
