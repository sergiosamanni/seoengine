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
  Plus, Search, MoreHorizontal, Edit, Trash2, ExternalLink, Settings,
  BarChart3, Globe, X, FileText, Users, TrendingUp, Loader2, ChevronDown, ChevronRight,
  AlertCircle, ArrowLeft, PenTool, Key, Sparkles, History, Save, Zap, MessageCircle, Target, Layers
} from 'lucide-react';
import { toast } from 'sonner';

// ErrorBoundary to catch and display rendering errors in the generator
import ErrorBoundary from '../components/ui/error-boundary';

// Components
import AdminGenerator from '../components/admin-workspace/AdminGenerator';
import { ClientGenerator } from '../components/client-workspace/ClientGenerator';
import { ArticleHistory } from '../components/client-workspace/ArticleHistory';

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



export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { 
    client, loading, saving, fetchClient, 
    updateConfiguration, addToQueueFromContext 
  } = useClient();
  
  const { clientId: routeClientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) return tabFromUrl;
    if (location.pathname.endsWith('/config')) return 'config';
    if (location.pathname.endsWith('/gsc')) return 'gsc';
    if (location.pathname.endsWith('/generate')) return 'generate';
    return (isAdmin ? 'config' : 'generate');
  });

  const effectiveClientId = routeClientId || client?.id;

  // Diagnostics
  console.log("[GeneratorPage] State:", { activeTab, isAdmin, clientId: client?.id, effectiveClientId, routeClientId });

  useEffect(() => {
    if (routeClientId) fetchClient(routeClientId);
  }, [routeClientId]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Configuration States
  const [wordpress, setWordpress] = useState({ url_api: '', utente: '', password_applicazione: '', stato_pubblicazione: 'draft' });
  const [llm, setLlm] = useState({ provider: 'deepseek', api_key: '', modello: 'deepseek-chat', temperatura: 0.7 });
  const [openai, setOpenai] = useState({ api_key: '', modello: 'gpt-4o', temperatura: 0.6 });
  const [seo, setSeo] = useState({ lingua: 'italiano', lunghezza_minima_parole: 1500, include_faq_in_fondo: false });
  const [tono, setTono] = useState({ registro: 'professionale_accessibile', persona_narrativa: 'seconda_singolare', descrizione_tono_libera: '', aggettivi_brand: [], parole_vietate: [], frasi_vietate: [] });
  const [knowledge, setKnowledge] = useState({ descrizione_attivita: '', storia_brand: '', citta_principale: '', regione: '', descrizione_geografica: '', punti_di_interesse_locali: [], punti_di_forza: [], pubblico_target_primario: '', pubblico_target_secondario: '', call_to_action_principale: '' });
  const [autopilot, setAutopilot] = useState({ enabled: false, frequency: 'weekly', strategy: 'editorial_plan_first', time_of_day: '09:00', auto_publish: true });

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

  if (!client && loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (!effectiveClientId) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-6 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <AlertCircle className="w-10 h-10 text-slate-200" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Client non trovato</h1>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Non è stato possibile identificare il cliente per questo workspace. Torna alla dashboard.</p>
        <Button onClick={() => navigate('/dashboard')} className="rounded-[1.5rem] px-10 h-16 bg-slate-950 border-none shadow-2xl shadow-slate-300 font-bold uppercase tracking-widest text-xs">
            Torna alla Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#f1f3f6]">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-12 w-12 rounded-2xl bg-white border border-[#f1f3f6] hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Button>
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[2rem] bg-slate-950 flex items-center justify-center text-white font-black text-2xl shadow-2xl shadow-slate-200">
                {client?.nome?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{client?.nome}</h1>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{client?.sito_web?.replace('https://', '')?.replace('http://', '')}</p>
                </div>
            </div>
          </div>
        </div>
        
        {(activeTab === 'config' || activeTab === 'autopilot') && (
            <div className="flex items-center gap-3">
                <Button onClick={handleSaveConfig} disabled={saving} className="bg-slate-950 hover:bg-slate-900 h-14 rounded-2xl px-10 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-95">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-3" />}
                    Salva Workspace
                </Button>
            </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
            <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1">
              {isAdmin && (
                <>
                  <TabsTrigger value="config" className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                    Configurazione
                  </TabsTrigger>
                  <TabsTrigger value="gsc" className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-sky-600 data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                    Search Console
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="generate" className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                Genera Contenuti
              </TabsTrigger>

              {isAdmin && (
                <TabsTrigger value="autopilot" className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  Autopilot
                </TabsTrigger>
              )}
            </TabsList>

            {isAdmin && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50/50 border border-blue-100 rounded-2xl shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">Administrative Control Active</span>
                </div>
            )}
        </div>

        <TabsContent value="config" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1">
                <Tabs defaultValue="kb" className="w-full">
                    <TabsList className="bg-slate-100/30 p-1.5 mb-10 rounded-2xl inline-flex h-auto gap-1 border border-slate-100">
                        <TabsTrigger value="api" className="rounded-xl text-[9px] font-black uppercase tracking-widest px-6 py-2.5">API Keys</TabsTrigger>
                        <TabsTrigger value="kb" className="rounded-xl text-[9px] font-black uppercase tracking-widest px-6 py-2.5">Knowledge Base</TabsTrigger>
                        <TabsTrigger value="tono" className="rounded-xl text-[9px] font-black uppercase tracking-widest px-6 py-2.5">Tono & Stile</TabsTrigger>
                        <TabsTrigger value="seo" className="rounded-xl text-[9px] font-black uppercase tracking-widest px-6 py-2.5">SEO Settings</TabsTrigger>
                        <TabsTrigger value="wp" className="rounded-xl text-[9px] font-black uppercase tracking-widest px-6 py-2.5">WordPress</TabsTrigger>
                        <TabsTrigger value="gsc_setup" className="rounded-xl text-[9px] font-black uppercase tracking-widest px-6 py-2.5">GSC Link</TabsTrigger>
                    </TabsList>

                    <TabsContent value="api" className="animate-in fade-in duration-500">
                        <ApiKeysTab llm={llm} setLlm={setLlm} openai={openai} setOpenai={setOpenai} wordpress={wordpress} setWordpress={setWordpress} />
                    </TabsContent>
                    <TabsContent value="kb" className="animate-in fade-in duration-500">
                        <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
                    </TabsContent>
                    <TabsContent value="tono" className="animate-in fade-in duration-500">
                        <ToneStyleTab tono={tono} setTono={setTono} />
                    </TabsContent>
                    <TabsContent value="seo" className="animate-in fade-in duration-500">
                        <SEOSettingsTab seo={seo} setSeo={setSeo} />
                    </TabsContent>
                    <TabsContent value="wp" className="animate-in fade-in duration-500">
                        <WordPressTab wordpress={wordpress} setWordpress={setWordpress} />
                    </TabsContent>
                    <TabsContent value="gsc_setup" className="animate-in fade-in duration-500">
                        <GscConnectionTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} isAdmin={isAdmin} />
                    </TabsContent>
                </Tabs>
            </div>
        </TabsContent>

        <TabsContent value="gsc" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ErrorBoundary>
                <GscDataTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} client={client} addToQueue={addToEditorialQueue} />
            </ErrorBoundary>
        </TabsContent>

        <TabsContent value="generate" className="mt-0 space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ErrorBoundary>
            {isAdmin ? (
              <AdminGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} />
            ) : (
              <ClientGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} />
            )}
          </ErrorBoundary>
          
          <ErrorBoundary>
            <ArticleHistory effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="autopilot" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <ErrorBoundary>
                <AutopilotTab effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} addToQueueFromContext={addToQueueFromContext} />
           </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratorPage;
