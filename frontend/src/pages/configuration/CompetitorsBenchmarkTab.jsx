import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
    Link2, ExternalLink, Trash2, Loader2, Sparkles, 
    Target, LayoutList, CheckCircle2, AlertCircle, Info, BrainCircuit
} from 'lucide-react';
import { toast } from 'sonner';

export function CompetitorsBenchmarkTab({ client, config, setConfig, getAuthHeaders, API }) {
    const [newUrl, setNewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const benchmarks = config.competitor_benchmarks || [];

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
                
                // Save immediately
                await axios.post(`${API}/save-config/${client.id}`, { configuration: updatedConfig }, { headers: getAuthHeaders() });
                
                setConfig(updatedConfig);
                setNewUrl('');
                toast.success("Benchmark aggiunto con successo (AI Analizzata)");
            }
        } catch (error) {
            console.error("Error analyzing benchmark:", error);
            toast.error("Errore durante l'analisi dell'URL. Verifica che sia accessibile.");
        } finally {
            setLoading(false);
        }
    };

    const removeBenchmark = async (url) => {
        const updated = benchmarks.filter(b => b.url !== url);
        const updatedConfig = { ...config, competitor_benchmarks: updated };
        
        try {
            await axios.post(`${API}/save-config/${client.id}`, { configuration: updatedConfig }, { headers: getAuthHeaders() });
            setConfig(updatedConfig);
            toast.success("Benchmark rimosso");
        } catch (e) {
            toast.error("Errore nel salvataggio");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
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
    );
}
