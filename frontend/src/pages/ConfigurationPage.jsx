import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  Save, 
  Key, 
  Globe, 
  FileText, 
  Sparkles,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const REGISTRI = [
  { value: 'formale', label: 'Formale', desc: 'Tono istituzionale' },
  { value: 'professionale_accessibile', label: 'Professionale Accessibile', desc: 'Professionale ma comprensibile' },
  { value: 'amichevole_conversazionale', label: 'Amichevole', desc: 'Come parlare con un amico' },
  { value: 'entusiasta_coinvolgente', label: 'Entusiasta', desc: 'Energico e motivante' },
  { value: 'autorevole_tecnico', label: 'Autorevole Tecnico', desc: 'Esperto del settore' },
];

const PERSONA = [
  { value: 'seconda_singolare', label: 'Tu (seconda singolare)', desc: 'Più personale e diretto' },
  { value: 'prima_plurale', label: 'Noi (prima plurale)', desc: 'Più istituzionale' },
  { value: 'terza_neutrale', label: 'Neutrale (terza persona)', desc: 'Più giornalistico' },
];

// LLM Providers and Models
const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    models: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Raccomandato)' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Economico)' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    icon: '🎭',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5' },
      { id: 'claude-3-opus-20240229', name: 'Claude Opus 3' }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔍',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
    ]
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🌐',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro (Con Ricerca Web)' },
      { id: 'sonar', name: 'Sonar' },
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama 3.1 Sonar Large' }
    ]
  }
];

