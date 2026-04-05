import React, { useState, useEffect } from 'react';
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
    Library, Check, Layers, ArrowRight, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';

import { ContentStrategyTab } from '../../pages/configuration/ContentStrategyTab';
import { KeywordsTab } from '../../pages/configuration/KeywordsTab';



const AdminGenerator = ({
    client, effectiveClientId, getAuthHeaders, navigate, externalMode, initialData, onDataUsed
}) => {
    const [automation, setAutomation] = useState({ enabled: false, articles_per_week: 1 });
    const [targetKeywords, setTargetKeywords] = useState([]);
    const [branding, setBranding] = useState({});
    const [saving, setSaving] = useState(false);
    const [step, setStep] = useState(1);

    // Strategy state
    const [contentStrategy, setContentStrategy] = useState({
        funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS',
        buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '',
        cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [],
        keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: ''
    });

    // SERP state
    const [serpKeyword, setSerpKeyword] = useState('');
    const [serpLoading, setSerpLoading] = useState(false);
    const [serpData, setSerpData] = useState(null);

    // GSC state
    const [gscData, setGscData] = useState(null);
    const [gscLoading, setGscLoading] = useState(false);

    // Prompt state
    const [advancedPrompt, setAdvancedPrompt] = useState('');

    // Generation state
    const [autoGenerateCover, setAutoGenerateCover] = useState(true);
    const [genMode, setGenMode] = useState(externalMode || 'single');
    
    useEffect(() => {
        if (externalMode && ['single', 'plan', 'programmatic'].includes(externalMode)) {
            setGenMode(externalMode);
        }
    }, [externalMode]);

    const [singleTitle, setSingleTitle] = useState('');
    const [singleKeywords, setSingleKeywords] = useState('');
    const [singleObjective, setSingleObjective] = useState('');
    const [singleGenerating, setSingleGenerating] = useState(false);
    const [refiningObjective, setRefiningObjective] = useState(false);
    const [singleResult, setSingleResult] = useState(null);
    const [singleScheduledDate, setSingleScheduledDate] = useState('');

    // Image Source State for Single Generate
    const [imageSource, setImageSource] = useState('ai'); // 'ai', 'upload', 'search'
    const [imgSearchQuery, setImgSearchQuery] = useState("");
    const [imgSearchResults, setImgSearchResults] = useState([]);
    const [searchingImages, setSearchingImages] = useState(false);
    const [singleSelectedImage, setSingleSelectedImage] = useState(null); // { id, url }
    
    // Silo State
    const [siloClusters, setSiloClusters] = useState([]);
    const [suggestingSilo, setSuggestingSilo] = useState(false);
    const [selectedSiloClusters, setSelectedSiloClusters] = useState([]);

    // Programmatic state
    const [keywords, setKeywords] = useState({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
    const [combinations, setCombinations] = useState([]);
    const [selectedCombinations, setSelectedCombinations] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState([]);
    const [publishToWp, setPublishToWp] = useState(true);
    const [progressPercent, setProgressPercent] = useState(0);
    const [coverLoading, setCoverLoading] = useState({}); // { article_id: boolean }
    const [contentType, setContentType] = useState('articolo');
    const [adminUploadedImages, setAdminUploadedImages] = useState([]);
    const [adminUploading, setAdminUploading] = useState(false);
    const [useSpintax, setUseSpintax] = useState(false);
    const [programmaticTemplate, setProgrammaticTemplate] = useState('');
    const [sidebarTemplate, setSidebarTemplate] = useState('');
    const [ctaConfig, setCtaConfig] = useState({ enabled: true, text: 'Richiedi Preventivo', url: '', color: '#4f46e5' });
    
    // Premium Wizard States
    const [wizardStep, setWizardStep] = useState(1);
    const [isArchitecting, setIsArchitecting] = useState(false);
    const [webCorrelates, setWebCorrelates] = useState([]);
    const [globalImages, setGlobalImages] = useState([]);
    const [imageUploadLoading, setImageUploadLoading] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [internalLinkingEnabled, setInternalLinkingEnabled] = useState(true);


    // Editorial Plan states
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
    const [recentSidebarOpen, setRecentSidebarOpen] = useState(true);
    const [expandedOutlines, setExpandedOutlines] = useState({});
    const [deletingPlan, setDeletingPlan] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const config = client?.configuration || {};
    const allPlanTopics = React.useMemo(() => {
        const planItems = plan?.topics || [];
        const queueItems = (client?.configuration?.editorial_queue || []).map(itemText => {
            // Smart parsing
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
    const llmConfig = config.llm || config.openai || {};
    const wpConfig = config.wordpress || {};
    const hasApiKey = !!llmConfig.api_key;
    const hasWpConfig = wpConfig.url_api && wpConfig.utente && wpConfig.password_applicazione;
    const gscConnected = config.gsc?.connected;
    const gscSite = config.gsc?.site_url || '';

    useEffect(() => {
        if (config.content_strategy) setContentStrategy(prev => ({ ...prev, ...config.content_strategy }));
        if (config.keyword_combinations) setKeywords(config.keyword_combinations);
        if (config.advanced_prompt?.secondo_livello_prompt) setAdvancedPrompt(config.advanced_prompt.secondo_livello_prompt);
        if (config.programmatic) {
            setUseSpintax(config.programmatic.use_spintax ?? true);
            setProgrammaticTemplate(config.programmatic.template || "");
            setSidebarTemplate(config.programmatic.sidebar_template || "");
            if (config.programmatic.cta) setCtaConfig(prev => ({ ...prev, ...config.programmatic.cta }));
        }

        fetchPlan();
        fetchRecentArticles();
    }, [client]);

    useEffect(() => {
        if (imageSource === 'search' && imgSearchQuery && imgSearchResults.length === 0 && !searchingImages) {
            handleImageSearch();
        }
    }, [imageSource, imgSearchQuery]);

    const handleSuggestSilo = async () => {
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
            setSelectedSiloClusters(data.clusters || []); // All selected by default
            toast.success("Strategia Silo generata con successo!");
        } catch (err) {
            console.error("Silo suggestion error:", err);
            toast.error("Errore generazione strategia silo");
        } finally {
            setSuggestingSilo(false);
        }
    };

    const toggleSiloCluster = (cluster) => {
        setSelectedSiloClusters(prev => 
            prev.find(c => c.titolo === cluster.titolo)
            ? prev.filter(c => c.titolo !== cluster.titolo)
            : [...prev, cluster]
        );
    };

    const handleGenerateSilo = async () => {
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
            setStep(1); // Return to list/dashboard
        } catch (err) {
            console.error("Silo batch error:", err);
            toast.error("Errore avvio generazione Silo");
        } finally {
            setGenerating(false);
        }
    };

    const fetchRecentArticles = async () => {
        if (!effectiveClientId) return;
        try {
            const res = await axios.get(`${API}/articles?client_id=${effectiveClientId}`, { headers: getAuthHeaders() });
            setRecentArticles(res.data.slice(0, 50));
        } catch (error) {
            console.error("Error fetching recent articles:", error);
        }
    };

    const fetchPlan = async () => {
        if (!effectiveClientId) return;
        setPlanLoading(true);
        try {
            const res = await axios.get(`${API}/editorial-plan/${effectiveClientId}`, {
                headers: getAuthHeaders()
            });
            setPlan(res.data || null); // Ensure null if empty to clear previous client data
        } catch (error) {
            console.error("Error fetching editorial plan:", error);
            setPlan(null);
        } finally {
            setPlanLoading(false);
        }
    };

    const loadFullPreview = async (id) => {
        try {
            const res = await axios.get(`${API}/articles/${id}/full`, { headers: getAuthHeaders() });
            setFullPreview(res.data);
        } catch (e) {
            toast.error('Errore caricamento anteprima');
        }
    };

    const generateNewPlan = async () => {
        setPlanGenerating(true);
        setResults([]); // Reset results when generating new strategy
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
    };

    const handleDeletePlan = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeletePlan = async () => {
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

    const handleSavePlan = async () => {
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
        if (!newPlanKeyword.trim()) return;
        if (targetKeywords.includes(newPlanKeyword.trim())) {
            toast.error("Keyword già presente");
            return;
        }
        setTargetKeywords([...targetKeywords, newPlanKeyword.trim()]);
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
            setSingleTitle(initialData.titolo || '');
            setSingleKeywords(initialData.keyword || '');
            setSingleObjective(initialData.funnel || 'TOFU');
            if (initialData.keyword) setSerpKeyword(initialData.keyword);

            // Notify that data was consumed
            if (onDataUsed) onDataUsed();
        }
    }, [initialData]);

    // Step checks
    const strategyDone = contentStrategy.funnel_stage && contentStrategy.modello_copywriting;
    const serpDone = serpData && serpData.competitors?.length > 0;
    const promptDone = advancedPrompt.trim().length > 20;

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

    const handleImproveObjective = async () => {
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

    const runSerpAnalysis = async () => {
        if (!serpKeyword.trim()) { toast.error('Inserisci una keyword'); return; }
        setSerpLoading(true);
        try {
            const res = await axios.post(`${API}/serp/analyze-full`, {
                keyword: serpKeyword, num_results: 4, country: 'it'
            }, { headers: getAuthHeaders() });
            setSerpData(res.data);
            toast.success(`Analizzati ${res.data.count} competitor per "${serpKeyword}"`);
            if (!advancedPrompt.trim()) buildDefaultPrompt(res.data, gscData);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore analisi SERP');
        } finally { setSerpLoading(false); }
    };

    const loadGscData = async () => {
        setGscLoading(true);
        try {
            const res = await axios.get(`${API}/clients/${effectiveClientId}/gsc-data?days=28`, { headers: getAuthHeaders() });
            setGscData(res.data);
            toast.success(`Dati GSC caricati: ${res.data.keywords?.length || 0} keyword`);
            if (serpData && !advancedPrompt.trim()) buildDefaultPrompt(serpData, res.data);
        } catch (error) {
            if (error.response?.status === 401) toast.error('Token GSC scaduto. Riconnetti dalla Configurazione.');
            else toast.error(error.response?.data?.detail || 'Errore caricamento GSC');
        } finally { setGscLoading(false); }
    };

    const handleImageSearch = async (count = 12, queryOverride = null) => {
        const searchQ = queryOverride || imgSearchQuery;
        if (!searchQ.trim()) return;
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
            await axios.put(`${API}/clients/${effectiveClientId}/configuration`, {
                ...config,
                content_strategy: contentStrategy,
                keyword_combinations: keywords,
                editorial_queue: targetKeywords,
                advanced_prompt: { ...config.advanced_prompt, secondo_livello_prompt: advancedPrompt },
                programmatic: {
                    use_spintax: true,
                    template: programmaticTemplate,
                    sidebar_template: sidebarTemplate,
                    cta: ctaConfig,
                    global_images: globalImages.map(img => img.url || img.secure_url),
                    internal_linking: internalLinkingEnabled
                },
                publish_to_wordpress: publishToWp,
                content_type: contentType
            }, { headers: getAuthHeaders() });
        } catch (e) { /* silent */ }
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
        if (!singleKeywords.trim() && !singleTitle.trim()) { toast.error('Inserisci almeno keywords o titolo'); return; }
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

    const handleRefine = async () => {
        if (!refineFeedback.trim()) {
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

    const handleProgrammaticGenerate = async () => {
        if (selectedCombinations.length === 0) { toast.error('Seleziona almeno una combinazione'); return; }
        setGenerating(true); setResults([]); setProgressPercent(0);
        await saveConfig();
        // In modalità 'programmatic' (sotto Pagine) genera landing page, altrimenti articoli
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
            const label = genMode === 'programmatic' ? 'pagine' : 'articoli';
            toast.info(`Job avviato: ${total} ${label} in elaborazione...`);
            const poll = async () => {
                try {
                    const jr = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
                    setResults(jr.data.results || []);
                    setProgressPercent(Math.round((jr.data.completed / total) * 100));
                    if (jr.data.status === 'completed') {
                        const s = jr.data.summary || {};
                        if ((s.generated_ok || 0) === 0) {
                            toast.error(`Generazione terminata senza successo: 0 pagine create.`);
                        } else {
                            toast.success(`Completato: ${s.generated_ok || 0} generate, ${s.published_ok || 0} pubblicate`);
                        }
                        setSelectedCombinations([]); setGenerating(false); return;
                    }
                    setTimeout(poll, 4000);
                } catch (e) { setTimeout(poll, 5000); }
            };
            setTimeout(poll, 5000);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore generazione');
            setGenerating(false);
        }
    };

    const handleBatchPlanGenerate = async () => {
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
                const currentQueue = config.editorial_queue || [];
                const newQueue = currentQueue.filter(k => !queueItemsInBatch.includes(k));
                axios.put(`${API}/clients/${effectiveClientId}/configuration`, { ...config, editorial_queue: newQueue }, { headers: getAuthHeaders() })
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
        const currentQueue = config.editorial_queue || [];
        const newQueue = currentQueue.filter(k => k !== textToRemove);
        const newConfig = { ...config, editorial_queue: newQueue };
        
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

    return (
        
        <div className="space-y-8 animate-fade-in">
            {/* Modalità (Sub-tabs) */}
            <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit shadow-sm border border-slate-200">
                <button onClick={() => setGenMode('single')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[11px] uppercase tracking-widest font-bold transition-all ${genMode === 'single' ? 'bg-white text-orange-600 shadow-md ring-1 ring-orange-100' : 'text-slate-500 hover:text-slate-800'}`}>
                    <PenTool className="w-4 h-4" /> Articolo Singolo
                </button>
                <button onClick={() => setGenMode('pillar')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[11px] uppercase tracking-widest font-bold transition-all ${genMode === 'pillar' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800'}`}>
                    <FileText className="w-4 h-4" /> Pillar Page
                </button>
                <button onClick={() => setGenMode('plan')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[11px] uppercase tracking-widest font-bold transition-all ${genMode === 'plan' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Calendar className="w-4 h-4" /> Piano Editoriale
                </button>

                <button onClick={() => setGenMode('programmatic')} className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[11px] uppercase tracking-widest font-bold transition-all ${genMode === 'programmatic' ? 'bg-white text-purple-600 shadow-md ring-1 ring-purple-100' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Sparkles className="w-4 h-4" /> Programmatica
                </button>
            </div>

            {genMode !== 'plan' && (
                <div className="sticky top-4 z-40 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-[#f1f3f6] shadow-md overflow-x-auto transition-all" data-testid="step-bar">
                {steps.map((s, i) => {
                    const isActive = step === s.num;
                    const isDone = s.done && !isActive;
                    return (
                        <React.Fragment key={s.num}>
                            <button
                                onClick={() => setStep(s.num)}
                                className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${
                                    isActive 
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 scale-[1.02]' 
                                    : isDone 
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                        : 'bg-transparent text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                                data-testid={`step-${s.num}-btn`}
                            >
                                <div className={`flex items-center justify-center w-5 h-5 rounded-lg border text-[9px] font-black transition-colors ${
                                    isActive ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50'
                                }`}>
                                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : s.num}
                                </div>
                                <span className="tracking-widest">{s.label}</span>
                            </button>
                            {i < steps.length - 1 && <div className="w-4 h-px bg-slate-100 flex-shrink-0 mx-1" />}
                        </React.Fragment>
                    );
                })}
            </div>
            )}

            {genMode !== "plan" && step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white border border-[#f1f3f6] rounded-[2rem] p-1 shadow-xl shadow-slate-100/50">
                        <ContentStrategyTab strategy={contentStrategy} setStrategy={setContentStrategy} />
                    </div>
                    <div className="flex justify-end p-2">
                        <Button 
                            onClick={() => setStep(2)} 
                            className="bg-slate-900 hover:bg-slate-800 h-11 px-8 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-95" 
                            data-testid="next-step-2-btn"
                        >
                            Analisi SERP <ChevronRight className="w-4 h-4 ml-2 opacity-50" />
                        </Button>
                    </div>
                </div>
            )}

            {genMode !== "plan" && step === 2 && (
                <div className="space-y-4">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-blue-600" />Analisi SERP</CardTitle>
                            <CardDescription>Analizza i competitor per la keyword target ed estrai titoli e headings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <Input value={serpKeyword} onChange={(e) => setSerpKeyword(e.target.value)}
                                    placeholder="Es: noleggio auto salerno" className="flex-1" data-testid="serp-keyword-input"
                                    onKeyDown={(e) => e.key === 'Enter' && runSerpAnalysis()} />
                                <Button onClick={runSerpAnalysis} disabled={serpLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]" data-testid="serp-analyze-btn">
                                    {serpLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                    {serpLoading ? 'Analisi...' : 'Analizza SERP'}
                                </Button>
                            </div>

                            {serpData && (
                                <div className="space-y-4 mt-4">
                                    {serpData.competitors?.map((c, i) => (
                                        <Card key={i} className="border-slate-200 bg-slate-50/50">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-xs font-mono">#{c.position}</Badge>
                                                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[300px]">
                                                                {c.url} <ExternalLink className="w-3 h-3 inline ml-1" />
                                                            </a>
                                                        </div>
                                                        <p className="font-semibold text-slate-900 text-sm">{c.title}</p>
                                                        {c.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
                        <Button onClick={() => setStep(gscConnected ? 3 : 4)} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-3-btn">
                            Prosegui: {gscConnected ? 'Dati GSC' : 'Prompt'} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {genMode !== "plan" && step === 3 && (
                <div className="space-y-4">
                    {gscConnected ? (
                        <Card className="border-sky-200 bg-sky-50/50" data-testid="gsc-step">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-sky-600" />Google Search Console
                                        </CardTitle>
                                        <CardDescription>{gscSite}</CardDescription>
                                    </div>
                                    {gscData && (
                                        <Button variant="outline" size="sm" onClick={loadGscData} disabled={gscLoading}>
                                            Aggiorna
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {gscLoading && !gscData ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-sky-600 mx-auto" />
                                ) : gscData ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-4 gap-3">
                                            {[
                                                { label: 'Click', value: gscData.totals?.total_clicks || 0 },
                                                { label: 'Impressioni', value: gscData.totals?.total_impressions || 0 },
                                                { label: 'CTR medio', value: `${gscData.totals?.avg_ctr || 0}%` },
                                                { label: 'Posiz. media', value: gscData.totals?.avg_position || 0 },
                                            ].map(m => (
                                                <div key={m.label} className="p-3 bg-white rounded-lg text-center border border-sky-100">
                                                    <p className="text-xl font-bold text-slate-900">{m.value}</p>
                                                    <p className="text-xs text-slate-500">{m.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {gscData.keywords?.slice(0, 12).map((k, i) => (
                                                <Badge key={i} variant="outline" className="text-xs bg-white font-mono">
                                                    {k.keyword}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <Button onClick={loadGscData} disabled={gscLoading}>Carica dati GSC</Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="p-6 text-center text-slate-500">GSC non connesso. Puoi saltare questo step.</Card>
                    )}
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(2)}>Indietro</Button>
                        <Button onClick={() => setStep(4)} className="bg-slate-900 hover:bg-slate-800">Prosegui</Button>
                    </div>
                </div>
            )}

            {genMode !== "plan" && step === 4 && (
                <div className="space-y-4">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Prompt Avanzato</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={advancedPrompt}
                                onChange={(e) => setAdvancedPrompt(e.target.value)}
                                rows={12}
                                className="font-mono text-sm"
                            />
                        </CardContent>
                    </Card>
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(gscConnected ? 3 : 2)}>Indietro</Button>
                        <Button onClick={() => setStep(5)} className="bg-slate-900 hover:bg-slate-800">Prosegui</Button>
                    </div>
                </div>
            )}

            {genMode !== "plan" && step === 5 && (
                <div className="space-y-6">
                    {/* L'immagine viene ora gestita automaticamente dal sistema */}

                    {(genMode === 'single' || genMode === 'pillar') && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Colonna Sinistra: Configurazione */}
                                <div className="lg:col-span-7 space-y-6">
                                    <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                                {genMode === 'pillar' ? <FileText className="w-5 h-5 text-emerald-500" /> : <PenTool className="w-5 h-5 text-orange-500" />} 
                                                {genMode === 'pillar' ? 'Dati Pillar Page' : 'Dati Articolo'}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                {genMode === 'pillar' ? 'Crea una pagina pilastro esaustiva (2500+ parole) con indice e anchor links' : 'Inserisci i dettagli per l\'analisi e la scrittura AI'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6 pt-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-700">Titolo Suggerito (Opzionale)</Label>
                                                <Input 
                                                    className={`h-12 rounded-xl text-sm bg-slate-50/50 border-slate-200 transition-all font-medium focus-visible:ring-${genMode === 'pillar' ? 'emerald' : 'orange'}-500`}
                                                    value={singleTitle} 
                                                    onChange={(e) => setSingleTitle(e.target.value)} 
                                                    placeholder={genMode === 'pillar' ? "Es: La Guida Definitiva al Noleggio Auto a Salerno" : "Es: Come noleggiare un'auto senza carta di credito a Salerno"} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-slate-700">Focus Keyword *</Label>
                                                <Input 
                                                    className={`h-12 rounded-xl text-sm bg-slate-50/50 border-slate-200 transition-all font-bold focus-visible:ring-${genMode === 'pillar' ? 'emerald' : 'orange'}-500`}
                                                    value={singleKeywords} 
                                                    onChange={(e) => setSingleKeywords(e.target.value)} 
                                                    placeholder="Es: noleggio auto salerno" 
                                                />
                                                <p className="text-[10px] text-slate-400">Inserisci la parola chiave principale per l'ottimizzazione SEO</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-bold text-slate-700">Obiettivo / Note Speciali</Label>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={handleImproveObjective}
                                                        disabled={refiningObjective || !singleObjective}
                                                        className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 shadow-sm transition-all"
                                                    >
                                                        {refiningObjective ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                                                        Migliora con IA
                                                    </Button>
                                                </div>
                                                <Textarea 
                                                    className={`min-h-[140px] rounded-xl text-sm bg-slate-50/50 border-slate-200 transition-all leading-relaxed focus-visible:ring-${genMode === 'pillar' ? 'emerald' : 'orange'}-500`}
                                                    value={singleObjective} 
                                                    onChange={(e) => setSingleObjective(e.target.value)} 
                                                    placeholder={genMode === 'pillar' ? "Indica punti chiave, opinioni forti da includere o previsioni di settore..." : "Descrivi il target, il tono di voce o specifiche SEO..."} 
                                                />
                                            </div>

                                            {genMode === 'pillar' && (
                                                <div className="pt-2">
                                                    <Button 
                                                        onClick={handleSuggestSilo}
                                                        disabled={suggestingSilo || (!singleTitle && !singleKeywords)}
                                                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 font-bold transition-all"
                                                    >
                                                        {suggestingSilo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
                                                        Strategia Silo: Suggerisci 5 Cluster di Sostegno
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                                <div className="flex-1 p-4 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-sm transition-all hover:bg-indigo-100/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-500">
                                                            <Globe className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-indigo-900">WordPress</p>
                                                            <p className="text-[10px] text-indigo-600 font-medium">Pubblicazione Live</p>
                                                        </div>
                                                    </div>
                                                    <Switch checked={publishToWp} onCheckedChange={setPublishToWp} />
                                                </div>


                                                <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-center">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Calendarizza (Opzionale)</Label>
                                                    <Input
                                                        type="datetime-local"
                                                        value={singleScheduledDate}
                                                        onChange={(e) => setSingleScheduledDate(e.target.value)}
                                                        className="h-7 text-xs bg-transparent border-none p-0 focus-visible:ring-0 font-bold text-slate-700"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Colonna Destra: Media & Risultato */}
                                <div className="lg:col-span-5 space-y-6">
                                    <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                                        <CardHeader className="bg-slate-50/50 py-4 border-b border-slate-100">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Camera className="w-4 h-4 text-orange-500" /> Immagine in Evidenza
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-5 space-y-5">
                                            <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                                                <button onClick={() => setImageSource('ai')} className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${imageSource === 'ai' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Generata AI</button>
                                                <button onClick={() => { setImageSource('upload'); if (singleTitle && !imgSearchQuery) setImgSearchQuery(singleTitle); }} className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${imageSource === 'upload' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Upload</button>
                                                <button onClick={() => { setImageSource('search'); if (singleTitle && !imgSearchQuery) setImgSearchQuery(singleTitle); }} className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${imageSource === 'search' ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>Cerca Web</button>
                                            </div>

                                            {imageSource === 'ai' && (
                                                <div className="p-6 border-2 border-dashed border-emerald-100 rounded-3xl bg-emerald-50/30 text-center space-y-3 animate-in fade-in zoom-in-95">
                                                    <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
                                                    <p className="text-xs text-slate-600 font-bold px-4 leading-normal">
                                                        L'AI creerà una cover cinematografica coerente con il brand e il contenuto dell'articolo.
                                                    </p>
                                                </div>
                                            )}

                                            {(imageSource === 'upload' || imageSource === 'search') && (
                                                <div className="space-y-4">
                                                    {singleSelectedImage ? (
                                                        <div className="relative group rounded-2xl overflow-hidden border-2 border-orange-200 shadow-lg">
                                                            <img src={singleSelectedImage.url} className="w-full aspect-video object-cover transition-transform group-hover:scale-105 duration-500" alt="selected" />
                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => setSingleSelectedImage(null)} className="w-full h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                                                                    <Trash2 className="w-3.5 h-3.5" /> Rimuovi
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : imageSource === 'upload' ? (
                                                        <div className="border-2 border-dashed rounded-3xl p-10 text-center hover:bg-slate-50 transition-all cursor-pointer relative group border-slate-200 hover:border-orange-300">
                                                            <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleSingleFileUpload} accept="image/*" />
                                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                                                <ImagePlus className="w-8 h-8 text-slate-300 group-hover:text-orange-400" />
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-500">Seleziona immagine</p>
                                                            <p className="text-[10px] text-slate-400 mt-1">PNG, JPG fino a 5MB</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            <div className="flex gap-2">
                                                                <Input 
                                                                    className="h-10 rounded-xl text-xs bg-slate-50 focus-visible:ring-orange-500" 
                                                                    placeholder="Cerca foto ad alta qualità..." 
                                                                    value={imgSearchQuery} 
                                                                    onChange={(e) => setImgSearchQuery(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleImageSearch(12)}
                                                                />
                                                                <Button size="sm" onClick={() => handleImageSearch(12)} disabled={searchingImages} className="h-10 px-4 bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-100">
                                                                    {searchingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                                                </Button>
                                                            </div>
                                                            {imgSearchResults.length > 0 && (
                                                                <ScrollArea className="h-[280px] rounded-2xl border border-slate-100 bg-slate-50 p-2 shadow-inner">
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {imgSearchResults.map((img, i) => (
                                                                            <div key={i} className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden shadow-sm" onClick={() => importExternalImage(img.image)}>
                                                                                <img src={img.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={img.title || ""} loading="lazy" />
                                                                                <div className="absolute inset-0 bg-orange-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                                                                    <ImagePlus className="w-6 h-6 text-white mb-1 shadow-md" />
                                                                                    <span className="text-[8px] font-bold text-white bg-black/40 px-1.5 py-0.5 rounded-full">{img.width}x{img.height}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-4 pb-2 text-center">
                                                                        <Button variant="ghost" size="sm" onClick={() => handleImageSearch(imgSearchResults.length + 10)} disabled={searchingImages} className="text-[10px] font-black text-slate-400 hover:text-orange-500">
                                                                            {searchingImages ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                                                            CARICA ALTRE IMMAGINI
                                                                        </Button>
                                                                    </div>
                                                                </ScrollArea>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {genMode === 'pillar' && (
                                        <div className="space-y-4 mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Strategia Pillar & Cluster</h3>
                                                    <p className="text-[10px] text-slate-500 font-medium">Genera 5 articoli satellite per creare un Silo SEO</p>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={handleSuggestSilo}
                                                    disabled={suggestingSilo || !singleObjective}
                                                    className="h-9 border-indigo-100 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl"
                                                >
                                                    {suggestingSilo ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Library className="w-3.5 h-3.5 mr-2" />}
                                                    Suggerisci Clusters
                                                </Button>
                                            </div>

                                            {siloClusters.length > 0 && (
                                                <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                                                    <div className="p-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-indigo-700 uppercase">Cluster Suggeriti</span>
                                                        <Badge className="bg-indigo-600 text-white font-bold">{selectedSiloClusters.length} Selezionati</Badge>
                                                    </div>
                                                    <div className="p-2 space-y-1">
                                                        {siloClusters.map((cluster, idx) => {
                                                            const isSelected = !!selectedSiloClusters.find(c => c.titolo === cluster.titolo);
                                                            return (
                                                                <div 
                                                                    key={idx} 
                                                                    onClick={() => toggleSiloCluster(cluster)}
                                                                    className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-transparent border-slate-100 hover:border-indigo-100'}`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                                                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`text-[11px] font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{cluster.titolo}</p>
                                                                        <p className="text-[9px] text-slate-400 line-clamp-1 italic">{cluster.objective}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="p-4 bg-slate-50 border-t border-indigo-100">
                                                        <Button 
                                                            onClick={handleGenerateSilo} 
                                                            disabled={generating || selectedSiloClusters.length === 0}
                                                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100"
                                                        >
                                                            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                                            LANCIA SILO (Pillar + {selectedSiloClusters.length} Cluster)
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Button 
                                        onClick={() => handleSingleGenerate('articolo')} 
                                        disabled={singleGenerating} 
                                        className={`w-full h-12 bg-gradient-to-r from-slate-900 to-slate-800 hover:to-orange-600 shadow-xl border-0 text-white rounded-2xl group transition-all duration-500 ${genMode === 'pillar' && siloClusters.length > 0 ? 'hidden' : ''}`}
                                    >
                                        <div className="flex items-center justify-center w-full relative">
                                            {singleGenerating ? (
                                                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                            ) : (
                                                <Zap className="w-6 h-6 mr-3 text-amber-400 group-hover:scale-125 transition-transform" />
                                            )}
                                            <span className="text-sm font-black tracking-tight uppercase">
                                                {singleGenerating ? 'Generazione in corso...' : (genMode === 'pillar' ? 'Genera Solo Pillar' : 'Avvia Generazione')}
                                            </span>
                                        </div>
                                    </Button>

                                    {singleResult && (
                                        <div className="mt-4 p-5 border border-emerald-100 bg-emerald-50 rounded-2xl space-y-4 shadow-sm animate-in zoom-in-95 duration-300">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-emerald-500 rounded-lg shadow-sm shadow-emerald-200">
                                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                                    </div>
                                                    <p className="font-bold text-sm text-emerald-900">
                                                        {singleResult.status === 'completed' ? 'Articolo Generato!' : 'In elaborazione...'}
                                                    </p>
                                                </div>
                                            </div>
                                            {singleResult.wordpress_link && (
                                                <div className="bg-white/80 border border-emerald-100 p-3 rounded-xl flex items-center justify-between group">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                        <span className="text-[10px] font-bold text-slate-600 truncate">{singleResult.wordpress_link.split('//')[1]}</span>
                                                    </div>
                                                    <a href={singleResult.wordpress_link} target="_blank" rel="noreferrer" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-all hover:scale-105">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            )}
                                            {singleResult.id && (
                                                <Button variant="outline" size="sm" className="w-full text-xs font-black text-emerald-800 border-emerald-200 h-10 hover:bg-emerald-100/50 rounded-xl" onClick={() => loadFullPreview(singleResult.id)}>
                                                    <Eye className="w-4 h-4 mr-2" /> ANTEPRIMA COMPLETA
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {genMode === 'programmatic' && (
                        <div className="space-y-6 flex flex-col">
                            {/* Wizard Header / Stepper */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-4">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                                SEO Programmatica Premium
                                                <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px]">v2.0</Badge>
                                            </h2>
                                            <p className="text-xs text-slate-500 font-medium">Generazione bulk ad alto impatto con intelligenza semantica</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div key={step} className="flex items-center">
                                                <div 
                                                    onClick={() => wizardStep > step && setWizardStep(step)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${wizardStep >= step ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'} ${wizardStep > step ? 'cursor-pointer hover:bg-indigo-500' : ''}`}
                                                >
                                                    {step}
                                                </div>
                                                {step < 4 && <div className={`w-8 h-1 mx-1 rounded-full ${wizardStep > step ? 'bg-indigo-600 cursor-pointer' : 'bg-slate-100'}`} onClick={() => wizardStep > step && setWizardStep(step)} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 1: Dati & Keyword */}
                                {wizardStep === 1 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid grid-cols-1 gap-6">
                                            <KeywordsTab keywords={keywords} setKeywords={setKeywords} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
                                        </div>
                                        <div className="flex justify-end p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl font-bold shadow-lg shadow-indigo-100"
                                                onClick={handleArchitectStep}
                                                disabled={isArchitecting}
                                            >
                                                {isArchitecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                Configura Architettura AI
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: AI Spintax Architect */}
                                {wizardStep === 2 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                            <div className="lg:col-span-8 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-bold text-slate-800">Master Spintax Template (Generato da AI)</Label>
                                                    <Button variant="ghost" size="sm" className="text-xs text-indigo-600" onClick={handleArchitectStep} disabled={isArchitecting}>
                                                        <RefreshCcw className="w-3 h-3 mr-1" /> Rigenera
                                                    </Button>
                                                </div>
                                                <Textarea 
                                                    className="min-h-[400px] font-mono text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors p-6 rounded-2xl leading-relaxed"
                                                    value={programmaticTemplate}
                                                    onChange={(e) => setProgrammaticTemplate(e.target.value)}
                                                />
                                            </div>
                                            <div className="lg:col-span-4 space-y-4">
                                                <Card className="border-indigo-100 bg-indigo-50/30 shadow-none rounded-2xl">
                                                    <CardHeader className="py-4">
                                                        <CardTitle className="text-xs font-black uppercase text-indigo-700 tracking-widest flex items-center gap-2">
                                                            <Globe className="w-3.5 h-3.5" /> Correlate dal Web
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="px-4 pb-4">
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {webCorrelates.map((c, i) => (
                                                                <Badge key={i} variant="secondary" className="bg-white border-indigo-200 text-indigo-700 px-3 py-1 text-[11px] font-medium shadow-sm">
                                                                    {c}
                                                                </Badge>
                                                            ))}
                                                            {webCorrelates.length === 0 && <p className="text-[10px] text-slate-400 italic">Nessun intento trovato...</p>}
                                                        </div>
                                                        <div className="mt-6 p-4 bg-white/60 rounded-xl border border-indigo-100 text-[10px] text-slate-500 leading-relaxed">
                                                            L'AI ha incorporato questi intenti naturali nel testo per massimizzare la rilevanza semantica e GEO.
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-3">
                                                    <h4 className="text-[11px] font-black text-orange-700 uppercase">Suggerimenti</h4>
                                                    <ul className="text-[10px] text-orange-600 space-y-2 list-disc pl-4">
                                                        <li>Usa [[CITTA]] per la località</li>
                                                        <li>Usa [[SERVIZIO]] per il core service</li>
                                                        <li>Controlla la chiusura delle parentesi per Spintax</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                            <Button variant="ghost" onClick={() => setWizardStep(1)}>Indietro</Button>
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl font-bold shadow-lg shadow-indigo-100"
                                                onClick={() => { setWizardStep(3); handleGeneratePreview(); }}
                                            >
                                                Scegli Design & Media <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Design & Media */}
                                {wizardStep === 3 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Design Controls */}
                                            <div className="space-y-6">
                                                <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                                                    <CardHeader className="bg-slate-50/50 py-3 border-b">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <ImageIcon className="w-4 h-4 text-emerald-600" /> Immagini Globali (Batch)
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {globalImages.map((img, i) => (
                                                                <div key={i} className="relative aspect-square rounded-lg border overflow-hidden group">
                                                                    <img src={img.url || img.secure_url} className="w-full h-full object-cover" />
                                                                    <button className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setGlobalImages(prev => prev.filter((_, idx) => idx !== i))}>
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <label className="border-2 border-dashed border-slate-200 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                                                                {imageUploadLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Plus className="w-6 h-6 text-slate-300" />}
                                                                <span className="text-[8px] font-bold text-slate-400 mt-1">UPLOAD</span>
                                                                <input type="file" className="hidden" multiple accept="image/*" onChange={handleGlobalImageUpload} />
                                                            </label>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 italic">Queste immagini verranno distribuite omogeneamente in tutte le pagine del batch.</p>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                                                    <CardHeader className="bg-slate-50/50 py-3 border-b">
                                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                            <MousePointerClick className="w-4 h-4 text-orange-600" /> Conversione & Strategia
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 space-y-6">
                                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <div className="space-y-0.5">
                                                                <Label className="text-xs font-bold">Linking Interno Incrociato</Label>
                                                                <p className="text-[9px] text-slate-500 italic">Collega 3 località casuali del batch per ogni pagina</p>
                                                            </div>
                                                            <Switch checked={internalLinkingEnabled} onCheckedChange={setInternalLinkingEnabled} />
                                                        </div>
                                                        
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-xs font-bold">Configurazione CTA</Label>
                                                                <Switch checked={ctaConfig.enabled} onCheckedChange={(v) => setCtaConfig({...ctaConfig, enabled: v})} />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Input className="h-9 text-xs" placeholder="Testo Bottone" value={ctaConfig.text} onChange={(e) => setCtaConfig({...ctaConfig, text: e.target.value})} />
                                                                <Input className="h-9 text-xs" placeholder="URL Destinazione" value={ctaConfig.url} onChange={(e) => setCtaConfig({...ctaConfig, url: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Live Preview */}
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                                    <Eye className="w-3.5 h-3.5" /> Anteprima Real-Time (Testata su {keywords.citta_e_zone[0] || 'Città'})
                                                </Label>
                                                <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-2xl h-[450px] bg-slate-50 relative">
                                                    <ScrollArea className="h-full">
                                                        <div className="p-6 bg-white prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewContent || '<p class="text-slate-400 text-center mt-20">Generazione anteprima...</p>' }} />
                                                    </ScrollArea>
                                                    <Button variant="outline" size="sm" className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full h-8 px-4 text-[10px] font-bold" onClick={handleGeneratePreview}>
                                                        <RefreshCcw className="w-3 h-3 mr-2" /> Rimescola
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                            <Button variant="ghost" onClick={() => setWizardStep(2)}>Indietro</Button>
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 px-8 h-12 rounded-xl font-bold shadow-lg shadow-indigo-100"
                                                onClick={() => { setWizardStep(4); refreshCombinations(); }}
                                            >
                                                Verifica & Lancio <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Lancio Bulk */}
                                {wizardStep === 4 && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px] rounded-3xl">
                                                <CardHeader className="bg-slate-50/50 border-b py-4 px-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-sm font-bold">Combinazioni da Generare</CardTitle>
                                                            <Badge variant="outline" className="text-[10px]">{combinations.length}</Badge>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="xs" onClick={refreshCombinations} className="h-7 text-[10px]">Refresh</Button>
                                                            <Button variant="outline" size="xs" onClick={selectAll} className="h-7 text-[10px]">{selectedCombinations.length === combinations.length ? 'Nessuna' : 'Tutte'}</Button>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                                                    <ScrollArea className="flex-1 p-6">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {combinations.map((combo, i) => {
                                                                const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                                                                const sel = selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                                                                return (
                                                                    <div key={key} onClick={() => toggleCombo(combo)} className={`p-3 rounded-xl cursor-pointer flex items-center gap-3 border transition-all ${sel ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50 border-slate-100'}`}>
                                                                        <Checkbox checked={!!sel} className="h-4 w-4" />
                                                                        <div className="min-w-0">
                                                                            <p className="text-[11px] font-bold truncate leading-none uppercase tracking-tight">{combo.titolo}</p>
                                                                            <p className="text-[9px] text-slate-400 mt-1">{combo.servizio} • {combo.citta}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </ScrollArea>
                                                    <div className="p-6 bg-slate-50 border-t mt-auto">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Totale Selezionato</span>
                                                                <span className="text-3xl font-black text-indigo-600 leading-none">{selectedCombinations.length} <span className="text-xs text-slate-400 font-normal">Pagine</span></span>
                                                            </div>
                                                            <Button 
                                                                className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-2xl font-black text-lg group"
                                                                onClick={handleProgrammaticGenerate}
                                                                disabled={generating || selectedCombinations.length === 0}
                                                            >
                                                                {generating ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Zap className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />}
                                                                LANCIO BULK
                                                            </Button>
                                                        </div>
                                                        {generating && <Progress value={progressPercent} className="h-2 bg-indigo-100" />}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px] rounded-3xl">
                                                <CardHeader className="bg-slate-50/50 border-b py-4 px-6">
                                                    <CardTitle className="text-sm font-bold">Stato Lavorazioni</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0 flex-1 overflow-hidden bg-slate-50/20">
                                                    <ScrollArea className="h-full p-6">
                                                        <div className="space-y-2">
                                                            {results.map((r, i) => (
                                                                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                                                                    <div className="min-w-0 flex-1">
                                                                        <h4 className="text-[11px] font-black text-slate-800 leading-none uppercase tracking-tight truncate">{r.titolo}</h4>
                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <Badge className={`text-[8px] h-3.5 border-none font-black ${r.generation_status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                                                                                {r.generation_status === 'done' ? 'PRONTO' : 'GENERAZIONE...'}
                                                                            </Badge>
                                                                            {r.publish_status === 'published' && <Badge className="bg-indigo-600 text-white text-[8px] h-3.5 border-none font-black">LIVE</Badge>}
                                                                        </div>
                                                                    </div>
                                                                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-slate-50">
                                                                        <Eye className="w-4 h-4 text-slate-400" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        
                                        <div className="flex justify-start items-center bg-slate-50 p-4 rounded-2xl mt-6">
                                            <Button variant="ghost" onClick={() => setWizardStep(3)}>
                                                <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    
                </div>
            )}

            {/* Full Preview Modal */}
            {fullPreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border-none overflow-hidden rounded-3xl">
                        <CardHeader className="bg-slate-900 text-white flex-shrink-0 py-5 px-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-orange-500 rounded-xl">
                                        <Globe className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <Badge className="bg-orange-500 hover:bg-orange-600 mb-1">Preview Live</Badge>
                                        <CardTitle className="text-xl font-bold">{fullPreview.titolo}</CardTitle>
                                    </div>
                                </div>
                                <Button variant="ghost" className="text-white hover:bg-slate-800 rounded-full h-10 w-10 p-0" onClick={() => setFullPreview(null)}>
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50">
                            <div className="article-full-preview bg-white">
                                <style dangerouslySetInnerHTML={{ __html: `
                                    .article-full-preview .tldr-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; margin-bottom: 40px; }
                                    .article-full-preview .tldr-box h4 { margin-top: 0; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
                                    .article-full-preview .hero-block {
                                        background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${fullPreview.image_url || "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2070"}');
                                        background-size: cover;
                                        background-position: center;
                                        padding: 120px 40px;
                                        text-align: center;
                                        color: white;
                                    }
                                    .article-full-preview .hero-block h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 20px; line-height: 1.1; color: white !important; }
                                    .article-full-preview .hero-block p { font-size: 1.25rem; opacity: 0.9; max-width: 800px; margin: 0 auto 30px; color: white !important; }
                                    .article-full-preview .wp-block-buttons { display: flex; gap: 15px; justify-content: center; }
                                    .article-full-preview .wp-block-button__link {
                                        padding: 15px 35px; border-radius: 50px; background: #f97316; color: white; font-weight: bold; text-decoration: none;
                                    }
                                    .article-full-preview .wp-block-columns {
                                        display: grid; grid-template-cols: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; padding: 60px 40px;
                                    }
                                    .article-full-preview .wp-block-column { padding: 30px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
                                    .article-full-preview .wp-block-column h3 { font-size: 1.5rem; margin-bottom: 15px; }
                                    .article-full-preview .faq-content { max-width: 800px; margin: 0 auto; padding: 60px 40px; }
                                    .article-full-preview .faq-content h3 { margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
                                    .article-full-preview .final-cta { background: #f1f5f9; padding: 80px 40px; text-align: center; margin-top: 60px; }
                                    .article-full-preview img { max-width: 100%; height: auto; border-radius: 8px; }
                                    .article-full-preview a { color: #2563eb; text-decoration: underline; }
                                `}} />
                                <div className="prose prose-slate max-w-none px-8 py-12" dangerouslySetInnerHTML={{ __html: fullPreview.contenuto }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Confirmation Modal for Delete Plan */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="bg-red-50 text-red-600 py-6 text-center border-b border-red-100">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Zona Pericolo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 text-center bg-white">
                            <p className="text-slate-600 mb-8 font-medium">
                                Stai per eliminare definitivamente l'intero **Piano Editoriale** attuale. 
                                <br/><span className="text-xs text-red-500 font-bold uppercase mt-2 block">Questa azione non è reversibile!</span>
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="h-12 rounded-xl font-bold border-slate-200 hover:bg-slate-50"
                                >
                                    Annulla
                                </Button>
                                <Button 
                                    disabled={deletingPlan}
                                    onClick={confirmDeletePlan}
                                    className="h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                                >
                                    {deletingPlan ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Sì, Elimina Piano
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
{genMode === 'plan' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 gap-6">
                            <Card className="border-slate-200">
                                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm">Obiettivo del Piano Editoriale</CardTitle>
                                        <CardDescription className="text-xs">I dati GSC vengono integrati automaticamente in background.</CardDescription>
                                    </div>
                                    <Button size="xs" className="h-7 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
                                        onClick={async () => {
                                            if(!advancedPrompt) return;
                                            setRefining(true);
                                            try {
                                                const res = await axios.post(`${API}/articles/refine-objective`, 
                                                    { client_id: effectiveClientId, objective: advancedPrompt, title: "Piano Editoriale SEO" }, 
                                                    { headers: getAuthHeaders() }
                                                );
                                                setAdvancedPrompt(res.data.refined_objective);
                                                toast.success("Ottimizzato!");
                                            } catch(e) { toast.error("Errore"); }
                                            setRefining(false);
                                        }}
                                        disabled={refining}
                                    >
                                        {refining ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Sparkles className="w-3 h-3 mr-1"/>} AI Optimize
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                        <div className="md:col-span-3 space-y-2">
                                            <Label className="text-xs font-semibold text-slate-700">Prompt / Indicazioni Strategiche</Label>
                                            <Textarea 
                                                value={advancedPrompt} 
                                                onChange={(e)=>setAdvancedPrompt(e.target.value)} 
                                                placeholder="Scrivi l'obiettivo di questo piano (es. Focus su nuovi prodotti 2024)..." 
                                                className="text-xs h-[80px]" 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-700">Articoli (1-50)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    min="1" max="50" 
                                                    value={numArticles} 
                                                    onChange={(e) => setNumArticles(parseInt(e.target.value))}
                                                    className="h-9 text-xs"
                                                />
                                                <span className="text-[10px] text-slate-400 font-bold">QTY</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
    
                            <Card className="border-slate-200 overflow-hidden shadow-sm">
                                <button className="w-full text-left" onClick={() => setShowPlanSettings(!showPlanSettings)}>
                                    <CardHeader className="pb-4 hover:bg-slate-50/70 transition-colors cursor-pointer">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                    <Target className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base">Target & Automazione</CardTitle>
                                                    <CardDescription className="text-xs mt-0.5">Gestisci keyword target e piloti automatici</CardDescription>
                                                </div>
                                            </div>
                                            {showPlanSettings ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </CardHeader>
                                </button>
                                {showPlanSettings && (
                                    <CardContent className="pt-0 pb-5 border-t border-slate-100">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold text-slate-700">Keyword Target SEO</Label>
                                                <div className="flex gap-2">
                                                    <Input placeholder="Es: idraulico roma" value={newPlanKeyword} onChange={(e) => setNewPlanKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTargetKeyword()} />
                                                    <Button onClick={addTargetKeyword} size="sm"><Plus className="w-4 h-4" /></Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {targetKeywords.map((kw, idx) => (
                                                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                                                            {kw} <X className="w-3 h-3 cursor-pointer" onClick={() => removeTargetKeyword(kw)} />
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-sm font-semibold text-slate-700">Automazione</Label>
                                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                                                    <span className="text-sm">Abilita pilota automatico</span>
                                                    <Switch checked={automation.enabled} onCheckedChange={(val) => setAutomation({ ...automation, enabled: val })} />
                                                </div>
                                                {automation.enabled && (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Articoli a settimana</Label>
                                                        <Select value={automation.articles_per_week.toString()} onValueChange={(val) => setAutomation({ ...automation, articles_per_week: parseInt(val) })}>
                                                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {[1, 2, 3, 5, 7].map(n => <SelectItem key={n} value={n.toString()}>{n} articoli</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                                            <Button onClick={onSaveConfig} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                Salva Impostazioni
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Editorial Hub</h2>
                                        <p className="text-xs text-slate-500 font-medium">Strategia basata su Intenti di Ricerca e Copertura Topic</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {allPlanTopics.length > 0 && (
                                        <div className="flex items-center bg-slate-100 rounded-lg p-1 mr-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={selectAllPlanTopics} 
                                                className={`text-[11px] h-8 px-3 ${selectedPlanTopics.length === allPlanTopics.length ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                                            >
                                                {selectedPlanTopics.length === allPlanTopics.length ? "Deseleziona" : "Seleziona Tutti"}
                                            </Button>
                                        </div>
                                    )}
                                    <Button onClick={generateNewPlan} disabled={planGenerating} className="h-10 bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-95">
                                        {planGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                                        {(plan?.topics?.length > 0 || allPlanTopics.length > 0) ? "Aggiorna Strategia" : "Genera Piano Editoriale"}
                                    </Button>
                                    {allPlanTopics.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="outline"
                                                disabled={saving || !plan}
                                                onClick={handleSavePlan}
                                                className="h-10 px-5 rounded-xl font-bold border-slate-200 hover:bg-slate-50 transition-all text-sm"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                Salva Piano
                                            </Button>
                                            <Button 
                                                disabled={generating || selectedPlanTopics.length === 0}
                                                onClick={handleBatchPlanGenerate}
                                                className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm"
                                            >
                                                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                                Pubblica Selezionati ({selectedPlanTopics.length})
                                            </Button>
                                            {plan?.topics?.length > 0 && (
                                                <Button 
                                                    variant="outline"
                                                    onClick={handleDeletePlan} 
                                                    disabled={deletingPlan} 
                                                    className="h-10 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {generating && (
                                <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Elaborazione Piano Editoriale in corso...
                                        </span>
                                        <span className="text-xs font-black text-indigo-700">{progressPercent}%</span>
                                    </div>
                                    <Progress value={progressPercent} className="h-2 bg-indigo-50" />
                                </div>
                            )}

                            {planLoading && (
                                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <BrainCircuit className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto" />
                                    </div>
                                    <p className="text-slate-500 font-medium animate-pulse text-sm">L'AI sta analizzando i dati del sito...</p>
                                </div>
                            )}

                            {allPlanTopics.length > 0 && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                                    {/* Sidebar Toggle Button (Sticky) */}
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => setRecentSidebarOpen(!recentSidebarOpen)}
                                        className={`hidden lg:flex absolute -right-4 top-0 z-20 h-8 w-8 rounded-full border shadow-sm bg-white transition-transform duration-300 ${recentSidebarOpen ? '' : 'rotate-180'}`}
                                        title={recentSidebarOpen ? "Chiudi Sidebar" : "Apri Sidebar"}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>

                                    <div className={`${recentSidebarOpen ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-8 transition-all duration-500`}>
                                        {/* Strategy Summary Stats */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                            {[
                                                { label: 'Piano AI', val: plan?.topics?.length || 0, icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                                { label: 'Da Freshness/GSC', val: config.editorial_queue?.length || 0, icon: ListPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                                { label: 'Selezionati', val: selectedPlanTopics.length, icon: MousePointerClick, color: 'text-orange-600', bg: 'bg-orange-50' },
                                                { label: 'Pubblicati', val: recentArticles.length, icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-white' },
                                            ].map((stat, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <stat.icon className={`w-3 h-3 ${stat.color}`} />
                                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{stat.label}</span>
                                                    </div>
                                                    <p className="text-xl font-black text-slate-900 leading-none">{stat.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                                <ListPlus className="w-5 h-5 text-indigo-500" /> Elenco Articoli & Coda
                                            </h2>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={selectAllPlanTopics} className="h-7 text-[10px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-white">
                                                    {selectedPlanTopics.length === allPlanTopics.length ? 'Deseleziona' : 'Seleziona Tutto'}
                                                </Button>
                                            </div>
                                        </div>
                                                                               {/* Gruppi per Topic */}
                                        {Object.entries(
                                            allPlanTopics.reduce((acc, t) => {
                                                const topicGroup = t.topic || "Vari/Altri";
                                                if (!acc[topicGroup]) acc[topicGroup] = [];
                                                acc[topicGroup].push(t);
                                                return acc;
                                            }, {})
                                        ).map(([topicName, topicItems], topicIdx) => (
                                            <div key={topicName} className="space-y-4">
                                                <div className="flex items-center gap-3 px-1">
                                                    <div className={`w-2 h-6 rounded-full ${['bg-indigo-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-sky-500'][topicIdx % 5]}`} />
                                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                        {topicName}
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] py-0 h-4 border-none font-black">
                                                            {topicItems.length} {topicItems.length === 1 ? 'articolo' : 'articoli'}
                                                        </Badge>
                                                    </h3>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-3">
                                                    {topicItems.map((item, idx) => {
                                                        const isSelected = !!selectedPlanTopics.find(t => t.titolo === item.titolo);
                                                        const resultMatch = results.find(r => r.titolo?.toLowerCase() === item.titolo?.toLowerCase());
                                                        const recentMatch = recentArticles.find(art => art.titolo?.toLowerCase() === item.titolo?.toLowerCase());
                                                        const isPublished = !!recentMatch || resultMatch?.publish_status === 'success';
                                                        const isDraft = recentMatch?.stato === 'draft';
                                                        const isGenerating = resultMatch?.generation_status === 'running' || resultMatch?.publish_status === 'running';
                                                        
                                                        // Resolve global index for plan topics if not queue item
                                                        const planIndex = !item.isQueueItem ? plan?.topics?.findIndex(t => t.titolo === item.titolo) : -1;

                                                        return (
                                                            <Card 
                                                                key={idx} 
                                                                className={`group transition-all duration-300 border-slate-100 hover:shadow-lg hover:shadow-indigo-500/5 ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400/20 bg-indigo-50/10' : 'hover:border-slate-200'} ${isPublished ? 'bg-slate-50/30' : ''}`}
                                                            >
                                                                <CardContent className="p-0 overflow-hidden">
                                                                    <div className="flex items-stretch h-16">
                                                                        {/* Select Area */}
                                                                        <div 
                                                                            onClick={() => !isPublished && togglePlanTopic(item)}
                                                                            className={`w-12 flex items-center justify-center cursor-pointer transition-all border-r border-slate-50 ${isPublished ? 'cursor-not-allowed bg-emerald-50 text-emerald-500/40' : isSelected ? 'bg-indigo-500 text-white' : 'hover:bg-slate-50 text-slate-200'}`}
                                                                        >
                                                                            {isPublished ? (
                                                                                <CheckCircle2 className="w-4 h-4" />
                                                                            ) : isGenerating ? (
                                                                                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                                                            ) : (
                                                                                <Checkbox checked={isSelected} className={`h-4 w-4 border-slate-200 ${isSelected ? 'border-none accent-white mb-0' : ''}`} />
                                                                            )}
                                                                        </div>

                                                                        {/* Mini Image */}
                                                                        <div className="relative w-20 bg-slate-50 flex-shrink-0 overflow-hidden group/img">
                                                                            {(item.image_url || resultMatch?.image_url || item.stock_image_url) ? (
                                                                                <img 
                                                                                    src={resultMatch?.image_url || item.image_url || item.stock_image_url} 
                                                                                    alt="" 
                                                                                    className="w-full h-full object-cover grayscale-[30%] group-hover/img:grayscale-0 transition-all duration-500 group-hover/img:scale-110" 
                                                                                />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                                                    <ImageIcon className="w-4 h-4" />
                                                                                </div>
                                                                            )}
                                                                            {!isPublished && (
                                                                                <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/20 hover:bg-white text-white hover:text-indigo-900 rounded-lg p-0"
                                                                                        onClick={(e) => { e.stopPropagation(); setActivePlanImageIndex(planIndex); setImgSearchQuery(item.keyword || item.titolo); handleImageSearch(30, item.keyword || item.titolo); }}>
                                                                                        <Search className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Info */}
                                                                        <div className="flex-1 min-w-0 flex items-center px-4 gap-4">
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                                    <Badge className={`text-[8px] px-1 py-0 h-3.5 border-none font-black ${
                                                                                        item.funnel === 'TOFU' ? 'bg-sky-50 text-sky-600' : 
                                                                                        item.funnel === 'MOFU' ? 'bg-indigo-50 text-indigo-600' : 
                                                                                        'bg-purple-50 text-purple-600'
                                                                                    }`}>
                                                                                        {item.funnel}
                                                                                    </Badge>
                                                                                    {item.keyword && <span className="text-[9px] font-mono font-bold text-slate-400 truncate tracking-tight uppercase">KW: {item.keyword}</span>}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <h4 className={`text-xs font-bold leading-none truncate ${isPublished ? 'text-slate-400' : 'text-slate-800'}`}>
                                                                                        {item.titolo}
                                                                                    </h4>
                                                                                    {item.isQueueItem && <Badge variant="outline" className="text-[7px] h-3 px-1 border-emerald-200 text-emerald-600 font-bold bg-emerald-50">AUDIT</Badge>}
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-400 truncate mt-1 italic leading-none">{item.motivo}</p>
                                                                            </div>

                                                                            {/* Mini Actions */}
                                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                                {isPublished ? (
                                                                                     <Badge variant="outline" className={`text-[8px] font-black h-4 px-1 ${isDraft ? 'border-amber-200 text-amber-600' : 'border-emerald-200 text-emerald-600'}`}>
                                                                                        {isDraft ? 'DRAFT' : 'LIVE'}
                                                                                     </Badge>
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Data:</span>
                                                                                            <input
                                                                                                type="date"
                                                                                                className="h-6 text-[10px] w-28 bg-transparent border-none focus:ring-0 p-0 text-indigo-600 font-bold"
                                                                                                value={item.scheduled_date ? item.scheduled_date.split('T')[0] : ''}
                                                                                                onChange={(e) => {
                                                                                                    const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                                                                    
                                                                                                    // Update source
                                                                                                    if (!item.isQueueItem) {
                                                                                                        const newTopics = [...plan.topics];
                                                                                                        newTopics[planIndex] = { ...newTopics[planIndex], scheduled_date: newDate };
                                                                                                        setPlan({ ...plan, topics: newTopics });
                                                                                                    } else {
                                                                                                        // For queue items, we just update it in the local derived view if possible, 
                                                                                                        // but it's better to update the selected list directly
                                                                                                    }

                                                                                                    // Update selected list if item is selected
                                                                                                    if (isSelected) {
                                                                                                        setSelectedPlanTopics(prev => prev.map(t => 
                                                                                                            t.titolo === item.titolo ? { ...t, scheduled_date: newDate } : t
                                                                                                        ));
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-indigo-600 rounded-lg hover:bg-slate-50" onClick={() => handleUseTopicInGenerator(item)}>
                                                                                            <PenTool className="w-3.5 h-3.5" />
                                                                                        </Button>
                                                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-50" onClick={() => item.isQueueItem ? handleRemoveFromQueue(item) : removeTopicFromPlan(planIndex)}>
                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div> {/* Fine lg:col-span-9/12 */}

                                    {recentSidebarOpen && (
                                        <div className="lg:col-span-3 space-y-6 animate-in slide-in-from-right-4 duration-500">
                                            <Card className="border-slate-200 shadow-sm sticky top-6">
                                                <CardHeader className="p-4 pb-2">
                                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-emerald-500" /> Recentemente Live
                                                    </CardTitle>
                                                    <CardDescription className="text-[10px]">Ultimi contenuti pubblicati nel sito</CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-2">
                                                    <ScrollArea className="h-[600px] pr-3">
                                                        <div className="space-y-4">
                                                            {recentArticles.length > 0 ? recentArticles.map((art) => (
                                                                <div key={art.id} className="relative pl-3 border-l-2 border-slate-100 pb-1 group cursor-default">
                                                                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors" />
                                                                    <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">{art.titolo}</h4>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[9px] font-medium text-slate-400">
                                                                            {art.published_at ? new Date(art.published_at).toLocaleDateString() : 'Draft'}
                                                                        </span>
                                                                        <Badge className={`text-[8px] h-3.5 px-1 font-bold ${art.stato === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400'}`} variant="outline">
                                                                            {art.stato}
                                                                        </Badge>
                                                                    </div>
                                                                    {art.wordpress_link && (
                                                                        <a href={art.wordpress_link} target="_blank" className="text-[9px] text-indigo-500 hover:underline flex items-center gap-0.5 mt-1">
                                                                            Link Post <ExternalLink className="w-2 h-2" />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )) : (
                                                                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                                                    <FileText className="w-8 h-8 mb-2" />
                                                                    <p className="text-[10px] font-medium">Nessun articolo trovato</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>

                                            {activePlanImageIndex !== null && (
                                                <Card className="border-orange-200 bg-orange-50/30 overflow-hidden shadow-lg animate-in slide-in-from-right-4 duration-300">
                                                    <CardHeader className="p-3 border-b border-orange-100 bg-white">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-xs font-bold text-orange-700">Immagine Articolo</CardTitle>
                                                            <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-orange-100 text-orange-400" onClick={() => setActivePlanImageIndex(null)}><X className="w-3.5 h-3.5" /></Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-3 bg-white space-y-2">
                                                        <div className="flex gap-1 mb-2">
                                                            <Input 
                                                                className="h-8 text-[11px] border-orange-100 focus-visible:ring-orange-500" 
                                                                value={imgSearchQuery} 
                                                                onChange={(e) => setImgSearchQuery(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleImageSearch(12)}
                                                                placeholder="Cerca foto..."
                                                            />
                                                            <Button size="icon" className="h-8 w-8 bg-orange-500 hover:bg-orange-600" onClick={() => handleImageSearch(12)}>
                                                                {searchingImages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </div>

                                                        {imgSearchResults.length > 0 && (
                                                            <p className="text-[9px] text-slate-400 mb-1">{imgSearchResults.length} trovate</p>
                                                        )}
                                                        <ScrollArea className="h-[300px]">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {imgSearchResults.map((img, i) => (
                                                                    <div key={i} className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-100 shadow-sm" onClick={() => importExternalImage(img.image)}>
                                                                        <img src={img.thumbnail} className="w-full aspect-square object-cover" loading="lazy" />
                                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                                            <ImagePlus className="w-5 h-5 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    )}

                                    {!recentSidebarOpen && activePlanImageIndex !== null && (
                                        <div className="lg:col-span-3 space-y-6 animate-in slide-in-from-right-4 duration-500">
                                             <Card className="border-orange-200 bg-orange-50/30 overflow-hidden shadow-lg sticky top-6">
                                                <CardHeader className="p-3 border-b border-orange-100 bg-white">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-xs font-bold text-orange-700">Immagine Articolo</CardTitle>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-orange-100 text-orange-400" onClick={() => setActivePlanImageIndex(null)}><X className="w-3.5 h-3.5" /></Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-3 bg-white space-y-2">
                                                    <div className="flex gap-1 mb-2">
                                                        <Input 
                                                            className="h-8 text-[11px] border-orange-100 focus-visible:ring-orange-500" 
                                                            value={imgSearchQuery} 
                                                            onChange={(e) => setImgSearchQuery(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleImageSearch(12)}
                                                            placeholder="Cerca foto..."
                                                        />
                                                        <Button size="icon" className="h-8 w-8 bg-orange-500 hover:bg-orange-600" onClick={() => handleImageSearch(12)}>
                                                            {searchingImages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    </div>
                                                    <ScrollArea className="h-[300px]">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {imgSearchResults.map((img, i) => (
                                                                <div key={i} className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-100 shadow-sm" onClick={() => importExternalImage(img.image)}>
                                                                    <img src={img.thumbnail} className="w-full aspect-square object-cover" loading="lazy" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!planLoading && allPlanTopics.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                                        <Sparkles className="w-10 h-10 text-indigo-400 opacity-40" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">Inizia la tua Strategia</h3>
                                    <p className="text-sm text-slate-500 max-w-sm text-center">
                                        Fai clic sul pulsante in alto per analizzare i dati del sito e generare un piano d'attacco basato sui dati AI, oppure aggiungi articoli dalla Freshness.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
        </div>
    );
};

export default AdminGenerator;
