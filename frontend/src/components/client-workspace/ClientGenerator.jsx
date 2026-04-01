import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
    Zap, AlertCircle, Loader2, ExternalLink, PenTool,
    ArrowLeft, CheckCircle2, X, Camera, ImagePlus, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ClientGenerator = ({ client, effectiveClientId, getAuthHeaders, navigate }) => {
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'text';

    const [keyword, setKeyword] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [ready, setReady] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [serpData, setSerpData] = useState(null);
    const [gscData, setGscData] = useState(null);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [clientNotes, setClientNotes] = useState('');
    const [result, setResult] = useState(null);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    const config = client?.configuration || {};
    const hasApiKey = config.llm?.api_key || config.openai?.api_key;
    const gscConnected = config.gsc?.connected;

    useEffect(() => {
        setKeyword('');
        setReady(false);
        setResult(null);
        setUploadedImages([]);
        setClientNotes('');
    }, [mode]);

    const runAutoAnalysis = async () => {
        if (!keyword.trim()) { toast.error('Inserisci un argomento'); return; }
        setAnalyzing(true);
        setReady(false);
        try {
            const serpRes = await axios.post(`${API}/serp/analyze-full`, {
                keyword: keyword, num_results: 4, country: 'it'
            }, { headers: getAuthHeaders() });
            setSerpData(serpRes.data);

            let gsc = null;
            if (gscConnected) {
                try {
                    const gscRes = await axios.get(`${API}/clients/${effectiveClientId}/gsc-data?days=28`, { headers: getAuthHeaders() });
                    gsc = gscRes.data;
                    setGscData(gsc);
                } catch (e) { }
            }

            const lines = ['Analizza questi competitor e crea un articolo migliore:'];
            serpRes.data.extracted?.titles?.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
            if (serpRes.data.extracted?.headings?.length > 0) {
                lines.push('\nStruttura competitor:');
                serpRes.data.extracted.headings.slice(0, 10).forEach(h => lines.push(`- ${h}`));
            }
            if (gsc?.keywords?.length > 0) {
                lines.push('\nKeyword GSC da integrare:');
                gsc.keywords.slice(0, 5).forEach(k => lines.push(`- "${k.keyword}" (pos. ${k.position})`));
            }
            setGeneratedPrompt(lines.join('\n'));
            setReady(true);
        } catch (error) {
            toast.error('Errore durante l\'analisi iniziale. Riprova.');
        } finally { setAnalyzing(false); }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const token = localStorage.getItem('seo_token');
        setUploading(true);
        const newImages = [];
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: max 5MB`); continue; }
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await axios.post(`${API}/uploads?token=${token}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                newImages.push({ id: res.data.id, name: file.name, preview: URL.createObjectURL(file) });
            } catch (err) { toast.error(`Errore caricamento`); }
        }
        setUploadedImages(prev => [...prev, ...newImages]);
        setUploading(false);
    };

    const removeImage = (idx) => {
        setUploadedImages(prev => { const copy = [...prev]; URL.revokeObjectURL(copy[idx].preview); copy.splice(idx, 1); return copy; });
    };

    const handleGenerate = async () => {
        if (generating) return;
        setGenerating(true);
        setResult(null);
        try {
            const res = await axios.post(`${API}/articles/simple-generate`, {
                client_id: effectiveClientId,
                keyword: keyword,
                topic: clientNotes ? `${generatedPrompt}\n\n## Note:\n${clientNotes}` : generatedPrompt,
                publish_to_wordpress: true,
                image_ids: uploadedImages.length > 0 ? uploadedImages.map(img => img.id) : undefined,
                serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
                gsc_context: gscData ? { top_keywords: gscData.keywords, totals: gscData.totals } : undefined
            }, { headers: getAuthHeaders() });
            setResult({ ...res.data, status: 'running' });
            const jobId = res.data.job_id;
            const poll = async () => {
                try {
                    const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
                    if (jr.data.status === 'completed' || jr.data.status === 'failed') {
                        const r = jr.data.results?.[0] || {};
                        setResult({ ...res.data, ...r, status: jr.data.status });
                        setGenerating(false);
                        if (jr.data.status === 'completed' && r.generation_status === 'success') {
                            toast.success('Articolo completato!');
                        } else {
                            toast.error('Errore generazione');
                        }
                        return;
                    }
                    setTimeout(poll, 4000);
                } catch (e) { setTimeout(poll, 5000); }
            };
            setTimeout(poll, 4000);
        } catch (error) {
            toast.error('Errore nella generazione');
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6 pb-20">
            <div className="text-center px-4 pt-4">
                <div className="inline-flex p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 transform -rotate-3">
                    {mode === 'photo' ? <Camera className="w-8 h-8 text-blue-600" /> : <PenTool className="w-8 h-8 text-orange-500" />}
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Manrope']">
                    {mode === 'photo' ? 'Genera da Foto' : 'Genera da Testo'}
                </h1>
                <p className="text-slate-500 mt-2 text-lg px-4 leading-snug">
                    {mode === 'photo'
                        ? 'Scatta una foto del tuo locale o prodotto e noi scriveremo l\'articolo per te.'
                        : 'Parlaci di una tua idea o servizio e noi creeremo un post SEO perfetto.'}
                </p>
            </div>

            {!hasApiKey && (
                <Alert className="mx-4 bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 font-medium italic">Configurazione AI incompleta.</AlertDescription>
                </Alert>
            )}

            <div className="px-4 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                {/* PHOTO MODE START: Image selection */}
                {mode === 'photo' && uploadedImages.length === 0 && (
                    <div className="grid grid-cols-1 gap-4">
                        <label className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all active:scale-95 shadow-sm">
                            <div className="p-5 bg-blue-100 rounded-full mb-4">
                                <Camera className="w-10 h-10 text-blue-600" />
                            </div>
                            <span className="text-lg font-bold text-slate-700">Scatta Foto</span>
                            <span className="text-sm text-slate-400 mt-1">Usa la fotocamera del telefono</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                        </label>

                        <label className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-[1.5rem] cursor-pointer hover:bg-slate-100 transition-all active:scale-95">
                            <ImagePlus className="w-6 h-6 text-slate-400 mb-2" />
                            <span className="text-sm font-semibold text-slate-600">Scegli dalla galleria</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                        </label>
                        {uploading && <div className="flex items-center justify-center gap-2 text-blue-600 py-2 font-medium animate-pulse"><Loader2 className="w-5 h-5 animate-spin" /> Caricamento in corso...</div>}
                    </div>
                )}

                {/* STEP 2 (PHOTO) or STEP 1 (TEXT): Keyword input */}
                {((mode === 'photo' && uploadedImages.length > 0) || mode === 'text') && !ready && (
                    <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            {mode === 'photo' && (
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="relative">
                                        <img src={uploadedImages[0].preview} className="w-20 h-20 object-cover rounded-xl border border-white shadow-sm" alt="Preview" />
                                        <button onClick={() => removeImage(0)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"><X className="w-3 h-3" /></button>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900 leading-tight">Ottima foto!</p>
                                        <p className="text-xs text-slate-500 mt-1">Ora dimmi di cosa vuoi parlare in riferimento a questa immagine.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <Label className="text-lg font-bold text-slate-800 ml-1">Cosa vuoi pubblicizzare?</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-400">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <Input
                                        value={keyword} onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="Es: Noleggio auto di lusso..."
                                        className="pl-12 h-14 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-2xl text-lg font-medium transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && !analyzing && runAutoAnalysis()}
                                    />
                                    {analyzing && <Loader2 className="absolute right-4 top-4 w-6 h-6 animate-spin text-blue-500" />}
                                </div>
                                <p className="text-[13px] text-slate-400 px-2 font-medium">Basta una frase di poche parole.</p>
                            </div>

                            <Button
                                onClick={runAutoAnalysis} disabled={analyzing || !keyword.trim()}
                                className="w-full bg-slate-900 hover:bg-slate-800 h-16 text-xl font-bold rounded-2xl shadow-lg transition-all active:scale-95"
                            >
                                {analyzing ? 'Sto analizzando...' : 'Pensa per me'}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* STEP 3: Generation Confirmation */}
                {ready && (
                    <Card className="border-slate-100 shadow-2xl shadow-slate-200/60 rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-300">
                        <CardContent className="p-8 space-y-8">
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center justify-center p-4 bg-emerald-100 rounded-full mb-2">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">Tutto Pronto!</h3>
                                <p className="text-slate-500 font-medium">Ho analizzato la tua idea e i competitor. L'articolo sarà perfetto.</p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <PenTool className="w-4 h-4" /> Note Personali <span className="text-slate-400 font-normal">(facoltativo)</span>
                                </Label>
                                <Textarea
                                    value={clientNotes} onChange={(e) => setClientNotes(e.target.value)}
                                    placeholder="Vuoi aggiungere un dettaglio particolare o un'offerta speciale?"
                                    rows={4}
                                    className="bg-slate-50 border-slate-200 rounded-2xl p-4 focus:bg-white text-base font-medium resize-none transition-all"
                                />
                            </div>

                            {/* Progress feedback */}
                            {(generating || result) && (
                                <div className="p-6 bg-slate-900 rounded-3xl space-y-5 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-bold text-sm flex items-center gap-2">
                                            {result?.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                                            {result?.status === 'completed' ? 'Articolo Pronto!' : 'Scrittura in corso...'}
                                        </span>
                                        {result?.status === 'completed' && <Badge className="bg-emerald-500 text-white border-0">Pubblicato</Badge>}
                                    </div>

                                    {!result?.status && (
                                        <div className="space-y-3">
                                            <Progress value={45} className="h-2 bg-slate-800 animate-pulse" indicatorClassName="bg-gradient-to-r from-blue-500 to-indigo-500" />
                                            <p className="text-[10px] text-slate-500 text-center italic">L'IA sta scrivendo un contenuto di alta qualità, potrebbe richiedere fino a 2 minuti. Non chiudere questa pagina.</p>
                                        </div>
                                    )}

                                    {result?.wordpress_link && (
                                        <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl" asChild>
                                            <a href={result.wordpress_link} target="_blank" rel="noreferrer">
                                                Vedi l'articolo <ExternalLink className="w-4 h-4 ml-2" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}

                            {!result && (
                                <div className="space-y-4">
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full bg-orange-500 hover:bg-orange-600 h-20 text-2xl font-black rounded-3xl shadow-xl shadow-orange-200 transition-all active:scale-95 group"
                                    >
                                        <Sparkles className="w-6 h-6 mr-3 group-hover:animate-spin" />
                                        Scrivi Articolo
                                    </Button>
                                    <Button variant="ghost" onClick={() => setReady(false)} className="w-full text-slate-400 font-bold h-12">
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Cambia argomento
                                    </Button>
                                </div>
                            )}

                            {result?.status === 'completed' && (
                                <Button onClick={() => navigate(0)} className="w-full bg-emerald-600 hover:bg-emerald-700 h-16 text-lg font-bold rounded-2xl">
                                    Crea un altro contenuto
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ClientGenerator;
