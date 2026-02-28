import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  ArrowLeft,
  Save,
  Key,
  Globe,
  FileText,
  Sparkles,
  AlertCircle,
  Lock,
  Search,
  Loader2,
  Zap,
  History
} from 'lucide-react';
import { toast } from 'sonner';

// Tab sub-components
import { ApiKeysTab } from './configuration/ApiKeysTab';
import { KnowledgeBaseTab } from './configuration/KnowledgeBaseTab';
import { ToneStyleTab } from './configuration/ToneStyleTab';
import { KeywordsTab } from './configuration/KeywordsTab';
import { SerpAnalysisTab } from './configuration/SerpAnalysisTab';
import { AdvancedPromptTab } from './configuration/AdvancedPromptTab';
import { ContentStrategyTab } from './configuration/ContentStrategyTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ConfigurationPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);

  // Configuration state
  const [wordpress, setWordpress] = useState({
    url_api: '', utente: '', password_applicazione: '', stato_pubblicazione: 'draft'
  });
  const [llm, setLlm] = useState({
    provider: 'openai', api_key: '', modello: 'gpt-4-turbo-preview', temperatura: 0.7
  });
  const [seo, setSeo] = useState({
    lingua: 'italiano', lunghezza_minima_parole: 1500, include_faq_in_fondo: false
  });
  const [tono, setTono] = useState({
    registro: 'professionale_accessibile', persona_narrativa: 'seconda_singolare',
    descrizione_tono_libera: '', aggettivi_brand: [], parole_vietate: [], frasi_vietate: []
  });
  const [knowledge, setKnowledge] = useState({
    descrizione_attivita: '', storia_brand: '', citta_principale: '', regione: '',
    descrizione_geografica: '', punti_di_interesse_locali: [], punti_di_forza: [],
    pubblico_target_primario: '', pubblico_target_secondario: '', call_to_action_principale: ''
  });
  const [keywords, setKeywords] = useState({
    servizi: [], citta_e_zone: [], tipi_o_qualificatori: []
  });
  const [apify, setApify] = useState({ enabled: false, api_key: '', actor_id: 'apify/google-search-scraper' });
  const [advancedPrompt, setAdvancedPrompt] = useState({
    prompt_password: '', secondo_livello_prompt: '', keyword_injection_template: ''
  });
  const [contentStrategy, setContentStrategy] = useState({
    funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS',
    buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '',
    cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [],
    keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: ''
  });

  // Save and Generate state
  const [saveAndGenerating, setSaveAndGenerating] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const effectiveClientId = isAdmin ? clientId : user?.client_id;

  useEffect(() => {
    const fetchClient = async () => {
      if (!effectiveClientId) { setLoading(false); return; }
      try {
        const response = await axios.get(`${API}/clients/${effectiveClientId}`, { headers: getAuthHeaders() });
        const clientData = response.data;
        setClient(clientData);

        const config = clientData.configuration || {};
        if (config.wordpress) setWordpress(config.wordpress);
        if (config.llm) {
          setLlm(config.llm);
        } else if (config.openai) {
          setLlm({
            provider: 'openai', api_key: config.openai.api_key || '',
            modello: config.openai.modello || 'gpt-4-turbo-preview', temperatura: config.openai.temperatura || 0.7
          });
        }
        if (config.seo) setSeo(config.seo);
        if (config.tono_e_stile) setTono(config.tono_e_stile);
        if (config.knowledge_base) setKnowledge(config.knowledge_base);
        if (config.keyword_combinations) setKeywords(config.keyword_combinations);
        if (config.apify) setApify(config.apify);
        if (config.advanced_prompt) setAdvancedPrompt(config.advanced_prompt);
        if (config.content_strategy) setContentStrategy(prev => ({ ...prev, ...config.content_strategy }));
      } catch (error) {
        toast.error('Errore nel caricamento della configurazione');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [effectiveClientId, getAuthHeaders]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
        wordpress, llm, openai: llm, apify, seo,
        tono_e_stile: tono, knowledge_base: knowledge, keyword_combinations: keywords,
        content_strategy: contentStrategy
      }, { headers: getAuthHeaders() });
      toast.success('Configurazione salvata');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    setSaveAndGenerating(true);
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
        wordpress, llm, openai: llm, apify, seo,
        tono_e_stile: tono, knowledge_base: knowledge, keyword_combinations: keywords,
        content_strategy: contentStrategy
      }, { headers: getAuthHeaders() });

      const response = await axios.post(
        `${API}/clients/${effectiveClientId}/save-and-generate?session_name=${encodeURIComponent(sessionName)}&notes=${encodeURIComponent(sessionNotes)}`,
        {}, { headers: getAuthHeaders() }
      );
      const result = response.data;
      toast.success(`Sessione "${result.session_name}" salvata! ${result.combinations_ready} combinazioni pronte.`, { duration: 5000 });

      setSessionName('');
      setSessionNotes('');
      setShowSaveDialog(false);

      if (result.combinations_ready > 0) {
        navigate(isAdmin ? `/clients/${effectiveClientId}` : '/generator');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaveAndGenerating(false);
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
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Nessun cliente associato al tuo account. Contatta l'amministratore.</AlertDescription>
        </Alert>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Configurazione</h1>
            {client && <p className="text-slate-500 mt-1">{client.nome}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(isAdmin ? `/clients/${effectiveClientId}/history` : '/history')} data-testid="history-btn">
            <History className="w-4 h-4 mr-2" />Storico
          </Button>
          <Button onClick={handleSave} variant="outline" disabled={saving} data-testid="save-config-btn">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Salvataggio...' : 'Salva'}
          </Button>
          <Button onClick={() => setShowSaveDialog(true)} className="bg-orange-500 hover:bg-orange-600" data-testid="save-and-generate-btn">
            <Zap className="w-4 h-4 mr-2" />Salva e Genera
          </Button>
        </div>
      </div>

      {/* Save and Generate Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />Salva Sessione e Genera
            </DialogTitle>
            <DialogDescription>
              Salva la configurazione attuale nello storico e prepara le combinazioni per la generazione articoli.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Sessione (opzionale)</Label>
              <Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="Es: Campagna Estate 2024" data-testid="session-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="Aggiungi note per questa sessione..." rows={3} data-testid="session-notes-input" />
            </div>
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-slate-700">Riepilogo dati da salvare:</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-slate-500">Servizi:</span><span className="ml-1 font-semibold">{keywords.servizi?.length || 0}</span></div>
                <div><span className="text-slate-500">Citta:</span><span className="ml-1 font-semibold">{keywords.citta_e_zone?.length || 0}</span></div>
                <div><span className="text-slate-500">Tipi:</span><span className="ml-1 font-semibold">{keywords.tipi_o_qualificatori?.length || 0}</span></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Combinazioni totali: <strong>{(keywords.servizi?.length || 0) * (keywords.citta_e_zone?.length || 0) * (keywords.tipi_o_qualificatori?.length || 0)}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annulla</Button>
            <Button onClick={handleSaveAndGenerate} className="bg-orange-500 hover:bg-orange-600" disabled={saveAndGenerating} data-testid="confirm-save-generate-btn">
              {saveAndGenerating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</>) : (<><Zap className="w-4 h-4 mr-2" />Conferma e Procedi</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <TabsTrigger value="api" className="rounded-lg" data-testid="tab-api"><Key className="w-4 h-4 mr-2" />API Keys</TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-lg" data-testid="tab-knowledge"><FileText className="w-4 h-4 mr-2" />Knowledge Base</TabsTrigger>
          <TabsTrigger value="tone" className="rounded-lg" data-testid="tab-tone"><Sparkles className="w-4 h-4 mr-2" />Tono & Stile</TabsTrigger>
          <TabsTrigger value="keywords" className="rounded-lg" data-testid="tab-keywords"><Globe className="w-4 h-4 mr-2" />Keywords</TabsTrigger>
          <TabsTrigger value="strategy" className="rounded-lg" data-testid="tab-strategy"><Zap className="w-4 h-4 mr-2" />Strategia</TabsTrigger>
          <TabsTrigger value="serp" className="rounded-lg" data-testid="tab-serp"><Search className="w-4 h-4 mr-2" />SERP</TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-lg" data-testid="tab-advanced"><Lock className="w-4 h-4 mr-2" />Prompt Avanzato</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-6">
          <ApiKeysTab llm={llm} setLlm={setLlm} wordpress={wordpress} setWordpress={setWordpress} apify={apify} setApify={setApify} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} />
        </TabsContent>

        <TabsContent value="tone" className="mt-6">
          <ToneStyleTab tono={tono} setTono={setTono} />
        </TabsContent>

        <TabsContent value="keywords" className="mt-6">
          <KeywordsTab keywords={keywords} setKeywords={setKeywords} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
        </TabsContent>

        <TabsContent value="serp" className="mt-6">
          <SerpAnalysisTab apify={apify} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedPromptTab advancedPrompt={advancedPrompt} setAdvancedPrompt={setAdvancedPrompt} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
