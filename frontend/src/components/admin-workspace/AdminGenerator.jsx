import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
    ChevronUp, ChevronDown, TrendingUp, Trash2, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../ui/switch';

import { ContentStrategyTab } from '../../pages/configuration/ContentStrategyTab';
import { KeywordsTab } from '../../pages/configuration/KeywordsTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminGenerator = ({
    client, effectiveClientId, getAuthHeaders, navigate, initialData, onDataUsed,
    targetKeywords = [], setTargetKeywords, automation = { enabled: false, articles_per_week: 1 },
    setAutomation, onSaveConfig, saving, branding = {}, setBranding = () => {}
}) => {
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
    const [genMode, setGenMode] = useState('single');
    const [singleTitle, setSingleTitle] = useState('');
    const [singleKeywords, setSingleKeywords] = useState('');
    const [singleObjective, setSingleObjective] = useState('');
    const [singleGenerating, setSingleGenerating] = useState(false);
    const [singleResult, setSingleResult] = useState(null);
    const [singleScheduledDate, setSingleScheduledDate] = useState('');

    // Image Source State for Single Generate
    const [imageSource, setImageSource] = useState('ai'); // 'ai', 'upload', 'search'
    const [imgSearchQuery, setImgSearchQuery] = useState('');
    const [imgSearchResults, setImgSearchResults] = useState([]);
    const [searchingImages, setSearchingImages] = useState(false);
    const [singleSelectedImage, setSingleSelectedImage] = useState(null); // { id, url }

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
    const [useSpintax, setUseSpintax] = useState(true);

    // Editorial Plan states
    const [plan, setPlan] = useState(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planGenerating, setPlanGenerating] = useState(false);
    const [newPlanKeyword, setNewPlanKeyword] = useState("");
    const [selectedPlanTopics, setSelectedPlanTopics] = useState([]);
    const [showPlanSettings, setShowPlanSettings] = useState(false);
    const [landingPreview, setLandingPreview] = useState(null);
    const [landingTemplate, setLandingTemplate] = useState('modern_conversion');
    const [refineFeedback, setRefineFeedback] = useState('');
    const [refining, setRefining] = useState(false);
    const [recentArticles, setRecentArticles] = useState([]);
    const [activePlanImageIndex, setActivePlanImageIndex] = useState(null);

    const config = client?.configuration || {};
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

        fetchPlan();
        fetchRecentArticles();
    }, [client]);

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
            setPlan(res.data);
        } catch (error) {
            console.error("Error fetching editorial plan:", error);
        } finally {
            setPlanLoading(false);
        }
    };

    const loadLandingPreview = async (id) => {
        try {
            const res = await axios.get(`${API}/articles/${id}/full`, { headers: getAuthHeaders() });
            setLandingPreview(res.data);
        } catch (e) {
            toast.error('Errore caricamento anteprima');
        }
    };

    const generateNewPlan = async () => {
        setPlanGenerating(true);
        try {
            const res = await axios.post(`${API}/generate-plan/${effectiveClientId}`, {}, {
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
    const useTopicInGenerator = (topic) => {
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

    const handleImageSearch = async (count = 10) => {
        if (!imgSearchQuery.trim()) return;
        setSearchingImages(true);
        try {
            const res = await axios.post(`${API}/serp/images`, { 
                keyword: imgSearchQuery,
                max_results: count
            }, { headers: getAuthHeaders() });
            const results = res.data.results || [];
            if (results.length === 0) {
                toast.info("Nessuna immagine trovata per questa ricerca.");
            }
            setImgSearchResults(results);
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
            const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
            const imageUrlFull = `${backendUrl}/api/uploads/files/${res.data.id}?auth=${token}`;

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
                url: `${process.env.REACT_APP_BACKEND_URL}/api/uploads/files/${res.data.id}?auth=${token}` 
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
                advanced_prompt: { ...config.advanced_prompt, secondo_livello_prompt: advancedPrompt }
            }, { headers: getAuthHeaders() });
        } catch (e) { /* silent */ }
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
                content_type: typeOverride || contentType,
                objective: genMode === 'landing' ? 'conversione' : 'informazionale',
                image_ids: (imageSource !== 'ai' && singleSelectedImage) ? [singleSelectedImage.id] : (adminUploadedImages.length > 0 ? adminUploadedImages.map(img => img.id) : undefined),
                scheduled_date: (singleScheduledDate && singleScheduledDate !== '') ? new Date(singleScheduledDate).toISOString() : undefined,
                gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
                serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
                generate_cover: imageSource === 'ai' ? autoGenerateCover : false,
                template_style: genMode === 'landing' ? landingTemplate : undefined
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
                toast.success('Landing page aggiornata con successo!');
                setRefineFeedback('');
                // Update local state if needed or re-fetch
                loadLandingPreview(singleResult.id);
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
                template_style: genMode === 'programmatic' ? landingTemplate : undefined
            }, { headers: getAuthHeaders() });
            const jobId = res.data.job_id;
            const total = res.data.total;
            const label = genMode === 'programmatic' ? 'landing page' : 'articoli';
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

        // Clear local plan before starting batch
        if (plan) setPlan({ ...plan, topics: [] });

        await saveConfig();
        try {
            const res = await axios.post(`${API}/articles/batch-plan`, {
                client_id: effectiveClientId,
                topics: selectedPlanTopics,
                publish_to_wordpress: publishToWp,
                content_type: contentType,
                generate_cover: true // Sempre attivo per i piani editoriali
            }, { headers: getAuthHeaders() });

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
                        setSelectedPlanTopics([]); setGenerating(false); return;
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
        if (selectedPlanTopics.length === (plan?.topics?.length || 0)) {
            setSelectedPlanTopics([]);
        } else {
            setSelectedPlanTopics([...(plan?.topics || [])]);
        }
    };

    const removeTopicFromPlan = (index) => {
        const newTopics = plan.topics.filter((_, i) => i !== index);
        setPlan({ ...plan, topics: newTopics });
        toast.info("Articolo rimosso dal piano");
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
        <div className="space-y-6">
            {/* Steps Progress Bar */}
            <div className="flex items-center gap-1 p-4 bg-white rounded-xl border border-slate-200" data-testid="step-bar">
                {steps.map((s, i) => (
                    <React.Fragment key={s.num}>
                        <button
                            onClick={() => setStep(s.num)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${step === s.num ? 'bg-slate-900 text-white shadow-md' :
                                s.done ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    s.connected && !s.done ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                        s.optional && !s.done ? 'bg-slate-50 text-slate-400 border border-dashed border-slate-300' :
                                            'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                            data-testid={`step-${s.num}-btn`}
                        >
                            {s.done && step !== s.num ? <CheckCircle2 className="w-4 h-4" /> :
                                s.connected && !s.done && step !== s.num ? <BarChart3 className="w-4 h-4 text-sky-600" /> :
                                    <s.icon className="w-4 h-4" />}
                            <span className="hidden sm:inline">{s.label}</span>
                            <span className="sm:hidden">{s.num}</span>
                        </button>
                        {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                    </React.Fragment>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-4">
                    <ContentStrategyTab strategy={contentStrategy} setStrategy={setContentStrategy} />
                    <div className="flex justify-end">
                        <Button onClick={() => setStep(2)} className="bg-slate-900 hover:bg-slate-800" data-testid="next-step-2-btn">
                            Prosegui: Analisi SERP <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
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

            {step === 3 && (
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

            {step === 4 && (
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

            {step === 5 && (
                <div className="space-y-6">
                    {/* L'immagine viene ora gestita automaticamente dal sistema */}


                    {/* ===== SEZIONE PRINCIPALE: Articoli / Pagine ===== */}
                    <div className="space-y-4">
                        {/* Tab principale */}
                        <div className="flex gap-1 p-1.5 bg-slate-100 rounded-2xl w-full max-w-sm">
                            <button
                                onClick={() => {
                                    if (genMode === 'landing' || genMode === 'programmatic') setGenMode('single');
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    (genMode === 'single' || genMode === 'plan')
                                        ? 'bg-white shadow text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <FileText className="w-4 h-4" /> Articoli
                            </button>
                            <button
                                onClick={() => {
                                    if (genMode === 'single' || genMode === 'plan') setGenMode('landing');
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    (genMode === 'landing' || genMode === 'programmatic')
                                        ? 'bg-white shadow text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Globe className="w-4 h-4" /> Pagine
                            </button>
                        </div>

                        {/* Sub-tab Articoli */}
                        {(genMode === 'single' || genMode === 'plan') && (
                            <div className="flex gap-2 p-1 bg-orange-50 border border-orange-100 rounded-xl w-fit">
                                <button
                                    onClick={() => setGenMode('single')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${genMode === 'single' ? 'bg-orange-500 text-white shadow-sm' : 'text-orange-700 hover:bg-orange-100'}`}
                                >
                                    <PenTool className="w-3.5 h-3.5" /> Articolo Singolo
                                </button>
                                <button
                                    onClick={() => setGenMode('plan')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${genMode === 'plan' ? 'bg-orange-500 text-white shadow-sm' : 'text-orange-700 hover:bg-orange-100'}`}
                                >
                                    <Calendar className="w-3.5 h-3.5" /> Piano Editoriale
                                </button>
                            </div>
                        )}

                        {/* Sub-tab Pagine */}
                        {(genMode === 'landing' || genMode === 'programmatic') && (
                            <div className="flex gap-2 p-1 bg-indigo-50 border border-indigo-100 rounded-xl w-fit">
                                <button
                                    onClick={() => setGenMode('landing')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${genMode === 'landing' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-700 hover:bg-indigo-100'}`}
                                >
                                    <Zap className="w-3.5 h-3.5" /> Landing Singola
                                </button>
                                <button
                                    onClick={() => setGenMode('programmatic')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${genMode === 'programmatic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-700 hover:bg-indigo-100'}`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> SEO Programmatica
                                </button>
                            </div>
                        )}
                    </div>

                    {(genMode === 'single' || genMode === 'landing') && (
                        <div className="space-y-4">
                            {/* Contextual header */}
                            {genMode === 'single' && (
                                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                                    <PenTool className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-orange-800">
                                        <strong>Articolo Singolo</strong> — Genera un articolo SEO ottimizzato per la keyword indicata.
                                        L'agente usa knowledge base, GSC, analisi SERP e link interni per massimizzare la rilevanza.
                                    </p>
                                </div>
                            )}
                            {genMode === 'landing' && (
                                <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <Zap className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-indigo-800">
                                        <strong>Landing Page Singola</strong> — Genera una landing page con blocchi Gutenberg (Hero, CTA, Testimonianze, Servizi, Colonne).
                                        Ottimizzata per conversione e SEO sulla keyword indicata.
                                    </p>
                                </div>
                            )}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2 border-slate-200">
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>{genMode === 'landing' ? 'Keyword Principale Landing' : 'Keywords'}</Label>
                                        <Input value={singleKeywords} onChange={(e) => setSingleKeywords(e.target.value)} placeholder={genMode === 'landing' ? "Es: noleggio lungo termine..." : "Keywords..."} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{genMode === 'landing' ? 'Titolo Headline (Opzionale)' : 'Titolo'}</Label>
                                        <Input value={singleTitle} onChange={(e) => setSingleTitle(e.target.value)} placeholder="Titolo..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Obiettivo Conversione / Note</Label>
                                        <Textarea value={singleObjective} onChange={(e) => setSingleObjective(e.target.value)} placeholder="Es: Convincere utenti a richiedere un preventivo per..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stile Template Landing</Label>
                                        <Select value={landingTemplate} onValueChange={setLandingTemplate}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Seleziona stile" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="modern_conversion">Modern Conversion (CRO Focus)</SelectItem>
                                                <SelectItem value="corporate_trust">Corporate Trust (Professional)</SelectItem>
                                                <SelectItem value="minimal_elegant">Minimal Elegant (Clean Design)</SelectItem>
                                                <SelectItem value="premium_pillar">Premium Pillar (High Fidelity)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-slate-500 italic">
                                            {landingTemplate === 'modern_conversion' ? "Efficace per leads veloci, headline forte e blocchi densi." : 
                                             landingTemplate === 'corporate_trust' ? "Ottimo per aziende strutturate, focus su fiducia e autorità." : 
                                             landingTemplate === 'premium_pillar' ? "Replica lo stile alta fedeltà con sezioni pillar e blocchi moderni." :
                                             "Perfetto per servizi premium e design minimalista."}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            Data Pubblicazione (Opzionale)
                                        </Label>
                                        <Input
                                            type="date"
                                            value={singleScheduledDate}
                                            onChange={(e) => setSingleScheduledDate(e.target.value)}
                                            className="bg-white"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Camera className="w-4 h-4 text-orange-500" /> Immagine Hero / Featured
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex bg-slate-100 p-1 rounded-lg">
                                            <button 
                                                onClick={() => setImageSource('ai')} 
                                                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${imageSource === 'ai' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Generata AI
                                            </button>
                                            <button 
                                                onClick={() => { setImageSource('upload'); if (singleTitle && !imgSearchQuery) setImgSearchQuery(singleTitle); }} 
                                                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${imageSource === 'upload' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Carica Foto
                                            </button>
                                            <button 
                                                onClick={() => { setImageSource('search'); if (singleTitle && !imgSearchQuery) setImgSearchQuery(singleTitle); }} 
                                                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all ${imageSource === 'search' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Cerca Web
                                            </button>
                                        </div>

                                        {imageSource === 'ai' && (
                                            <div className="p-3 border border-dashed rounded-lg bg-slate-50/50 text-center space-y-2">
                                                <Sparkles className="w-6 h-6 text-emerald-400 mx-auto" />
                                                <p className="text-[10px] text-slate-500 px-2 line-clamp-3">
                                                    L'immagine verrà creata durante la generazione usando lo stile {branding?.style || 'cinematic'} e i colori del brand.
                                                </p>
                                            </div>
                                        )}

                                        {(imageSource === 'upload' || imageSource === 'search') && (
                                            <div className="space-y-3">
                                                {singleSelectedImage ? (
                                                    <div className="relative group">
                                                        <img src={singleSelectedImage.url} className="w-full aspect-video object-cover rounded-lg border shadow-sm" alt="selected" />
                                                        <button 
                                                            onClick={() => setSingleSelectedImage(null)}
                                                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : imageSource === 'upload' ? (
                                                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                                        <Input 
                                                            type="file" 
                                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                                            onChange={handleSingleFileUpload}
                                                            accept="image/*"
                                                        />
                                                        <ImagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-[10px] text-slate-400">Clicca o trascina per caricare</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="flex gap-1.5">
                                                            <Input 
                                                                className="h-8 text-xs" 
                                                                placeholder="Cerca immagine..." 
                                                                value={imgSearchQuery} 
                                                                onChange={(e) => setImgSearchQuery(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleImageSearch()}
                                                            />
                                                            <Button size="xs" onClick={() => handleImageSearch()} disabled={searchingImages} className="h-8">
                                                                {searchingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                                            </Button>
                                                        </div>
                                                        {imgSearchResults.length > 0 && (
                                                            <div className="space-y-2 flex flex-col h-full">
                                                                <ScrollArea className="h-[280px] rounded-lg border bg-slate-50 p-2">
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        {imgSearchResults.map((img, i) => (
                                                                            <div key={i} className="relative group cursor-pointer" onClick={() => importExternalImage(img.image)}>
                                                                                <img 
                                                                                    src={img.thumbnail} 
                                                                                    className="w-full aspect-square object-cover rounded hover:ring-2 hover:ring-orange-400 transition-all" 
                                                                                    alt={img.title || "Immagine"}
                                                                                    loading="lazy"
                                                                                />
                                                                                <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    {img.width && img.height ? `${img.width}x${img.height} • ~${img.weight_kb} KB` : ''}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="pt-3 pb-1 text-center">
                                                                        <Button variant="ghost" size="sm" onClick={() => handleImageSearch(imgSearchResults.length + 30)} disabled={searchingImages} className="text-xs">
                                                                            Carica altre...
                                                                        </Button>
                                                                    </div>
                                                                </ScrollArea>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Button 
                                    onClick={() => handleSingleGenerate(genMode === 'landing' ? 'landing_page' : 'articolo')} 
                                    disabled={singleGenerating} 
                                    className={`w-full h-12 ${genMode === 'landing' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                                >
                                    {singleGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
                                    {genMode === 'landing' ? 'Genera Landing Page' : 'Genera Articolo'}
                                </Button>

                                {singleResult && (
                                    <Card className="border-slate-200">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm">
                                                    {singleResult.status === 'completed' ? 'Completato' : 'In elaborazione...'}
                                                </p>
                                                {singleResult.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            </div>
                                            {singleResult.wordpress_link && (
                                                <a href={singleResult.wordpress_link} target="_blank" className="text-blue-600 flex items-center gap-1 text-xs hover:underline">
                                                    Vedi su WordPress <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                            {singleResult.visual_audit && (
                                                <div className="pt-2 border-t border-slate-100">
                                                    <div className="flex items-center justify-between text-[11px] mb-1">
                                                        <span className="text-slate-500 font-medium">Visual Audit Score</span>
                                                        <Badge variant={singleResult.visual_audit.score >= 80 ? "success" : singleResult.visual_audit.score >= 60 ? "warning" : "destructive"} className="text-[10px] py-0 h-4">
                                                            {singleResult.visual_audit.score}/100
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 italic line-clamp-2">
                                                        {singleResult.visual_audit.cro_suggestions}
                                                    </p>
                                                </div>
                                            )}
                                            {singleResult.id && (
                                                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                                                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => loadLandingPreview(singleResult.id)}>
                                                        <Eye className="w-4 h-4 mr-2" /> {genMode === 'landing' ? 'Anteprima Landing' : 'Anteprima Articolo'}
                                                    </Button>
                                                    
                                                    {genMode === 'landing' && singleResult.status === 'completed' && (
                                                        <div className="space-y-2 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700">
                                                                <BrainCircuit className="w-3.5 h-3.5" />
                                                                Conversa con l'Agente
                                                            </div>
                                                            <Textarea 
                                                                placeholder="Es: Rendi il pulsante rosso, aggiungi una sezione garanzia..." 
                                                                className="text-[11px] min-h-[60px] bg-white"
                                                                value={refineFeedback}
                                                                onChange={(e) => setRefineFeedback(e.target.value)}
                                                            />
                                                            <Button 
                                                                size="sm" 
                                                                className="w-full text-[10px] h-7 bg-indigo-600 hover:bg-indigo-700"
                                                                onClick={handleRefine}
                                                                disabled={refining || !refineFeedback.trim()}
                                                            >
                                                                {refining ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCcw className="w-3 h-3 mr-1" />}
                                                                Applica Modifiche
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                        </div>
                    )}



                    {genMode === 'programmatic' && (
                        <div className="space-y-6">
                            {/* Info banner */}
                            <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-indigo-900">SEO Programmatica — Landing Pages con Spintax</p>
                                    <p className="text-xs text-indigo-700 mt-0.5">
                                        Genera varianti uniche per ogni combinazione utilizzando la tecnologia <strong>Spintax</strong>. 
                                        L'agente crea un template intelligente con migliaia di varianti possibili, assicurando che ogni landing sia originale pur mantenendo la struttura Gutenberg richiesta.
                                    </p>
                                </div>
                            </div>
                            <KeywordsTab keywords={keywords} setKeywords={setKeywords} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
                            <div className="flex justify-end">
                                <Button onClick={refreshCombinations} className="bg-indigo-700 hover:bg-indigo-800">
                                    Aggiorna Varianti Landing ({combinations.length})
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="border-slate-200 lg:col-span-1">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">Combinazioni</CardTitle>
                                            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">Tutte</Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[300px]">
                                            <div className="space-y-1">
                                                {combinations.map((combo, i) => {
                                                    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                                                    const sel = selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                                                    return (
                                                        <div key={key} onClick={() => toggleCombo(combo)} className={`p-2 rounded-md cursor-pointer flex items-center gap-2 ${sel ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                                                            <Checkbox checked={!!sel} />
                                                            <span className="text-sm truncate">{combo.titolo}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200 lg:col-span-1">
                                    <CardHeader><CardTitle className="text-base">Esecuzione</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-lg text-center">
                                            <p className="text-2xl font-bold">{selectedCombinations.length}</p>
                                            <p className="text-xs text-slate-500">Selezionati</p>
                                        </div>

                                        <div className="flex items-center justify-between p-3 border rounded-lg bg-indigo-50/30">
                                            <div className="space-y-0.5">
                                                <Label className="text-xs font-semibold">Attiva Spintax</Label>
                                                <p className="text-[10px] text-slate-500 leading-tight">
                                                    Genera un template unico con varianti testuali per massimizzare l'originalità di ogni pagina.
                                                </p>
                                            </div>
                                            <Switch checked={useSpintax} onCheckedChange={setUseSpintax} />
                                        </div>

                                        {generating && <Progress value={progressPercent} className="h-2" />}
                                        <Button className={`w-full h-12 ${genMode === 'programmatic' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-500 hover:bg-orange-600'}`} onClick={handleProgrammaticGenerate} disabled={generating || selectedCombinations.length === 0}>
                                            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                                            {genMode === 'programmatic' ? 'Genera Landing Pages' : 'Genera Articoli'}
                                        </Button>
                                    </CardContent>
                                </Card>
                                <Card className="border-slate-200 lg:col-span-1">
                                    <CardHeader><CardTitle className="text-base">Risultati</CardTitle></CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-[300px]">
                                            <div className="space-y-2">
                                                {results.map((r, i) => (
                                                    <div key={i} className="text-xs p-2 bg-slate-50 rounded border flex flex-col gap-2">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex-1 truncate">
                                                                <p className="font-medium truncate">{r.titolo}</p>
                                                                {r.visual_audit && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${r.visual_audit.score >= 80 ? 'bg-emerald-500' : r.visual_audit.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                                        <span className="text-[9px] text-slate-400">Audit Score: {r.visual_audit.score}%</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {getStatusIcon(r.generation_status)}
                                                                {getStatusIcon(r.publish_status)}
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <div className="flex gap-2 items-center">
                                                                {r.image_url ? (
                                                                    <div className="w-12 h-12 rounded border bg-white flex items-center justify-center overflow-hidden">
                                                                        <img src={r.image_url.startsWith('http') ? r.image_url : `${process.env.REACT_APP_BACKEND_URL}${r.image_url}`} alt="cover" className="w-full h-full object-cover" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded border bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">
                                                                        No Image
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    className="h-7 text-[10px] px-2"
                                                                    disabled={coverLoading[r.id]}
                                                                    onClick={() => handleGenerateCover(r.id, r.titolo)}
                                                                >
                                                                    {coverLoading[r.id] ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                                                                    Cover
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {genMode === 'plan' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
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

                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Piano Editoriale Strategico</h2>
                                    <p className="text-xs text-slate-500">Analisi basata su GSC, SERP e Knowledge Base.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {plan?.topics?.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={selectAllPlanTopics} className="text-xs">
                                            {selectedPlanTopics.length === plan.topics.length ? "Deseleziona Tutti" : "Seleziona Tutti"}
                                        </Button>
                                    )}
                                    <Button onClick={generateNewPlan} disabled={planGenerating} className="bg-gradient-to-r from-amber-500 to-orange-600">
                                        {planGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                                        {plan?.topics?.length > 0 ? "Aggiorna Piano" : "Genera Piano"}
                                    </Button>
                                    {plan?.topics?.length > 0 && (
                                        <Button
                                            onClick={handleBatchPlanGenerate}
                                            disabled={generating || selectedPlanTopics.length === 0}
                                            className="bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                            Genera Selezionati ({selectedPlanTopics.length})
                                        </Button>
                                    )}
                                    {plan?.topics?.length > 0 && (
                                        <Button variant="outline" size="sm" onClick={() => {
                                            if (!automation.enabled) {
                                                toast.error("Abilita prima l'automazione per pianificare le date");
                                                return;
                                            }
                                            // Simple distribution logic
                                            const newTopics = plan.topics.map((t, i) => {
                                                const daysOffset = Math.floor(i / automation.articles_per_week) * 7 + (i % automation.articles_per_week) * Math.floor(7 / automation.articles_per_week);
                                                const d = new Date();
                                                d.setDate(d.getDate() + 1 + daysOffset);
                                                return { ...t, scheduled_date: d.toISOString() };
                                            });
                                            setPlan({ ...plan, topics: newTopics });
                                            toast.success("Date pianificate automaticamente!");
                                        }}>
                                            <Calendar className="w-4 h-4 mr-2" /> Auto-Pianifica
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {planLoading ? (
                                <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
                            ) : plan?.topics?.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                        <div className="lg:col-span-3 space-y-3">
                                            {plan.topics.map((topic, index) => (
                                                <Card key={index} className="hover:border-blue-200 transition-all border-slate-200">
                                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div className="relative w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden border border-slate-200 group">
                                                                {topic.image_url ? (
                                                                    <img src={topic.image_url} alt="Cover" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                        <ImageIcon className="w-6 h-6" />
                                                                    </div>
                                                                )}
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                    }}
                                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2"
                                                                >
                                                                    <div className="flex gap-2">
                                                                        <Search 
                                                                             className="w-4 h-4 hover:scale-125 transition-transform" 
                                                                             onClick={(e) => {
                                                                                 e.stopPropagation();
                                                                                 setActivePlanImageIndex(index);
                                                                                 setImgSearchQuery(topic.keyword || topic.titolo);
                                                                                 handleImageSearch(30, topic.keyword || topic.titolo);
                                                                             }}
                                                                        />
                                                                        <Sparkles 
                                                                            className="w-4 h-4 text-amber-300 hover:scale-125 transition-transform"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                generateAIImageForTopic(index);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    {(searchingImages && activePlanImageIndex === index) && <Loader2 className="w-4 h-4 animate-spin" />}
                                                                </button>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-[10px] text-blue-600">{topic.funnel}</Badge>
                                                                    <span className="text-[11px] text-slate-500">KW: {topic.keyword}</span>
                                                                </div>
                                                                <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">{topic.titolo}</h3>
                                                                <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">{topic.motivo}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col md:flex-row items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox
                                                                    checked={!!selectedPlanTopics.find(t => t.titolo === topic.titolo)}
                                                                    onCheckedChange={() => togglePlanTopic(topic)}
                                                                />
                                                                <span className="text-[10px] text-slate-400">Seleziona</span>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <Label className="text-[10px] text-slate-400">Data Programmazione</Label>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 text-xs w-32 py-1"
                                                                    value={topic.scheduled_date ? topic.scheduled_date.split('T')[0] : ''}
                                                                    onChange={(e) => {
                                                                        const newTopics = [...plan.topics];
                                                                        newTopics[index] = { ...newTopics[index], scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : null };
                                                                        setPlan({ ...plan, topics: newTopics });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => useTopicInGenerator(topic)}>
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                                    onClick={() => removeTopicFromPlan(index)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                        <div className="space-y-4">
                                            <Card className="border-slate-200">
                                                <CardHeader className="p-4 pb-2">
                                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-blue-500" /> Articoli Pubblicati
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-0">
                                                    <ScrollArea className="h-[500px] pr-3">
                                                        <div className="space-y-3">
                                                            {recentArticles.length > 0 ? recentArticles.map((art) => (
                                                                <div key={art.id} className="border-b border-slate-100 pb-2 last:border-0">
                                                                    <h4 className="text-[11px] font-semibold text-slate-800 line-clamp-1">{art.titolo}</h4>
                                                                    <div className="flex justify-between items-center mt-1">
                                                                        <span className="text-[9px] text-slate-400">{art.published_at ? new Date(art.published_at).toLocaleDateString() : 'Non pubblicato'}</span>
                                                                        <Badge className={`text-[8px] h-3.5 ${art.stato === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                            {art.stato}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            )) : (
                                                                <div className="text-center py-10 text-[10px] text-slate-400 italic">Nessun articolo trovato.</div>
                                                            )}
                                                        </div>
                                                    </ScrollArea>
                                                </CardContent>
                                            </Card>

                                            {activePlanImageIndex !== null && (
                                                <Card className="border-orange-200 bg-orange-50/30 overflow-hidden sticky top-4">
                                                    <CardHeader className="p-3 border-b border-orange-100 bg-orange-50">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-xs font-bold">Immagine per: {plan.topics[activePlanImageIndex].titolo.substring(0, 20)}...</CardTitle>
                                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setActivePlanImageIndex(null)}><X className="w-3 h-3" /></Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-2">
                                                        <div className="flex gap-1 mb-2">
                                                            <Input 
                                                                className="h-7 text-[10px]" 
                                                                value={imgSearchQuery} 
                                                                onChange={(e) => setImgSearchQuery(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleImageSearch(30)}
                                                            />
                                                            <Button size="icon" className="h-7 w-7" onClick={() => handleImageSearch(30)}>
                                                                {searchingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                                            </Button>
                                                        </div>
                                                        <ScrollArea className="h-[300px]">
                                                            <div className="grid grid-cols-2 gap-1">
                                                                {imgSearchResults.map((img, i) => (
                                                                    <div key={i} className="cursor-pointer group relative" onClick={() => importExternalImage(img.image)}>
                                                                        <img src={img.thumbnail} className="w-full aspect-square object-cover rounded border border-slate-200" />
                                                                        <div className="absolute inset-0 bg-orange-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                                            <Plus className="w-6 h-6 text-white drop-shadow-md" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>
                                    </div>
                            ) : (
                                <Card className="border-dashed border-2 py-16 text-center text-slate-400">Nessun piano attivo.</Card>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Landing Preview Modal */}
            {landingPreview && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <Card className="w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border-none rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-900 text-white p-4">
                            <div className="flex items-center gap-3">
                                <Badge className="bg-orange-500 hover:bg-orange-600">Landing Page Live</Badge>
                                <CardTitle className="text-lg">{landingPreview.titolo}</CardTitle>
                            </div>
                            <Button variant="ghost" className="text-white hover:bg-slate-800" onClick={() => setLandingPreview(null)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50">
                            <ScrollArea className="h-full">
                                <div className="landing-page-full-preview bg-white">
                                    <style>{`
                                        .landing-page-full-preview .hero-block {
                                            background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${landingPreview.image_url ? (landingPreview.image_url.startsWith('http') ? landingPreview.image_url : (process.env.REACT_APP_BACKEND_URL || '') + landingPreview.image_url + '?auth=' + localStorage.getItem('token')) : "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2070"}');
                                            background-size: cover;
                                            background-position: center;
                                            color: white !important;
                                            padding: 100px 40px;
                                            text-align: center;
                                            margin-bottom: 60px;
                                        }
                                        .landing-page-full-preview .hero-block h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 20px; line-height: 1.1; color: white !important; }
                                        .landing-page-full-preview .hero-block p { font-size: 1.25rem; opacity: 0.9; max-width: 800px; margin: 0 auto 30px; color: white !important; }
                                        .landing-page-full-preview .wp-block-buttons { display: flex; gap: 15px; justify-content: center; }
                                        .landing-page-full-preview .wp-block-button__link {
                                            background: #f97316; color: white !important; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: 700; transition: all 0.2s;
                                        }
                                        .landing-page-full-preview .wp-block-columns {
                                            display: grid; grid-template-cols: repeat(3, 1fr); gap: 30px; padding: 60px 40px; max-width: 1200px; margin: 0 auto;
                                        }
                                        .landing-page-full-preview .wp-block-column { padding: 30px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
                                        .landing-page-full-preview .wp-block-column h3 { font-size: 1.5rem; margin-bottom: 15px; }
                                        .landing-page-full-preview .faq-content { max-width: 800px; margin: 0 auto; padding: 60px 40px; }
                                        .landing-page-full-preview .faq-content h3 { margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
                                        .landing-page-full-preview .final-cta { background: #f1f5f9; padding: 80px 40px; text-align: center; margin-top: 60px; }
                                        .landing-page-full-preview img { max-width: 100%; height: auto; border-radius: 8px; }
                                    `}</style>
                                    <div className="prose prose-slate max-w-none px-0" dangerouslySetInnerHTML={{ __html: landingPreview.contenuto }} />
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AdminGenerator;
