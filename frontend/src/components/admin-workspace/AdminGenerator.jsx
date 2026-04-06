import * as React from 'react';
import { useState, useEffect, useMemo, Fragment, useRef, Suspense, lazy } from 'react';
import axios from 'axios';
import config, { API_URL as API, BASE_URL } from '../../config';
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    Zap, AlertCircle, Loader2, FileText, Globe, CheckCircle2,
    XCircle, Clock, Send, ExternalLink, Search, Lock, Target, BarChart3,
    PenTool, ChevronRight, Sparkles, ImagePlus, X, Camera, Image as ImageIcon,
    Calendar, BrainCircuit, RefreshCcw, Info, AlertTriangle, Plus,
    ChevronUp, ChevronDown, TrendingUp, Trash2, Eye, Save, History, ListPlus, MousePointerClick, FileCode,
    Library, Check, Layers, ArrowRight, ArrowLeft, RotateCcw, LayoutList, LayoutGrid
} from 'lucide-react';
import { EditorialCalendar } from './EditorialCalendar';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';

const ContentStrategyTab = lazy(() => import('../../pages/configuration/ContentStrategyTab').then(m => ({ default: m.ContentStrategyTab })));
const KeywordsTab = lazy(() => import('../../pages/configuration/KeywordsTab').then(m => ({ default: m.KeywordsTab })));



