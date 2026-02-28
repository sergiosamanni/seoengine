import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Zap, AlertCircle, Loader2, FileText, Globe, ArrowLeft, CheckCircle2,
  XCircle, Clock, Send, ExternalLink, ChevronDown, ChevronUp, Search,
  Lock, Target, BarChart3, PenTool
} from 'lucide-react';
import { toast } from 'sonner';

import { KeywordsTab } from './configuration/KeywordsTab';
import { ContentStrategyTab } from './configuration/ContentStrategyTab';
import { SerpAnalysisTab } from './configuration/SerpAnalysisTab';
import { AdvancedPromptTab } from './configuration/AdvancedPromptTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { clientId: routeClientId } = useParams();
  const navigate = useNavigate();
  const pollRef = useRef(null);

  // Core state
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [mode, setMode] = useState('single'); // 'single' | 'programmatic'

  // Single article state
  const [singleTitle, setSingleTitle] = useState('');
  const [singleKeywords, setSingleKeywords] = useState('');
  const [singleObjective, setSingleObjective] = useState('');
  const [singleGenerating, setSingleGenerating] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  // Programmatic state
  const [combinations, setCombinations] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [publishToWp, setPublishToWp] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [contentType, setContentType] = useState('articolo_blog');

  // Editable config (loaded from client, editable per-session)
  const [keywords, setKeywords] = useState({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
  const [contentStrategy, setContentStrategy] = useState({
    funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS',
    buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '',
    cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [],
    keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: ''
  });
  const [advancedPrompt, setAdvancedPrompt] = useState({
    prompt_password: '', secondo_livello_prompt: '', keyword_injection_template: ''
  });

  // GSC data
  const [gscData, setGscData] = useState(null);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscSite, setGscSite] = useState('');

  const effectiveClientId = isAdmin ? routeClientId : user?.client_id;

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveClientId) { setLoading(false); return; }
      try {
        const [clientRes, combosRes] = await Promise.all([
          axios.get(`${API}/clients/${effectiveClientId}`, { headers: getAuthHeaders() }),
          axios.get(`${API}/clients/${effectiveClientId}/combinations`, { headers: getAuthHeaders() })
        ]);
        const c = clientRes.data;
        setClient(c);
        setCombinations(combosRes.data.combinations || []);

        // Load config into editable state
        const config = c.configuration || {};
        if (config.keyword_combinations) setKeywords(config.keyword_combinations);
        if (config.content_strategy) setContentStrategy(prev => ({ ...prev, ...config.content_strategy }));
        if (config.advanced_prompt) setAdvancedPrompt(config.advanced_prompt);

        // Check GSC
        const gsc = config.gsc || {};
        if (gsc.connected && gsc.site_url) setGscSite(gsc.site_url);
      } catch (error) {
        toast.error('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [effectiveClientId]);

  // Fetch GSC data
  const fetchGscData = async () => {
    if (!gscSite) return;
    setGscLoading(true);
    try {
      const res = await axios.get(`${API}/clients/${effectiveClientId}/gsc-data?days=28`, { headers: getAuthHeaders() });
      setGscData(res.data);
      toast.success(`Dati GSC caricati: ${res.data.keywords?.length || 0} keyword`);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Token GSC scaduto. Riconnetti dalla Configurazione.');
      } else {
        toast.error(error.response?.data?.detail || 'Errore caricamento dati GSC');
      }
    } finally {
      setGscLoading(false);
    }
  };

  // Save current keywords/strategy to client config before generating
  const saveConfig = async () => {
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
        ...client.configuration,
        keyword_combinations: keywords,
        content_strategy: contentStrategy
      }, { headers: getAuthHeaders() });
    } catch (e) { /* silent save */ }
  };

  // SINGLE ARTICLE GENERATION
  const handleSingleGenerate = async () => {
    if (!singleTitle.trim() && !singleKeywords.trim()) {
      toast.error('Inserisci almeno un titolo o una keyword');
      return;
    }
    setSingleGenerating(true);
    setSingleResult(null);
    try {
      const response = await axios.post(`${API}/articles/simple-generate`, {
        client_id: effectiveClientId,
        keyword: singleKeywords || singleTitle,
        titolo_suggerito: singleTitle || undefined,
        obiettivo: singleObjective || undefined,
        gsc_context: gscData ? {
          top_keywords: gscData.keywords?.slice(0, 10) || [],
          totals: gscData.totals || {}
        } : undefined
      }, { headers: getAuthHeaders() });
      setSingleResult(response.data);
      toast.success('Articolo generato con successo!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella generazione');
    } finally {
      setSingleGenerating(false);
    }
  };

  // PROGRAMMATIC GENERATION
  const toggleCombination = (combo) => {
    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
    if (selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key)) {
      setSelectedCombinations(selectedCombinations.filter(c => `${c.servizio}-${c.citta}-${c.tipo}` !== key));
    } else {
      setSelectedCombinations([...selectedCombinations, combo]);
    }
  };

  const selectAll = () => {
    setSelectedCombinations(selectedCombinations.length === combinations.length ? [] : [...combinations]);
  };

  const handleProgrammaticGenerate = async () => {
    if (selectedCombinations.length === 0) {
      toast.error('Seleziona almeno una combinazione');
      return;
    }
    setGenerating(true);
    setResults([]);
    setProgressPercent(0);
    await saveConfig();

    try {
      if (publishToWp) {
        const response = await axios.post(`${API}/articles/generate-and-publish`, {
          client_id: effectiveClientId,
          combinations: selectedCombinations,
          publish_to_wordpress: true,
          content_type: contentType,
          gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10) || [], totals: gscData.totals || {} } : undefined
        }, { headers: getAuthHeaders() });
        const jobId = response.data.job_id;
        const totalItems = response.data.total;
        toast.info(`Job avviato: ${totalItems} articoli in elaborazione...`);
        const pollJob = async () => {
          try {
            const jobRes = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
            const job = jobRes.data;
            setResults(job.results || []);
            setProgressPercent(Math.round((job.completed / totalItems) * 100));
            if (job.status === 'completed') {
              const s = job.summary || {};
              toast.success(`Completato: ${s.generated_ok || 0} generati, ${s.published_ok || 0} pubblicati`);
              setSelectedCombinations([]);
              setGenerating(false);
              return;
            }
            setTimeout(pollJob, 4000);
          } catch (e) { setTimeout(pollJob, 5000); }
        };
        setTimeout(pollJob, 5000);
        return;
      } else {
        const response = await axios.post(`${API}/articles/generate`, {
          client_id: effectiveClientId,
          combinations: selectedCombinations
        }, { headers: getAuthHeaders(), timeout: 600000 });
        setResults((response.data.articles || []).map(a => ({
          id: a.id, titolo: a.titolo,
          generation_status: a.stato === 'generated' ? 'success' : 'failed',
          publish_status: 'skipped'
        })));
        toast.success(`Generati ${response.data.generated} articoli`);
        setSelectedCombinations([]);
        setProgressPercent(100);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante la generazione');
    } finally {
      if (!publishToWp) setGenerating(false);
    }
  };

  // Refresh combinations after keyword change
  const refreshCombinations = async () => {
    try {
      await saveConfig();
      const res = await axios.get(`${API}/clients/${effectiveClientId}/combinations`, { headers: getAuthHeaders() });
      setCombinations(res.data.combinations || []);
      toast.success(`${res.data.combinations?.length || 0} combinazioni aggiornate`);
    } catch (e) { toast.error('Errore aggiornamento combinazioni'); }
  };

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  if (!effectiveClientId) {
    return (
      <Alert><AlertCircle className="h-4 w-4" />
        <AlertDescription>{isAdmin ? 'Seleziona un cliente dalla lista Clienti.' : 'Nessun cliente associato al tuo account.'}</AlertDescription>
      </Alert>
    );
  }

  const hasApiKey = client?.configuration?.llm?.api_key || client?.configuration?.openai?.api_key;
  const llmConfig = client?.configuration?.llm || client?.configuration?.openai || {};
  const wpConfig = client?.configuration?.wordpress || {};
  const hasWpConfig = wpConfig.url_api && wpConfig.utente && wpConfig.password_applicazione;
  const gscConnected = client?.configuration?.gsc?.connected;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Genera Articoli</h1>
            <p className="text-slate-500 mt-1">{client?.nome}</p>
          </div>
        </div>
      </div>

      {!hasApiKey && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            API Key LLM non configurata. <Button variant="link" className="px-1 h-auto text-amber-800 font-semibold" onClick={() => navigate(isAdmin ? `/clients/${effectiveClientId}/config` : '/config')}>Vai alla Configurazione</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* GSC Panel */}
      {gscConnected && (
        <Card className="border-sky-200 bg-sky-50/50" data-testid="gsc-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                <div>
                  <p className="font-medium text-sm text-slate-900">Google Search Console</p>
                  <p className="text-xs text-slate-500">{gscSite || 'Connesso'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {gscData && (
                  <Badge variant="outline" className="text-xs bg-white">{gscData.keywords?.length || 0} keyword rilevate</Badge>
                )}
                <Button size="sm" variant={gscData ? "outline" : "default"} onClick={fetchGscData} disabled={gscLoading}
                  className={!gscData ? "bg-sky-600 hover:bg-sky-700" : ""} data-testid="load-gsc-btn">
                  {gscLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-1" />}
                  {gscData ? 'Aggiorna' : 'Carica dati GSC'}
                </Button>
              </div>
            </div>
            {gscData && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                <div className="p-2 bg-white rounded-lg text-center">
                  <p className="text-lg font-bold text-slate-900">{gscData.totals?.total_clicks || 0}</p>
                  <p className="text-xs text-slate-500">Click</p>
                </div>
                <div className="p-2 bg-white rounded-lg text-center">
                  <p className="text-lg font-bold text-slate-900">{gscData.totals?.total_impressions || 0}</p>
                  <p className="text-xs text-slate-500">Impressioni</p>
                </div>
                <div className="p-2 bg-white rounded-lg text-center">
                  <p className="text-lg font-bold text-slate-900">{gscData.totals?.avg_ctr || 0}%</p>
                  <p className="text-xs text-slate-500">CTR medio</p>
                </div>
                <div className="p-2 bg-white rounded-lg text-center">
                  <p className="text-lg font-bold text-slate-900">{gscData.totals?.avg_position || 0}</p>
                  <p className="text-xs text-slate-500">Posiz. media</p>
                </div>
              </div>
            )}
            {gscData && gscData.keywords?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 mb-2">Top keyword GSC (usate come contesto nella generazione):</p>
                <div className="flex flex-wrap gap-1">
                  {gscData.keywords.slice(0, 8).map((k, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-white font-mono">
                      {k.keyword} <span className="ml-1 text-slate-400">pos {k.position}</span>
                    </Badge>
                  ))}
                  {gscData.keywords.length > 8 && <Badge variant="secondary" className="text-xs">+{gscData.keywords.length - 8}</Badge>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit" data-testid="mode-toggle">
        <button
          onClick={() => setMode('single')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'single' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
          data-testid="mode-single-btn"
        >
          <PenTool className="w-4 h-4 inline mr-2" />Articolo Singolo
        </button>
        <button
          onClick={() => setMode('programmatic')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === 'programmatic' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
          data-testid="mode-programmatic-btn"
        >
          <Zap className="w-4 h-4 inline mr-2" />SEO Programmatica
        </button>
      </div>

      {/* ====== SINGLE ARTICLE MODE ====== */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PenTool className="w-5 h-5 text-orange-500" />Genera Articolo Singolo</CardTitle>
                <CardDescription>Inserisci titolo, keyword e obiettivo per generare un articolo SEO ottimizzato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Titolo (opzionale)</Label>
                  <Input value={singleTitle} onChange={(e) => setSingleTitle(e.target.value)} placeholder="Es: Guida completa al noleggio auto a Salerno" data-testid="single-title-input" />
                </div>
                <div className="space-y-2">
                  <Label>Keywords *</Label>
                  <Input value={singleKeywords} onChange={(e) => setSingleKeywords(e.target.value)} placeholder="Es: noleggio auto salerno, autonoleggio economico" data-testid="single-keywords-input" />
                  <p className="text-xs text-slate-500">Separa piu keyword con virgola</p>
                </div>
                <div className="space-y-2">
                  <Label>Obiettivo specifico (opzionale)</Label>
                  <Textarea value={singleObjective} onChange={(e) => setSingleObjective(e.target.value)} placeholder="Es: Posizionarsi per ricerche locali di noleggio auto nella zona di Salerno, convertire visitatori in richieste di preventivo" rows={3} data-testid="single-objective-input" />
                </div>
                <Button
                  onClick={handleSingleGenerate}
                  disabled={singleGenerating || !hasApiKey || (!singleTitle.trim() && !singleKeywords.trim())}
                  className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold"
                  data-testid="single-generate-btn"
                >
                  {singleGenerating ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generazione in corso...</>) : (<><Zap className="w-5 h-5 mr-2" />Genera Articolo</>)}
                </Button>
              </CardContent>
            </Card>

            {/* Single Result Preview */}
            {singleResult && (
              <Card className="border-emerald-200 bg-emerald-50/30" data-testid="single-result">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />Articolo Generato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-bold text-lg text-slate-900">{singleResult.titolo || singleResult.article?.titolo}</p>
                  {singleResult.article?.meta_description && (
                    <p className="text-sm text-slate-600 italic">{singleResult.article.meta_description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/articles`)}>
                      <FileText className="w-4 h-4 mr-1" />Vedi negli Articoli
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar: quick info */}
          <div className="space-y-4">
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-slate-900">Configurazione attiva</p>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="font-medium">{llmConfig.provider || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Modello</span><span className="font-mono text-xs">{llmConfig.modello || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">WordPress</span>
                    <Badge variant={hasWpConfig ? "default" : "secondary"} className={hasWpConfig ? "bg-emerald-100 text-emerald-700" : ""}>
                      {hasWpConfig ? 'Configurato' : 'Non config.'}
                    </Badge>
                  </div>
                  {gscConnected && <div className="flex justify-between"><span className="text-slate-500">GSC</span><Badge className="bg-sky-100 text-sky-700">Connesso</Badge></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ====== PROGRAMMATIC SEO MODE ====== */}
      {mode === 'programmatic' && (
        <div className="space-y-6">
          {/* Tabs for Keywords, Strategy, SERP, Prompt */}
          <Tabs defaultValue="keywords" className="w-full">
            <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-xl overflow-x-auto">
              <TabsTrigger value="keywords" className="rounded-lg" data-testid="gen-tab-keywords"><Globe className="w-4 h-4 mr-2" />Keywords</TabsTrigger>
              <TabsTrigger value="strategy" className="rounded-lg" data-testid="gen-tab-strategy"><Target className="w-4 h-4 mr-2" />Strategia</TabsTrigger>
              <TabsTrigger value="serp" className="rounded-lg" data-testid="gen-tab-serp"><Search className="w-4 h-4 mr-2" />Analisi SERP</TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-lg" data-testid="gen-tab-advanced"><Lock className="w-4 h-4 mr-2" />Prompt Avanzato</TabsTrigger>
              <TabsTrigger value="generate" className="rounded-lg" data-testid="gen-tab-generate"><Zap className="w-4 h-4 mr-2" />Genera</TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="mt-6">
              <KeywordsTab keywords={keywords} setKeywords={setKeywords} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
              <div className="mt-4 flex justify-end">
                <Button onClick={refreshCombinations} className="bg-slate-900 hover:bg-slate-800" data-testid="refresh-combos-btn">
                  <Zap className="w-4 h-4 mr-2" />Aggiorna Combinazioni ({combinations.length})
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="mt-6">
              <ContentStrategyTab strategy={contentStrategy} setStrategy={setContentStrategy} />
            </TabsContent>

            <TabsContent value="serp" className="mt-6">
              <SerpAnalysisTab effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
            </TabsContent>

            <TabsContent value="advanced" className="mt-6">
              <AdvancedPromptTab advancedPrompt={advancedPrompt} setAdvancedPrompt={setAdvancedPrompt} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
            </TabsContent>

            <TabsContent value="generate" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Combinations List */}
                <Card className="border-slate-200 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Combinazioni</CardTitle>
                      <CardDescription>{combinations.length} disponibili</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={selectAll} data-testid="select-all-btn">
                      {selectedCombinations.length === combinations.length ? 'Deseleziona' : 'Seleziona'} Tutte
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {combinations.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">Nessuna combinazione</p>
                        <p className="text-xs text-slate-400 mt-1">Configura le keyword nel tab Keywords</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[350px] pr-2">
                        <div className="space-y-2">
                          {combinations.map((combo, i) => {
                            const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                            const isSelected = selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                            return (
                              <div key={key}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                onClick={() => toggleCombination(combo)} data-testid={`combo-${i}`}>
                                <Checkbox checked={!!isSelected} onCheckedChange={() => toggleCombination(combo)} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 text-sm truncate">{combo.titolo}</p>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    <Badge variant="outline" className="text-xs font-mono">{combo.servizio}</Badge>
                                    <Badge variant="outline" className="text-xs font-mono">{combo.citta}</Badge>
                                    <Badge variant="outline" className="text-xs font-mono">{combo.tipo}</Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                {/* Generation Panel */}
                <Card className="border-slate-200 lg:col-span-1">
                  <CardHeader><CardTitle>Riepilogo Generazione</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Articoli selezionati</span>
                      <span className="text-2xl font-bold text-slate-900 font-['Manrope']">{selectedCombinations.length}</span>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-500">Tipo Contenuto</Label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger data-testid="content-type-select" className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="articolo_blog">Articolo Blog</SelectItem>
                          <SelectItem value="pillar_page">Pillar Page</SelectItem>
                          <SelectItem value="landing_page">Landing Page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Pubblica su WordPress</span>
                      </div>
                      <button type="button" role="switch" aria-checked={publishToWp} onClick={() => setPublishToWp(!publishToWp)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publishToWp ? 'bg-blue-600' : 'bg-slate-200'}`}
                        data-testid="publish-wp-toggle">
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publishToWp ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {publishToWp && !hasWpConfig && <p className="text-xs text-red-500">Credenziali WP mancanti</p>}
                    {generating && (
                      <div className="space-y-2">
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-slate-500 text-center">Generazione in corso... {progressPercent}%</p>
                      </div>
                    )}
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold"
                      onClick={handleProgrammaticGenerate}
                      disabled={generating || selectedCombinations.length === 0 || !hasApiKey || (publishToWp && !hasWpConfig)}
                      data-testid="generate-btn"
                    >
                      {generating ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generazione...</>) :
                       publishToWp ? (<><Send className="w-5 h-5 mr-2" />Genera e Pubblica ({selectedCombinations.length})</>) :
                       (<><Zap className="w-5 h-5 mr-2" />Genera {selectedCombinations.length} Articoli</>)}
                    </Button>
                  </CardContent>
                </Card>

                {/* Results */}
                <Card className="border-slate-200 lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>Risultati
                    </CardTitle>
                    {results.length > 0 && (
                      <CardDescription>
                        {results.filter(r => r.generation_status === 'success').length} generati, {results.filter(r => r.publish_status === 'success').length} pubblicati
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {results.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <FileText className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-sm">I risultati appariranno qui</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[350px]">
                        <div className="space-y-2">
                          {results.map((r, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2" data-testid={`result-${i}`}>
                              <p className="font-medium text-slate-900 text-sm truncate">{r.titolo}</p>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1">{getStatusIcon(r.generation_status)}<span className="text-slate-600">Gen</span></span>
                                <span className="flex items-center gap-1">{getStatusIcon(r.publish_status)}<span className="text-slate-600">WP</span></span>
                              </div>
                              {r.wordpress_link && (
                                <a href={r.wordpress_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                  Vedi su WP <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {r.generation_error && <p className="text-xs text-red-600 bg-red-50 p-1 rounded">{r.generation_error}</p>}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};
