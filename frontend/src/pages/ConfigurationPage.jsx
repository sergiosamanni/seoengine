import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, Save, Key, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ApiKeysTab } from './configuration/ApiKeysTab';
import { KnowledgeBaseTab } from './configuration/KnowledgeBaseTab';
import { ToneStyleTab } from './configuration/ToneStyleTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ConfigurationPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);

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
  const [apify, setApify] = useState({ enabled: false, api_key: '', actor_id: 'apify/google-search-scraper' });

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
        if (config.llm) setLlm(config.llm);
        else if (config.openai) {
          setLlm({ provider: 'openai', api_key: config.openai.api_key || '', modello: config.openai.modello || 'gpt-4-turbo-preview', temperatura: config.openai.temperatura || 0.7 });
        }
        if (config.seo) setSeo(config.seo);
        if (config.tono_e_stile) setTono(config.tono_e_stile);
        if (config.knowledge_base) setKnowledge(config.knowledge_base);
        if (config.apify) setApify(config.apify);
      } catch (error) {
        toast.error('Errore nel caricamento della configurazione');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [effectiveClientId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
        wordpress, llm, openai: llm, apify, seo,
        tono_e_stile: tono, knowledge_base: knowledge
      }, { headers: getAuthHeaders() });
      toast.success('Configurazione salvata');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!effectiveClientId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Nessun cliente associato al tuo account. Contatta l'amministratore.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Configurazione</h1>
            {client && <p className="text-slate-500 mt-1">{client.nome} — Impostazioni base</p>}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800" data-testid="save-config-btn">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Salvataggio...' : 'Salva Configurazione'}
        </Button>
      </div>

      <Tabs defaultValue="api" className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="api" className="rounded-lg" data-testid="tab-api"><Key className="w-4 h-4 mr-2" />API Keys</TabsTrigger>
          <TabsTrigger value="knowledge" className="rounded-lg" data-testid="tab-knowledge"><FileText className="w-4 h-4 mr-2" />Knowledge Base</TabsTrigger>
          <TabsTrigger value="tone" className="rounded-lg" data-testid="tab-tone"><Sparkles className="w-4 h-4 mr-2" />Tono & Stile</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="mt-6">
          <ApiKeysTab llm={llm} setLlm={setLlm} wordpress={wordpress} setWordpress={setWordpress} apify={apify} setApify={setApify} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
        </TabsContent>
        <TabsContent value="tone" className="mt-6">
          <ToneStyleTab tono={tono} setTono={setTono} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
