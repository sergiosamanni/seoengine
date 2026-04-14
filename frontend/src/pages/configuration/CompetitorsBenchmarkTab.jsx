import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
    Link2, ExternalLink, Trash2, Loader2, Sparkles, 
    Target, LayoutList, CheckCircle2, AlertCircle, Info, BrainCircuit,
    UploadCloud, FileText, BarChart3, TrendingUp, MousePointerClick, Search, HelpCircle
} from 'lucide-react';
import { 
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from '../../components/ui/table';
import { toast } from 'sonner';

export function CompetitorsBenchmarkTab({ client, config, setConfig, getAuthHeaders, API }) {
    const [newUrl, setNewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [keywords, setKeywords] = useState([]);
    const [uploadingKeywords, setUploadingKeywords] = useState(false);
    const benchmarks = config.competitor_benchmarks || [];

    useEffect(() => {
        const fetchKeywords = async () => {
            try {
                const res = await axios.get(`${API}/clients/${client.id}/keyword-research`, { headers: getAuthHeaders() });
                if (res.data && res.data.data) {
                    setKeywords(res.data.data);
                }
            } catch (e) {
                console.error("[KEYWORD DEBUG] Error fetching keywords", e);
            }
        };
        if (client?.id) fetchKeywords();
    }, [client?.id]);

    const handleAddBenchmark = async () => {
        if (!newUrl) return;
        if (!newUrl.startsWith('http')) {
            toast.error("Inserisci un URL valido (es. https://...)");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API}/analyze-competitor-url`, { 
                url: newUrl,
                client_id: client.id 
            }, { headers: getAuthHeaders() });

            if (res.data) {
                const newBenchmark = res.data;
                const updated = [...benchmarks, newBenchmark];
                const updatedConfig = { ...config, competitor_benchmarks: updated };
                await axios.put(`${API}/clients/${client.id}/configuration`, updatedConfig, { headers: getAuthHeaders() });
                setConfig(updatedConfig);
                setNewUrl('');
                toast.success("Benchmark aggiunto con successo (AI Analizzata)");
            }
        } catch (error) {
            toast.error("Errore durante l'analisi dell'URL.");
        } finally {
            setLoading(false);
        }
    };

    const removeBenchmark = async (url) => {
        const updated = benchmarks.filter(b => b.url !== url);
        const updatedConfig = { ...config, competitor_benchmarks: updated };
        try {
            await axios.put(`${API}/clients/${client.id}/configuration`, updatedConfig, { headers: getAuthHeaders() });
            setConfig(updatedConfig);
            toast.success("Benchmark rimosso");
        } catch (e) {
            toast.error("Errore nel salvataggio");
        }
    };

    const handleKeywordUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploadingKeywords(true);
        try {
            const res = await axios.post(`${API}/clients/${client.id}/upload-keyword-research`, formData, {
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success(`Hub aggiornato: ${res.data.rows_added} nuove keyword caricate.`);
            const refresh = await axios.get(`${API}/clients/${client.id}/keyword-research`, { headers: getAuthHeaders() });
            setKeywords(refresh.data.data || []);
        } catch (error) {
            toast.error("Errore durante il caricamento del file Excel/CSV");
        } finally {
            setUploadingKeywords(false);
        }
    };

    const handleDeleteKeywords = async () => {
        if (!confirm("Sei sicuro di voler eliminare tutti i dati della ricerca keyword per questo cliente?")) return;
        
        try {
            await axios.delete(`${API}/clients/${client.id}/keyword-research`, { headers: getAuthHeaders() });
            setKeywords([]);
            toast.success("Dati eliminati con successo.");
        } catch (error) {
            toast.error("Errore durante l'eliminazione dei dati.");
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            {/* --- SECTION 1: COMPETITOR BENCHMARK --- */}
            <div className="space-y-8">
                <header className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Target className="w-6 h-6 text-indigo-500" />
                        Competitor Benchmark
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Studia i contenuti forti dei competitor per guidare la nostra strategia.</p>
                </header>

                <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden border-dashed">
                    <CardContent className="p-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Incolla URL Pagina Competitor (Articoli, Pillar, Guide)</Label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        className="h-12 pl-12 bg-slate-50 border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all text-sm font-medium" 
                                        placeholder="https://competitor.com/guida-seo-perfetta" 
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddBenchmark()}
                                    />
                                </div>
                                <Button 
                                    onClick={handleAddBenchmark} 
                                    disabled={loading || !newUrl}
                                    className="h-12 px-8 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Analizza & Aggiungi
                                </Button>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">Il sistema scaricherà la pagina e ne estrarrà la struttura semantica per guidare l'AI.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1 flex items-center gap-2">
                        <LayoutList className="w-3.5 h-3.5" />
                        Benchmark Salvati ({benchmarks.length})
                    </h4>

                    {benchmarks.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                            <Info className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nessun benchmark ancora inserito.</p>
                            <p className="text-[10px] text-slate-300 mt-2">Gli URL dei tuoi competitor appariranno qui sotto.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {benchmarks.map((b, idx) => (
                                <Card key={idx} className="group border-slate-100 shadow-sm rounded-3xl bg-white hover:border-slate-300 transition-all overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-12">
                                        <div className="md:col-span-8 p-8 space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 uppercase text-[8px] font-black py-0.5 px-2">Competitor Analysis</Badge>
                                                    <span className="text-[9px] text-slate-300 font-bold">{new Date(b.created_at || Date.now()).toLocaleDateString('it-IT')}</span>
                                                </div>
                                                <h5 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{b.title || 'Competitor Page'}</h5>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold truncate">
                                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{b.url}</a>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50 relative">
                                                <div className="absolute top-4 right-4 opacity-5"><BrainCircuit className="w-8 h-8" /></div>
                                                <h6 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                                    AI Synthesis (Semantic Gap)
                                                </h6>
                                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">{b.summary || 'Analisi in corso...'}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {b.headings?.slice(0, 5).map((h, i) => (
                                                    <Badge key={i} variant="outline" className="text-[8px] font-black uppercase border-slate-200 text-slate-400 truncate max-w-[150px]">
                                                        {h.text}
                                                    </Badge>
                                                ))}
                                                {b.headings?.length > 5 && <span className="text-[9px] text-slate-300 font-bold">+{b.headings.length - 5} others</span>}
                                            </div>
                                        </div>
                                        <div className="md:col-span-4 bg-slate-50 p-8 border-l border-slate-100 flex flex-col justify-between">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Word Count Benchmark</p>
                                                    <p className="text-2xl font-black text-slate-900">{b.word_count || '~0'} <span className="text-[10px] text-slate-300 leading-none">parole</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">SEO Health</p>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        <p className="text-[10px] font-black uppercase text-slate-600">Struttura Ottimizzata</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => removeBenchmark(b.url)}
                                                className="w-full mt-8 bg-white hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                Rimuovi Benchmark
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: KEYWORD RESEARCH HUB --- */}
            <div className="space-y-8 pt-8 border-t border-slate-100">
                <header className="space-y-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <BarChart3 className="w-6 h-6 text-emerald-500" />
                            Keyword Research Hub
                        </h3>
                        <div className="flex items-center gap-3">
                            <input 
                                type="file" 
                                id="kw-upload" 
                                className="hidden" 
                                accept=".xlsx, .xls, .csv" 
                                onChange={handleKeywordUpload}
                            />
                            {keywords.length > 0 && (
                                <Button 
                                    variant="outline"
                                    onClick={handleDeleteKeywords}
                                    className="h-10 px-4 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Svuota Dati
                                </Button>
                            )}
                            <Button 
                                asChild
                                disabled={uploadingKeywords}
                                className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                            >
                                <label htmlFor="kw-upload">
                                    {uploadingKeywords ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                                    Carica Ricerca (Excel/CSV)
                                </label>
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Alimenta l'AI con dati reali di volumi, difficoltà e intenti per ottimizzazioni mirate.</p>
                </header>

                {keywords.length > 0 ? (
                    <Card className="border-slate-200 shadow-xl rounded-2xl bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest py-4 pl-8">Keyword</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest py-4">Volumi</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest py-4">Difficoltà</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest py-4">CPC</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest py-4">Intenti</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 tracking-widest py-4 pr-8 text-right">Reference</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {keywords.slice(0, 50).map((kw, i) => (
                                        <TableRow key={i} className="border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                            <TableCell className="py-4 pl-8">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{kw.keyword}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-1.5 font-black text-slate-700 text-xs">
                                                    <TrendingUp className="w-3 h-3 text-slate-300" />
                                                    {kw.search_volume?.toLocaleString() || '0'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${kw.difficulty > 60 ? 'bg-red-400' : kw.difficulty > 30 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                                                            style={{ width: `${kw.difficulty}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500">{kw.difficulty}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-[10px] font-black text-slate-400 font-mono tracking-tighter">€{kw.cpc?.toFixed(2) || '0.00'}</span>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {kw.intents?.map((intent, idx) => (
                                                        <Badge key={idx} variant="ghost" className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase py-0 px-2 h-4">
                                                            {intent}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 pr-8 text-right">
                                                {kw.url ? (
                                                    <a href={kw.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                ) : <span className="text-slate-200">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {keywords.length > 50 && (
                            <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Mostrando le prime 50 keyword di {keywords.length} totali</p>
                            </div>
                        )}
                    </Card>
                ) : (
                    <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-white shadow-inner">
                        <BarChart3 className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                        <h5 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Keyword Research Vuota</h5>
                        <p className="text-[11px] text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">Carica un file Ahrefs, SEMRush o Google Search Console per sbloccare l'intelligenza semantica avanzata del tuo assistente.</p>
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                                <FileText className="w-3 h-3" /> Detect Excel/CSV
                            </div>
                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                                <MousePointerClick className="w-3 h-3" /> Auto Column Mapping
                            </div>
                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                                <Sparkles className="w-3 h-3" /> AI Integration
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
