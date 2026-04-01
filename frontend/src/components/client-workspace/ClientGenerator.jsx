import React, { useState } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Zap, Loader2, CheckCircle2,
  XCircle, ExternalLink, ImagePlus, X, Camera, ChevronRight, ArrowLeft, Info,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export const ClientGenerator = ({ client: initialClient, getAuthHeaders }) => {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [keyword, setKeyword] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [serpData, setSerpData] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [result, setResult] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [orientationWarning, setOrientationWarning] = useState(false);

  // Fetch available clients for the user
  React.useEffect(() => {
    const fetchClients = async () => {
        try {
            const res = await axios.get(`${API}/clients`, { headers: getAuthHeaders() });
            setClients(res.data);
            if (res.data.length === 1) {
                setSelectedClient(res.data[0]);
                setStep(2);
            } else if (initialClient) {
                setSelectedClient(initialClient);
                setStep(2);
            }
        } catch (e) {
            toast.error("Errore caricamento siti associati");
        }
    };
    fetchClients();
  }, [getAuthHeaders, initialClient]);

  const config = selectedClient?.configuration || {};
  const gscConnected = config.gsc?.connected;

  const runAutoAnalysis = async () => {
    if (!keyword.trim()) { toast.error('Inserisci una keyword'); return; }
    setAnalyzing(true);
    setSerpData(null);
    setResult(null);

    try {
      const serpRes = await axios.post(`${API}/serp/analyze-full`, {
        keyword: keyword, num_results: 4, country: 'it'
      }, { headers: getAuthHeaders() });
      setSerpData(serpRes.data);

      const lines = ['Crea un articolo SEO basandoti su questi dati:'];
      serpRes.data.extracted?.titles?.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
      setGeneratedPrompt(lines.join('\n'));
      setStep(4);
    } catch (error) {
      toast.error('Errore analisi. Riprova.');
    } finally { setAnalyzing(false); }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploading(true);
    setOrientationWarning(false);
    const token = localStorage.getItem('seo_token');
    const newImages = [];

    for (const file of files) {
      const isHorizontal = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
              const orient = img.naturalWidth >= img.naturalHeight;
              URL.revokeObjectURL(img.src);
              resolve(orient);
          };
          img.src = URL.createObjectURL(file);
      });

      if (!isHorizontal) {
          setOrientationWarning(true);
          toast.warning("La foto sembra verticale. Consigliamo foto orizzontali.");
          setUploading(false);
          return;
      }

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
    if (newImages.length > 0) toast.success("Immagine caricata correttamente!");
    
    // Reset target value to allow uploading the same file again
    e.target.value = '';
  };

  const removeImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerate = async () => {
    if (generating) return; // Immediate lock for mobile double-taps
    setGenerating(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/articles/simple-generate`, {
        client_id: selectedClient.id,
        keyword: keyword,
        topic: clientNotes ? `${generatedPrompt}\n\n## Note del cliente:\n${clientNotes}` : generatedPrompt,
        publish_to_wordpress: true,
        image_ids: uploadedImages.map(img => img.id)
      }, { headers: getAuthHeaders() });
      
      setResult({ ...res.data, status: 'running' });
      const jobId = res.data.job_id;
      const poll = async () => {
        try {
          const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
          
          // Only stop if we have a clear status from the job
          if (jr.data && (jr.data.status === 'completed' || jr.data.status === 'failed')) {
            const r = jr.data.results?.[0] || {};
            setResult({ ...res.data, ...r, status: jr.data.status });
            setGenerating(false);
            return;
          }
          
          // If status is still running, continue
          setTimeout(poll, 3000);
        } catch (e) { 
          // Silently handle network errors during polling (common on mobile)
          console.log("Network glitch during polling, retrying...", e.message);
          setTimeout(poll, 3000); 
        }
      };
      poll();
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(`Errore: ${error.response?.data?.detail || error.message}`);
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-[80vh] flex flex-col pt-4">
      
      {/* Step Indicator */}
      {step < 5 && !result && (
          <div className="flex items-center justify-between px-6 mb-8">
              {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          step === s ? 'bg-slate-900 text-white shadow-xl scale-110' : 
                          step > s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                      }`}>
                          {step > s ? <Check className="w-4 h-4" /> : s}
                      </div>
                      {s < 4 && <div className={`h-[2px] flex-1 mx-2 ${step > s ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
                  </div>
              ))}
          </div>
      )}

      {/* Step 1: Select Site */}
      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-6 px-4 space-y-6">
            <div className="space-y-2 text-center mb-8">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Benvenuto!</h1>
                <p className="text-sm text-slate-500 font-medium">Su quale sito vuoi pubblicare oggi?</p>
            </div>
            <div className="space-y-3">
                {clients.map(c => (
                    <Card key={c.id} 
                        className={`cursor-pointer transition-all border-slate-100 hover:shadow-xl active:scale-95 rounded-2xl overflow-hidden ${selectedClient?.id === c.id ? 'ring-2 ring-slate-900 border-transparent shadow-xl' : ''}`}
                        onClick={() => { setSelectedClient(c); setStep(2); }}
                    >
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black">
                                    {c.nome?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{c.nome}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{c.sito_web?.replace('https://', '')}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
      )}

      {/* Step 2: Photo capture */}
      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-6 px-4 space-y-8">
            <div className="flex items-center gap-3 mb-6" onClick={() => setStep(1)}>
                <ArrowLeft className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Torna alla scelta sito</span>
            </div>
            
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-900 mx-auto shadow-inner border border-slate-100">
                    <Camera className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Carica o Scatta la Foto</h1>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
                    <Info className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Importante: Usa foto Orizzontali</span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="aspect-video bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden relative shadow-2xl shadow-slate-100 transition-all">
                    {uploading ? (
                        <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
                    ) : (
                        <>
                            {uploadedImages.length > 0 ? (
                                <div className="relative w-full h-full group">
                                    <img src={uploadedImages[uploadedImages.length-1].preview} className="w-full h-full object-cover" alt="Preview" />
                                    <button 
                                        onClick={() => removeImage(uploadedImages[uploadedImages.length-1].id)}
                                        className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-red-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                             ) : (
                                <div className="text-center space-y-3 p-8">
                                    <ImagePlus className="w-12 h-12 text-slate-200 mx-auto" />
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Nessuna immagine</p>
                                </div>
                             )}
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                    <label htmlFor="camera-input" className="flex items-center justify-center gap-3 h-14 bg-slate-950 rounded-2xl cursor-pointer hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200 border border-slate-800">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Scatta</span>
                        <input id="camera-input" type="file" accept="image/*" capture="environment" className="hidden"
                            onChange={handleImageUpload} disabled={uploading} />
                    </label>

                    <label htmlFor="gallery-input" className="flex items-center justify-center gap-3 h-14 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                        <ImagePlus className="w-4 h-4 text-slate-600" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Galleria</span>
                        <input id="gallery-input" type="file" accept="image/*" className="hidden"
                            onChange={handleImageUpload} disabled={uploading} />
                    </label>
                </div>
                
                {orientationWarning && (
                    <p className="text-[10px] text-red-500 font-bold text-center uppercase tracking-widest animate-bounce">⚠️ Per favore, carica una foto orizzontale</p>
                )}

                <Button 
                    onClick={() => setStep(3)} 
                    disabled={uploadedImages.length === 0}
                    className="w-full bg-slate-900 text-white h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 disabled:opacity-20 mt-8"
                >
                    Prosegui <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
            </div>
        </div>
      )}

      {/* Step 3: Keyword & Notes */}
      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-bottom-6 px-4 space-y-8">
            <div className="flex items-center gap-3 mb-6" onClick={() => setStep(2)}>
                <ArrowLeft className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Torna alla foto</span>
            </div>

            <div className="space-y-8">
                <div className="space-y-4">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 ml-1">L'articolo tratterà di...</Label>
                    <Input 
                        value={keyword} 
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Es: Apertura nuovo salone" 
                        className="h-16 border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-slate-900 text-lg font-bold rounded-[1.2rem] px-6"
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 ml-1">Dettagli aggiuntivi (opzionale)</Label>
                    <Textarea
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Dettagli, offerte o info specifiche..."
                      className="text-sm border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-slate-900 rounded-[1.2rem] p-6 min-h-[140px] resize-none"
                    />
                </div>
            </div>

            <Button 
                onClick={runAutoAnalysis} 
                disabled={analyzing || !keyword.trim()}
                className="w-full bg-slate-900 text-white h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95"
            >
                {analyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Analizza & Prepara"}
            </Button>
        </div>
      )}

      {/* Step 4: Generation */}
      {step === 4 && !result && (
        <div className="animate-in fade-in slide-in-from-bottom-6 px-4 space-y-12 py-10">
            <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-xl shadow-emerald-50 animate-pulse">
                    <Zap className="w-12 h-12 fill-current" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analisi Completata!</h1>
                <p className="text-sm text-slate-500 font-medium px-4">Ora puoi procedere: l'AI scriverà l'articolo e lo salverà come bozza su WordPress.</p>
            </div>

            <Button 
                onClick={handleGenerate} 
                disabled={generating}
                className="w-full bg-slate-900 text-white h-20 rounded-[2rem] font-black uppercase tracking-[0.25em] shadow-2xl shadow-slate-300 active:scale-95"
            >
                {generating ? <Loader2 className="w-8 h-8 animate-spin" /> : "Lancia Pubblicazione"}
            </Button>

            <div className="p-6 bg-slate-50 rounded-[1.5rem] space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sito: {selectedClient?.nome}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Target: {keyword}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Media: {uploadedImages.length} foto caricata</p>
                </div>
            </div>
        </div>
      )}

      {/* Result View */}
      {result && (
        <div className="animate-in zoom-in duration-500 px-4 pt-10 pb-20 space-y-12">
            <div className="text-center space-y-6">
                <div className={`w-28 h-28 mx-auto rounded-[3rem] shadow-2xl flex items-center justify-center transition-all ${
                    result.status === 'completed' ? 'bg-emerald-500 text-white shadow-emerald-200' : 
                    result.status === 'failed' ? 'bg-red-500 text-white shadow-red-200' : 'bg-slate-900 text-white'
                }`}>
                    {generating ? <Loader2 className="w-12 h-12 animate-spin" /> : 
                     result.status === 'completed' ? <CheckCircle2 className="w-14 h-14" /> : <XCircle className="w-14 h-14" />}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {generating ? 'Scrittura in corso...' : (result.publish_status === 'success' || (result.status === 'completed' && !result.publish_error)) ? 'Pubblicato!' : 'Ops! Errore'}
                    </h2>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-2 px-6">
                        {generating ? 'L\'IA sta scrivendo l\'articolo perfetto' : (result.publish_status === 'success' || (result.status === 'completed' && !result.publish_error)) ? 'L\'articolo è ora nel tuo WordPress' : (result.publish_error || result.generation_error || 'Qualcosa è andato storto, riprova')}
                    </p>
                </div>
            </div>

            {result.status === 'completed' && result.wordpress_link && (
                <div className="border-none shadow-2xl shadow-indigo-100 rounded-[2.5rem] overflow-hidden bg-white">
                    <div className="p-8 space-y-8">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Titolo Articolo</p>
                             <p className="font-bold text-slate-900 leading-tight">{result.titolo}</p>
                        </div>
                        <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all select-none touch-none">
                            <a href={result.wordpress_link} target="_blank" rel="noreferrer">
                                Vedi su WordPress <ExternalLink className="w-5 h-5 ml-2" />
                            </a>
                        </Button>
                    </div>
                </div>
            )}

            {(result.status === 'completed' || result.status === 'failed') && (
                <Button variant="ghost" onClick={() => { setStep(1); setResult(null); setKeyword(''); setUploadedImages([]); }} className="w-full h-14 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Inizia un nuovo articolo
                </Button>
            )}
        </div>
      )}

    </div>
  );
};

export default ClientGenerator;
