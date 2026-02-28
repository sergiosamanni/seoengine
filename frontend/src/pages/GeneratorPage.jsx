import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Zap, 
  AlertCircle, 
  Loader2,
  FileText,
  Eye,
  Globe,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { clientId: routeClientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [combinations, setCombinations] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [results, setResults] = useState([]);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [client, setClient] = useState(null);
  const [publishToWp, setPublishToWp] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activityLogs, setActivityLogs] = useState([]);
  const [contentType, setContentType] = useState('articolo_blog');
  const [briefNotes, setBriefNotes] = useState('');
  const [briefCta, setBriefCta] = useState('');
  const [showBrief, setShowBrief] = useState(false);
  const logsEndRef = useRef(null);
  const pollRef = useRef(null);

  // Admin can generate for any client via route param
  const effectiveClientId = isAdmin ? routeClientId : user?.client_id;

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveClientId) { setLoading(false); return; }
      try {
        const [clientRes, combosRes] = await Promise.all([
          axios.get(`${API}/clients/${effectiveClientId}`, { headers: getAuthHeaders() }),
          axios.get(`${API}/clients/${effectiveClientId}/combinations`, { headers: getAuthHeaders() })
        ]);
        setClient(clientRes.data);
        setCombinations(combosRes.data.combinations || []);
      } catch (error) {
        toast.error('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [effectiveClientId]);

  // Fetch activity logs
  const fetchLogs = async () => {
    if (!effectiveClientId) return;
    try {
      const res = await axios.get(`${API}/activity-logs/${effectiveClientId}?limit=30`, {
        headers: getAuthHeaders()
      });
      setActivityLogs(res.data);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    fetchLogs();
  }, [effectiveClientId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLogs]);

  const toggleCombination = (combo) => {
    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
    if (selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key)) {
      setSelectedCombinations(selectedCombinations.filter(c => `${c.servizio}-${c.citta}-${c.tipo}` !== key));
    } else {
      setSelectedCombinations([...selectedCombinations, combo]);
    }
  };

  const selectAll = () => {
    if (selectedCombinations.length === combinations.length) {
      setSelectedCombinations([]);
    } else {
      setSelectedCombinations([...combinations]);
    }
  };

  const handleGenerate = async () => {
    if (selectedCombinations.length === 0) {
      toast.error('Seleziona almeno una combinazione');
      return;
    }

    setGenerating(true);
    setResults([]);
    setProgressPercent(0);

    // Start log polling
    pollRef.current = setInterval(fetchLogs, 3000);

    try {
      if (publishToWp) {
        // Build brief override from per-generation settings
        const briefOverride = {};
        if (briefCta) briefOverride.cta_finale = briefCta;
        if (briefNotes) briefOverride.note_speciali = briefNotes;

        // Async job: generate and publish
        const response = await axios.post(`${API}/articles/generate-and-publish`, {
          client_id: effectiveClientId,
          combinations: selectedCombinations,
          publish_to_wordpress: true,
          content_type: contentType,
          brief_override: Object.keys(briefOverride).length > 0 ? briefOverride : null
        }, { headers: getAuthHeaders() });

        const jobId = response.data.job_id;
        const totalItems = response.data.total;
        toast.info(`Job avviato: ${totalItems} articoli in elaborazione...`);

        // Poll job status
        const pollJob = async () => {
          try {
            const jobRes = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
            const job = jobRes.data;
            setResults(job.results || []);
            setProgressPercent(Math.round((job.completed / totalItems) * 100));
            fetchLogs();

            if (job.status === 'completed') {
              const s = job.summary || {};
              toast.success(`Completato: ${s.generated_ok || 0} generati, ${s.published_ok || 0} pubblicati su WP`);
              setSelectedCombinations([]);
              setGenerating(false);
              clearInterval(pollRef.current);
              return;
            }
            // Continue polling
            setTimeout(pollJob, 4000);
          } catch (e) {
            // Retry on network errors
            setTimeout(pollJob, 5000);
          }
        };
        setTimeout(pollJob, 5000);
        return; // Don't set generating=false yet
      } else {
        // Sync: generate only (fast)
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
      if (!publishToWp) {
        setGenerating(false);
        clearInterval(pollRef.current);
        fetchLogs();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!effectiveClientId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isAdmin ? 'Seleziona un cliente dalla lista Clienti.' : 'Nessun cliente associato al tuo account.'}
        </AlertDescription>
      </Alert>
    );
  }

  const hasApiKey = client?.configuration?.llm?.api_key || client?.configuration?.openai?.api_key;
  const llmConfig = client?.configuration?.llm || client?.configuration?.openai || {};
  const wpConfig = client?.configuration?.wordpress || {};
  const hasWpConfig = wpConfig.url_api && wpConfig.utente && wpConfig.password_applicazione;
  const providerName = { openai: 'OpenAI', anthropic: 'Claude', deepseek: 'DeepSeek', perplexity: 'Perplexity' }[llmConfig.provider] || 'LLM';

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (status === 'skipped') return <Clock className="w-4 h-4 text-slate-400" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const getActionLabel = (action) => {
    const labels = {
      batch_start: 'Avvio batch',
      batch_complete: 'Batch completato',
      article_generate: 'Generazione articolo',
      wordpress_publish: 'Pubblicazione WordPress'
    };
    return labels[action] || action;
  };

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
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
              Genera Articoli
            </h1>
            <p className="text-slate-500 mt-1">
              {client?.nome} — Seleziona le combinazioni e genera articoli SEO
            </p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {!hasApiKey && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            API Key LLM non configurata. Vai su <strong>Configurazione &gt; API Keys</strong> per inserirla.
          </AlertDescription>
        </Alert>
      )}
      {!hasWpConfig && publishToWp && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Credenziali WordPress non configurate. La pubblicazione diretta non sara' possibile.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Combinations Selection */}
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
                <p className="text-slate-500">Nessuna combinazione</p>
                <p className="text-sm text-slate-400 mt-1">Configura le keyword prima</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-2">
                  {combinations.map((combo, i) => {
                    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                    const isSelected = selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => toggleCombination(combo)}
                        data-testid={`combo-${i}`}
                      >
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

        {/* Center: Generation Panel + Results */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Riepilogo Generazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Articoli selezionati</span>
                <span className="text-2xl font-bold text-slate-900 font-['Manrope']">{selectedCombinations.length}</span>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="text-slate-900 font-medium">{client?.nome}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="text-slate-900 font-medium">{providerName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Modello</span><span className="text-slate-900 font-mono text-xs">{llmConfig?.modello}</span></div>
              </div>

              <Separator />

              {/* WordPress toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Pubblica su WordPress</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={publishToWp}
                  onClick={() => setPublishToWp(!publishToWp)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    publishToWp ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                  data-testid="publish-wp-toggle"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    publishToWp ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {publishToWp && !hasWpConfig && (
                <p className="text-xs text-red-500">Credenziali WP mancanti</p>
              )}
              {publishToWp && hasWpConfig && (
                <p className="text-xs text-emerald-600">WP: {wpConfig.url_api?.replace('https://', '').split('/')[0]} ({wpConfig.stato_pubblicazione})</p>
              )}

              {generating && (
                <div className="space-y-2">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-slate-500 text-center">Generazione in corso...</p>
                </div>
              )}
              
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold"
                onClick={handleGenerate}
                disabled={generating || selectedCombinations.length === 0 || !hasApiKey || (publishToWp && !hasWpConfig)}
                data-testid="generate-btn"
              >
                {generating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generazione...</>
                ) : publishToWp ? (
                  <><Send className="w-5 h-5 mr-2" />Genera e Pubblica ({selectedCombinations.length})</>
                ) : (
                  <><Zap className="w-5 h-5 mr-2" />Genera {selectedCombinations.length} Articoli</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Risultati
                </CardTitle>
                <CardDescription>
                  {results.filter(r => r.generation_status === 'success').length} generati,{' '}
                  {results.filter(r => r.publish_status === 'success').length} pubblicati
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2" data-testid={`result-${i}`}>
                        <p className="font-medium text-slate-900 text-sm truncate">{r.titolo}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            {getStatusIcon(r.generation_status)}
                            <span className="text-slate-600">Generazione</span>
                          </span>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(r.publish_status)}
                            <span className="text-slate-600">WordPress</span>
                          </span>
                        </div>
                        {r.wordpress_link && (
                          <a href={r.wordpress_link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            Vedi su WP <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {r.generation_error && (
                          <p className="text-xs text-red-600 bg-red-50 p-1 rounded">{r.generation_error}</p>
                        )}
                        {r.publish_error && (
                          <p className="text-xs text-red-600 bg-red-50 p-1 rounded">{r.publish_error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Activity Log */}
        <Card className="border-slate-200 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Storico operazioni</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchLogs} data-testid="refresh-logs-btn">
              <Loader2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {activityLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-sm">Nessuna attivita' registrata</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...activityLogs].reverse().map((log, i) => (
                    <div key={log.id || i} className={`p-3 rounded-lg border text-xs ${
                      log.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                      log.status === 'failed' ? 'bg-red-50 border-red-200' :
                      log.status === 'running' ? 'bg-blue-50 border-blue-200' :
                      'bg-slate-50 border-slate-200'
                    }`} data-testid={`log-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {getStatusIcon(log.status)}
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('it-IT')}
                        </span>
                      </div>
                      {log.details?.titolo && (
                        <p className="text-slate-600 truncate">{log.details.titolo}</p>
                      )}
                      {log.details?.error && (
                        <p className="text-red-600 mt-1 line-clamp-2">{log.details.error}</p>
                      )}
                      {log.details?.link && (
                        <a href={log.details.link} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 mt-1">
                          WP Link <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {log.details?.post_id && (
                        <p className="text-slate-500 mt-0.5">WP Post ID: {log.details.post_id}</p>
                      )}
                      {log.details?.total_combinations && (
                        <p className="text-slate-500">{log.details.total_combinations} combinazioni | {log.details.provider} ({log.details.model})</p>
                      )}
                      {log.details?.total !== undefined && log.action === 'batch_complete' && (
                        <p className="text-slate-500">{log.details.generated} generati, {log.details.published} pubblicati</p>
                      )}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
