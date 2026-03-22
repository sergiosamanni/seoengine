import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Zap, Loader2, Sparkles, AlertCircle, Clock, Link2, Search, ExternalLink, CalendarClock, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const FreshnessTab = ({ clientId, getAuthHeaders, client, addToQueue }) => {
    const [loading, setLoading] = useState(true);
    const [platformArticles, setPlatformArticles] = useState([]);
    const [sitemapLinks, setSitemapLinks] = useState([]);
    const [activeTab, setActiveTab] = useState('platform'); // platform or sitemap
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditData, setAuditData] = useState([]);
    
    // Status during refresh action
    const [refreshing, setRefreshing] = useState({});
    
    useEffect(() => {
        if(clientId) fetchFreshnessData();
    }, [clientId]);
    
    const fetchFreshnessData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/freshness/${clientId}`, {
                headers: getAuthHeaders()
            });
            setPlatformArticles(res.data.platform_articles || []);
            setSitemapLinks(res.data.sitemap_links || []);
        } catch (error) {
            toast.error("Errore nel recupero dati Freshness.");
        } finally {
            setLoading(false);
        }
    };
    
    const handleRefresh = async (item, type) => {
        if(addToQueue) {
            addToQueue(`[FRESHNESS] Revamp: ${item.titolo || item.url}`);
        }
    };


    const handleAudit = async () => {
        if(platformArticles.length === 0) return toast.info("Nessun articolo per l'audit.");
        setAuditLoading(true);
        try {
            const res = await axios.post(`${API}/freshness-audit/${clientId}`, {
                articles: platformArticles.slice(0, 10).map(a => ({ url: a.url, titolo: a.titolo }))
            }, { headers: getAuthHeaders() });
            setAuditData(res.data.audit || []);
            toast.success("Indicazioni di Revamp elaborate!");
        } catch(error) {
            toast.error("Errore generazione audit.");
        } finally {
            setAuditLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-emerald-500" />
                        Analisi Freshness & Content Decay
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                        Il sistema analizza l'obsolescenza dei contenuti e ottiene indicazioni IA (semantica, ottimizzazione, internal link gaps).<br/> Clicca "Inserisci nel Piano" per posizionare l'azione direttamente nella Coda del <b>Piano Editoriale</b> ("Genera Contenuti").
                    </p>
                </div>
                {activeTab === 'platform' && (
                    <Button onClick={handleAudit} disabled={auditLoading || platformArticles.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg h-9 rounded-xl font-bold uppercase tracking-wider text-xs">
                        {auditLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                        Analizza con AI
                    </Button>
                )}
            </div>

            <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('platform')}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'platform' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Search className="w-4 h-4" /> Articoli Generati (Piattaforma)
                </button>
                <button
                    onClick={() => setActiveTab('sitemap')}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'sitemap' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Link2 className="w-4 h-4" /> Scoperti da Sitemap
                </button>
            </div>

            <Card className="border-slate-200">
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {activeTab === 'platform' && platformArticles.length === 0 && (
                            <div className="p-10 text-center text-slate-400">Nessun articolo pubblicato tramite la piattaforma.</div>
                        )}
                        {activeTab === 'platform' && platformArticles.map((art) => {
                            const thisAudit = auditData.find(a => (a.url === art.url || a.url.includes(art.titolo)));
                            return (
                                <div key={art.id} className="p-5 flex flex-col gap-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-900 text-base">{art.titolo}</h4>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <CalendarClock className="w-3.5 h-3.5" />
                                                    Pubblicato: {art.published_at ? new Date(art.published_at).toLocaleDateString() : 'Sconosciuta'}
                                                </div>
                                                {art.focus_keyword && (
                                                    <Badge variant="outline" className="text-[10px] font-mono tracking-wider text-emerald-600 bg-emerald-50 border-emerald-100">
                                                        {art.focus_keyword}
                                                    </Badge>
                                                )}
                                                {art.url && (
                                                    <a href={art.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                        <ExternalLink className="w-3 h-3" /> Live
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                                            <Button size="sm" onClick={() => handleRefresh(art, 'platform')} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold border-emerald-200 shadow-sm w-full lg:w-auto">
                                                <Sparkles className="w-4 h-4 mr-2" /> Inserisci nel Piano (Coda)
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Indicazioni Audit se presenti */}
                                    {thisAudit && (
                                        <div className="mt-2 bg-slate-100/60 rounded-xl p-4 text-sm text-slate-700 border border-slate-200">
                                            <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900">
                                                <Search className="w-4 h-4 text-emerald-500" /> Analisi AI per il Revamping:
                                            </div>
                                            {thisAudit.advice}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {activeTab === 'sitemap' && sitemapLinks.length === 0 && (
                            <div className="p-10 text-center text-slate-400">
                                La sitemap URL non è stata configurata o non contiene articoli non gestiti dalla piattaforma. Inserisci una sitemap in Impostazioni.
                            </div>
                        )}
                        {activeTab === 'sitemap' && sitemapLinks.map((sl, i) => (
                            <div key={i} className="p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 text-sm truncate max-w-lg">{sl.url}</h4>
                                </div>
                                <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                                    <Button size="sm" onClick={() => handleRefresh(sl, 'sitemap')} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold border-emerald-200 w-full lg:w-auto">
                                        <Sparkles className="w-4 h-4 mr-2" /> Riorganizza Link Interni & SEO
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default FreshnessTab;
