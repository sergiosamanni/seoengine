import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Zap, AlertCircle, Loader2, Search, CheckCircle2,
  XCircle, Send, ExternalLink, Eye, ImagePlus, X
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ClientGenerator = ({ client, effectiveClientId, getAuthHeaders, navigate }) => {
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

  const runAutoAnalysis = async () => {
    if (!keyword.trim()) { toast.error('Inserisci una keyword'); return; }
    setAnalyzing(true);
    setReady(false);
    setSerpData(null);
    setGscData(null);
    setResult(null);

    try {
      // 1. SERP Analysis
      toast.info('Analisi SERP in corso...');
      const serpRes = await axios.post(`${API}/serp/analyze-full`, {
        keyword: keyword, num_results: 4, country: 'it'
      }, { headers: getAuthHeaders() });
      setSerpData(serpRes.data);

      // 2. GSC Data (if connected)
      let gsc = null;
      if (gscConnected) {
        toast.info('Caricamento dati GSC...');
        try {
          const gscRes = await axios.get(`${API}/clients/${effectiveClientId}/gsc-data?days=28`, { headers: getAuthHeaders() });
          gsc = gscRes.data;
          setGscData(gsc);
        } catch (e) { /* GSC optional */ }
      }

      // 3. Auto-build prompt
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
      toast.success('Analisi completata! Pronto per la generazione.');
    } catch (error) {
      toast.error('Errore durante l\'analisi. Riprova.');
    } finally { setAnalyzing(false); }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const token = localStorage.getItem('seo_token');
    setUploading(true);
    const newImages = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: troppo grande (max 5MB)`); continue; }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error(`${file.name}: formato non supportato`); continue; }
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API}/uploads?token=${token}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        newImages.push({ id: res.data.id, name: file.name, preview: URL.createObjectURL(file) });
      } catch (err) { toast.error(`Errore upload ${file.name}`); }
    }
    setUploadedImages(prev => [...prev, ...newImages]);
    setUploading(false);
    if (newImages.length > 0) toast.success(`${newImages.length} immagine/i caricata/e`);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setUploadedImages(prev => { const copy = [...prev]; URL.revokeObjectURL(copy[idx].preview); copy.splice(idx, 1); return copy; });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/articles/simple-generate`, {
        client_id: effectiveClientId,
        keyword: keyword,
        topic: clientNotes ? `${generatedPrompt}\n\n## Note del cliente:\n${clientNotes}` : generatedPrompt,
        gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
        serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
        publish_to_wordpress: true,
        image_ids: uploadedImages.length > 0 ? uploadedImages.map(img => img.id) : undefined
      }, { headers: getAuthHeaders() });
      setResult({ ...res.data, status: 'running' });
      toast.success('Generazione avviata!');
      const jobId = res.data.job_id;
      const poll = async () => {
        try {
          const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
          if (jr.data.status === 'completed' || jr.data.status === 'failed') {
            const r = jr.data.results?.[0] || {};
            setResult({ ...res.data, ...r, status: jr.data.status });
            setGenerating(false);
            if (jr.data.status === 'completed' && r.generation_status === 'success') {
              toast.success(r.publish_status === 'success' ? 'Articolo pubblicato su WordPress!' : 'Articolo generato!');
            } else {
              toast.error('Errore nella generazione');
            }
            return;
          }
          setTimeout(poll, 5000);
        } catch (e) { setTimeout(poll, 6000); }
      };
      setTimeout(poll, 5000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella generazione');
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-slate-200 mb-6">
            <Zap className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">Generatore Contenuti</h1>
        <p className="text-[10px] uppercase tracking-[0.25em] font-black text-slate-300">Workspace Intelligente - AI Powered</p>
      </div>

      {!hasApiKey && (
        <Alert className="bg-amber-50 border-amber-100 rounded-3xl p-6">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="text-amber-700 text-[11px] font-bold uppercase tracking-widest pl-2">
            AI non configurata. Contatta l'amministratore per attivare i servizi.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-[#f1f3f6] shadow-2xl shadow-slate-100/50 rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-12 space-y-10">
          <div className="space-y-4">
            <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 ml-1">Argomento o Keyword Target</Label>
            <div className="flex gap-3">
              <Input 
                value={keyword} 
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Es: come scegliere un'auto elettrica" 
                className="h-14 border-[#f1f3f6] bg-slate-50/50 focus:bg-white focus:ring-slate-900 text-sm rounded-[1.2rem] px-6 transition-all duration-300"
                onKeyDown={(e) => e.key === 'Enter' && !analyzing && runAutoAnalysis()} 
              />
              <Button 
                onClick={runAutoAnalysis} 
                disabled={analyzing || !keyword.trim()}
                className="bg-slate-900 hover:bg-slate-800 h-14 w-14 flex-shrink-0 rounded-[1.2rem] shadow-xl shadow-slate-200 active:scale-95 transition-all"
              >
                {analyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
              </Button>
            </div>
          </div>

          {analyzing && (
            <div className="space-y-4 py-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Analisi semantica in corso...</span>
                </div>
                <span className="text-[10px] font-black text-slate-300 tracking-tighter uppercase px-2 py-0.5 bg-slate-50 rounded-md">Deep Scan</span>
              </div>
              <Progress value={33} className="h-1 bg-slate-50 overflow-hidden rounded-full" />
            </div>
          )}

          {ready && serpData && (
            <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-2 py-1.5 px-4 bg-emerald-50 border border-emerald-100/50 rounded-full w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] uppercase font-bold tracking-[0.1em] text-emerald-600">Strategia Pronta</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 border border-[#f1f3f6] p-6 rounded-[1.5rem] text-center transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 group">
                  <p className="text-3xl font-bold text-slate-900 group-hover:scale-110 transition-transform duration-500">{serpData.count}</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400 mt-3">Competitor Analizzati</p>
                </div>
                <div className="bg-slate-50/50 border border-[#f1f3f6] p-6 rounded-[1.5rem] text-center transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 group">
                  <p className="text-3xl font-bold text-slate-900 group-hover:scale-110 transition-transform duration-500">{serpData.extracted?.headings?.length || 0}</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400 mt-3">Topic Rilevati</p>
                </div>
              </div>

              {gscData && (
                <div className="p-6 bg-sky-50/30 rounded-[1.5rem] border border-sky-100/50">
                  <p className="text-[9px] uppercase font-black tracking-widest text-sky-500 mb-4 ml-1">Context Keywords (GSC)</p>
                  <div className="flex flex-wrap gap-2">
                    {gscData.keywords?.slice(0, 6).map((k, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] bg-white border-sky-100/50 text-sky-600 font-bold uppercase py-1 px-3 rounded-lg shadow-sm">{k.keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Note & Istruzioni</Label>
                    <span className="text-[9px] font-bold text-slate-300 italic uppercase">Opzionale</span>
                </div>
                <Textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Aggiungi istruzioni specifiche (es: usa un tono ironico, cita il servizio X...)"
                  className="text-sm border-[#f1f3f6] bg-slate-50/50 focus:bg-white focus:ring-slate-900 rounded-[1.2rem] p-6 min-h-[120px] transition-all resize-none shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 ml-1">Immagini per l'Articolo</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col items-center justify-center gap-3 h-32 border-2 border-dashed border-[#f1f3f6] rounded-[1.5rem] cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all group bg-slate-50/20">
                      <ImagePlus className="w-6 h-6 text-slate-300 group-hover:text-slate-900 group-hover:scale-110 transition-all" />
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 group-hover:text-slate-900">{uploading ? 'Upload...' : 'Carica Foto'}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                        onChange={handleImageUpload} disabled={uploading} />
                    </label>

                    {uploadedImages.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide py-2 px-1">
                        {uploadedImages.map((img, idx) => (
                          <div key={img.id} className="relative flex-shrink-0 group/img">
                            <img src={img.preview} alt={img.name} className="w-24 h-24 object-cover rounded-[1.2rem] border border-[#f1f3f6] shadow-md transition-transform group-hover/img:scale-105" />
                            <button onClick={() => removeImage(idx)}
                              className="absolute -top-2 -right-2 bg-white border border-[#f1f3f6] text-slate-400 rounded-full w-7 h-7 flex items-center justify-center shadow-xl hover:text-red-500 hover:scale-110 transition-all">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                    onClick={handleGenerate} 
                    disabled={generating || !hasApiKey}
                    className="w-full bg-slate-900 hover:bg-slate-800 h-16 text-xs font-black uppercase tracking-[0.25em] rounded-[1.5rem] shadow-2xl shadow-slate-200 transition-all active:scale-[0.98] animate-pulse-slow"
                >
                    {generating ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Generazione in corso...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 fill-current" />
                            <span>Crea Contenuto Pubblicabile</span>
                        </div>
                    )}
                </Button>
                <p className="text-[9px] text-center text-slate-400 mt-6 font-bold uppercase tracking-widest opacity-50">L'articolo verrà automaticamente pubblicato in bozza su WordPress</p>
              </div>
            </div>
          )}

          {result && (
            <div className={`mt-8 p-8 rounded-[1.5rem] border border-dashed animate-in zoom-in duration-500 ${
                result.status === 'completed' ? 'bg-emerald-50/20 border-emerald-200' : 'bg-slate-50/50 border-slate-200'
            }`}>
                {generating ? (
                  <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">Deep AI Writing...</p>
                  </div>
                ) : result.generation_status === 'success' ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Contenuto Pronto</p>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600">Generazione di Successo</p>
                        </div>
                    </div>
                    {result.wordpress_link && (
                      <Button asChild className="bg-white border border-[#f1f3f6] text-slate-900 hover:bg-slate-50 h-12 px-8 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest group">
                        <a href={result.wordpress_link} target="_blank" rel="noreferrer">
                           Apri Anteprime <ExternalLink className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-red-500">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Errore Critico</p>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Operazione Interrotta</p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientGenerator;
