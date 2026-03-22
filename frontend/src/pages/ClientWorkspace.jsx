import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
    LayoutDashboard, PenTool, Settings, ArrowLeft,
    Loader2, AlertCircle, Globe, ExternalLink, Zap, FileText, Sparkles, Search, RefreshCw, Palette
} from 'lucide-react';
import { toast } from 'sonner';

// Import components from other pages (we'll need to refactor these to be more modular)
// For now, we might need to copy/paste or wrap existing logic.
// In a real refactor, we'd move these to src/components/client-workspace/
import { ApiKeysTab } from './configuration/ApiKeysTab';
import { KnowledgeBaseTab } from './configuration/KnowledgeBaseTab';
import { ToneStyleTab } from './configuration/ToneStyleTab';
import AdminGenerator from '../components/admin-workspace/AdminGenerator';
import ArticleHistory from '../components/admin-workspace/ArticleHistory';
import EditorialPlanTab from './client-workspace/EditorialPlanTab';
import GscConnectionTab from './client-workspace/GscConnectionTab';
import { BrandingTab } from './configuration/BrandingTab';
import { FreshnessTab } from './client-workspace/FreshnessTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ClientWorkspace = () => {
    const { clientId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getAuthHeaders, isAdmin } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [client, setClient] = useState(null);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'settings');

    // Configuration States
    const [wordpress, setWordpress] = useState({ url_api: '', utente: '', password_applicazione: '', stato_pubblicazione: 'draft' });
    const [llm, setLlm] = useState({ provider: 'openai', api_key: '', modello: 'gpt-4-turbo-preview', temperatura: 0.7 });
    const [seo, setSeo] = useState({ lingua: 'italiano', lunghezza_minima_parole: 1500, include_faq_in_fondo: false, sitemap_url: '' });
    const [tono, setTono] = useState({ registro: 'professionale_accessibile', persona_narrativa: 'seconda_singolare', descrizione_tono_libera: '', aggettivi_brand: [], parole_vietate: [], frasi_vietate: [] });
    const [knowledge, setKnowledge] = useState({ descrizione_attivita: '', storia_brand: '', citta_principale: '', regione: '', descrizione_geografica: '', punti_di_interesse_locali: [], punti_di_forza: [], pubblico_target_primario: '', pubblico_target_secondario: '', call_to_action_principale: '', url_home: '', url_chi_siamo: '', url_contatti: '' });
    const [contentStrategy, setContentStrategy] = useState({ funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS', buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '', cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [], keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: '' });
    const [advancedPrompt, setAdvancedPrompt] = useState('');
    const [keywordsCombo, setKeywordsCombo] = useState({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [targetKeywords, setTargetKeywords] = useState([]);
    const [automation, setAutomation] = useState({ enabled: false, articles_per_week: 1 });
    const [branding, setBranding] = useState({ palette_primary: '#4F46E5', palette_secondary: '#10B981', style: 'cinematic', logo_url: '', custom_instructions: '' });



    useEffect(() => {
        const fetchClient = async () => {
            try {
                const res = await axios.get(`${API}/clients/${clientId}`, { headers: getAuthHeaders() });
                const clientData = res.data;
                setClient(clientData);

                // Initialize configuration states
                const config = clientData.configuration || {};
                if (config.wordpress) setWordpress(config.wordpress);
                if (config.llm) setLlm(config.llm);
                else if (config.openai) setLlm({ provider: 'openai', api_key: config.openai.api_key || '', modello: config.openai.modello || 'gpt-4-turbo-preview', temperatura: config.openai.temperatura || 0.7 });

                if (config.seo) setSeo(config.seo);
                if (config.tono_e_stile) setTono(config.tono_e_stile);
                if (config.knowledge_base) setKnowledge(config.knowledge_base);
                if (config.content_strategy) setContentStrategy(prev => ({ ...prev, ...config.content_strategy }));
                if (config.advanced_prompt?.secondo_livello_prompt) setAdvancedPrompt(config.advanced_prompt.secondo_livello_prompt);
                if (config.keyword_combinations) setKeywordsCombo(config.keyword_combinations);
                if (config.seo_targets) setTargetKeywords(config.seo_targets.keywords || []);
                if (config.automation) setAutomation(config.automation);
                if (config.branding) setBranding(prev => ({ ...prev, ...config.branding }));

            } catch (err) {
                toast.error('Errore caricamento cliente');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchClient();
    }, [clientId]);

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            await axios.put(`${API}/clients/${clientId}/configuration`, {
                ...client.configuration,
                wordpress, llm, openai: llm, seo,
                tono_e_stile: tono,
                knowledge_base: knowledge,
                keyword_combinations: keywordsCombo,
                seo_targets: { keywords: targetKeywords },
                automation: automation,
                branding: branding,
            }, { headers: getAuthHeaders() });
            toast.success('Configurazione salvata');

            // Refresh client data to ensure UI is in sync
            const response = await axios.get(`${API}/clients/${clientId}`, { headers: getAuthHeaders() });
            setClient(response.data);
        } catch (error) {
            toast.error('Errore durante il salvataggio');
        } finally {
            setSaving(false);
        }
    };

    const handleTabChange = (value) => {
        setActiveTab(value);
        setSearchParams({ tab: value });
    };

    const handleIndexSite = async () => {
        try {
            const res = await axios.post(`${API}/index-site/${clientId}`, {}, { headers: getAuthHeaders() });
            toast.success(`Indicizzazione completata: ${res.data.posts_indexed} articoli trovati.`);
        } catch (error) {
            toast.error("Errore durante l'indicizzazione del sito");
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Workspace Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="rounded-full hover:bg-slate-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
                                {client?.nome}
                            </h1>
                            <Badge variant={client?.attivo ? "default" : "secondary"} className={client?.attivo ? "bg-emerald-100 text-emerald-700" : ""}>
                                {client?.attivo ? 'Attivo' : 'Inattivo'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 mt-1">
                            <Globe className="w-4 h-4" />
                            <span className="text-sm">{client?.sito_web}</span>
                            <ExternalLink className="w-3 h-3 cursor-pointer hover:text-blue-600" onClick={() => window.open(client?.sito_web, '_blank')} />
                        </div>
                    </div>
                </div>

            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start bg-transparent h-auto p-0 border-b border-slate-200 rounded-none mb-6">
                    <TabsTrigger value="settings" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none">
                        <Settings className="w-4 h-4 mr-2" />Configurazione
                    </TabsTrigger>
                    <TabsTrigger value="generator" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none">
                        <PenTool className="w-4 h-4 mr-2" />Generatore
                    </TabsTrigger>
                    <TabsTrigger value="freshness" className="px-6 py-3 border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none">
                        <RefreshCw className="w-4 h-4 mr-2" />Freshness
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="generator" className="mt-0">
                    <AdminGenerator
                        client={client}
                        effectiveClientId={clientId}
                        getAuthHeaders={getAuthHeaders}
                        navigate={navigate}
                        initialData={selectedTopic}
                        onDataUsed={() => setSelectedTopic(null)}
                        targetKeywords={targetKeywords}
                        setTargetKeywords={setTargetKeywords}
                        automation={automation}
                        setAutomation={setAutomation}
                        onSaveConfig={handleSaveConfig}
                        saving={saving}
                        branding={branding}
                        setBranding={setBranding}
                    />
                    <Card className="mt-8 border-slate-200 shadow-sm border-dashed">
                        <CardHeader>
                            <CardTitle className="text-lg">Storico Recente Client</CardTitle>
                            <CardDescription>Ultimi articoli generati per {client?.nome}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ArticleHistory 
                                effectiveClientId={clientId} 
                                getAuthHeaders={getAuthHeaders} 
                                clientConfig={client?.configuration}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>


                <TabsContent value="settings" className="mt-0 space-y-4">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Configurazione Globale</h3>
                            <p className="text-sm text-slate-500">Gestisci tutte le impostazioni per {client?.nome} in un unico posto.</p>
                        </div>
                        <Button onClick={handleSaveConfig} disabled={saving} className="bg-slate-900 hover:bg-slate-800 shadow-md">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                            {saving ? 'Salvataggio...' : 'Salva Tutte le Impostazioni'}
                        </Button>
                    </div>

                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-0">
                            <Tabs defaultValue="api-keys" className="w-full flex">
                                <TabsList className="flex-col h-auto justify-start bg-slate-50 p-4 border-r border-slate-200 rounded-none w-64 space-y-1">
                                    <TabsTrigger value="api-keys" className="w-full justify-start px-4 py-2 bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
                                        <Globe className="w-4 h-4 mr-2" />API & WordPress
                                    </TabsTrigger>
                                    <TabsTrigger value="gsc" className="w-full justify-start px-4 py-2 bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
                                        <Search className="w-4 h-4 mr-2" />Google Search Console
                                    </TabsTrigger>
                                    <TabsTrigger value="knowledge-base" className="w-full justify-start px-4 py-2 bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
                                        <div className="flex items-center"><FileText className="w-4 h-4 mr-2" />Knowledge Base</div>
                                    </TabsTrigger>
                                    <TabsTrigger value="tone-style" className="w-full justify-start px-4 py-2 bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
                                        <Sparkles className="w-4 h-4 mr-2" />Tono & Stile
                                    </TabsTrigger>
                                    <TabsTrigger value="branding" className="w-full justify-start px-4 py-2 bg-transparent data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg text-sm">
                                        <Palette className="w-4 h-4 mr-2" />Branding & Immagini
                                    </TabsTrigger>
                                </TabsList>
                                <div className="flex-1 p-6 overflow-y-auto max-h-[700px]">
                                    <TabsContent value="api-keys" className="mt-0">
                                        <ApiKeysTab
                                            llm={llm}
                                            setLlm={setLlm}
                                            wordpress={wordpress}
                                            setWordpress={setWordpress}
                                            seo={seo}
                                            setSeo={setSeo}
                                            onIndexSite={handleIndexSite}
                                            onSave={handleSaveConfig}
                                            clientConfig={client?.configuration}
                                            clientId={clientId}
                                        />
                                    </TabsContent>
                                    <TabsContent value="gsc" className="mt-0">
                                        <GscConnectionTab clientId={clientId} getAuthHeaders={getAuthHeaders} />
                                    </TabsContent>
                                    <TabsContent value="knowledge-base" className="mt-0">
                                        <KnowledgeBaseTab knowledge={knowledge} setKnowledge={setKnowledge} isAdmin={isAdmin} effectiveClientId={clientId} getAuthHeaders={getAuthHeaders} />
                                    </TabsContent>
                                    <TabsContent value="tone-style" className="mt-0">
                                        <ToneStyleTab tono={tono} setTono={setTono} />
                                    </TabsContent>
                                    <TabsContent value="branding" className="mt-0">
                                        <BrandingTab branding={branding} setBranding={setBranding} />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="freshness" className="mt-0">
                    <FreshnessTab clientId={clientId} getAuthHeaders={getAuthHeaders} />
                </TabsContent>
            </Tabs>
        </div>
    );
};
