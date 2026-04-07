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
    Library, Check, Layers, ArrowRight, ArrowLeft, RotateCcw, LayoutList, LayoutGrid, Play, Edit2
} from 'lucide-react';
import { EditorialCalendar } from './EditorialCalendar';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent } from '../ui/dialog';

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
    const [planLoading, setPlanLoading] = useState(false);    const [showImgChangeModal, setShowImgChangeModal] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
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
                objective: typeof advancedPrompt === 'string' ? advancedPrompt : (advancedPrompt?.secondo_livello_prompt || JSON.stringify(advancedPrompt)),
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
        // Fill the stepper with this topic
        setGenMode('single'); setStep(1);
        setSelectedTopic(topic);
        setStrategistSelection(topic.keyword || topic.titolo);
        setSingleTitle(topic.titolo);
        setSingleObjective(topic.final_objective || topic.outline?.map(h => h.text).join('\n') || '');
        setSerpDone(!!topic.serp_summary);
        setSerpData(topic.serp_summary ? { summary: topic.serp_summary } : null);
        setAdvancedPrompt(topic.master_prompt || '');
        setPromptDone(!!topic.master_prompt);
        
        if (topic.featured_image || topic.stock_image_url) {
            setSingleSelectedImage({ 
                url: topic.featured_image || topic.stock_image_url, 
                thumb: topic.featured_image || topic.stock_image_thumb 
            });
        }
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
    // Only run when strictly crossing into step 5
    useEffect(() => {
        if (step === 5 && genMode === 'single') {
            const kb = client?.configuration?.knowledge_base || {};
            const strategy = contentStrategy || {};
            
            // If it's the first time entering step 5, or if it's still default, try to sync
            const isDefault = !singleObjective || 
                             singleObjective.includes("Obiettivo: Generare un contenuto") || 
                             singleObjective === "";

            if (isDefault) {
                if (advancedPrompt && advancedPrompt.length > 50) {
                    setSingleObjective(advancedPrompt);
                } else {
                    const defaultObj = `Obiettivo: Generare un contenuto ${strategy.funnel_stage || 'TOFU'} seguendo il modello ${strategy.modello_copywriting || 'PAS'}. 
Target: ${kb.pubblico_target_primario || 'Audience generale'}.
Focus: ${singleTitle || singleKeywords || 'Keyword principale'}.
Direttive: Ottimizzazione standard SEO premium.`;
                    setSingleObjective(defaultObj);
                }
            }
        }
    }, [step]); // Only depend on 'step' to avoid infinite loops or constant overwrites

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
            // Always rebuild prompt if we have new data, unless user has a very custom one
            if (!advancedPrompt || advancedPrompt.length < 100 || window.confirm("Le analisi sono cambiate. Vuoi rigenerare il prompt strategico?")) {
                buildDefaultPrompt(res.data, gscData);
            }
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
            if (serpData) buildDefaultPrompt(serpData, res.data);
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
                context: `${singleTitle} - ${singleObjective?.slice(0, 200)}`,
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
        const strategy = contentStrategy || {};
        const kb = client?.configuration?.knowledge_base || {};

        lines.push('🎯 OBIETTIVO STRATEGICO E CONTESTO');
        lines.push('====================================');
        lines.push(`Asset: ${singleTitle || serpKeyword || 'Articolo Ottimizzato'}`);
        lines.push(`Funnel Stage: ${strategy.funnel_stage || 'TOFU'}`);
        lines.push(`Copywriting Model: ${strategy.modello_copywriting || 'PAS'}`);
        lines.push(`Target Audience: ${kb.pubblico_target_primario || 'Audience interessata al settore'}`);
        lines.push('');

        lines.push('🏢 KNOWLEDGE BASE AZIENDALE (BRAND CORE)');
        lines.push('------------------------------------');
        lines.push('IMPORTANTE: Questo contenuto deve rappresentare ESCLUSIVAMENTE l\'azienda descritta. Non inventare servizi o caratteristiche non presenti qui.');
        lines.push(`- Attività: ${kb.descrizione_attivita || 'Non specificata'}`);
        if (kb.citta_principale) lines.push(`- Focus Territoriale: ${kb.citta_principale} (${kb.regione || ''})`);
        
        if (kb.punti_di_forza?.length > 0) {
            lines.push('\n### Punti di Forza Unici (USPs):');
            kb.punti_di_forza.slice(0, 5).forEach(p => lines.push(`- ${p}`));
        }
        lines.push('');

        if ((serp?.extracted?.titles?.length > 0) || (serp?.competitors?.length > 0)) {
            lines.push('🔍 ANALISI SERP E CONCORRENZA');
            lines.push('------------------------------------');
            lines.push('Usa questi dati SOLO come base semantica e per capire cosa manca sul mercato. NON copiare il posizionamento dei competitor se va contro i valori del brand.');
            const titles = serp?.extracted?.titles || serp?.competitors?.map(c => c.title) || [];
            titles.slice(0, 5).forEach((t, i) => lines.push(`Competitor ${i+1}: ${t}`));
            
            if (serp?.extracted?.headings?.length > 0) {
                lines.push('\n### Topic Semantici Rilevati:');
                serp.extracted.headings.slice(0, 8).forEach(h => lines.push(`- ${h}`));
            }
            lines.push('');
        }

        if (gsc?.keywords?.length > 0) {
            lines.push('📈 DATI REAL-TIME SEARCH CONSOLE');
            lines.push('------------------------------------');
            lines.push('Ottimizza per conversioni sulle seguenti keyword già attive:');
            gsc.keywords.slice(0, 6).forEach(k => {
                lines.push(`- "${k.keyword}" (Ranking: pos. ${k.position.toFixed(1)})`);
            });
            lines.push('');
        }

        lines.push('🛡️ DIRETTIVE DI GENERAZIONE E BRAND SAFETY');
        lines.push('------------------------------------');
        lines.push('1. PRIORITÀ AZIENDALE: Integra le informazioni della Knowledge Base in ogni paragrafo. L\'azienda è l\'autorità assoluta nel testo.');
        lines.push('2. FILTRO SERP: Usa gli heading dei competitor solo se sono coerenti con i servizi offerti dall\'azienda.');
        lines.push(`3. TONE OF VOICE: ${kb.tono_voce || 'Professionale e orientato al brand'}.`);
        lines.push('4. CONVERSIONE: Orienta il lettore verso la CTA aziendale, non limitarti all\'informazione pura.');
        lines.push('5. AUTENTICITÀ: Evita genericismi. Usa i punti di forza aziendali per differenziarti radicalmente dai competitor.');
        
        setAdvancedPrompt(lines.join('\n'));
        toast.info("Prompt strategico generato con dati Brand KB!");
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

    const handleDeleteSelectedTopics = async () => {
        if (selectedPlanTopics.length === 0) return;
        if (!confirm(`Sei sicuro di voler eliminare ${selectedPlanTopics.length} contenuti dal piano?`)) return;
        
        setPlanLoading(true);
        try {
            // Se sono queue items, li togliamo dalla coda manuale nel config
            const queueTitles = selectedPlanTopics.filter(t => t.isQueueItem).map(t => t.originalText || t.titolo);
            if (queueTitles.length > 0) {
                const currentConfig = client?.configuration || {};
                const currentQueue = currentConfig.editorial_queue || [];
                const newQueue = currentQueue.filter(k => !queueTitles.includes(k));
                await axios.put(`${API}/clients/${effectiveClientId}/configuration`, { ...currentConfig, editorial_queue: newQueue }, { headers: getAuthHeaders() });
            }

            // Se sono dal piano generato, li passiamo al backend per l'eliminazione
            const planTitles = selectedPlanTopics.filter(t => !t.isQueueItem).map(t => t.titolo);
            if (planTitles.length > 0) {
                await axios.post(`${API}/editorial-plan/${effectiveClientId}/delete-topics`, { titles: planTitles }, { headers: getAuthHeaders() });
            }

            toast.success("Contenuti rimossi con successo");
            setSelectedPlanTopics([]);
            fetchPlan();
            fetchClient(); // Refresh for the queue
        } catch (error) {
            toast.error("Errore durante l'eliminazione");
        } finally {
            setPlanLoading(false);
        }
    };

    const toggleTopicSelection = (topic) => {
        const isSelected = selectedPlanTopics.some(t => t.titolo === topic.titolo);
        if (isSelected) {
            setSelectedPlanTopics(selectedPlanTopics.filter(t => t.titolo !== topic.titolo));
        } else {
            setSelectedPlanTopics([...selectedPlanTopics, topic]);
        }
    };

    const isTopicSelected = (topic) => selectedPlanTopics.some(t => t.titolo === topic.titolo);

    async function handleBatchPlanGenerate() {
        if (selectedPlanTopics.length === 0) { toast.error('Seleziona almeno un articolo'); return; }
        setGenerating(true); setResults([]); setProgressPercent(0);

        await saveConfig();
        try {
            // Pre-process topics to include image information
            const topicsToProcess = selectedPlanTopics.map(t => ({
                ...t,
                // Ensure image_ids is initialized if we have a stock URL
                featured_image_url: t.featured_image || t.stock_image_url
            }));

            const res = await axios.post(`${API}/articles/batch-plan`, {
                client_id: effectiveClientId,
                topics: topicsToProcess,
                publish_to_wordpress: publishToWp,
                content_type: contentType,
                generate_cover: true // Fallback to search if no image present
            }, { headers: getAuthHeaders() });

            // Se abbiamo generato elementi della coda manuale, rimuoviamoli dal config
            const queueItemsInBatch = selectedPlanTopics.filter(t => t.isQueueItem).map(t => t.originalText || t.titolo);
            if (queueItemsInBatch.length > 0) {
                const currentConfig = client?.configuration || {};
                const currentQueue = currentConfig.editorial_queue || [];
                const newQueue = currentQueue.filter(k => !queueItemsInBatch.includes(k));
                axios.put(`${API}/clients/${effectiveClientId}/configuration`, { ...currentConfig, editorial_queue: newQueue }, { headers: getAuthHeaders() })
                     .catch(e => console.error("Could not cleanup queue", e));
            }

            const jobId = res.data.job_id;
            const total = res.data.total;
            toast.success(`Job avviato con successo: ${total} articoli in elaborazione in background.`, {
                description: "Puoi monitorare lo stato nel Centro Task in alto a destra.",
                duration: 6000
            });

            // We no longer poll locally here to keep the UI free.
            // The TaskCenter will handle the global job monitoring.
            setGenerating(false);
            setSelectedPlanTopics([]);
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
        { num: 1, label: 'Strategia', icon: Target },
        { num: 2, label: 'Analisi SERP', icon: Search },
        { num: 3, label: 'Configurazione', icon: Lock },
        { num: 4, label: 'Generazione', icon: Zap },
    ];

    useEffect(() => {
        if (gscConnected && !gscData && !gscLoading) {
            loadGscData();
        }
    }, [effectiveClientId, gscConnected]);

    if (!effectiveClientId) return null;


    return (
        <div className="space-y-6 animate-fade-in min-h-screen pb-10 bg-slate-50/30">
            {/* --- PREMIUM STUDIO HEADER --- */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'single', label: 'Studio Articoli', icon: PenTool },
                            { id: 'pillar', label: 'Pillar Hub', icon: Layers },
                            { id: 'plan', label: 'Editorial Plan', icon: Calendar },
                            { id: 'programmatic', label: 'Bulk SEO', icon: Library }
                        ].map((mode) => (
                            <button 
                                key={mode.id}
                                onClick={() => { setGenMode(mode.id); setStep(1); }} 
                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                                    genMode === mode.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <mode.icon className="w-3.5 h-3.5" /> 
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    <div className="px-4 flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PROJET :</p>
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{client?.nome || 'STUDIO'}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <BrainCircuit className="w-4 h-4 text-slate-900" />
                        </div>
                    </div>
                </div>

                {/* --- COMPACT STRATEGY INSIGHT --- */}
                {genMode === 'plan' && gscInsights.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {gscInsights.map((insight, idx) => (
                            <div key={idx} className={`rounded-2xl p-5 border border-slate-100 shadow-sm ${insight.bg} flex flex-col justify-between`}>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                                        <insight.icon className={`w-5 h-5 ${insight.color}`} />
                                    </div>
                                    <div>
                                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${insight.color}`}>{insight.title}</h4>
                                        <p className="text-[10px] text-slate-600 leading-snug font-bold">{insight.desc}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button onClick={() => handleApproveInsight(insight)} className="h-8 px-4 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase">Applica</Button>
                                    <Button onClick={() => handleDismissInsight(insight.id)} variant="ghost" className="h-8 px-4 text-slate-400 hover:text-slate-900 rounded-lg text-[9px] font-black uppercase">Archivia</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- WORKSPACE CORE --- */}
            <div className="max-w-6xl mx-auto w-full">
                {(genMode === 'single' || genMode === 'pillar') && (
                    <div className="space-y-6">
                        {/* SOBRE STEPPER */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-1 shadow-sm overflow-x-auto overflow-y-hidden custom-scrollbar">
                            {steps.map((s, i) => {
                                const active = step === s.num;
                                return (
                                    <Fragment key={s.num}>
                                        <button 
                                            onClick={() => setStep(s.num)} 
                                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex-shrink-0 ${
                                                active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 flex items-center justify-center rounded-lg font-black text-[9px] ${active ? 'bg-white/10 border-white/20' : 'border-slate-100 bg-slate-50'}`}>
                                                {s.num}
                                            </div>
                                            {s.label}
                                        </button>
                                        {i < steps.length - 1 && <div className="w-3 h-px bg-slate-100 flex-shrink-0" />}
                                    </Fragment>
                                );
                            })}
                        </div>

                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight">Content Strategy Selection</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define the strategic baseline for this asset</p>
                                        </div>
                                    </div>
                                    <div className="p-8">
                                        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-200" /></div>}>
                                            <ContentStrategyTab strategy={contentStrategy} setStrategy={setContentStrategy} />
                                        </Suspense>
                                    </div>
                                    <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                        <Button onClick={() => setStep(2)} className="h-11 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            Analisi SERP <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {step === 2 && (
                            <Card className="border-slate-200 rounded-2xl p-8 shadow-sm bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">SERP Intelligence Analysis</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scraping competitors & semantic gap</p>
                                    </div>
                                    <div className="flex bg-slate-100 p-3 rounded-2xl w-full max-w-xl">
                                        <Input 
                                            value={serpKeyword} 
                                            onChange={(e) => setSerpKeyword(e.target.value)} 
                                            placeholder="Focus keyword..." 
                                            className="h-10 px-4 rounded-xl text-sm border-none bg-transparent focus:ring-0" 
                                            onKeyDown={(e) => e.key === 'Enter' && runSerpAnalysis()}
                                        />
                                        <Button onClick={runSerpAnalysis} disabled={serpLoading} className="h-10 px-6 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase">
                                            {serpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analizza'}
                                        </Button>
                                    </div>
                                </div>

                                {serpData && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {serpData.competitors?.map((comp, idx) => (
                                                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between hover:bg-slate-100 transition-colors">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <Badge className="bg-slate-900 text-white text-[8px] font-black px-2 h-4">TOP {idx + 1}</Badge>
                                                            <a href={comp.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-2.5 h-2.5 text-slate-400 hover:text-slate-900" /></a>
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 mb-1 line-clamp-2 leading-tight text-[11px]">{comp.title}</h4>
                                                        <p className="text-[9px] text-slate-400 truncate opacity-60">{comp.url}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between">
                                    <Button variant="ghost" onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors">Indietro</Button>
                                    <Button onClick={() => setStep(3)} className="h-12 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">
                                        Prosegui <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {step === 3 && (
                            <Card className="border-slate-200 rounded-2xl p-8 shadow-sm bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center shadow-md">
                                        <Lock className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">AI Strategy Master Prompt</h3>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Step 03: Final logic control</p>
                                    </div>
                                </div>

                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-slate-900 rounded-2xl blur opacity-5 group-hover:opacity-10 transition duration-500"></div>
                                    <Textarea
                                        className="min-h-[400px] relative bg-slate-50 border-slate-100 p-8 text-sm font-medium leading-relaxed rounded-2xl shadow-inner focus:ring-1 focus:ring-slate-900 transition-all font-mono shadow-inner"
                                        value={advancedPrompt}
                                        onChange={(e) => setAdvancedPrompt(e.target.value)}
                                        placeholder="Generating strategy..."
                                    />
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                                    <Button variant="ghost" onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors">Indietro</Button>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => buildDefaultPrompt(serpData, gscData)} className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest flex gap-2">
                                            <RefreshCcw className="w-3 h-3" /> Re-build
                                        </Button>
                                        <Button onClick={() => setStep(4)} className="h-12 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">Configura Asset <ChevronRight className="w-4 h-4 ml-2" /></Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {step === 4 && (
                             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Final Asset Configuration</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Article Studio</p>
                                            </div>
                                            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
                                                <Button variant="ghost" size="sm" onClick={() => setImageSource('ai')} className={`h-8 px-5 rounded-lg text-[9px] font-black uppercase transition-all ${imageSource === 'ai' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Gen IA</Button>
                                                <Button variant="ghost" size="sm" onClick={() => setImageSource('search')} className={`h-8 px-5 rounded-lg text-[9px] font-black uppercase transition-all ${imageSource === 'search' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Search</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Column 1: Core Config */}
                                        <div className="lg:col-span-7 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Titolo dell'Asset</Label>
                                                <Input 
                                                    className="h-12 text-lg font-black bg-slate-50 border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all" 
                                                    value={singleTitle} 
                                                    onChange={(e) => setSingleTitle(e.target.value)} 
                                                    placeholder="Inserisci il titolo..."
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Concept Strategico</Label>
                                                    <Button onClick={handleImproveObjective} disabled={refiningObjective} variant="outline" className="h-7 px-3 gap-1.5 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black text-[8px] uppercase tracking-widest rounded-lg transition-colors">
                                                        {refiningObjective ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                        AI Refine
                                                    </Button>
                                                </div>
                                                <Textarea 
                                                    className="min-h-[220px] max-h-[350px] text-[11px] p-5 bg-slate-50 border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all font-bold leading-relaxed custom-scrollbar shadow-inner" 
                                                    value={singleObjective} 
                                                    onChange={(e) => setSingleObjective(e.target.value)} 
                                                    placeholder="Describe the strategic goal..."
                                                />
                                            </div>
                                        </div>

                                        {/* Column 2: Visual Intelligence */}
                                        <div className="lg:col-span-5 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Visual Intelligence</Label>
                                                
                                                <div className="relative group overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 min-h-[300px] flex flex-col">
                                                    {imageSource === 'ai' ? (
                                                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
                                                            <div className="w-20 h-20 rounded-[2rem] bg-white shadow-xl shadow-indigo-100/50 flex items-center justify-center border border-indigo-50">
                                                                <Sparkles className="w-8 h-8 text-indigo-300" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Generazione IA</p>
                                                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-1">L'immagine verrà creata in base <br/>al concept strategico.</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 p-4 space-y-4">
                                                            <div className="flex gap-2">
                                                                <div className="relative flex-1">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                                                    <Input 
                                                                        value={imgSearchQuery} 
                                                                        onChange={(e) => setImgSearchQuery(e.target.value)} 
                                                                        placeholder="Search..." 
                                                                        className="h-9 pl-9 rounded-xl border-slate-200 bg-white text-[11px] font-bold" 
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleImageSearch(12)}
                                                                    />
                                                                </div>
                                                                <Button onClick={() => handleImageSearch(12)} disabled={searchingImages} className="h-9 w-9 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                                                                    {searchingImages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                                                {imgSearchResults.map((img, i) => (
                                                                    <div key={i} onClick={() => importExternalImage(img.image)} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-slate-900 transition-all bg-white border border-slate-100">
                                                                        <img src={img.thumbnail || img.image} className="w-full h-full object-cover" />
                                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <Plus className="w-4 h-4 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {imgSearchResults.length === 0 && !searchingImages && (
                                                                    <div className="col-span-3 py-10 flex flex-col items-center justify-center opacity-30">
                                                                        <ImageIcon className="w-8 h-8 mb-2" />
                                                                        <p className="text-[8px] font-black uppercase">Fai una ricerca</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {singleSelectedImage && (
                                                        <div className="absolute inset-0 bg-white z-10 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="relative h-full rounded-xl overflow-hidden border-2 border-emerald-500/30 group">
                                                                <img src={singleSelectedImage.url} className="w-full h-full object-cover" />
                                                                <div className="absolute top-2 right-2 flex gap-2">
                                                                    <Button size="icon" onClick={() => setSingleSelectedImage(null)} variant="destructive" className="h-8 w-8 rounded-lg shadow-lg"><X className="w-4 h-4" /></Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <Button variant="ghost" onClick={() => setStep(3)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-950 tracking-widest pl-0">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Indietro
                                        </Button>
                                        <Button 
                                            onClick={handleSingleGenerate} 
                                            disabled={singleGenerating} 
                                            className="h-14 px-12 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            {singleGenerating ? (
                                                <div className="flex items-center gap-3">
                                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                                    <span>PROCESSING ENGINE...</span>
                                                </div>
                                            ) : (
                                                <span className="flex items-center gap-3">EXECUTE STRATEGY <Zap className="w-4 h-4 text-amber-400" /></span>
                                            )}
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {genMode === 'plan' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-600">
                        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-md"><Calendar className="w-5 h-5 text-white" /></div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Editorial Hub</h2>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{client?.nome || 'Studio'} Strategy</p>
                                        {selectedPlanTopics.length > 0 && (
                                            <Badge className="bg-indigo-600 border-none text-[8px] font-black">{selectedPlanTopics.length} SELEZIONATI</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedPlanTopics.length > 0 ? (
                                    <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                                         <Button onClick={handleBatchPlanGenerate} disabled={generating} className="h-10 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase px-6 tracking-widest shadow-lg shadow-indigo-100 flex gap-2">
                                            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                            GENERA SELEZIONATI
                                         </Button>
                                         <Button onClick={handleDeleteSelectedTopics} variant="outline" className="h-10 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-black text-[9px] uppercase px-4 flex gap-2">
                                            <Trash2 className="w-3 h-3" />
                                         </Button>
                                         <Button onClick={() => setSelectedPlanTopics([])} variant="ghost" className="h-10 text-slate-400 hover:text-slate-900 rounded-xl font-black text-[9px] uppercase">Annulla</Button>
                                    </div>
                                ) : (
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        <Button variant="ghost" size="sm" onClick={() => setPlanView('list')} className={`h-8 px-4 rounded-lg text-[9px] uppercase font-black ${planView === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>List</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setPlanView('calendar')} className={`h-8 px-4 rounded-lg text-[9px] uppercase font-black ${planView === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Calendar</Button>
                                    </div>
                                )}
                                <Button onClick={generateNewPlan} disabled={planGenerating} className="h-10 bg-slate-950 text-white rounded-xl font-black text-[9px] px-6 uppercase tracking-widest">
                                    {planGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh Hub'}
                                </Button>
                            </div>
                        </div>

                        {allPlanTopics.length > 0 && planView === 'calendar' && (
                            <div className="bg-white rounded-[3.5rem] border border-slate-200 p-10 shadow-2xl">
                                <EditorialCalendar topics={allPlanTopics} onArticleClick={handleUseTopicInGenerator} />
                            </div>
                        )}

                        {allPlanTopics.length > 0 && planView === 'list' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-6 py-2">
                                     <div className="flex items-center gap-2">
                                         <button 
                                            onClick={() => {
                                                if (selectedPlanTopics.length === allPlanTopics.length) setSelectedPlanTopics([]);
                                                else setSelectedPlanTopics(allPlanTopics);
                                            }}
                                            className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center hover:border-slate-900 transition-colors"
                                         >
                                             {selectedPlanTopics.length === allPlanTopics.length && <div className="w-2.5 h-2.5 bg-slate-900 rounded-[2px]" />}
                                         </button>
                                         <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">SELEZIONA TUTTI ({allPlanTopics.length})</span>
                                     </div>
                                     <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">STATUS / AZIONE</div>
                                </div>

                                {allPlanTopics.map((item, idx) => {
                                    const isSelected = isTopicSelected(item);
                                    return (
                                        <div key={idx} className={`bg-white p-4 rounded-2xl border transition-all relative overflow-hidden group ${isSelected ? 'border-indigo-600 ring-1 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-300 shadow-sm'}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                                    <button 
                                                        onClick={() => toggleTopicSelection(item)}
                                                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                                                    >
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </button>

                                                    <div 
                                                        className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 group/img cursor-pointer"
                                                        onClick={() => {
                                                            setEditingTopic(item);
                                                            setImgSearchQuery(item.keyword || item.titolo);
                                                            handleImageSearch(12);
                                                            setShowImgChangeModal(true);
                                                        }}
                                                    >
                                                        <img src={item.featured_image || item.stock_image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Sparkles className="w-3 h-3 text-white" />
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1.5 focus-within:z-10">
                                                             <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-tight truncate leading-none">{item.titolo}</h4>
                                                             <Badge variant="outline" className={`text-[7px] font-black uppercase px-2 h-3.5 border-none shadow-none ${item.isQueueItem ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                                                                {item.isQueueItem ? 'SUGGESTED' : 'PLAN'}
                                                             </Badge>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                            <div className="flex items-center gap-1.5 opacity-60">
                                                                <span className="w-1 h-1 rounded-full bg-slate-400" />
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.funnel || 'Awareness'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Search className="w-2.5 h-2.5 text-slate-300" />
                                                                <span className="text-[9px] text-slate-500 font-black tracking-tight">{item.keyword || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="hidden sm:flex flex-col items-end px-4 border-r border-slate-100">
                                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">ESTIMATED</p>
                                                        <p className="font-bold text-slate-600 text-[10px] tabular-nums">~1,500 words</p>
                                                    </div>
                                                    <Button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUseTopicInGenerator(item);
                                                        }}
                                                        variant="outline"
                                                        className="h-10 w-10 p-0 border-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedPlanTopics([item]);
                                                            setTimeout(handleBatchPlanGenerate, 100);
                                                        }}
                                                        disabled={generating}
                                                        className="h-10 w-10 p-0 bg-slate-950 hover:bg-slate-900 text-white rounded-xl transition-all shadow-lg group/play"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-current" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {genMode === 'programmatic' && (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-600">
                         <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
                              <div className="w-16 h-16 rounded-xl bg-slate-950 flex items-center justify-center mx-auto shadow-lg"><Library className="w-8 h-8 text-white" /></div>
                              <div>
                                  <h2 className="text-xl font-black text-slate-950 tracking-tight">Bulk SEO Studio</h2>
                                  <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto">Generazione massiva di contenuti ottimizzati per silo semantici.</p>
                              </div>
                              <Button onClick={() => setWizardStep(1)} className="h-12 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Lancia Wizard Programmatico</Button>
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
            {/* --- IMAGE CHANGE MODAL --- */}
            <Dialog open={showImgChangeModal} onOpenChange={setShowImgChangeModal}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
                    <div className="p-5 bg-slate-950 text-white">
                        <h3 className="text-[11px] font-black uppercase tracking-tight flex items-center gap-2">
                             <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                             Cambia Immagine
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 line-clamp-1">{editingTopic?.titolo}</p>
                    </div>
                    <ScrollArea className="max-h-[60vh] bg-slate-50">
                        <div className="p-4">
                            {searchingImages ? (
                                <div className="flex flex-col items-center justify-center py-16 animate-pulse">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                    <p className="text-[8px] font-black uppercase text-slate-400 mt-4 tracking-widest">Searching...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {imgSearchResults.map((img, i) => (
                                        <div 
                                            key={i} 
                                            onClick={async () => {
                                                const updatedTopic = { ...editingTopic, featured_image: img.image };
                                                const updatedPlanTopics = allPlanTopics.map(t => t.titolo === editingTopic.titolo ? updatedTopic : t);
                                                await axios.post(`${API}/save-plan/${effectiveClientId}`, { topics: updatedPlanTopics }, { headers: getAuthHeaders() });
                                                fetchPlan();
                                                setShowImgChangeModal(false);
                                                toast.success("Immagine aggiornata");
                                            }}
                                            className="group relative aspect-square rounded-2xl overflow-hidden bg-white border border-slate-100 cursor-pointer hover:ring-2 hover:ring-slate-900 transition-all shadow-sm"
                                        >
                                            <img src={img.thumbnail || img.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Check className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

        </div>
    );
}
