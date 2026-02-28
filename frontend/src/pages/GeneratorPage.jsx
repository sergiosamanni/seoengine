import React, { useState, useEffect } from 'react';
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
  XCircle, Clock, Send, ExternalLink, Search, Lock, Target, BarChart3,
  PenTool, ChevronRight, Eye, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import { ContentStrategyTab } from './configuration/ContentStrategyTab';
import { SerpAnalysisTab } from './configuration/SerpAnalysisTab';
import { AdvancedPromptTab } from './configuration/AdvancedPromptTab';
import { KeywordsTab } from './configuration/KeywordsTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ========== ADMIN GENERATOR ==========
const AdminGenerator = ({ client, effectiveClientId, getAuthHeaders, navigate }) => {
  const [step, setStep] = useState(1);

  // Strategy state
  const [contentStrategy, setContentStrategy] = useState({
    funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS',
    buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '',
    cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [],
    keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: ''
  });

  // SERP state
  const [serpKeyword, setSerpKeyword] = useState('');
  const [serpLoading, setSerpLoading] = useState(false);
  const [serpData, setSerpData] = useState(null);

  // GSC state
  const [gscData, setGscData] = useState(null);
  const [gscLoading, setGscLoading] = useState(false);

  // Prompt state
  const [advancedPrompt, setAdvancedPrompt] = useState('');
  const [promptOptimizing, setPromptOptimizing] = useState(false);

  // Generation state
  const [genMode, setGenMode] = useState('single');
  const [singleTitle, setSingleTitle] = useState('');
  const [singleKeywords, setSingleKeywords] = useState('');
  const [singleObjective, setSingleObjective] = useState('');
  const [singleGenerating, setSingleGenerating] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  // Programmatic state
  const [keywords, setKeywords] = useState({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
  const [combinations, setCombinations] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [publishToWp, setPublishToWp] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [contentType, setContentType] = useState('articolo_blog');

  const config = client?.configuration || {};
  const llmConfig = config.llm || config.openai || {};
  const wpConfig = config.wordpress || {};
  const hasApiKey = !!llmConfig.api_key;
  const hasWpConfig = wpConfig.url_api && wpConfig.utente && wpConfig.password_applicazione;
  const gscConnected = config.gsc?.connected;
  const gscSite = config.gsc?.site_url || '';

  useEffect(() => {
    if (config.content_strategy) setContentStrategy(prev => ({ ...prev, ...config.content_strategy }));
    if (config.keyword_combinations) setKeywords(config.keyword_combinations);
    if (config.advanced_prompt?.secondo_livello_prompt) setAdvancedPrompt(config.advanced_prompt.secondo_livello_prompt);
  }, [client]);

  // Step checks
  const strategyDone = contentStrategy.obiettivo_primario && contentStrategy.modello_copywriting;
  const serpDone = serpData && serpData.competitors?.length > 0;
  const promptDone = advancedPrompt.trim().length > 20;

  const runSerpAnalysis = async () => {
    if (!serpKeyword.trim()) { toast.error('Inserisci una keyword'); return; }
    setSerpLoading(true);
    try {
      const res = await axios.post(`${API}/serp/analyze-full`, {
        keyword: serpKeyword, num_results: 4, country: 'it'
      }, { headers: getAuthHeaders() });
      setSerpData(res.data);
      toast.success(`Analizzati ${res.data.count} competitor per "${serpKeyword}"`);
      // Auto-generate prompt suggestion based on SERP data
      if (!advancedPrompt.trim()) {
        buildDefaultPrompt(res.data, gscData);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore analisi SERP');
    } finally { setSerpLoading(false); }
  };

  const loadGscData = async () => {
    setGscLoading(true);
    try {
      const res = await axios.get(`${API}/clients/${effectiveClientId}/gsc-data?days=28`, { headers: getAuthHeaders() });
      setGscData(res.data);
      toast.success(`Dati GSC caricati: ${res.data.keywords?.length || 0} keyword`);
      if (serpData && !advancedPrompt.trim()) buildDefaultPrompt(serpData, res.data);
    } catch (error) {
      if (error.response?.status === 401) toast.error('Token GSC scaduto. Riconnetti dalla Configurazione.');
      else toast.error(error.response?.data?.detail || 'Errore caricamento GSC');
    } finally { setGscLoading(false); }
  };

  const buildDefaultPrompt = (serp, gsc) => {
    const lines = [];
    lines.push('=== ISTRUZIONI PER LA GENERAZIONE ===');
    lines.push('');
    if (serp?.extracted?.titles?.length > 0) {
      lines.push('## Analisi SERP - Titoli Competitor:');
      serp.extracted.titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
      lines.push('');
    }
    if (serp?.extracted?.headings?.length > 0) {
      lines.push('## Struttura Headings dai Competitor:');
      serp.extracted.headings.slice(0, 12).forEach(h => lines.push(`- ${h}`));
      lines.push('');
    }
    lines.push('## Direttive:');
    lines.push('- Analizza i titoli e le strutture dei competitor sopra riportati.');
    lines.push('- Crea un articolo che copra tutti gli argomenti trattati dai competitor MA con un angolo unico e valore aggiunto.');
    lines.push('- Usa heading (H2, H3) che rispondano alle domande implicite dell\'utente.');
    lines.push('- Includi sezioni FAQ alla fine con schema markup suggerito.');
    if (gsc?.keywords?.length > 0) {
      lines.push('');
      lines.push('## Dati Google Search Console:');
      lines.push('Queste keyword portano gia traffico al sito. Integrale naturalmente nel contenuto:');
      gsc.keywords.slice(0, 8).forEach(k => {
        lines.push(`- "${k.keyword}" (pos. ${k.position}, ${k.clicks} click, ${k.impressions} impression)`);
      });
      lines.push('');
      lines.push('- Rafforza le keyword con posizione 4-15 (potenziale di crescita).');
      lines.push('- Evita cannibalizzazione con pagine gia posizionate per le keyword top.');
    }
    setAdvancedPrompt(lines.join('\n'));
  };

  // Save config before generating
  const saveConfig = async () => {
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
        ...config,
        content_strategy: contentStrategy,
        keyword_combinations: keywords
      }, { headers: getAuthHeaders() });
    } catch (e) { /* silent */ }
  };

  // Single article generation
  const handleSingleGenerate = async () => {
    if (!singleKeywords.trim() && !singleTitle.trim()) { toast.error('Inserisci almeno keywords o titolo'); return; }
    setSingleGenerating(true);
    setSingleResult(null);
    try {
      const res = await axios.post(`${API}/articles/simple-generate`, {
        client_id: effectiveClientId,
        keyword: singleKeywords || singleTitle,
        titolo_suggerito: singleTitle || undefined,
        topic: singleObjective || undefined,
        gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
        serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined
      }, { headers: getAuthHeaders() });
      setSingleResult(res.data);
      toast.success('Generazione avviata!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella generazione');
    } finally { setSingleGenerating(false); }
  };

  // Programmatic generation
  const refreshCombinations = async () => {
    try {
      await saveConfig();
      const res = await axios.get(`${API}/clients/${effectiveClientId}/combinations`, { headers: getAuthHeaders() });
      setCombinations(res.data.combinations || []);
      toast.success(`${res.data.combinations?.length || 0} combinazioni`);
    } catch (e) { toast.error('Errore aggiornamento combinazioni'); }
  };

  const toggleCombo = (combo) => {
    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
    if (selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key))
      setSelectedCombinations(selectedCombinations.filter(c => `${c.servizio}-${c.citta}-${c.tipo}` !== key));
    else setSelectedCombinations([...selectedCombinations, combo]);
  };

  const selectAll = () => setSelectedCombinations(selectedCombinations.length === combinations.length ? [] : [...combinations]);

  const handleProgrammaticGenerate = async () => {
    if (selectedCombinations.length === 0) { toast.error('Seleziona almeno una combinazione'); return; }
    setGenerating(true); setResults([]); setProgressPercent(0);
    await saveConfig();
    try {
      const res = await axios.post(`${API}/articles/generate-and-publish`, {
        client_id: effectiveClientId, combinations: selectedCombinations,
        publish_to_wordpress: publishToWp, content_type: contentType,
        gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined
      }, { headers: getAuthHeaders() });
      const jobId = res.data.job_id;
      const total = res.data.total;
      toast.info(`Job avviato: ${total} articoli in elaborazione...`);
      const poll = async () => {
        try {
          const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
          setResults(jr.data.results || []);
          setProgressPercent(Math.round((jr.data.completed / total) * 100));
          if (jr.data.status === 'completed') {
            const s = jr.data.summary || {};
            toast.success(`Completato: ${s.generated_ok || 0} generati, ${s.published_ok || 0} pubblicati`);
            setSelectedCombinations([]); setGenerating(false); return;
          }
          setTimeout(poll, 4000);
        } catch (e) { setTimeout(poll, 5000); }
      };
      setTimeout(poll, 5000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore generazione');
      setGenerating(false);
    }
  };

  const getStatusIcon = (s) => {
    if (s === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (s === 'running') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const steps = [
    { num: 1, label: 'Strategia', icon: Target, done: strategyDone },
    { num: 2, label: 'Analisi SERP', icon: Search, done: serpDone },
    { num: 3, label: 'Dati GSC', icon: BarChart3, done: !!gscData, optional: !gscConnected },
    { num: 4, label: 'Prompt', icon: Lock, done: promptDone },
    { num: 5, label: 'Genera', icon: Zap, done: false },
  ];

  return (
    <div className="space-y-6">
      {/* Steps Progress Bar */}
      <div className="flex items-center gap-1 p-4 bg-white rounded-xl border border-slate-200" data-testid="step-bar">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <button
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                step === s.num ? 'bg-slate-900 text-white shadow-md' :
                s.done ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                s.optional && !s.done ? 'bg-slate-50 text-slate-400 border border-dashed border-slate-300' :
                'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
              data-testid={`step-${s.num}-btn`}
            >
              {s.done && step !== s.num ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.num}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: Strategia */}
      {step === 1 && (
        <div className="space-y-4">
          <ContentStrategyTab strategy={contentStrategy} setStrategy={setContentStrategy} />
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-2-btn">
              Prosegui: Analisi SERP <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Analisi SERP */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-blue-600" />Analisi SERP</CardTitle>
              <CardDescription>Analizza i competitor per la keyword target ed estrai titoli e headings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input value={serpKeyword} onChange={(e) => setSerpKeyword(e.target.value)}
                  placeholder="Es: noleggio auto salerno" className="flex-1" data-testid="serp-keyword-input"
                  onKeyDown={(e) => e.key === 'Enter' && runSerpAnalysis()} />
                <Button onClick={runSerpAnalysis} disabled={serpLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]" data-testid="serp-analyze-btn">
                  {serpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  {serpLoading ? 'Analisi...' : 'Analizza SERP'}
                </Button>
              </div>

              {serpData && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Top {serpData.count} Competitor per "{serpData.keyword}"</h3>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{serpData.extracted?.headings?.length || 0} headings estratti</Badge>
                  </div>
                  {serpData.competitors?.map((c, i) => (
                    <Card key={i} className="border-slate-200 bg-slate-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-mono">#{c.position}</Badge>
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[300px]">
                                {c.url} <ExternalLink className="w-3 h-3 inline ml-1" />
                              </a>
                            </div>
                            <p className="font-semibold text-slate-900 text-sm">{c.title}</p>
                            {c.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>}
                            {c.headings?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {c.headings.map((h, j) => (
                                  <Badge key={j} variant="secondary" className="text-xs font-normal">{h}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
            <Button onClick={() => setStep(gscConnected ? 3 : 4)} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-3-btn">
              Prosegui: {gscConnected ? 'Dati GSC' : 'Prompt'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: GSC Data */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className={`border-sky-200 ${gscConnected ? 'bg-sky-50/50' : 'bg-slate-50'}`} data-testid="gsc-step">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-600" />Google Search Console</CardTitle>
              <CardDescription>{gscConnected ? `Connesso a ${gscSite}` : 'Non connesso. Puoi configurarlo nelle Impostazioni.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {!gscConnected ? (
                <Alert><AlertCircle className="h-4 w-4" />
                  <AlertDescription>GSC non connesso. Puoi saltare questo step o connetterlo dalle Impostazioni del cliente.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Button onClick={loadGscData} disabled={gscLoading} className="bg-sky-600 hover:bg-sky-700" data-testid="load-gsc-btn">
                    {gscLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
                    {gscData ? 'Aggiorna dati GSC' : 'Carica dati GSC (ultimi 28 giorni)'}
                  </Button>

                  {gscData && (
                    <>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Click', value: gscData.totals?.total_clicks || 0 },
                          { label: 'Impressioni', value: gscData.totals?.total_impressions || 0 },
                          { label: 'CTR medio', value: `${gscData.totals?.avg_ctr || 0}%` },
                          { label: 'Posiz. media', value: gscData.totals?.avg_position || 0 },
                        ].map(m => (
                          <div key={m.label} className="p-3 bg-white rounded-lg text-center border border-sky-100">
                            <p className="text-xl font-bold text-slate-900">{m.value}</p>
                            <p className="text-xs text-slate-500">{m.label}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-2">Top keyword dal sito ({gscData.keywords?.length}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {gscData.keywords?.slice(0, 12).map((k, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-white font-mono">
                              {k.keyword} <span className="ml-1 text-slate-400">pos {k.position}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Indietro</Button>
            <Button onClick={() => setStep(4)} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-4-btn">
              Prosegui: Prompt <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Advanced Prompt */}
      {step === 4 && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-purple-600" />Prompt Avanzato</CardTitle>
                  <CardDescription>Prompt pre-impostato basato sui dati SERP e GSC. Ottimizzabile.</CardDescription>
                </div>
                {(serpData || gscData) && !advancedPrompt.trim() && (
                  <Button variant="outline" size="sm" onClick={() => buildDefaultPrompt(serpData, gscData)} data-testid="generate-prompt-btn">
                    <Sparkles className="w-4 h-4 mr-1" />Genera Prompt
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!serpData && !gscData && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    Nessun dato SERP o GSC caricato. Il prompt sara generico. Torna ai passi precedenti per un prompt ottimizzato.
                  </AlertDescription>
                </Alert>
              )}
              <Textarea
                value={advancedPrompt}
                onChange={(e) => setAdvancedPrompt(e.target.value)}
                placeholder="Istruzioni avanzate per il modello AI. Questo prompt verra aggiunto al contesto di generazione..."
                rows={16}
                className="font-mono text-sm leading-relaxed"
                data-testid="advanced-prompt-textarea"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{advancedPrompt.length} caratteri</span>
                {serpData && (
                  <Button variant="ghost" size="sm" className="text-xs text-purple-600" onClick={() => buildDefaultPrompt(serpData, gscData)}>
                    <Sparkles className="w-3 h-3 mr-1" />Rigenera da dati SERP/GSC
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(gscConnected ? 3 : 2)}>Indietro</Button>
            <Button onClick={() => setStep(5)} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-5-btn">
              Prosegui: Genera <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Generate */}
      {step === 5 && (
        <div className="space-y-6">
          {/* Context summary */}
          <Card className="border-slate-200 bg-slate-50/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-slate-700">Contesto attivo:</span>
                <Badge variant={strategyDone ? "default" : "secondary"} className={strategyDone ? "bg-emerald-100 text-emerald-700" : ""}>
                  {strategyDone ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}Strategia
                </Badge>
                <Badge variant={serpDone ? "default" : "secondary"} className={serpDone ? "bg-emerald-100 text-emerald-700" : ""}>
                  {serpDone ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}SERP {serpDone ? `(${serpData.count})` : ''}
                </Badge>
                <Badge variant={gscData ? "default" : "secondary"} className={gscData ? "bg-sky-100 text-sky-700" : ""}>
                  {gscData ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}GSC {gscData ? `(${gscData.keywords?.length} kw)` : '(skip)'}
                </Badge>
                <Badge variant={promptDone ? "default" : "secondary"} className={promptDone ? "bg-purple-100 text-purple-700" : ""}>
                  {promptDone ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}Prompt {promptDone ? `(${advancedPrompt.length}c)` : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit" data-testid="gen-mode-toggle">
            <button onClick={() => setGenMode('single')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${genMode === 'single' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              data-testid="gen-mode-single-btn">
              <PenTool className="w-4 h-4 inline mr-2" />Articolo Singolo
            </button>
            <button onClick={() => setGenMode('programmatic')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${genMode === 'programmatic' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              data-testid="gen-mode-programmatic-btn">
              <Zap className="w-4 h-4 inline mr-2" />SEO Programmatica
            </button>
          </div>

          {/* Single Article */}
          {genMode === 'single' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-slate-200 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><PenTool className="w-5 h-5 text-orange-500" />Articolo Singolo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titolo (opzionale)</Label>
                    <Input value={singleTitle} onChange={(e) => setSingleTitle(e.target.value)} placeholder="Es: Guida al noleggio auto a Salerno" data-testid="single-title-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Keywords *</Label>
                    <Input value={singleKeywords} onChange={(e) => setSingleKeywords(e.target.value)} placeholder="Es: noleggio auto salerno" data-testid="single-keywords-input" />
                  </div>
                  <div className="space-y-2">
                    <Label>Obiettivo specifico (opzionale)</Label>
                    <Textarea value={singleObjective} onChange={(e) => setSingleObjective(e.target.value)} rows={3}
                      placeholder="Es: Posizionarsi per ricerche locali..." data-testid="single-objective-input" />
                  </div>
                  <Button onClick={handleSingleGenerate} disabled={singleGenerating || !hasApiKey || (!singleTitle && !singleKeywords)}
                    className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold" data-testid="single-generate-btn">
                    {singleGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generazione...</> : <><Zap className="w-5 h-5 mr-2" />Genera Articolo</>}
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-4">
                {singleResult && (
                  <Card className="border-emerald-200 bg-emerald-50/30" data-testid="single-result">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="font-semibold">Generazione avviata</span></div>
                      <p className="text-sm text-slate-600">Job ID: {singleResult.job_id}</p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/articles')}><FileText className="w-4 h-4 mr-1" />Vedi Articoli</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Programmatic SEO */}
          {genMode === 'programmatic' && (
            <div className="space-y-6">
              <KeywordsTab keywords={keywords} setKeywords={setKeywords} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
              <div className="flex justify-end">
                <Button onClick={refreshCombinations} className="bg-slate-800 hover:bg-slate-900" data-testid="refresh-combos-btn">
                  <Zap className="w-4 h-4 mr-2" />Aggiorna Combinazioni ({combinations.length})
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Combos */}
                <Card className="border-slate-200 lg:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle className="text-base">Combinazioni</CardTitle><CardDescription>{combinations.length} disponibili</CardDescription></div>
                    {combinations.length > 0 && <Button variant="outline" size="sm" onClick={selectAll} data-testid="select-all-btn">{selectedCombinations.length === combinations.length ? 'Deseleziona' : 'Seleziona'} Tutte</Button>}
                  </CardHeader>
                  <CardContent>
                    {combinations.length === 0 ? (
                      <div className="text-center py-8 text-slate-400"><FileText className="w-10 h-10 mx-auto mb-2" /><p className="text-sm">Configura le keyword sopra</p></div>
                    ) : (
                      <ScrollArea className="h-[300px] pr-2">
                        <div className="space-y-2">
                          {combinations.map((combo, i) => {
                            const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                            const sel = selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                            return (
                              <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${sel ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                onClick={() => toggleCombo(combo)} data-testid={`combo-${i}`}>
                                <Checkbox checked={!!sel} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{combo.titolo}</p>
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

                {/* Gen panel */}
                <Card className="border-slate-200 lg:col-span-1">
                  <CardHeader><CardTitle className="text-base">Riepilogo</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Selezionati</span>
                      <span className="text-2xl font-bold">{selectedCombinations.length}</span>
                    </div>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger data-testid="content-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="articolo_blog">Articolo Blog</SelectItem>
                        <SelectItem value="pillar_page">Pillar Page</SelectItem>
                        <SelectItem value="landing_page">Landing Page</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium">Pubblica WP</span></div>
                      <button type="button" role="switch" onClick={() => setPublishToWp(!publishToWp)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${publishToWp ? 'bg-blue-600' : 'bg-slate-200'}`} data-testid="publish-wp-toggle">
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publishToWp ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {generating && <Progress value={progressPercent} className="h-2" />}
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 font-semibold"
                      onClick={handleProgrammaticGenerate}
                      disabled={generating || selectedCombinations.length === 0 || !hasApiKey}
                      data-testid="programmatic-generate-btn">
                      {generating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generazione...</> :
                        <><Send className="w-5 h-5 mr-2" />Genera {selectedCombinations.length} Articoli</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Results */}
                <Card className="border-slate-200 lg:col-span-1">
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" />Risultati</CardTitle></CardHeader>
                  <CardContent>
                    {results.length === 0 ? (
                      <div className="text-center py-12 text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3" /><p className="text-sm">I risultati appariranno qui</p></div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {results.map((r, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-1" data-testid={`result-${i}`}>
                              <p className="font-medium text-sm truncate">{r.titolo}</p>
                              <div className="flex gap-3 text-xs">
                                <span className="flex items-center gap-1">{getStatusIcon(r.generation_status)}Gen</span>
                                <span className="flex items-center gap-1">{getStatusIcon(r.publish_status)}WP</span>
                              </div>
                              {r.wordpress_link && <a href={r.wordpress_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Vedi su WP <ExternalLink className="w-3 h-3 inline" /></a>}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(4)}>Indietro: Prompt</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== CLIENT SIMPLIFIED GENERATOR ==========
const ClientGenerator = ({ client, effectiveClientId, getAuthHeaders, navigate }) => {
  const [keyword, setKeyword] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [serpData, setSerpData] = useState(null);
  const [gscData, setGscData] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [result, setResult] = useState(null);

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

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/articles/simple-generate`, {
        client_id: effectiveClientId,
        keyword: keyword,
        topic: generatedPrompt,
        gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
        serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
        publish_to_wordpress: true
      }, { headers: getAuthHeaders() });
      setResult(res.data);
      toast.success('Generazione avviata!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore nella generazione');
    } finally { setGenerating(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 font-['Manrope']">Genera Articolo SEO</h1>
        <p className="text-slate-500">Inserisci la keyword target. Il sistema analizzera la SERP e ottimizzera il contenuto automaticamente.</p>
      </div>

      {!hasApiKey && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">API Key LLM non configurata. Contatta l'amministratore.</AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Keyword Target</Label>
            <div className="flex gap-3">
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Es: noleggio auto salerno" className="text-lg h-12"
                data-testid="client-keyword-input"
                onKeyDown={(e) => e.key === 'Enter' && !analyzing && runAutoAnalysis()} />
              <Button onClick={runAutoAnalysis} disabled={analyzing || !keyword.trim()}
                className="bg-blue-600 hover:bg-blue-700 h-12 px-6" data-testid="client-analyze-btn">
                {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Analysis Progress */}
          {analyzing && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /><span className="text-sm text-slate-600">Analisi SERP e competitor in corso...</span></div>
              <Progress value={33} className="h-1.5" />
            </div>
          )}

          {/* Ready state */}
          {ready && serpData && (
            <div className="space-y-4 animate-fade-in">
              <Separator />
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Analisi completata</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="border-slate-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">{serpData.count}</p>
                    <p className="text-xs text-slate-500">Competitor analizzati</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">{serpData.extracted?.headings?.length || 0}</p>
                    <p className="text-xs text-slate-500">Headings estratti</p>
                  </CardContent>
                </Card>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-800 font-medium">
                  <Eye className="w-4 h-4 inline mr-1" />Vedi dettagli analisi
                </summary>
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-200">
                  {serpData.competitors?.map((c, i) => (
                    <div key={i} className="py-1">
                      <p className="font-medium text-xs text-slate-900">#{c.position} {c.title}</p>
                      {c.headings?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.headings.map((h, j) => <Badge key={j} variant="secondary" className="text-xs">{h}</Badge>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>

              {gscData && (
                <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                  <p className="text-xs font-medium text-sky-700 mb-1">Dati GSC integrati: {gscData.keywords?.length} keyword dal sito</p>
                  <div className="flex flex-wrap gap-1">
                    {gscData.keywords?.slice(0, 5).map((k, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-white">{k.keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleGenerate} disabled={generating || !hasApiKey}
                className="w-full bg-orange-500 hover:bg-orange-600 h-14 text-lg font-semibold" data-testid="client-generate-btn">
                {generating ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Generazione in corso...</> : <><Zap className="w-6 h-6 mr-2" />Genera Articolo Ottimizzato</>}
              </Button>
            </div>
          )}

          {/* Result */}
          {result && (
            <Card className="border-emerald-200 bg-emerald-50/30 mt-4" data-testid="client-result">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="font-semibold">Generazione avviata!</span></div>
                <p className="text-sm text-slate-600">Il tuo articolo per "{keyword}" e in fase di generazione e sara pubblicato automaticamente.</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/articles')}><FileText className="w-4 h-4 mr-1" />Vedi Articoli</Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ========== MAIN PAGE ==========
export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { clientId: routeClientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);

  const effectiveClientId = isAdmin ? routeClientId : user?.client_id;

  useEffect(() => {
    const fetch = async () => {
      if (!effectiveClientId) { setLoading(false); return; }
      try {
        const res = await axios.get(`${API}/clients/${effectiveClientId}`, { headers: getAuthHeaders() });
        setClient(res.data);
      } catch (e) { toast.error('Errore caricamento cliente'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [effectiveClientId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (!effectiveClientId) {
    return <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{isAdmin ? 'Seleziona un cliente dalla lista Clienti.' : 'Nessun cliente associato. Contatta l\'amministratore.'}</AlertDescription></Alert>;
  }

  const hasApiKey = client?.configuration?.llm?.api_key || client?.configuration?.openai?.api_key;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        {isAdmin && <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} data-testid="back-btn"><ArrowLeft className="w-5 h-5" /></Button>}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Genera Articoli</h1>
          <p className="text-slate-500 mt-1">{client?.nome}</p>
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

      {isAdmin ? (
        <AdminGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} />
      ) : (
        <ClientGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} />
      )}
    </div>
  );
};
