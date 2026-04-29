import * as React from 'react';
import { useState, useEffect, Suspense, lazy } from 'react';
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
const AdminGenerator = lazy(() => import('../components/admin-workspace/AdminGenerator').then(m => ({ default: m.AdminGenerator })));
const ClientGenerator = lazy(() => import('../components/client-workspace/ClientGenerator').then(m => ({ default: m.ClientGenerator })));
const ArticleHistory = lazy(() => import('../components/client-workspace/ArticleHistory').then(m => ({ default: m.ArticleHistory })));

// Configuration Tabs
const ApiKeysTab = lazy(() => import('./configuration/ApiKeysTab').then(m => ({ default: m.ApiKeysTab })));
const KnowledgeBaseTab = lazy(() => import('./configuration/KnowledgeBaseTab').then(m => ({ default: m.KnowledgeBaseTab })));
const ToneStyleTab = lazy(() => import('./configuration/ToneStyleTab').then(m => ({ default: m.ToneStyleTab })));
const SEOSettingsTab = lazy(() => import('./configuration/SEOSettingsTab').then(m => ({ default: m.SEOSettingsTab })));
const KeywordsTab = lazy(() => import('./configuration/KeywordsTab').then(m => ({ default: m.KeywordsTab })));
const WordPressTab = lazy(() => import('./configuration/WordPressTab').then(m => ({ default: m.WordPressTab })));
const ContentStrategyTab = lazy(() => import('./configuration/ContentStrategyTab').then(m => ({ default: m.ContentStrategyTab })));
const AutopilotTab = lazy(() => import('./configuration/AutopilotTab').then(m => ({ default: m.AutopilotTab })));
const GscConnectionTab = lazy(() => import('./configuration/GscConnectionTab').then(m => ({ default: m.GscConnectionTab })));
const GA4ConnectionTab = lazy(() => import('./configuration/GA4ConnectionTab').then(m => ({ default: m.GA4ConnectionTab })));
const GscDataTab = lazy(() => import('./configuration/GscDataTab').then(m => ({ default: m.GscDataTab })));
const FreshnessTab = lazy(() => import('./client-workspace/FreshnessTab'));



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

  const effectiveClientId = routeClientId || (!isAdmin ? user?.client_id : client?.id) || (!isAdmin && user?.client_ids?.length > 0 ? user.client_ids[0] : null);

  // Diagnostics
  console.log("[GeneratorPage] State:", { activeTab, isAdmin, clientId: client?.id, effectiveClientId, routeClientId });

  useEffect(() => {
    if (effectiveClientId && (!client || client.id !== effectiveClientId)) {
        fetchClient(effectiveClientId);
    }
  }, [effectiveClientId, client?.id]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Force-refresh client data when entering the generator tab,
  // so that the editorial_queue (updated by Autopilot approvals) is always fresh.
  useEffect(() => {
    if (activeTab === 'generate' && effectiveClientId) {
      fetchClient(effectiveClientId);
    }
  }, [activeTab, effectiveClientId]);

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
                  <TabsTrigger value="ga4" className="px-6 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">
                    Analytics GA4
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
                        <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading API...</div>}>
                            <ApiKeysTab llm={llm} setLlm={setLlm} openai={openai} setOpenai={setOpenai} wordpress={wordpress} setWordpress={setWordpress} />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="kb" className="animate-in fade-in duration-500">
                        <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading KB...</div>}>
                            <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} isAdmin={isAdmin} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="tono" className="animate-in fade-in duration-500">
                        <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading Tone...</div>}>
                            <ToneStyleTab tono={tono} setTono={setTono} />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="seo" className="animate-in fade-in duration-500">
                        <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading SEO...</div>}>
                            <SEOSettingsTab seo={seo} setSeo={setSeo} />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="wp" className="animate-in fade-in duration-500">
                        <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading WP...</div>}>
                            <WordPressTab wordpress={wordpress} setWordpress={setWordpress} />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="gsc_setup" className="animate-in fade-in duration-500">
                        <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading GSC...</div>}>
                            <GscConnectionTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} isAdmin={isAdmin} />
                        </Suspense>
                    </TabsContent>
                </Tabs>
            </div>
        </TabsContent>

        <TabsContent value="gsc" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ErrorBoundary>
                <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading GSC Data...</div>}>
                    <GscDataTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} client={client} addToQueue={addToEditorialQueue} />
                </Suspense>
            </ErrorBoundary>
        </TabsContent>

        <TabsContent value="ga4" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ErrorBoundary>
                <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading GA4...</div>}>
                    <GA4ConnectionTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} isAdmin={isAdmin} />
                </Suspense>
            </ErrorBoundary>
        </TabsContent>

        <TabsContent value="generate" className="mt-0 space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center p-12 text-slate-400 font-medium italic animate-pulse"><Loader2 className="w-5 h-5 mr-3 animate-spin" />Inizializzazione Generatore...</div>}>
              {isAdmin ? (
                <AdminGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} fetchClient={fetchClient} />
              ) : (
                <ClientGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} fetchClient={fetchClient} />
              )}
            </Suspense>
          </ErrorBoundary>
          
          <ErrorBoundary>
            <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading History...</div>}>
                <ArticleHistory effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
            </Suspense>
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="autopilot" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <ErrorBoundary>
                <Suspense fallback={<div className="p-4 text-xs animate-pulse">Loading Autopilot...</div>}>
                    <AutopilotTab clientId={effectiveClientId} getAuthHeaders={getAuthHeaders} addToQueueFromContext={addToQueueFromContext} autopilot={autopilot} setAutopilot={setAutopilot} />
                </Suspense>
           </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GeneratorPage;
