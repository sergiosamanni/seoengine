import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import {
  AlertCircle, Loader2, ArrowLeft, Settings, PenTool, BarChart3, 
  Key, FileText, Sparkles, Globe, History, Save
} from 'lucide-react';
import { toast } from 'sonner';

// Components
import AdminGenerator from '../components/admin-workspace/AdminGenerator';
import ClientGenerator from '../components/client-workspace/ClientGenerator';
import ArticleHistory from '../components/client-workspace/ArticleHistory';

// Configuration Tabs
import { ApiKeysTab } from './configuration/ApiKeysTab';
import { KnowledgeBaseTab } from './configuration/KnowledgeBaseTab';
import { ToneStyleTab } from './configuration/ToneStyleTab';
import { GscConnectionTab } from './configuration/GscConnectionTab';
import { GscDataTab } from './configuration/GscDataTab';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { clientId: routeClientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(null);
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    } else if (location.pathname.endsWith('/config')) {
      setActiveTab('config');
    } else if (location.pathname.endsWith('/gsc')) {
      setActiveTab('gsc');
    } else {
      setActiveTab('generate');
    }
  }, [location.pathname, searchParams]);

  // Configuration States (synced from ConfigurationPage.jsx logic)
  const [wordpress, setWordpress] = useState({ url_api: '', utente: '', password_applicazione: '', stato_pubblicazione: 'draft' });
  const [llm, setLlm] = useState({ provider: 'openai', api_key: '', modello: 'gpt-4-turbo-preview', temperatura: 0.7 });
  const [seo, setSeo] = useState({ lingua: 'italiano', lunghezza_minima_parole: 1500, include_faq_in_fondo: false });
  const [tono, setTono] = useState({ registro: 'professionale_accessibile', persona_narrativa: 'seconda_singolare', descrizione_tono_libera: '', aggettivi_brand: [], parole_vietate: [], frasi_vietate: [] });
  const [knowledge, setKnowledge] = useState({ descrizione_attivita: '', storia_brand: '', citta_principale: '', regione: '', descrizione_geografica: '', punti_di_interesse_locali: [], punti_di_forza: [], pubblico_target_primario: '', pubblico_target_secondario: '', call_to_action_principale: '' });

  const effectiveClientId = isAdmin ? routeClientId : user?.client_id;

  useEffect(() => {
    const fetch = async () => {
      if (!effectiveClientId) { setLoading(false); return; }
      try {
        const res = await axios.get(`${API}/clients/${effectiveClientId}`, { headers: getAuthHeaders() });
        const clientData = res.data;
        setClient(clientData);
        
        // Sync configuration states
        const config = clientData.configuration || {};
        if (config.wordpress) setWordpress(config.wordpress);
        if (config.llm) setLlm(config.llm);
        else if (config.openai) setLlm({ provider: 'openai', api_key: config.openai.api_key || '', modello: config.openai.modello || 'gpt-4-turbo-preview', temperatura: config.openai.temperatura || 0.7 });
        if (config.seo) setSeo(config.seo);
        if (config.tono_e_stile) setTono(config.tono_e_stile);
        if (config.knowledge_base) setKnowledge(config.knowledge_base);

        // Check for GSC redirect success
        if (searchParams.get('gsc_connected') === 'true') {
            toast.success('Google Search Console connesso!');
            setActiveTab('gsc'); // Switch to GSC data tab on success
        }
      } catch (e) { toast.error('Errore caricamento cliente'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [effectiveClientId, searchParams]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
        wordpress, llm, openai: llm, seo,
        tono_e_stile: tono, knowledge_base: knowledge
      }, { headers: getAuthHeaders() });
      toast.success('Configurazione salvata');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const onTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (!effectiveClientId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {isAdmin ? 'Seleziona un cliente dalla lista Clienti.' : 'Nessun cliente associato. Contatta l\'amministratore.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header - Refined & Elegant */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-10 w-10 rounded-xl bg-white border border-[#f1f3f6] hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-slate-200">
                {client?.nome?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="leading-tight">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{client?.nome}</h1>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-bold">Workspace: {client?.sito_web?.replace('https://', '')?.replace('http://', '')}</p>
            </div>
          </div>
        </div>
        
        {activeTab === 'config' && (
            <Button onClick={handleSaveConfig} disabled={saving} className="bg-slate-900 hover:bg-slate-800 h-10 rounded-xl px-6 text-xs font-bold uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salva Modifiche
            </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="w-full justify-start bg-transparent p-0 h-auto flex-wrap mb-10 border-b border-[#f1f3f6] rounded-none gap-10">
          <TabsTrigger value="generate" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all">
            Genera Contenuti
          </TabsTrigger>
          <TabsTrigger value="gsc" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all">
            Dashboard Search Console
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all">
            Configurazione & Setup
          </TabsTrigger>
        </TabsList>

        {/* TAB: GENERATE */}
        <TabsContent value="generate" className="mt-0 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isAdmin ? (
            <AdminGenerator 
              client={client} 
              effectiveClientId={effectiveClientId} 
              getAuthHeaders={getAuthHeaders} 
              navigate={navigate} 
            />
          ) : (
            <ClientGenerator 
              client={client} 
              effectiveClientId={effectiveClientId} 
              getAuthHeaders={getAuthHeaders} 
              navigate={navigate} 
            />
          )}
          
          <div className="pt-8 border-t border-[#f1f3f6]">
            <ArticleHistory effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
          </div>
        </TabsContent>

        {/* TAB: GSC DATA */}
        <TabsContent value="gsc" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GscDataTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} client={client} />
        </TabsContent>

        {/* TAB: CONFIGURATION */}
        <TabsContent value="config" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-[#f1f3f6] shadow-xl shadow-slate-100/50 rounded-3xl overflow-hidden bg-white">
            <CardContent className="p-0">
                <Tabs defaultValue="api" className="w-full">
                    <TabsList className="w-full justify-start bg-slate-50/50 p-2 border-b border-[#f1f3f6] rounded-none overflow-x-auto h-auto px-6 gap-2">
                        <TabsTrigger value="api" className="rounded-xl py-2 px-4 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">API Settings</TabsTrigger>
                        <TabsTrigger value="knowledge" className="rounded-xl py-2 px-4 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">General Knowledge</TabsTrigger>
                        <TabsTrigger value="tone" className="rounded-xl py-2 px-4 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Tone & Identity</TabsTrigger>
                        <TabsTrigger value="gsc_setup" className="rounded-xl py-2 px-4 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Search Console Link</TabsTrigger>
                    </TabsList>

                    <div className="p-10">
                        <TabsContent value="api" className="m-0">
                            <ApiKeysTab llm={llm} setLlm={setLlm} wordpress={wordpress} setWordpress={setWordpress} />
                        </TabsContent>
                        <TabsContent value="knowledge" className="m-0">
                            <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
                        </TabsContent>
                        <TabsContent value="tone" className="m-0">
                            <ToneStyleTab tono={tono} setTono={setTono} />
                        </TabsContent>
                        <TabsContent value="gsc_setup" className="m-0">
                            <GscConnectionTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} isAdmin={isAdmin} />
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratorPage;
