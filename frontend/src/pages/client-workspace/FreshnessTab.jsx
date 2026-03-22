import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import {
    Loader2, RefreshCw, Eye, Sparkles, ExternalLink,
    ArrowRight, CheckCircle2, AlertCircle, MessageSquare,
    FileText, X
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const FreshnessTab = ({ clientId, getAuthHeaders }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(null); // ID del post in analisi
    const [applying, setApplying] = useState(null); // Indice del suggerimento in applicazione
    const [appliedIndexes, setAppliedIndexes] = useState([]); // Indici dei suggerimenti applicati nella sessione
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [manualPrompt, setManualPrompt] = useState('');
    const [isApplyingManual, setIsApplyingManual] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, [clientId]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/wordpress/posts?client_id=${clientId}`, { headers: getAuthHeaders() });
            setPosts(res.data);
        } catch (error) {
            toast.error('Errore nel recupero degli articoli da WordPress');
        } finally {
            setLoading(false);
        }
    };

    const runAnalysis = async (post) => {
        setAnalyzing(post.id);
        setAnalysisResult(null);
        setAppliedIndexes([]); // Reset delle modifiche applicate per la nuova analisi
        try {
            const res = await axios.post(`${API}/articles/freshness-analyze`, {
                client_id: clientId,
                post_id: post.id,
                title: post.title.rendered,
                content: post.content.rendered
            }, { headers: getAuthHeaders() });

            setAnalysisResult({
                post,
                ...res.data
            });
            toast.success('Analisi del contenuto completata!');
        } catch (error) {
            toast.error("Errore durante l'analisi");
        } finally {
            setAnalyzing(null);
        }
    };

    const handleApplySuggestion = async (suggestion, index) => {
        if (!analysisResult?.post?.id || !suggestion) {
            toast.error("Dati dell'articolo o del suggerimento mancanti.");
            return;
        }

        const currentContent = analysisResult.post.content?.rendered || "";
        if (!currentContent) {
            toast.error("Contenuto dell'articolo non trovato.");
            return;
        }

        setApplying(index);
        try {
            const res = await axios.post(`${API}/articles/freshness-apply`, {
                client_id: clientId,
                post_id: analysisResult.post.id,
                content: currentContent,
                suggestion: suggestion
            }, { headers: getAuthHeaders() });

            if (res.data.success) {
                toast.success('Modifica applicata e pubblicata su WordPress!');
                setAppliedIndexes(prev => [...prev, index]);
                // Aggiorniamo il contenuto locale del post per ulteriori modifiche
                setAnalysisResult(prev => ({
                    ...prev,
                    post: {
                        ...prev.post,
                        content: { ...prev.post.content, rendered: res.data.updated_content }
                    }
                }));
                // Aggiorniamo anche la data per il sidebar se vogliamo visibilità immediata?
                // Forse ricaricare solo il post specifico? 
                // Per ora aggiorniamo localmente
                setPosts(prev => prev.map(p => p.id === analysisResult.post.id ? { ...p, last_freshness: new Date().toISOString() } : p));
            }
        } catch (error) {
            toast.error("Errore nell'applicazione della modifica");
        } finally {
            setApplying(null);
        }
    };

    const handleApplyManualPrompt = async () => {
        if (!manualPrompt.trim()) {
            toast.error("Inserisci un'istruzione per l'AI.");
            return;
        }

        const currentContent = analysisResult?.post?.content?.rendered || "";
        setIsApplyingManual(true);
        try {
            const res = await axios.post(`${API}/articles/freshness-apply`, {
                client_id: clientId,
                post_id: analysisResult.post.id,
                content: currentContent,
                suggestion: {
                    type: "manual_edit",
                    description: manualPrompt
                }
            }, { headers: getAuthHeaders() });

            if (res.data.success) {
                toast.success('Modifica manuale applicata con successo!');
                setManualPrompt('');
                // Aggiorniamo il contenuto locale
                setAnalysisResult(prev => ({
                    ...prev,
                    post: {
                        ...prev.post,
                        content: { ...prev.post.content, rendered: res.data.updated_content }
                    }
                }));
                setPosts(prev => prev.map(p => p.id === analysisResult.post.id ? { ...p, last_freshness: new Date().toISOString() } : p));
            }
        } catch (error) {
            toast.error("Errore nell'applicazione della modifica manuale");
        } finally {
            setIsApplyingManual(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Articoli su WordPress</h3>
                    <Button variant="ghost" size="sm" onClick={fetchPosts} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {posts.map(post => {
                            const lastF = post.last_freshness;
                            return (
                                <Card
                                    key={post.id}
                                    className={`cursor-pointer transition-all hover:border-blue-300 ${analysisResult?.post?.id === post.id ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'}`}
                                    onClick={() => runAnalysis(post)}
                                >
                                    <CardContent className="p-3">
                                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">{post.title.rendered}</h4>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] text-slate-500">{new Date(post.date).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1">
                                                {lastF && (
                                                    <Badge variant="secondary" className="text-[8px] bg-green-50 text-green-700 border-green-200">
                                                        <Sparkles className="w-2 h-2 mr-1" /> FRESH: {new Date(lastF).toLocaleDateString()}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[9px] uppercase">{post.status}</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="lg:col-span-2 space-y-4">
                {analyzing ? (
                    <Card className="h-full flex flex-col items-center justify-center py-20 border-dashed border-2">
                        <Sparkles className="w-10 h-10 text-blue-500 animate-pulse mb-4" />
                        <h3 className="text-xl font-bold text-slate-900">Analisi in corso...</h3>
                        <p className="text-sm text-slate-500 mt-2">Sto analizzando il testo, la SERP attuale e i dati GSC.</p>
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mt-6" />
                    </Card>
                ) : analysisResult ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card className="border-blue-200">
                            <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge className="bg-blue-600 mb-2">Keyword Inferita: {analysisResult.inferred_keyword}</Badge>
                                        <CardTitle className="text-xl text-slate-900">{analysisResult.post.title.rendered}</CardTitle>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => window.open(analysisResult.post.link, '_blank')}>
                                        <ExternalLink className="w-4 h-4 mr-2" /> Vedi su Sito
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Stato Attuale & GSC
                                    </h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                        "{analysisResult.status_analysis}"
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        Gap rispetto alla SERP
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                        {analysisResult.serp_gaps}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900">Azioni Consigliate per il Refresh</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {analysisResult.suggestions?.map((s, i) => {
                                            const isApplied = appliedIndexes.includes(i);
                                            return (
                                                <div key={i} className={`p-4 rounded-xl border transition-all ${isApplied ? 'bg-emerald-50/30 border-emerald-200' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={`text-[10px] uppercase ${isApplied ? 'text-emerald-700 border-emerald-300' : ''}`}>
                                                                {s.type.replace('_', ' ')}
                                                            </Badge>
                                                            {isApplied && (
                                                                <Badge className="bg-emerald-600 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" /> MODIFICA APPLICATA</Badge>
                                                            )}
                                                        </div>
                                                        {s.title && <span className="text-xs font-bold text-indigo-600">{s.title}</span>}
                                                    </div>
                                                    <p className={`text-sm leading-relaxed ${isApplied ? 'text-slate-500 italic' : 'text-slate-700'}`}>
                                                        {s.description || s.content_brief}
                                                    </p>
                                                    <div className="mt-3 flex justify-end">
                                                        <Button
                                                            size="xs"
                                                            variant={isApplied ? "outline" : "ghost"}
                                                            className={isApplied ? "text-emerald-700 border-emerald-200" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
                                                            onClick={() => !isApplied && handleApplySuggestion(s, i)}
                                                            disabled={applying !== null || isApplied}
                                                        >
                                                            {applying === i ? (
                                                                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Applicazione...</>
                                                            ) : isApplied ? (
                                                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Completato</>
                                                            ) : (
                                                                <>Applica Modifica <ArrowRight className="w-3 h-3 ml-1" /></>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                                            Modifica Manuale (Prompt)
                                        </h4>
                                        <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="text-slate-500 hover:text-indigo-600">
                                            {showPreview ? <><X className="w-4 h-4 mr-2" /> Chiudi Anteprima</> : <><Eye className="w-4 h-4 mr-2" /> Vedi Anteprima</>}
                                        </Button>
                                    </div>

                                    {showPreview && (
                                        <Card className="bg-slate-50/50 border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <CardHeader className="bg-slate-100/50 py-3 px-4 border-b">
                                                <CardTitle className="text-xs uppercase text-slate-500 flex items-center gap-2">
                                                    <FileText className="w-3 h-3" />
                                                    Anteprima Contenuto Attuale
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 max-h-[400px] overflow-y-auto">
                                                <div
                                                    className="prose prose-sm max-w-none text-slate-700 text-xs"
                                                    dangerouslySetInnerHTML={{ __html: analysisResult.post.content.rendered }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className="space-y-3">
                                        <Textarea
                                            placeholder="Esempio: Togli la seconda riga, aggiorna i dati del 2024 con quelli del 2025, aggiungi un paragrafo sui vantaggi ecologici..."
                                            value={manualPrompt}
                                            onChange={(e) => setManualPrompt(e.target.value)}
                                            className="min-h-[100px] border-slate-200 focus:ring-indigo-500 bg-white"
                                        />
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleApplyManualPrompt}
                                                disabled={isApplyingManual || !manualPrompt.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                {isApplyingManual ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Elaborazione...</>
                                                ) : (
                                                    <><Sparkles className="w-4 h-4 mr-2" /> Applica Modifica Manuale</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Impatto Stimato:</span>
                                        <Badge className={`${analysisResult.estimated_impact === 'Alto' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                            {analysisResult.estimated_impact}
                                        </Badge>
                                    </div>
                                    <Button
                                        className="bg-slate-900 hover:bg-slate-800"
                                        disabled={applying !== null || isApplyingManual}
                                    >
                                        Aggiorna Tutto (WP)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <Card className="h-full flex flex-col items-center justify-center py-20 border-dashed border-2 text-slate-400">
                        <RefreshCw className="w-12 h-12 mb-4 opacity-20" />
                        <p>Seleziona un articolo dalla lista a sinistra per iniziare l'analisi di Freshness.</p>
                    </Card>
                )}
            </div>
        </div>
    );
};