export const ConfigurationPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);
  
  // Configuration sections
  const [wordpress, setWordpress] = useState({
    url_api: '',
    utente: '',
    password_applicazione: '',
    stato_pubblicazione: 'draft'
  });
  
  const [llm, setLlm] = useState({
    provider: 'openai',
    api_key: '',
    modello: 'gpt-4-turbo-preview',
    temperatura: 0.7
  });
  
  const [seo, setSeo] = useState({
    lingua: 'italiano',
    lunghezza_minima_parole: 1500,
    include_faq_in_fondo: false
  });
  
  const [tono, setTono] = useState({
    registro: 'professionale_accessibile',
    persona_narrativa: 'seconda_singolare',
    descrizione_tono_libera: '',
    aggettivi_brand: [],
    parole_vietate: [],
    frasi_vietate: []
  });
  
  const [knowledge, setKnowledge] = useState({
    descrizione_attivita: '',
    storia_brand: '',
    citta_principale: '',
    regione: '',
    descrizione_geografica: '',
    punti_di_interesse_locali: [],
    punti_di_forza: [],
    pubblico_target_primario: '',
    pubblico_target_secondario: '',
    call_to_action_principale: ''
  });
  
  const [keywords, setKeywords] = useState({
    servizi: [],
    citta_e_zone: [],
    tipi_o_qualificatori: []
  });

  // Input states for adding items
  const [newAggettivo, setNewAggettivo] = useState('');
  const [newParolaVietata, setNewParolaVietata] = useState('');
  const [newFraseVietata, setNewFraseVietata] = useState('');
  const [newPuntoInteresse, setNewPuntoInteresse] = useState('');
  const [newPuntoForza, setNewPuntoForza] = useState('');
  const [newServizio, setNewServizio] = useState('');
  const [newCitta, setNewCitta] = useState('');
  const [newTipo, setNewTipo] = useState('');

  const effectiveClientId = isAdmin ? clientId : user?.client_id;

  useEffect(() => {
    const fetchClient = async () => {
      if (!effectiveClientId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/clients/${effectiveClientId}`, {
          headers: getAuthHeaders()
        });
        const clientData = response.data;
        setClient(clientData);
        
        // Load existing configuration
        const config = clientData.configuration || {};
        if (config.wordpress) setWordpress(config.wordpress);
        // Support both new llm config and legacy openai config
        if (config.llm) {
          setLlm(config.llm);
        } else if (config.openai) {
          setLlm({
            provider: 'openai',
            api_key: config.openai.api_key || '',
            modello: config.openai.modello || 'gpt-4-turbo-preview',
            temperatura: config.openai.temperatura || 0.7
          });
        }
        if (config.seo) setSeo(config.seo);
        if (config.tono_e_stile) setTono(config.tono_e_stile);
        if (config.knowledge_base) setKnowledge(config.knowledge_base);
        if (config.keyword_combinations) setKeywords(config.keyword_combinations);
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
        wordpress,
        openai,
        seo,
        tono_e_stile: tono,
        knowledge_base: knowledge,
        keyword_combinations: keywords
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Configurazione salvata');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const addToList = (list, setList, field, value, setValue) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList({ ...list, [field]: [...list[field], value.trim()] });
      setValue('');
    }
  };

  const removeFromList = (list, setList, field, value) => {
    setList({ ...list, [field]: list[field].filter(v => v !== value) });
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
          <AlertDescription>
            Nessun cliente associato al tuo account. Contatta l'amministratore.
          </AlertDescription>
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/clients')}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
              Configurazione
            </h1>
            {client && (
              <p className="text-slate-500 mt-1">{client.nome}</p>
            )}
          </div>
        </div>
        
        <Button 
          onClick={handleSave}
          className="bg-slate-900 hover:bg-slate-800"
          disabled={saving}
          data-testid="save-config-btn"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvataggio...' : 'Salva Configurazione'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="api" className="rounded-lg" data-testid="tab-api">
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-lg" data-testid="tab-knowledge">
            <FileText className="w-4 h-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="tone" className="rounded-lg" data-testid="tab-tone">
            <Sparkles className="w-4 h-4 mr-2" />
            Tono & Stile
          </TabsTrigger>
          <TabsTrigger value="keywords" className="rounded-lg" data-testid="tab-keywords">
            <Globe className="w-4 h-4 mr-2" />
            Keywords
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* OpenAI */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  OpenAI
                </CardTitle>
                <CardDescription>Configurazione per la generazione AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={openai.api_key}
                    onChange={(e) => setOpenai({ ...openai, api_key: e.target.value })}
                    placeholder="sk-..."
                    data-testid="openai-api-key-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modello</Label>
                  <Select
                    value={openai.modello}
                    onValueChange={(v) => setOpenai({ ...openai, modello: v })}
                  >
                    <SelectTrigger data-testid="openai-model-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo (Raccomandato)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Economico)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temperatura ({openai.temperatura})</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={openai.temperatura}
                    onChange={(e) => setOpenai({ ...openai, temperatura: parseFloat(e.target.value) })}
                    className="w-full"
                    data-testid="openai-temp-slider"
                  />
                  <p className="text-xs text-slate-500">
                    0.0 = deterministico | 1.0 = creativo | 0.7 = equilibrato
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* WordPress */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  WordPress
                </CardTitle>
                <CardDescription>Credenziali per la pubblicazione</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL API</Label>
                  <Input
                    value={wordpress.url_api}
                    onChange={(e) => setWordpress({ ...wordpress, url_api: e.target.value })}
                    placeholder="https://sito.it/wp-json/wp/v2/posts"
                    data-testid="wp-url-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Utente</Label>
                  <Input
                    value={wordpress.utente}
                    onChange={(e) => setWordpress({ ...wordpress, utente: e.target.value })}
                    placeholder="username"
                    data-testid="wp-user-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password Applicazione</Label>
                  <Input
                    type="password"
                    value={wordpress.password_applicazione}
                    onChange={(e) => setWordpress({ ...wordpress, password_applicazione: e.target.value })}
                    placeholder="xxxx xxxx xxxx xxxx"
                    data-testid="wp-pass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stato Pubblicazione</Label>
                  <Select
                    value={wordpress.stato_pubblicazione}
                    onValueChange={(v) => setWordpress({ ...wordpress, stato_pubblicazione: v })}
                  >
                    <SelectTrigger data-testid="wp-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bozza</SelectItem>
                      <SelectItem value="publish">Pubblica</SelectItem>
                      <SelectItem value="pending">In Revisione</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Informazioni Azienda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrizione Attività</Label>
                  <Textarea
                    value={knowledge.descrizione_attivita}
                    onChange={(e) => setKnowledge({ ...knowledge, descrizione_attivita: e.target.value })}
                    placeholder="Descrivi l'attività principale..."
                    rows={3}
                    data-testid="kb-descrizione-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Storia del Brand</Label>
                  <Textarea
                    value={knowledge.storia_brand}
                    onChange={(e) => setKnowledge({ ...knowledge, storia_brand: e.target.value })}
                    placeholder="La storia dell'azienda..."
                    rows={3}
                    data-testid="kb-storia-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Call to Action Principale</Label>
                  <Input
                    value={knowledge.call_to_action_principale}
                    onChange={(e) => setKnowledge({ ...knowledge, call_to_action_principale: e.target.value })}
                    placeholder="Es: Richiedi un preventivo gratuito"
                    data-testid="kb-cta-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Territorio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Città Principale</Label>
                    <Input
                      value={knowledge.citta_principale}
                      onChange={(e) => setKnowledge({ ...knowledge, citta_principale: e.target.value })}
                      placeholder="Es: Salerno"
                      data-testid="kb-citta-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Regione</Label>
                    <Input
                      value={knowledge.regione}
                      onChange={(e) => setKnowledge({ ...knowledge, regione: e.target.value })}
                      placeholder="Es: Campania"
                      data-testid="kb-regione-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrizione Geografica</Label>
                  <Textarea
                    value={knowledge.descrizione_geografica}
                    onChange={(e) => setKnowledge({ ...knowledge, descrizione_geografica: e.target.value })}
                    placeholder="Descrizione del territorio..."
                    rows={2}
                    data-testid="kb-geo-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Punti di Interesse Locali</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPuntoInteresse}
                      onChange={(e) => setNewPuntoInteresse(e.target.value)}
                      placeholder="Aggiungi punto di interesse"
                      onKeyPress={(e) => e.key === 'Enter' && addToList(knowledge, setKnowledge, 'punti_di_interesse_locali', newPuntoInteresse, setNewPuntoInteresse)}
                      data-testid="kb-poi-input"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => addToList(knowledge, setKnowledge, 'punti_di_interesse_locali', newPuntoInteresse, setNewPuntoInteresse)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {knowledge.punti_di_interesse_locali.map((poi) => (
                      <Badge key={poi} variant="secondary" className="pl-2">
                        {poi}
                        <button
                          onClick={() => removeFromList(knowledge, setKnowledge, 'punti_di_interesse_locali', poi)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Target</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pubblico Target Primario</Label>
                  <Input
                    value={knowledge.pubblico_target_primario}
                    onChange={(e) => setKnowledge({ ...knowledge, pubblico_target_primario: e.target.value })}
                    placeholder="Es: Turisti italiani e stranieri"
                    data-testid="kb-target1-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pubblico Target Secondario</Label>
                  <Input
                    value={knowledge.pubblico_target_secondario}
                    onChange={(e) => setKnowledge({ ...knowledge, pubblico_target_secondario: e.target.value })}
                    placeholder="Es: Aziende locali"
                    data-testid="kb-target2-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Punti di Forza</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newPuntoForza}
                    onChange={(e) => setNewPuntoForza(e.target.value)}
                    placeholder="Aggiungi punto di forza"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(knowledge, setKnowledge, 'punti_di_forza', newPuntoForza, setNewPuntoForza)}
                    data-testid="kb-forza-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(knowledge, setKnowledge, 'punti_di_forza', newPuntoForza, setNewPuntoForza)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {knowledge.punti_di_forza.map((pf, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm">{pf}</span>
                        <button
                          onClick={() => removeFromList(knowledge, setKnowledge, 'punti_di_forza', pf)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tone Tab */}
        <TabsContent value="tone" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Registro e Persona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Registro</Label>
                  <Select
                    value={tono.registro}
                    onValueChange={(v) => setTono({ ...tono, registro: v })}
                  >
                    <SelectTrigger data-testid="tone-registro-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGISTRI.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <div>
                            <span className="font-medium">{r.label}</span>
                            <span className="text-slate-500 ml-2 text-xs">{r.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Persona Narrativa</Label>
                  <Select
                    value={tono.persona_narrativa}
                    onValueChange={(v) => setTono({ ...tono, persona_narrativa: v })}
                  >
                    <SelectTrigger data-testid="tone-persona-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSONA.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div>
                            <span className="font-medium">{p.label}</span>
                            <span className="text-slate-500 ml-2 text-xs">{p.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrizione Tono Libera</Label>
                  <Textarea
                    value={tono.descrizione_tono_libera}
                    onChange={(e) => setTono({ ...tono, descrizione_tono_libera: e.target.value })}
                    placeholder="Descrivi il tono desiderato in modo libero..."
                    rows={3}
                    data-testid="tone-desc-input"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Aggettivi del Brand</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAggettivo}
                    onChange={(e) => setNewAggettivo(e.target.value)}
                    placeholder="Es: affidabile, professionale"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(tono, setTono, 'aggettivi_brand', newAggettivo, setNewAggettivo)}
                    data-testid="tone-agg-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(tono, setTono, 'aggettivi_brand', newAggettivo, setNewAggettivo)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tono.aggettivi_brand.map((agg) => (
                    <Badge key={agg} className="bg-blue-50 text-blue-700 border-blue-200">
                      {agg}
                      <button
                        onClick={() => removeFromList(tono, setTono, 'aggettivi_brand', agg)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Parole Vietate</CardTitle>
                <CardDescription>Parole da evitare negli articoli</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newParolaVietata}
                    onChange={(e) => setNewParolaVietata(e.target.value)}
                    placeholder="Es: ovviamente, semplicemente"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(tono, setTono, 'parole_vietate', newParolaVietata, setNewParolaVietata)}
                    data-testid="tone-parole-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(tono, setTono, 'parole_vietate', newParolaVietata, setNewParolaVietata)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tono.parole_vietate.map((pv) => (
                    <Badge key={pv} variant="outline" className="text-red-600 border-red-200">
                      {pv}
                      <button
                        onClick={() => removeFromList(tono, setTono, 'parole_vietate', pv)}
                        className="ml-1 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Frasi Vietate</CardTitle>
                <CardDescription>Frasi da evitare negli articoli</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newFraseVietata}
                    onChange={(e) => setNewFraseVietata(e.target.value)}
                    placeholder="Es: non esitare a contattarci"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(tono, setTono, 'frasi_vietate', newFraseVietata, setNewFraseVietata)}
                    data-testid="tone-frasi-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(tono, setTono, 'frasi_vietate', newFraseVietata, setNewFraseVietata)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {tono.frasi_vietate.map((fv, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                        <span className="text-sm text-red-700">{fv}</span>
                        <button
                          onClick={() => removeFromList(tono, setTono, 'frasi_vietate', fv)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="mt-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              Le tre liste vengono combinate automaticamente. Ogni combinazione = un articolo possibile.
              <br />
              <strong>Strategia:</strong> Servizi = cosa offri | Città = dove sei | Tipi = per chi/quale tipo
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Servizi</CardTitle>
                <CardDescription>Cosa offri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newServizio}
                    onChange={(e) => setNewServizio(e.target.value)}
                    placeholder="Es: noleggio auto"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(keywords, setKeywords, 'servizi', newServizio, setNewServizio)}
                    data-testid="kw-servizi-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(keywords, setKeywords, 'servizi', newServizio, setNewServizio)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {keywords.servizi.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg font-mono text-sm">
                        <span>{s}</span>
                        <button
                          onClick={() => removeFromList(keywords, setKeywords, 'servizi', s)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-slate-500 text-center">
                  {keywords.servizi.length} servizi
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Città e Zone</CardTitle>
                <CardDescription>Dove operi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newCitta}
                    onChange={(e) => setNewCitta(e.target.value)}
                    placeholder="Es: Salerno"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(keywords, setKeywords, 'citta_e_zone', newCitta, setNewCitta)}
                    data-testid="kw-citta-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(keywords, setKeywords, 'citta_e_zone', newCitta, setNewCitta)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {keywords.citta_e_zone.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg font-mono text-sm">
                        <span>{c}</span>
                        <button
                          onClick={() => removeFromList(keywords, setKeywords, 'citta_e_zone', c)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-slate-500 text-center">
                  {keywords.citta_e_zone.length} località
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Tipi/Qualificatori</CardTitle>
                <CardDescription>Per chi/quale tipo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value)}
                    placeholder="Es: economico, di lusso"
                    onKeyPress={(e) => e.key === 'Enter' && addToList(keywords, setKeywords, 'tipi_o_qualificatori', newTipo, setNewTipo)}
                    data-testid="kw-tipi-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToList(keywords, setKeywords, 'tipi_o_qualificatori', newTipo, setNewTipo)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {keywords.tipi_o_qualificatori.map((t, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg font-mono text-sm">
                        <span>{t}</span>
                        <button
                          onClick={() => removeFromList(keywords, setKeywords, 'tipi_o_qualificatori', t)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-slate-500 text-center">
                  {keywords.tipi_o_qualificatori.length} qualificatori
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Combinations Preview */}
          <Card className="border-slate-200 mt-6">
            <CardHeader>
              <CardTitle>Anteprima Combinazioni</CardTitle>
              <CardDescription>
                {keywords.servizi.length} servizi × {keywords.citta_e_zone.length} città × {keywords.tipi_o_qualificatori.length} tipi = 
                <strong className="text-slate-900 ml-1">
                  {keywords.servizi.length * keywords.citta_e_zone.length * keywords.tipi_o_qualificatori.length} articoli possibili
                </strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {keywords.servizi.slice(0, 2).map(s => 
                  keywords.citta_e_zone.slice(0, 2).map(c =>
                    keywords.tipi_o_qualificatori.slice(0, 2).map(t => (
                      <Badge key={`${s}-${c}-${t}`} variant="outline" className="font-mono text-xs">
                        {s} {t} a {c}
                      </Badge>
                    ))
                  )
                )}
                {(keywords.servizi.length * keywords.citta_e_zone.length * keywords.tipi_o_qualificatori.length) > 8 && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    +{(keywords.servizi.length * keywords.citta_e_zone.length * keywords.tipi_o_qualificatori.length) - 8} altre
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
