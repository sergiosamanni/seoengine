import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import {
  AlertCircle, Loader2, ArrowLeft, Settings, PenTool, BarChart3, 
  Key, FileText, Sparkles, Globe, History, Save, Zap, MessageCircle, Target, Layers
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
import { SEOSettingsTab } from './configuration/SEOSettingsTab';
import { KeywordsTab } from './configuration/KeywordsTab';
import { WordPressTab } from './configuration/WordPressTab';
import { ContentStrategyTab } from './configuration/ContentStrategyTab';
import { AutopilotTab } from './configuration/AutopilotTab';
import { GscConnectionTab } from './configuration/GscConnectionTab';
import { GscDataTab } from './configuration/GscDataTab';
import FreshnessTab from './client-workspace/FreshnessTab';
import SeoChatTab from './client-workspace/SeoChatTab';



export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { 
    client, loading, saving, fetchClient, 
    updateConfiguration, addToEditorialQueue: addToQueueFromContext 
  } = useClient();
  
  const { clientId: routeClientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    } else if (location.pathname.endsWith('/config')) {
      setActiveTab('config');
    } else if (location.pathname.endsWith('/gsc')) {
      setActiveTab('gsc');
    } else if (location.pathname.endsWith('/generate')) {
      setActiveTab('single');
    } else {
      setActiveTab('config');
    }
  }, [location.pathname, searchParams]);

  // Configuration States
  const [wordpress, setWordpress] = useState({ url_api: '', utente: '', password_applicazione: '', stato_pubblicazione: 'draft' });
  const [llm, setLlm] = useState({ provider: 'deepseek', api_key: '', modello: 'deepseek-chat', temperatura: 0.7 });
  const [openai, setOpenai] = useState({ api_key: '', modello: 'gpt-4o', temperatura: 0.6 });
  const [seo, setSeo] = useState({ lingua: 'italiano', lunghezza_minima_parole: 1500, include_faq_in_fondo: false });
  const [tono, setTono] = useState({ registro: 'professionale_accessibile', persona_narrativa: 'seconda_singolare', descrizione_tono_libera: '', aggettivi_brand: [], parole_vietate: [], frasi_vietate: [] });
  const [knowledge, setKnowledge] = useState({ descrizione_attivita: '', storia_brand: '', citta_principale: '', regione: '', descrizione_geografica: '', punti_di_interesse_locali: [], punti_di_forza: [], pubblico_target_primario: '', pubblico_target_secondario: '', call_to_action_principale: '' });
  const [autopilot, setAutopilot] = useState({ enabled: false, frequency: 'weekly', strategy: 'editorial_plan_first', time_of_day: '09:00', auto_publish: true });

  const [userClients, setUserClients] = useState([]);
  const [currentClientId, setCurrentClientId] = useState(isAdmin ? routeClientId : user?.client_id);

  useEffect(() => {
    if (isAdmin) {
      setCurrentClientId(routeClientId);
    }
  }, [isAdmin, routeClientId]);

  useEffect(() => {
    if (!isAdmin && user?.client_ids?.length > 1) {
      const fetchUserClients = async () => {
        try {
          const res = await axios.get(`${API}/clients`, { headers: getAuthHeaders() });
          setUserClients(res.data);
        } catch (e) {
          console.error("Error fetching user clients", e);
        }
      };
      fetchUserClients();
    }
  }, [isAdmin, user, getAuthHeaders]);

  const effectiveClientId = currentClientId;

  useEffect(() => {
    if (effectiveClientId) {
      fetchClient(effectiveClientId);
    }
  }, [effectiveClientId, fetchClient]);

  useEffect(() => {
    if (client) {
      const config = client.configuration || {};
      if (config.wordpress) setWordpress(config.wordpress);
      if (config.llm) setLlm(config.llm);
      if (config.openai) setOpenai(config.openai);
      else if (config.llm && config.llm.provider === 'openai') setOpenai({ api_key: config.llm.api_key || '', modello: config.llm.modello || 'gpt-4o', temperatura: config.llm.temperatura || 0.6 });
      if (config.seo) setSeo(config.seo);
      if (config.tono_e_stile) setTono(config.tono_e_stile);
      if (config.knowledge_base) setKnowledge(config.knowledge_base);
      if (config.autopilot) setAutopilot(config.autopilot);

      if (searchParams.get('gsc_connected') === 'true') {
          toast.success('Google Search Console connesso!');
          onTabChange('gsc');
      }
    }
  }, [client]);

  const addToEditorialQueue = (keyword) => {
    addToQueueFromContext(effectiveClientId, keyword);
  };

  const handleSaveConfig = async () => {
    await updateConfiguration(effectiveClientId, {
      wordpress, llm, openai, seo,
      tono_e_stile: tono, knowledge_base: knowledge,
      autopilot
    });
  };

  const onTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (loading && !client) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

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
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-10 w-10 rounded-xl bg-white border border-[#f1f3f6] hover:bg-slate-50 shadow-sm">
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-900" />
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-slate-200">
                    {client?.nome?.charAt(0).toUpperCase() || 'C'}
                </div>
                {!isAdmin && user?.client_ids?.length > 1 && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Globe className="w-3 h-3 text-white" />
                    </div>
                )}
            </div>
            <div className="leading-tight">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{client?.nome}</h1>
                    {!isAdmin && user?.client_ids?.length > 1 && (
                        <select 
                            value={effectiveClientId} 
                            onChange={(e) => setCurrentClientId(e.target.value)}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/50 border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-blue-100 transition-all"
                        >
                            {userClients.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-bold">Workspace: {client?.sito_web?.replace('https://', '')?.replace('http://', '')}</p>
            </div>
          </div>
        </div>
        
        {(activeTab === 'config' || activeTab === 'autopilot') && (
            <div className="flex items-center gap-3">
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-slate-900 hover:bg-slate-800 h-10 rounded-xl px-6 text-xs font-bold uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salva Modifiche
                </Button>
            </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="hidden lg:flex w-full justify-start bg-transparent p-0 h-auto flex-wrap mb-10 border-b border-[#f1f3f6] rounded-none gap-6">
          {isAdmin && (
            <>
              <TabsTrigger value="config" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all">
                Configurazione Workspace
              </TabsTrigger>
              <TabsTrigger value="gsc" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all">
                Dashboard Search Console
              </TabsTrigger>
            </>
          )}
          {isAdmin && (
            <>
              <TabsTrigger value="single" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5" />
                Articolo Singolo
              </TabsTrigger>
              <TabsTrigger value="plan" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Piano Editoriale
              </TabsTrigger>
              <TabsTrigger value="programmatic" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                SEO Programmatica
              </TabsTrigger>
            </>
          )}
          {!isAdmin && (
            <TabsTrigger value="single" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all flex items-center gap-1.5">
              Genera Contenuti
            </TabsTrigger>
          )}
          {isAdmin && (
            <>
              <TabsTrigger value="autopilot" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all flex items-center gap-1.5 ">
                <Zap className="w-3 h-3 text-emerald-500 fill-current" />
                Autopilot
              </TabsTrigger>
              <TabsTrigger value="chat" className="rounded-none py-4 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300 data-[state=active]:text-slate-900 transition-all flex items-center gap-1.5 ">
                <MessageCircle className="w-3 h-3 text-blue-500" />
                SEO Chat
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="config">
            <div className="grid grid-cols-1 gap-8">
                <Tabs defaultValue="kb" className="w-full">
                    <TabsList className="bg-slate-100/50 p-1 mb-8 rounded-2xl inline-flex h-auto">
                        <TabsTrigger value="api" className="rounded-xl text-[10px] font-bold uppercase tracking-widest px-6 py-2">API Keys</TabsTrigger>
                        <TabsTrigger value="kb" className="rounded-xl text-[10px] font-bold uppercase tracking-widest px-6 py-2">Knowledge Base</TabsTrigger>
                        <TabsTrigger value="tono" className="rounded-xl text-[10px] font-bold uppercase tracking-widest px-6 py-2">Tono & Stile</TabsTrigger>
                        <TabsTrigger value="seo" className="rounded-xl text-[10px] font-bold uppercase tracking-widest px-6 py-2">SEO Settings</TabsTrigger>
                        <TabsTrigger value="wp" className="rounded-xl text-[10px] font-bold uppercase tracking-widest px-6 py-2">WordPress</TabsTrigger>
                        <TabsTrigger value="gsc_setup" className="rounded-xl text-[10px] font-bold uppercase tracking-widest px-6 py-2">Google Link</TabsTrigger>
                    </TabsList>

                    <TabsContent value="api" className="m-0 animate-in fade-in duration-300">
                        <ApiKeysTab llm={llm} setLlm={setLlm} openai={openai} setOpenai={setOpenai} wordpress={wordpress} setWordpress={setWordpress} />
                    </TabsContent>

                    <TabsContent value="kb" className="m-0 animate-in fade-in duration-300">
                        <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
                    </TabsContent>
                    <TabsContent value="tono" className="m-0 animate-in fade-in duration-300">
                        <ToneStyleTab tono={tono} setTono={setTono} />
                    </TabsContent>
                    <TabsContent value="seo" className="m-0 animate-in fade-in duration-300">
                        <SEOSettingsTab seo={seo} setSeo={setSeo} />
                    </TabsContent>
                    <TabsContent value="wp" className="m-0 animate-in fade-in duration-300">
                        <WordPressTab wordpress={wordpress} setWordpress={setWordpress} />
                    </TabsContent>
                    <TabsContent value="gsc_setup" className="m-0 animate-in fade-in duration-300">
                        <GscConnectionTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} isAdmin={isAdmin} />
                    </TabsContent>
                </Tabs>
            </div>
        </TabsContent>

        <TabsContent value="gsc" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GscDataTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} client={client} addToQueue={addToEditorialQueue} />
        </TabsContent>

        <TabsContent value="single" className="hidden" />
        <TabsContent value="plan" className="hidden" />
        <TabsContent value="programmatic" className="hidden" />

        {['single', 'plan', 'programmatic'].includes(activeTab) && (
            <div className="mt-0 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isAdmin ? (
                <AdminGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} externalMode={activeTab} />
              ) : (
                <ClientGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} externalMode={activeTab} />
              )}
              <div className="pt-8 border-t border-[#f1f3f6]">
                <ArticleHistory effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
              </div>
            </div>
        )}


        <TabsContent value="autopilot" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AutopilotTab autopilot={autopilot} setAutopilot={setAutopilot} clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
            <div className="mt-12 flex justify-center">
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 h-14 rounded-2xl px-12 text-xs font-bold uppercase tracking-widest shadow-2xl shadow-emerald-200 transition-all active:scale-95 group">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />}
                    Attiva / Salva Configurazione Autopilot
                </Button>
            </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SeoChatTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} client={client} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default GeneratorPage;