export function AdminGenerator({
    client, effectiveClientId, getAuthHeaders, navigate, externalMode, initialData, onDataUsed
}) {
    // 1. ALL HOOKS AND STATE AT THE TOP (TDZ SAFETY)
    const [automation, setAutomation] = useState({ enabled: false, articles_per_week: 1 });
    const [targetKeywords, setTargetKeywords] = useState([]);
    const [branding, setBranding] = useState({});
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(1);
    const [contentStrategy, setContentStrategy] = useState({
        funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS',
        buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '',
        cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [],
        keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: ''
    });
    const [serpKeyword, setSerpKeyword] = useState('');
    const [serpLoading, setSerpLoading] = useState(false);
    const [serpData, setSerpData] = useState(null);
    const [gscData, setGscData] = useState(null);
    const [gscLoading, setGscLoading] = useState(false);
    const [advancedPrompt, setAdvancedPrompt] = useState('');
    const [gscSite, setGscSite] = useState('');
    const [autoGenerateCover, setAutoGenerateCover] = useState(true);
    const [genMode, setGenMode] = useState(externalMode || 'single');
    const [singleTitle, setSingleTitle] = useState('');
    const [singleKeywords, setSingleKeywords] = useState('');
    const [singleObjective, setSingleObjective] = useState('');
    const [singleGenerating, setSingleGenerating] = useState(false);
    const [refiningObjective, setRefiningObjective] = useState(false);
    const [singleResult, setSingleResult] = useState(null);
    const [singleScheduledDate, setSingleScheduledDate] = useState('');
    const [imageSource, setImageSource] = useState('ai'); 
    const [imgSearchQuery, setImgSearchQuery] = useState("");
    const [imgSearchResults, setImgSearchResults] = useState([]);
    const [searchingImages, setSearchingImages] = useState(false);
    const [singleSelectedImage, setSingleSelectedImage] = useState(null); 
    const [siloClusters, setSiloClusters] = useState([]);
    const [suggestingSilo, setSuggestingSilo] = useState(false);
    const [selectedSiloClusters, setSelectedSiloClusters] = useState([]);
    const [keywords, setKeywords] = useState({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
    const [combinations, setCombinations] = useState([]);
    const [selectedCombinations, setSelectedCombinations] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState([]);
    const [publishToWp, setPublishToWp] = useState(true);
    const [progressPercent, setProgressPercent] = useState(0);
    const [coverLoading, setCoverLoading] = useState({}); 
    const [contentType, setContentType] = useState('articolo');
    const [adminUploadedImages, setAdminUploadedImages] = useState([]);
    const [adminUploading, setAdminUploading] = useState(false);
    const [useSpintax, setUseSpintax] = useState(false);
    const [programmaticTemplate, setProgrammaticTemplate] = useState('');
    const [sidebarTemplate, setSidebarTemplate] = useState('');
    const [ctaConfig, setCtaConfig] = useState({ enabled: true, text: 'Richiedi Preventivo', url: '', color: '#4f46e5' });
    const [wizardStep, setWizardStep] = useState(1);
    const [isArchitecting, setIsArchitecting] = useState(false);
    const [webCorrelates, setWebCorrelates] = useState([]);
    const [globalImages, setGlobalImages] = useState([]);
    const [imageUploadLoading, setImageUploadLoading] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [internalLinkingEnabled, setInternalLinkingEnabled] = useState(true);
    const [activeJobId, setActiveJobId] = useState(null);
    const [totalInJob, setTotalInJob] = useState(0);
    const [plan, setPlan] = useState(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planGenerating, setPlanGenerating] = useState(false);
    const [newPlanKeyword, setNewPlanKeyword] = useState("");
    const [numArticles, setNumArticles] = useState(10);
    const [selectedPlanTopics, setSelectedPlanTopics] = useState([]);
    const [showPlanSettings, setShowPlanSettings] = useState(false);
    const [fullPreview, setFullPreview] = useState(null);
    const [templateStyle, setTemplateStyle] = useState('modern_conversion');
    const [refineFeedback, setRefineFeedback] = useState('');
    const [refining, setRefining] = useState(false);
    const [recentArticles, setRecentArticles] = useState([]);
    const [activePlanImageIndex, setActivePlanImageIndex] = useState(null);
    const [planView, setPlanView] = useState('list'); // 'list' | 'calendar'
    const [recentSidebarOpen, setRecentSidebarOpen] = useState(true);
    const [expandedOutlines, setExpandedOutlines] = useState({});
    const [deletingPlan, setDeletingPlan] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Diagnostics
    console.log("[AdminGenerator] Render:", { effectiveClientId, genMode, clientName: client?.nome });

    // useMemo AFTER useState
    const allPlanTopics = useMemo(() => {
        const planItems = plan?.topics || [];
        const queueItems = (client?.configuration?.editorial_queue || [])
            .filter(item => typeof item === 'string') 
            .map(itemText => {
                let title = itemText;
                let kw = itemText;
                if (itemText.includes('] ')) {
                    const parts = itemText.split('] ');
                    title = parts[1] || itemText;
                    if (title.includes(': ')) {
                        const subParts = title.split(': ');
                        title = subParts.slice(1).join(': ');
                        kw = subParts[0] || title;
                    } else {
                        kw = title;
                    }
                }
                return {
                    titolo: title,
                    keyword: kw,
                    funnel: 'TOFU',
                    motivo: 'Priorità Audit AI (Freshness/GSC)',
                    isQueueItem: true,
                    topic: 'Contenuti Suggeriti dal Sistema',
                    originalText: itemText
                };
            });
        return [...planItems, ...queueItems];
    }, [plan, client?.configuration?.editorial_queue]);

    // Derived Constants
    const clientConfig = client?.configuration || {};
    const llmConfig = clientConfig.llm || clientConfig.openai || {};
    const hasApiKey = !!(llmConfig.api_key || llmConfig.apiKey);
    const wpConfig = clientConfig.wordpress || {};
    const hasWpConfig = wpConfig.url_api && wpConfig.utente && wpConfig.password_applicazione;
    const gscConnected = client?.configuration?.gsc?.connected || false;

    // 2. HELPER FUNCTIONS (USE function DECLARATIONS FOR HOISTING SAFETY)
    async function fetchRecentArticles() {
        if (!effectiveClientId) return;
        try {
            const res = await axios.get(`${API}/articles?client_id=${effectiveClientId}`, { headers: getAuthHeaders() });
            setRecentArticles(res.data.slice(0, 50));
        } catch (error) {
            console.error("Error fetching recent articles:", error);
        }
    }

    async function fetchPlan() {
        if (!effectiveClientId) return;
        setPlanLoading(true);
        try {
            const res = await axios.get(`${API}/editorial-plan/${effectiveClientId}`, {
                headers: getAuthHeaders()
            });
            setPlan(res.data || null); 
        } catch (error) {
            console.error("Error fetching editorial plan:", error);
            setPlan(null);
        } finally {
            setPlanLoading(false);
        }
    }


    // 3. MAIN LOGIC AND EFFECTS
    useEffect(() => {
        if (externalMode && ['single', 'plan', 'programmatic'].includes(externalMode)) {
            setGenMode(externalMode);
        }
    }, [externalMode]);

    useEffect(() => {
        if (effectiveClientId) {
            // Global mode/step persistence
            const savedGlobal = localStorage.getItem(`admin_gen_state_${effectiveClientId}`);
            if (savedGlobal) {
                try {
                    const data = JSON.parse(savedGlobal);
                    if (data.genMode) setGenMode(data.genMode);
                    if (data.step) setStep(data.step);
                } catch (e) { console.error("Error loading global state", e); }
            }

            // Programmatic state persistence
            const savedProg = localStorage.getItem(`prog_seo_state_${effectiveClientId}`);
            if (savedProg) {
                try {
                    const data = JSON.parse(savedProg);
                    if (data.keywords) setKeywords(data.keywords);
                    if (data.wizardStep) setWizardStep(data.wizardStep);
                    if (data.programmaticTemplate) setProgrammaticTemplate(data.programmaticTemplate);
                    if (data.sidebarTemplate) setSidebarTemplate(data.sidebarTemplate);
                    if (data.ctaConfig) setCtaConfig(data.ctaConfig);
                    if (data.templateStyle) setTemplateStyle(data.templateStyle);
                    if (data.internalLinkingEnabled !== undefined) setInternalLinkingEnabled(data.internalLinkingEnabled);
                    if (data.globalImages) setGlobalImages(data.globalImages);
                    if (data.webCorrelates) setWebCorrelates(data.webCorrelates);
                    
                    if (data.activeJobId) {
                        setActiveJobId(data.activeJobId);
                        setTotalInJob(data.totalInJob || 0);
                        setGenerating(true);
                    }
                } catch (e) { console.error("Error loading saved prog state", e); }
            }
        }
    }, [effectiveClientId]);

    useEffect(() => {
        if (effectiveClientId) {
            const globalState = { genMode, step };
            localStorage.setItem(`admin_gen_state_${effectiveClientId}`, JSON.stringify(globalState));
        }
    }, [genMode, step, effectiveClientId]);

    useEffect(() => {
        if (effectiveClientId && genMode === 'programmatic') {
            const stateToSave = {
                keywords, wizardStep, programmaticTemplate, sidebarTemplate, 
                ctaConfig, templateStyle, internalLinkingEnabled, 
                globalImages, webCorrelates, activeJobId, totalInJob
            };
            localStorage.setItem(`prog_seo_state_${effectiveClientId}`, JSON.stringify(stateToSave));
        }
    }, [keywords, wizardStep, programmaticTemplate, sidebarTemplate, ctaConfig, templateStyle, internalLinkingEnabled, globalImages, webCorrelates, activeJobId, totalInJob, effectiveClientId, genMode]);

    useEffect(() => {
        if (effectiveClientId && gscConnected && !gscData && !gscLoading) {
            loadGscData();
        }
    }, [effectiveClientId, gscConnected]);

    const gscInsights = useMemo(() => {
        if (!gscData?.keywords) return [];
        const insights = [];
        const keywords = gscData.keywords;
        const dismissed = client?.configuration?.dismissed_insights || [];

        // 1. CTR Optimization Opportunity
        const lowCtr = keywords
            .filter(k => k.impressions > 1000 && k.ctr < 0.02)
            .sort((a,b) => b.impressions - a.impressions)
            .slice(0, 2);
        if (lowCtr.length > 0) {
            const id = `ctr_opt_${lowCtr.map(k=>k.keyword).join('_')}`;
            if (!dismissed.includes(id)) {
                insights.push({
                    id,
                    type: 'optimization',
                    title: 'CTR Optimization Support',
                    desc: `High visibility detected for "${lowCtr.map(k=>k.keyword).join(', ')}". Update Meta Titles to capture search intent.`,
                    icon: MousePointerClick,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    context: lowCtr
                });
            }
        }

        // 2. High-Potential Ranking Gains
        const pageTwo = keywords
            .filter(k => k.position > 10 && k.position < 25)
            .sort((a,b) => b.impressions - a.impressions)
            .slice(0, 2);
        if (pageTwo.length > 0) {
            const id = `growth_${pageTwo.map(k=>k.keyword).join('_')}`;
            if (!dismissed.includes(id)) {
                insights.push({
                    id,
                    type: 'growth',
                    title: 'Semantic Expansion Required',
                    desc: `"${pageTwo.map(k=>k.keyword).join(', ')}" are ranking on page 2. Create supporting cluster content to push into Top 10.`,
                    icon: Target,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                    context: pageTwo
                });
            }
        }

        // 3. New Emerging Trends
        const emerging = keywords
            .filter(k => k.impressions > 500 && k.clicks === 0)
            .sort((a,b) => b.impressions - a.impressions)
            .slice(0, 1);
        if (emerging.length > 0) {
            const id = `trend_${emerging[0].keyword}`;
            if (!dismissed.includes(id)) {
                insights.push({
                    id,
                    type: 'trend',
                    title: 'Market Trend Detected',
                    desc: `Growing interest in "${emerging[0].keyword}". Build an authoritative guide now to secure early market position.`,
                    icon: TrendingUp,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-50',
                    context: emerging
                });
            }
        }

        return insights;
    }, [gscData, client?.configuration?.dismissed_insights]);

    useEffect(() => {
        if (!effectiveClientId) {
            navigate('/dashboard');
        }
    }, [effectiveClientId, navigate]);

    useEffect(() => {
        if (clientConfig.content_strategy) setContentStrategy(prev => ({ ...prev, ...clientConfig.content_strategy }));
        if (clientConfig.advanced_prompt) setAdvancedPrompt(clientConfig.advanced_prompt);
        if (clientConfig.keywords) setKeywords(clientConfig.keywords);
        if (clientConfig.automation) setAutomation(clientConfig.automation);
        if (clientConfig.gsc?.site_url) setGscSite(clientConfig.gsc.site_url);
        
        if (clientConfig.programmatic) {
            setUseSpintax(clientConfig.programmatic.use_spintax ?? true);
            setProgrammaticTemplate(clientConfig.programmatic.template || "");
            setSidebarTemplate(clientConfig.programmatic.sidebar_template || "");
            if (clientConfig.programmatic.cta) setCtaConfig(prev => ({ ...prev, ...clientConfig.programmatic.cta }));
        }

        if (!effectiveClientId) return;
        fetchPlan();
        fetchRecentArticles();
    }, [client, effectiveClientId]);

    useEffect(() => {
        if (imageSource === 'search' && imgSearchQuery && imgSearchResults.length === 0 && !searchingImages) {
            handleImageSearch();
        }
    }, [imageSource, imgSearchQuery]);


    async function handleSuggestSilo() {
        if (!singleObjective) {
            toast.error("Inserisci prima l'obiettivo della Pillar Page");
            return;
        }
        setSuggestingSilo(true);
        try {
            const { data } = await axios.post(`${API}/articles/suggest-silo`, { 
                objective: singleObjective,
                clientId: effectiveClientId 
            }, { headers: getAuthHeaders() });
            setSiloClusters(data.clusters || []);
            setSelectedSiloClusters(data.clusters || []); 
            toast.success("Strategia Silo generata con successo!");
        } catch (err) {
            console.error("Silo suggestion error:", err);
            toast.error("Errore generazione strategia silo");
        } finally {
            setSuggestingSilo(false);
        }
    }

    function toggleSiloCluster(cluster) {
        setSelectedSiloClusters(prev => 
            prev.find(c => c.titolo === cluster.titolo)
            ? prev.filter(c => c.titolo !== cluster.titolo)
            : [...prev, cluster]
        );
    }

    async function handleGenerateSilo() {
        if (!singleObjective) return;
        if (selectedSiloClusters.length === 0) {
            toast.error("Seleziona almeno un cluster di supporto");
            return;
        }
        
        setGenerating(true);
        try {
            const { data } = await axios.post(`${API}/articles/batch-generate`, {
                client_id: effectiveClientId,
                is_silo: true,
                pillar_topic: {
                    titolo: singleTitle || singleObjective,
                    objective: singleObjective,
                    type: 'page',
                    scheduled_date: new Date().toISOString()
                },
                clusters: selectedSiloClusters.map(c => ({
                    ...c,
                    type: 'post',
                    scheduled_date: new Date().toISOString()
                }))
            }, { headers: getAuthHeaders() });
            
            toast.success(`Batch Silo avviato! ${selectedSiloClusters.length + 1} articoli in coda.`);
            setStep(1); 
        } catch (err) {
            console.error("Silo batch error:", err);
            toast.error("Errore avvio generazione Silo");
        } finally {
            setGenerating(false);
        }
    }

    async function loadFullPreview(id) {
        try {
            const res = await axios.get(`${API}/articles/${id}/full`, { headers: getAuthHeaders() });
            setFullPreview(res.data);
        } catch (e) {
            toast.error('Errore caricamento anteprima');
        }
    }

    async function generateNewPlan() {
        setPlanGenerating(true);
        setResults([]); 
        try {
            const res = await axios.post(`${API}/generate-plan/${effectiveClientId}`, {
                objective: advancedPrompt,
                num_topics: numArticles
            }, {
                headers: getAuthHeaders()
            });
            setPlan(res.data);
            toast.success("Piano editoriale generato con successo!");
        } catch (error) {
            toast.error("Errore durante la generazione del piano");
            console.error(error);
        } finally {
            setPlanGenerating(false);
        }
    }

    function handleDeletePlan() {
        setShowDeleteConfirm(true);
    }

    async function confirmDeletePlan() {
        setDeletingPlan(true);
        try {
            await axios.delete(`${API}/editorial-plan/${effectiveClientId}`, { headers: getAuthHeaders() });
            setPlan(null);
            setSelectedPlanTopics([]);
            toast.success("Piano editoriale eliminato con successo.");
            setShowDeleteConfirm(false);
        } catch (e) {
            toast.error("Errore durante l'eliminazione del piano.");
            console.error(e);
        } finally {
            setDeletingPlan(false);
        }
    };

    async function handleSavePlan() {
        if (!effectiveClientId || !plan) return;
        setSaving(true);
        try {
            await axios.post(`${API}/save-plan/${effectiveClientId}`, plan, { headers: getAuthHeaders() });
            toast.success("Piano editoriale aggiornato");
        } catch (e) {
            toast.error("Errore salvataggio piano");
        } finally {
            setSaving(false);
        }
    };

    const toggleOutline = (idx) => {
        setExpandedOutlines(prev => ({ ...prev, [idx]: !prev[idx] }));
    };



    const addTargetKeyword = () => {
        if (!String(newPlanKeyword || "").trim()) return;
        if (targetKeywords.includes(String(newPlanKeyword || "").trim())) {
            toast.error("Keyword già presente");
            return;
        }
        setTargetKeywords([...targetKeywords, String(newPlanKeyword || "").trim()]);
        setNewPlanKeyword("");
    };

    const removeTargetKeyword = (kw) => {
        setTargetKeywords(targetKeywords.filter(k => k !== kw));
    };
    const handleUseTopicInGenerator = (topic) => {
        setGenMode('single');
        setSingleTitle(topic.titolo || '');
        setSingleKeywords(topic.keyword || '');
        setSingleObjective(topic.funnel || 'TOFU');
        setSerpKeyword(topic.keyword || '');
        if (topic.scheduled_date) {
            // Convert to YYYY-MM-DD for input type date
            setSingleScheduledDate(topic.scheduled_date.split('T')[0]);
        } else {
            setSingleScheduledDate('');
        }
        toast.info(`Contesto caricato: ${topic.titolo}`);
        // Restiamo qui nello step 5 (Genera) ma in modalità 'single'.
    };

    useEffect(() => {
        if (initialData) {
            setStep(4); // Go straight to generation
            setGenMode('single');
            setSingleTitle(String(initialData.titolo || ''));
            setSingleKeywords(String(initialData.keyword || ''));
            setSingleObjective(String(initialData.funnel || 'TOFU'));
            if (initialData.keyword) setSerpKeyword(String(initialData.keyword));

            // Notify that data was consumed
            if (onDataUsed) onDataUsed();
        }
    }, [initialData]);

    // Step checks
    const strategyDone = contentStrategy.funnel_stage && contentStrategy.modello_copywriting;
    const serpDone = serpData && serpData.competitors?.length > 0;
    const promptDone = String(advancedPrompt || "").trim().length > 20;

    // Auto-fill Strategic Objective based on Step 1, 4 and KB
    useEffect(() => {
        if (step === 5 && genMode === 'single' && !singleObjective) {
            const kb = client?.configuration?.knowledge_base || {};
            const strategy = contentStrategy || {};
            
            const autoObjective = `Obiettivo: Generare un contenuto ${strategy.funnel_stage || 'TOFU'} seguendo il modello ${strategy.modello_copywriting || 'PAS'}. 
Target: ${kb.pubblico_target_primario || 'Audience generale'}.
Focus: ${singleTitle || singleKeywords || 'Keyword principale'}.
Direttive Prompt: ${advancedPrompt ? 'Seguire le analisi SERP e GSC definite nello Step 4.' : 'Ottimizzazione standard.'}`;
            
            setSingleObjective(autoObjective);
        }
    }, [step, genMode, contentStrategy, advancedPrompt, client]);

    async function handleImproveObjective() {
        if (!effectiveClientId) return;
        setRefiningObjective(true);
        try {
            const res = await axios.post(`${API}/articles/refine-objective`, {
                client_id: effectiveClientId,
                objective: singleObjective,
                strategy: contentStrategy,
                prompt_context: advancedPrompt.substring(0, 500) // Pass snippet of prompt for context
            }, { headers: getAuthHeaders() });
            
            if (res.data.refined_objective) {
                setSingleObjective(res.data.refined_objective);
                toast.success("Obiettivo migliorato con l'IA!");
            }
        } catch (error) {
            toast.error("Errore durante il miglioramento dell'obiettivo");
            console.error(error);
        } finally {
            setRefiningObjective(false);
        }
    };


    const handleAdminImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const token = localStorage.getItem('seo_token');
        setAdminUploading(true);
        const newImgs = [];
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: max 5MB`); continue; }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error(`${file.name}: formato non supportato`); continue; }
            try {
                const fd = new FormData(); fd.append('file', file);
                const res = await axios.post(`${API}/uploads?token=${token}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                newImgs.push({ id: res.data.id, name: file.name, preview: URL.createObjectURL(file) });
            } catch (err) { toast.error(`Errore upload ${file.name}`); }
        }
        setAdminUploadedImages(prev => [...prev, ...newImgs]);
        setAdminUploading(false);
        if (newImgs.length) toast.success(`${newImgs.length} immagine/i caricata/e`);
        e.target.value = '';
    };
    const removeAdminImage = (idx) => {
        setAdminUploadedImages(prev => { const c = [...prev]; URL.revokeObjectURL(c[idx].preview); c.splice(idx, 1); return c; });
    };

    async function runSerpAnalysis() {
        if (!String(serpKeyword || "").trim()) { toast.error('Inserisci una keyword'); return; }
        setSerpLoading(true);
        try {
            const res = await axios.post(`${API}/serp/analyze-full`, {
                keyword: serpKeyword, num_results: 4, country: 'it'
            }, { headers: getAuthHeaders() });
            setSerpData(res.data);
            toast.success(`Analizzati ${res.data.count} competitor per "${serpKeyword}"`);
            if (!String(advancedPrompt || "").trim()) buildDefaultPrompt(res.data, gscData);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore analisi SERP');
        } finally { setSerpLoading(false); }
    };

    async function loadGscData() {
        setGscLoading(true);
        try {
            const res = await axios.get(`${API}/clients/${effectiveClientId}/gsc-data?days=28`, { headers: getAuthHeaders() });
            setGscData(res.data);
            toast.success(`Dati GSC caricati: ${res.data.keywords?.length || 0} keyword`);
            if (serpData && !String(advancedPrompt || "").trim()) buildDefaultPrompt(serpData, res.data);
        } catch (error) {
            if (error.response?.status === 401) toast.error('Token GSC scaduto. Riconnetti dalla Configurazione.');
            else toast.error(error.response?.data?.detail || 'Errore caricamento GSC');
        } finally { setGscLoading(false); }
    };

    const handleImageSearch = async (count = 12, queryOverride = null) => {
        const searchQ = (typeof queryOverride === 'string' ? queryOverride : null) || imgSearchQuery || "";
        if (!String(searchQ).trim()) return;
        setSearchingImages(true);
        // If count == 12 (fresh search), reset results. Otherwise append.
        const isFreshSearch = (count === 12);
        try {
            const res = await axios.post(`${API}/serp/images`, { 
                keyword: searchQ,
                max_results: isFreshSearch ? 12 : count
            }, { headers: getAuthHeaders() });
            const newResults = res.data.results || [];
            if (isFreshSearch) {
                setImgSearchResults(newResults);
            } else {
                setImgSearchResults(prev => {
                    const existingUrls = new Set(prev.map(r => r.image));
                    const unique = newResults.filter(r => !existingUrls.has(r.image));
                    return [...prev, ...unique];
                });
            }
            if (newResults.length === 0 && isFreshSearch) {
                toast.info("Nessuna immagine trovata per questa ricerca.");
            }
        } catch (error) {
            toast.error("Errore ricerca immagini");
        } finally {
            setSearchingImages(false);
        }
    };

    const generateAIImageForTopic = async (index) => {
        const topic = plan.topics[index];
        const token = localStorage.getItem('seo_token');
        setActivePlanImageIndex(index);
        setSearchingImages(true);
        try {
            const res = await axios.post(`${API}/articles/generate-topic-image`, {
                client_id: effectiveClientId,
                title: topic.titolo,
                branding: branding,
                token: token
            }, { headers: getAuthHeaders() });
            
            const newTopics = [...plan.topics];
            newTopics[index] = { 
                ...newTopics[index], 
                image_ids: [res.data.id],
                image_url: res.data.url
            };
            setPlan({ ...plan, topics: newTopics });
            toast.success("Immagine IA generata!");
        } catch (error) {
            toast.error("Errore generazione immagine IA");
        } finally {
            setSearchingImages(false);
            setActivePlanImageIndex(null);
        }
    };

    const importExternalImage = async (imgUrl) => {
        const token = localStorage.getItem('seo_token');
        setSearchingImages(true);
        try {
            const res = await axios.post(`${API}/articles/import-external-image`, { 
                url: imgUrl, 
                client_id: effectiveClientId 
            }, { headers: getAuthHeaders() });
            const imageUrlFull = `${BASE_URL}/api/uploads/files/${res.data.id}?auth=${token}`;

            if (activePlanImageIndex !== null) {
                const newTopics = [...plan.topics];
                newTopics[activePlanImageIndex] = { 
                    ...newTopics[activePlanImageIndex], 
                    image_ids: [res.data.id],
                    image_url: imageUrlFull
                };
                setPlan({ ...plan, topics: newTopics });
                setActivePlanImageIndex(null);
            } else {
                setSingleSelectedImage({ 
                    id: res.data.id, 
                    url: imageUrlFull 
                });
            }
            toast.success("Immagine importata correttamente");
            setImgSearchResults([]);
        } catch (error) {
            const detail = error.response?.data?.detail || "Importazione fallita";
            toast.error("Errore importazione immagine: " + detail);
            console.error("Image import error:", error);
        } finally {
            setSearchingImages(false);
        }
    };

    const handleSingleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error("File troppo grande (max 5MB)");
        
        const token = localStorage.getItem('seo_token');
        const fd = new FormData();
        fd.append('file', file);
        
        try {
            const res = await axios.post(`${API}/uploads?token=${token}`, fd, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            setSingleSelectedImage({ 
                id: res.data.id, 
                url: `${API}/uploads/files/${res.data.id}?auth=${token}` 
            });
            toast.success("Immagine caricata");
        } catch (error) {
            toast.error("Errore upload immagine");
        }
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

    const saveConfig = async () => {
        try {
            const currentConfig = client?.configuration || {};
            const payload = {
                ...currentConfig,
                content_strategy: contentStrategy,
                advanced_prompt: advancedPrompt,
                keywords: keywords,
                automation: automation,
                programmatic: {
                    ...currentConfig.programmatic,
                    use_spintax: useSpintax,
                    template: programmaticTemplate,
                    sidebar_template: sidebarTemplate,
                    cta: ctaConfig,
                    global_images: globalImages.map(img => img.url || img.secure_url),
                    internal_linking: internalLinkingEnabled
                },
                publish_to_wordpress: publishToWp,
                content_type: contentType
            };
            await axios.put(`${API}/clients/${effectiveClientId}/configuration`, payload, { headers: getAuthHeaders() });
        } catch (e) { console.error("Error saving config", e); throw e; }
    };

    const onSaveConfig = async () => {
        setSaving(true);
        try {
            await saveConfig();
            toast.success("Impostazioni salvate con successo!");
        } catch (e) {
            toast.error("Errore salvataggio impostazioni");
        } finally {
            setSaving(false);
        }
    };

    const handleSingleGenerate = async (typeOverride = null) => {
        if (!String(singleKeywords || "").trim() && !String(singleTitle || "").trim()) { toast.error('Inserisci almeno keywords o titolo'); return; }
        setSingleGenerating(true);
        setSingleResult(null);
        try {
            const res = await axios.post(`${API}/articles/simple-generate`, {
                client_id: effectiveClientId,
                keyword: singleKeywords || singleTitle,
                titolo_suggerito: singleTitle || undefined,
                topic: singleObjective || undefined,
                publish_to_wordpress: publishToWp,
                content_type: genMode === 'pillar' ? 'pillar_page' : 'articolo',
                objective: 'informazionale',
                image_ids: (imageSource !== 'ai' && singleSelectedImage) ? [singleSelectedImage.id] : (adminUploadedImages.length > 0 ? adminUploadedImages.map(img => img.id) : undefined),
                scheduled_date: (singleScheduledDate && singleScheduledDate !== '') ? new Date(singleScheduledDate).toISOString() : undefined,
                gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
                serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
                generate_cover: imageSource === 'ai' ? true : false
            }, { headers: getAuthHeaders() });
            setSingleResult({ ...res.data, status: 'running' });
            toast.success('Generazione avviata!');
            const jobId = res.data.job_id;
            const poll = async () => {
                try {
                    const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
                    if (jr.data.status === 'completed' || jr.data.status === 'failed') {
                        const r = jr.data.results?.[0] || {};
                        setSingleResult({ ...res.data, ...r, status: jr.data.status });
                        setSingleGenerating(false);
                        if (jr.data.status === 'completed' && r.generation_status === 'success') {
                            toast.success(r.publish_status === 'success' ? 'Articolo generato e pubblicato su WordPress!' : 'Articolo generato con successo!');
                        } else {
                            toast.error('Generazione fallita: ' + (r.generation_error || jr.data.error || 'errore sconosciuto'));
                        }
                        return;
                    }
                    setTimeout(poll, 5000);
                } catch (e) { setTimeout(poll, 6000); }
            };
            setTimeout(poll, 5000);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore nella generazione');
            setSingleGenerating(false);
        }
    };

    async function handleRefine() {
        if (!String(refineFeedback || "").trim()) {
            toast.error('Inserisci un feedback per l\'agente');
            return;
        }
        setRefining(true);
        try {
            const res = await axios.post(`${API}/articles/refine`, {
                client_id: effectiveClientId,
                article_id: singleResult.id,
                feedback: refineFeedback,
                publish_to_wordpress: true // Default to true if they want to see changes
            }, { headers: getAuthHeaders() });
            
            if (res.data.status === 'success') {
                toast.success('Contenuto aggiornato con successo!');
                setRefineFeedback('');
                // Update local state if needed or re-fetch
                loadFullPreview(singleResult.id);
            }
        } catch (error) {
            toast.error('Errore durante il raffinamento: ' + (error.response?.data?.detail || error.message));
        } finally {
            setRefining(false);
        }
    };

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

    const handleArchitectStep = async () => {
        if (!keywords.servizi.length || !keywords.citta_e_zone.length) {
            toast.error("Seleziona almeno un servizio e una città nello Step 1.");
            return;
        }
        setIsArchitecting(true);
        try {
            const res = await axios.post(`${API}/articles/programmatic/architect`, {
                client_id: effectiveClientId,
                topic: keywords.servizi[0],
                service: keywords.servizi[0],
                cities: keywords.citta_e_zone
            }, { headers: getAuthHeaders() });
            
            setWebCorrelates(res.data.correlates || []);
            setProgrammaticTemplate(res.data.master_spintax || "");
            setWizardStep(2);
            toast.success("Architettura AI generata con successo!");
        } catch (e) {
            toast.error("Errore durante la generazione dell'architettura.");
        } finally {
            setIsArchitecting(false);
        }
    };

    const handleGeneratePreview = async () => {
        if (!programmaticTemplate) return;
        try {
            const randomItem = {
                servizio: keywords.servizi[0] || "Servizio",
                citta: keywords.citta_e_zone[0] || "Città",
                keyword: (keywords.servizi[0] || "") + " " + (keywords.citta_e_zone[0] || "")
            };
            const res = await axios.post(`${API}/articles/programmatic/preview`, {
                template: programmaticTemplate,
                item: randomItem,
                global_images: globalImages.map(img => img.url)
            }, { headers: getAuthHeaders() });
            setPreviewContent(res.data.html);
        } catch (e) {
            toast.error("Errore nell'anteprima");
        }
    };

    const handleGlobalImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        // Quick frontend validation
        const tooLarge = files.some(f => f.size > 5 * 1024 * 1024);
        if (tooLarge) {
            toast.error("Una o più immagini superano i 5MB consentiti.");
            return;
        }

        setImageUploadLoading(true);
        let successCount = 0;
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('client_id', effectiveClientId);
                try {
                    const res = await axios.post(`${API}/uploads/article-image`, formData, {
                        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                    });
                    setGlobalImages(prev => [...prev, res.data]);
                    successCount++;
                } catch (err) {
                    const msg = err.response?.data?.detail || "Errore caricamento singola immagine";
                    toast.error(`${file.name}: ${msg}`);
                }
            }
            if (successCount > 0) {
                toast.success(`${successCount} immagini caricate con successo!`);
            }
        } catch (e) {
            toast.error("Errore critico durante l'upload");
        } finally {
            setImageUploadLoading(false);
            // Reset input
            e.target.value = '';
        }
    };

    // Resumable Polling Effect
    useEffect(() => {
        let isStopped = false;
        const poll = async () => {
            if (!activeJobId || !generating || isStopped) return;
            try {
                const jr = await axios.get(`${API}/jobs/${activeJobId}`, { headers: getAuthHeaders() });
                setResults(jr.data.results || []);
                const total = totalInJob || jr.data.total || 1;
                setProgressPercent(Math.round((jr.data.completed / total) * 100));
                
                if (jr.data.status === 'completed' || jr.data.status === 'failed') {
                    const s = jr.data.summary || {};
                    if (jr.data.status === 'completed') {
                        if ((s.generated_ok || 0) === 0) {
                            toast.error(`Generazione terminata senza successo.`);
                        } else {
                            toast.success(`Completato: ${s.generated_ok || 0} generate`);
                        }
                    }
                    setGenerating(false);
                    setActiveJobId(null);
                    setTotalInJob(0);
                    return;
                }
                if (!isStopped) setTimeout(poll, 4000);
            } catch (e) { 
                console.error("Polling error", e);
                if (!isStopped) setTimeout(poll, 5000); 
            }
        };

        if (activeJobId && generating) {
            poll();
        }

        return () => { isStopped = true; };
    }, [activeJobId, generating, totalInJob]);

    const handleResetProgrammatic = () => {
        if (window.confirm("Vuoi resettare la sessione corrente? Perderai il template e i dati inseriti nel wizard.")) {
            localStorage.removeItem(`prog_seo_state_${effectiveClientId}`);
            setKeywords({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
            setWizardStep(1);
            setProgrammaticTemplate('');
            setSidebarTemplate('');
            setPreviewContent('');
            setGlobalImages([]);
            setWebCorrelates([]);
            setResults([]);
            setProgressPercent(0);
            setGenerating(false);
            setActiveJobId(null);
            toast.info("Sessione resettata");
        }
    };

    async function handleProgrammaticGenerate() {
        if (selectedCombinations.length === 0) { toast.error('Seleziona almeno una combinazione'); return; }
        setGenerating(true); setResults([]); setProgressPercent(0);
        await saveConfig();
        const effectiveContentType = genMode === 'programmatic' ? 'landing_page' : contentType;
        try {
            const res = await axios.post(`${API}/articles/generate-and-publish`, {
                client_id: effectiveClientId, combinations: selectedCombinations,
                publish_to_wordpress: publishToWp,
                content_type: effectiveContentType,
                use_spintax: genMode === 'programmatic' ? useSpintax : false,
                gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
                serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
                generate_cover: autoGenerateCover,
                template_style: genMode === 'programmatic' ? templateStyle : undefined
            }, { headers: getAuthHeaders() });
            
            const jobId = res.data.job_id;
            const total = res.data.total;
            setActiveJobId(jobId);
            setTotalInJob(total);
            
            const label = genMode === 'programmatic' ? 'pagine' : 'articoli';
            toast.info(`Job avviato: ${total} ${label} in elaborazione...`);
            // The useEffect takes over polling
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore generazione');
            setGenerating(false);
            setActiveJobId(null);
        }
    };

    async function handleBatchPlanGenerate() {
        if (selectedPlanTopics.length === 0) { toast.error('Seleziona almeno un articolo'); return; }
        setGenerating(true); setResults([]); setProgressPercent(0);

        await saveConfig();
        try {
            const res = await axios.post(`${API}/articles/batch-plan`, {
                client_id: effectiveClientId,
                topics: selectedPlanTopics,
                publish_to_wordpress: publishToWp,
                content_type: contentType,
                generate_cover: true
            }, { headers: getAuthHeaders() });

            // Se abbiamo generato elementi della coda manuale, rimuoviamoli dal config
            const queueItemsInBatch = selectedPlanTopics.filter(t => t.isQueueItem).map(t => t.titolo);
            if (queueItemsInBatch.length > 0) {
                const currentConfig = client?.configuration || {};
                const currentQueue = currentConfig.editorial_queue || [];
                const newQueue = currentQueue.filter(k => !queueItemsInBatch.includes(k));
                axios.put(`${API}/clients/${effectiveClientId}/configuration`, { ...currentConfig, editorial_queue: newQueue }, { headers: getAuthHeaders() })
                     .catch(e => console.error("Could not cleanup queue", e));
            }

            const jobId = res.data.job_id;
            const total = res.data.total;
            toast.info(`Job Piano avviato: ${total} articoli in coda...`);

            const poll = async () => {
                try {
                    const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
                    setResults(jr.data.results || []);
                    setProgressPercent(Math.round((jr.data.completed / total) * 100));
                    if (jr.data.status === 'completed') {
                        const s = jr.data.summary || {};
                        toast.success(`Piano completato: ${s.generated_ok || 0} generati`);
                        setSelectedPlanTopics([]); 
                        setGenerating(false); 
                        fetchRecentArticles(); // Refresh list after completion
                        return;
                    }
                    setTimeout(poll, 4000);
                } catch (e) { setTimeout(poll, 5000); }
            };
            setTimeout(poll, 5000);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore generazione batch');
            setGenerating(false);
        }
    };

    const togglePlanTopic = (topic) => {
        const key = topic.titolo;
        if (selectedPlanTopics.find(t => t.titolo === key)) {
            setSelectedPlanTopics(selectedPlanTopics.filter(t => t.titolo !== key));
        } else {
            setSelectedPlanTopics([...selectedPlanTopics, topic]);
        }
    };

    const selectAllPlanTopics = () => {
        if (selectedPlanTopics.length === allPlanTopics.length && allPlanTopics.length > 0) {
            setSelectedPlanTopics([]);
        } else {
            // Selezioniamo tutti quelli che non sono ancora pubblicati
            const notPublished = allPlanTopics.filter(t => 
                !recentArticles.some(art => art.titolo?.toLowerCase() === t.titolo?.toLowerCase() || (art.keyword && art.keyword === t.keyword))
            );
            setSelectedPlanTopics(notPublished);
        }
    };

    const removeTopicFromPlan = (index) => {
        const newTopics = plan.topics.filter((_, i) => i !== index);
        setPlan({ ...plan, topics: newTopics });
        toast.info("Articolo rimosso dal piano");
    };

    const handleRemoveFromQueue = async (item) => {
        const textToRemove = item.originalText || item.titolo;
        const currentConfig = client?.configuration || {};
        const currentQueue = currentConfig.editorial_queue || [];
        const newQueue = currentQueue.filter(k => k !== textToRemove);
        const newConfig = { ...currentConfig, editorial_queue: newQueue };
        
        try {
            await axios.put(`${API}/clients/${effectiveClientId}/configuration`, newConfig, { headers: getAuthHeaders() });
            toast.success("Rimosso dalla coda");
            // Nota: il client viene aggiornato nel genitore, quindi dovremmo aspettarci un re-render
        } catch (e) {
            toast.error("Errore durante la rimozione");
        }
    };

    const handleGenerateCover = async (articleId, title) => {
        setCoverLoading(prev => ({ ...prev, [articleId]: true }));
        try {
            const res = await axios.post(`${API}/articles/generate-cover`, {
                client_id: effectiveClientId,
                title: title
            }, { headers: getAuthHeaders() });

            // Update results with cover URL
            setResults(prev => prev.map(r => r.id === articleId ? { ...r, image_url: res.data.url } : r));
            toast.success("Immagine di copertina generata!");
        } catch (error) {
            toast.error("Errore generazione immagine");
        } finally {
            setCoverLoading(prev => ({ ...prev, [articleId]: false }));
        }
    };

    const handleDismissInsight = async (id) => {
        const config = client?.configuration || {};
        const currentDismissed = config.dismissed_insights || [];
        if (currentDismissed.includes(id)) return;
        
        const newConfig = {
            ...config,
            dismissed_insights: [...currentDismissed, id]
        };
        
        try {
            await axios.put(`${API}/clients/${effectiveClientId}/configuration`, newConfig, { headers: getAuthHeaders() });
            toast.success("Suggerimento archiviato.");
        } catch (e) {
            toast.error("Errore salvataggio scelta");
        }
    };

    const handleApproveInsight = (insight) => {
        if (insight.type === 'growth' || insight.type === 'trend') {
            const firstKw = insight.context?.[0]?.keyword || "";
            setGenMode('single');
            setSingleKeywords(firstKw);
            setSingleTitle(firstKw);
            setSingleObjective(`Espansione semantica per keyword emergente: ${firstKw}`);
            setStep(5);
            toast.success(`Configurazione caricata per: ${firstKw}`);
        } else if (insight.type === 'optimization') {
             toast.info("Funzione ottimizzazione Meta Title in arrivo.");
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
        { num: 3, label: gscConnected ? 'GSC' : 'GSC (N/C)', icon: BarChart3, done: !!gscData, optional: !gscConnected, connected: gscConnected },
        { num: 4, label: 'Prompt', icon: Lock, done: promptDone },
        { num: 5, label: 'Genera', icon: Zap, done: false },
    ];

    useEffect(() => {
        if (step === 3 && gscConnected && !gscData && !gscLoading) {
            loadGscData();
        }
    }, [step]);

    if (!effectiveClientId) return null;


    return (
        <div className="space-y-8 animate-fade-in min-h-screen pb-20">
            {/* 1. Header & Mode Selector */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 backdrop-blur-3xl p-3 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/20">
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: 'single', label: 'Articolo', icon: PenTool, color: 'orange' },
                            { id: 'pillar', label: 'Pillar', icon: Layers, color: 'emerald' },
                            { id: 'plan', label: 'Editorial Hub', icon: Calendar, color: 'indigo' },
                            { id: 'programmatic', label: 'Programmatica', icon: Library, color: 'purple' }
                        ].map((mode) => (
                            <button 
                                key={mode.id}
                                onClick={() => { setGenMode(mode.id); setStep(1); }} 
                                className={`group flex items-center gap-3 px-6 py-4 rounded-[2rem] text-[10px] uppercase tracking-[0.15em] font-black transition-all duration-500 ${
                                    genMode === mode.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-500 hover:bg-white hover:border-slate-100 border border-transparent'
                                }`}
                            >
                                <Library className={`w-4 h-4 ${genMode === mode.id ? 'text-white' : 'text-slate-400'}`} /> 
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    <div className="pr-8 flex items-center gap-3 text-right">
                        <div className="hidden sm:block">
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{client?.nome || 'CLIENTE'}</p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                        </div>
                    </div>
                </div>

                {/* GSC Insights - Visual High impact */}
                {genMode === 'plan' && gscInsights.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {gscInsights.map((insight, idx) => (
                            <div key={idx} className={`rounded-[2.5rem] p-6 shadow-sm border-none ${insight.bg} flex flex-col justify-between`}>
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                                        <Target className={`w-6 h-6 ${insight.color}`} />
                                    </div>
                                    <div>
                                        <h4 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${insight.color}`}>{insight.title}</h4>
                                        <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">{insight.desc}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex gap-2 pt-2">
                                    <Button onClick={() => handleApproveInsight(insight)} className="h-9 px-5 bg-white/80 hover:bg-white text-slate-900 rounded-full text-[9px] font-black uppercase shadow-sm">Sì, Procedi</Button>
                                    <Button onClick={() => handleDismissInsight(insight.id)} variant="ghost" className="h-9 px-5 text-slate-400 hover:text-red-500 rounded-full text-[9px] font-black uppercase">Ignora</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. Main Body Content Area */}
            <div className="flex-1">
                {(genMode === 'single' || genMode === 'pillar') && (
                    <div className="space-y-8">
                        <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-2 flex items-center gap-2 shadow-xl overflow-x-auto">
                            {steps.map((s, i) => {
                                const active = step === s.num;
                                const done = s.done && !active;
                                return (
                                    <Fragment key={s.num}>
                                        <button onClick={() => setStep(s.num)} className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : done ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                                            <div className="w-5 h-5 flex items-center justify-center rounded-lg border font-black text-[9px]">
                                                {done ? <CheckCircle2 className="w-3 h-3" /> : s.num}
                                            </div>
                                            {s.label}
                                        </button>
                                        {i < steps.length - 1 && <div className="w-4 h-px bg-slate-100 flex-shrink-0" />}
                                    </Fragment>
                                );
                            })}
                        </div>

                        {step === 1 && (
                            <Card className="border-slate-200 rounded-[3.5rem] p-12 overflow-hidden shadow-2xl">
                                <Suspense fallback={<div>Loading...</div>}>
                                    <ContentStrategyTab strategy={contentStrategy} setStrategy={setContentStrategy} />
                                </Suspense>
                                <div className="mt-12 flex justify-end">
                                    <Button onClick={() => setStep(2)} className="h-16 px-12 bg-slate-950 text-white rounded-3xl font-black text-xs uppercase tracking-widest">
                                        Analisi SERP <ChevronRight className="w-5 h-5 ml-4" />
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {step === 2 && (
                            <Card className="border-slate-200 rounded-[3rem] p-10 shadow-xl">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Search className="w-6 h-6 text-indigo-500" /> SERP Intelligence</h3>
                                <div className="flex gap-4 mb-8">
                                    <Input value={serpKeyword} onChange={(e) => setSerpKeyword(e.target.value)} placeholder="Tua keyword focus..." className="h-14 rounded-2xl text-lg px-6 bg-slate-50" />
                                    <Button onClick={runSerpAnalysis} disabled={serpLoading} className="h-14 px-8 bg-indigo-600 text-white rounded-2xl font-bold">
                                        {serpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analizza SERP'}
                                    </Button>
                                </div>
                                <div className="mt-10 flex justify-between">
                                    <Button variant="ghost" onClick={() => setStep(1)}>Indietro</Button>
                                    <Button onClick={() => setStep(gscConnected ? 3 : 4)} className="h-12 px-8 bg-slate-900 text-white rounded-xl font-bold">Avanti</Button>
                                </div>
                            </Card>
                        )}

                        {step === 5 && (
                             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-8">
                                    <Card className="border-slate-200 rounded-[3.5rem] shadow-2xl p-12 space-y-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Titolo dell'Asset</Label>
                                            <Input className="h-16 text-xl font-black bg-slate-50 border-slate-100 rounded-3xl" value={singleTitle} onChange={(e) => setSingleTitle(e.target.value)} />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Concept Strategico</Label>
                                            <Textarea className="min-h-[160px] text-base p-8 bg-slate-50 border-slate-100 rounded-[2.5rem]" value={singleObjective} onChange={(e) => setSingleObjective(e.target.value)} />
                                        </div>
                                        <Button onClick={() => handleSingleGenerate()} disabled={singleGenerating} className="w-full h-20 bg-gradient-to-r from-slate-950 to-slate-800 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl">
                                            {singleGenerating ? <Loader2 className="w-7 h-7 animate-spin" /> : 'Lancia Generazione AI'}
                                        </Button>
                                    </Card>
                                </div>
                             </div>
                        )}
                    </div>
                )}

                {genMode === 'plan' && (
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-200 shadow-2xl">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200"><Calendar className="w-8 h-8 text-white" /></div>
                                <div><h2 className="text-2xl font-black text-slate-900 tracking-tight">Editorial Hub</h2><p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Strategy Control v4.0</p></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                                    <Button variant="ghost" size="sm" onClick={() => setPlanView('list')} className={`h-10 px-4 rounded-xl text-[10px] uppercase font-black ${planView === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>List</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setPlanView('calendar')} className={`h-10 px-4 rounded-xl text-[10px] uppercase font-black ${planView === 'calendar' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Calendar</Button>
                                </div>
                                <Button onClick={generateNewPlan} disabled={planGenerating} className="h-12 bg-slate-950 text-white rounded-2xl font-black text-[10px] px-8">REFRESH STRATEGY</Button>
                            </div>
                        </div>
                        {allPlanTopics.length > 0 && planView === 'calendar' && (
                            <div className="bg-white rounded-[3.5rem] border border-slate-200 p-10 shadow-2xl">
                                <EditorialCalendar topics={allPlanTopics} onArticleClick={handleUseTopicInGenerator} />
                            </div>
                        )}
                    </div>
                )}

                {genMode === 'programmatic' && (
                     <div className="animate-in fade-in slide-in-from-right-12 duration-800">
                         <div className="bg-white p-20 rounded-[4rem] border border-slate-200 shadow-2xl text-center space-y-10">
                              <div className="w-24 h-24 rounded-[2.5rem] bg-purple-600 flex items-center justify-center mx-auto shadow-2xl rotate-6 hover:rotate-0 transition-transform"><Zap className="w-12 h-12 text-white" /></div>
                              <div><h2 className="text-4xl font-black text-slate-950 tracking-tighter">Programmatica v3.0</h2><p className="text-slate-500 max-w-lg mx-auto font-medium italic">Generazione massiva SEO-friendly.</p></div>
                              <Button onClick={() => setWizardStep(1)} className="h-16 px-12 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl">INIZIA WIZARD BULK</Button>
                         </div>
                     </div>
                )}
            </div>

            {fullPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6">
                     <Card className="w-full max-w-6xl h-[92vh] bg-white rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl relative border-none">
                         <div className="p-10 bg-slate-950 text-white flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                 <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg"><Globe className="w-7 h-7" /></div>
                                 <h2 className="text-2xl font-black truncate max-w-2xl">{fullPreview.titolo}</h2>
                             </div>
                             <Button variant="ghost" onClick={() => setFullPreview(null)} className="h-14 w-14 rounded-full text-white"><X className="w-8 h-8" /></Button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-16 prose prose-slate max-w-none">
                             <div dangerouslySetInnerHTML={{ __html: fullPreview.contenuto }} />
                         </div>
                     </Card>
                </div>
            )}
        </div>
    );
}
