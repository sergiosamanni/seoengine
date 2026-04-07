import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../../config';
import { toast } from 'sonner';

/**
 * Custom hook that encapsulates ALL state declarations and persistence logic
 * for the AdminGenerator component.
 */
export function useGeneratorState({ client, effectiveClientId, externalMode, initialData, onDataUsed }) {
    // --- Core Navigation ---
    const [step, setStep] = useState(1);
    const [genMode, setGenMode] = useState(externalMode || 'single');

    // --- Content Strategy ---
    const [contentStrategy, setContentStrategy] = useState({
        funnel_stage: 'TOFU', obiettivo_primario: 'traffico', modello_copywriting: 'PAS',
        buyer_persona_nome: '', buyer_persona_descrizione: '', buyer_persona_obiezioni: '',
        cta_finale: '', search_intent: 'informazionale', leve_psicologiche: [],
        keyword_secondarie: [], keyword_lsi: [], lunghezza_target: 1500, note_speciali: ''
    });

    // --- SERP & GSC ---
    const [serpKeyword, setSerpKeyword] = useState('');
    const [serpLoading, setSerpLoading] = useState(false);
    const [serpData, setSerpData] = useState(null);
    const [serpDone, setSerpDone] = useState(false);
    const [gscData, setGscData] = useState(null);
    const [gscLoading, setGscLoading] = useState(false);
    const [gscSite, setGscSite] = useState('');

    // --- Prompt ---
    const [advancedPrompt, setAdvancedPrompt] = useState('');
    const [promptDone, setPromptDone] = useState(false);

    // --- Single Article Generation ---
    const [singleTitle, setSingleTitle] = useState('');
    const [singleKeywords, setSingleKeywords] = useState('');
    const [singleObjective, setSingleObjective] = useState('');
    const [singleGenerating, setSingleGenerating] = useState(false);
    const [refiningObjective, setRefiningObjective] = useState(false);
    const [singleResult, setSingleResult] = useState(null);
    const [singleScheduledDate, setSingleScheduledDate] = useState('');

    // --- Images ---
    const [imageSource, setImageSource] = useState('ai');
    const [imgSearchQuery, setImgSearchQuery] = useState('');
    const [imgSearchResults, setImgSearchResults] = useState([]);
    const [searchingImages, setSearchingImages] = useState(false);
    const [singleSelectedImage, setSingleSelectedImage] = useState(null);
    const [autoGenerateCover, setAutoGenerateCover] = useState(true);
    const [activePlanImageIndex, setActivePlanImageIndex] = useState(null);
    const [adminUploadedImages, setAdminUploadedImages] = useState([]);
    const [adminUploading, setAdminUploading] = useState(false);
    const [globalImages, setGlobalImages] = useState([]);
    const [imageUploadLoading, setImageUploadLoading] = useState(false);

    // --- Pillar / Silo ---
    const [siloClusters, setSiloClusters] = useState([]);
    const [suggestingSilo, setSuggestingSilo] = useState(false);
    const [selectedSiloClusters, setSelectedSiloClusters] = useState([]);

    // --- Programmatic / Bulk ---
    const [keywords, setKeywords] = useState({ servizi: [], citta_e_zone: [], tipi_o_qualificatori: [] });
    const [combinations, setCombinations] = useState([]);
    const [selectedCombinations, setSelectedCombinations] = useState([]);
    const [useSpintax, setUseSpintax] = useState(false);
    const [programmaticTemplate, setProgrammaticTemplate] = useState('');
    const [sidebarTemplate, setSidebarTemplate] = useState('');
    const [ctaConfig, setCtaConfig] = useState({ enabled: true, text: 'Richiedi Preventivo', url: '', color: '#4f46e5' });
    const [wizardStep, setWizardStep] = useState(1);
    const [isArchitecting, setIsArchitecting] = useState(false);
    const [webCorrelates, setWebCorrelates] = useState([]);
    const [previewContent, setPreviewContent] = useState('');
    const [templateStyle, setTemplateStyle] = useState('modern_conversion');

    // --- Generation & Jobs ---
    const [generating, setGenerating] = useState(false);
    const [results, setResults] = useState([]);
    const [publishToWp, setPublishToWp] = useState(true);
    const [progressPercent, setProgressPercent] = useState(0);
    const [coverLoading, setCoverLoading] = useState({});
    const [contentType, setContentType] = useState('articolo');
    const [activeJobId, setActiveJobId] = useState(null);
    const [totalInJob, setTotalInJob] = useState(0);
    const [internalLinkingEnabled, setInternalLinkingEnabled] = useState(true);

    // --- Plan ---
    const [plan, setPlan] = useState(null);
    const [planLoading, setPlanLoading] = useState(false);
    const [planGenerating, setPlanGenerating] = useState(false);
    const [selectedPlanTopics, setSelectedPlanTopics] = useState([]);
    const [planView, setPlanView] = useState('list');
    const [expandedOutlines, setExpandedOutlines] = useState({});
    const [showPlanSettings, setShowPlanSettings] = useState(false);
    const [deletingPlan, setDeletingPlan] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [newPlanKeyword, setNewPlanKeyword] = useState('');
    const [numArticles, setNumArticles] = useState(10);
    const [targetKeywords, setTargetKeywords] = useState([]);

    // --- UI & Misc ---
    const [saving, setSaving] = useState(false);
    const [automation, setAutomation] = useState({ enabled: false, articles_per_week: 1 });
    const [branding, setBranding] = useState({});
    const [fullPreview, setFullPreview] = useState(null);
    const [refineFeedback, setRefineFeedback] = useState('');
    const [refining, setRefining] = useState(false);
    const [recentArticles, setRecentArticles] = useState([]);
    const [recentSidebarOpen, setRecentSidebarOpen] = useState(true);
    const [showImgChangeModal, setShowImgChangeModal] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [competitorBenchmarks, setCompetitorBenchmarks] = useState([]);

    // --- Derived Constants ---
    const clientConfig = useMemo(() => ({
        ...(client?.configuration || {}),
        competitor_benchmarks: competitorBenchmarks
    }), [client?.configuration, competitorBenchmarks]);

    const llmConfig = clientConfig.llm || clientConfig.openai || {};
    const hasApiKey = !!(llmConfig.api_key || llmConfig.apiKey);
    const wpConfig = clientConfig.wordpress || {};
    const hasWpConfig = wpConfig.url_api && wpConfig.utente && wpConfig.password_applicazione;
    const gscConnected = client?.configuration?.gsc?.connected || false;
    const strategyDone = contentStrategy.funnel_stage && contentStrategy.modello_copywriting;

    // --- Memoized Plan Topics ---
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
                    } else { kw = title; }
                }
                return {
                    titolo: title, keyword: kw, funnel: 'TOFU',
                    motivo: 'Priorità Audit AI (Freshness/GSC)',
                    isQueueItem: true, topic: 'Contenuti Suggeriti dal Sistema',
                    originalText: itemText
                };
            });
        return [...planItems, ...queueItems];
    }, [plan, client?.configuration?.editorial_queue]);

    // --- Persistence Effects ---
    useEffect(() => {
        if (externalMode && ['single', 'plan', 'programmatic'].includes(externalMode)) {
            setGenMode(externalMode);
        }
    }, [externalMode]);

    // Load saved state
    useEffect(() => {
        if (effectiveClientId) {
            const savedGlobal = localStorage.getItem(`admin_gen_state_${effectiveClientId}`);
            if (savedGlobal) {
                try {
                    const data = JSON.parse(savedGlobal);
                    if (data.genMode) setGenMode(data.genMode);
                    if (data.step) setStep(data.step);
                } catch (e) { console.error("Error loading global state", e); }
            }
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

    // Save global state
    useEffect(() => {
        if (effectiveClientId) {
            localStorage.setItem(`admin_gen_state_${effectiveClientId}`, JSON.stringify({ genMode, step }));
        }
    }, [genMode, step, effectiveClientId]);

    // Save programmatic state
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

    // Load client config
    useEffect(() => {
        if (clientConfig.content_strategy) setContentStrategy(prev => ({ ...prev, ...clientConfig.content_strategy }));
        if (clientConfig.advanced_prompt) setAdvancedPrompt(clientConfig.advanced_prompt);
        if (clientConfig.keywords) setKeywords(clientConfig.keywords);
        if (clientConfig.automation) setAutomation(clientConfig.automation);
        if (clientConfig.gsc?.site_url) setGscSite(clientConfig.gsc.site_url);
        if (clientConfig.programmatic) {
            setUseSpintax(clientConfig.programmatic.use_spintax ?? true);
            setProgrammaticTemplate(clientConfig.programmatic.template || '');
            setSidebarTemplate(clientConfig.programmatic.sidebar_template || '');
            if (clientConfig.programmatic.cta) setCtaConfig(prev => ({ ...prev, ...clientConfig.programmatic.cta }));
        }
        
        // Initial load of benchmarks from prop, then let state take over
        const incomingBenchmarks = client?.configuration?.competitor_benchmarks || [];
        if (incomingBenchmarks.length > 0 && competitorBenchmarks.length === 0) {
            setCompetitorBenchmarks(incomingBenchmarks);
        }
    }, [client, effectiveClientId]);

    // Handle initial data from external sources (e.g. edit button)
    useEffect(() => {
        if (initialData) {
            setStep(4);
            setGenMode('single');
            setSingleTitle(String(initialData.titolo || ''));
            setSingleKeywords(String(initialData.keyword || ''));
            setSerpKeyword(String(initialData.keyword || ''));
            if (initialData.serp_summary) {
                setSerpDone(true);
                setSerpData({ summary: initialData.serp_summary });
            }
            if (initialData.master_prompt) {
                setAdvancedPrompt(initialData.master_prompt);
                setPromptDone(true);
            }
            if (initialData.final_objective) {
                setSingleObjective(initialData.final_objective);
            }
            if (initialData.featured_image) {
                setSingleSelectedImage({ url: initialData.featured_image, thumb: initialData.featured_image });
            }
            if (onDataUsed) onDataUsed();
        }
    }, [initialData]);

    // Auto-fill strategic objective when entering step 5
    useEffect(() => {
        if (step === 5 && genMode === 'single') {
            const kb = client?.configuration?.knowledge_base || {};
            const strategy = contentStrategy || {};
            const isDefault = !singleObjective || singleObjective.includes("Obiettivo: Generare un contenuto") || singleObjective === "";
            if (isDefault) {
                if (advancedPrompt && advancedPrompt.length > 50) {
                    setSingleObjective(advancedPrompt);
                } else {
                    setSingleObjective(`Obiettivo: Generare un contenuto ${strategy.funnel_stage || 'TOFU'} seguendo il modello ${strategy.modello_copywriting || 'PAS'}. 
Target: ${kb.pubblico_target_primario || 'Audience generale'}.
Focus: ${singleTitle || singleKeywords || 'Keyword principale'}.
Direttive: Ottimizzazione standard SEO premium.`);
                }
            }
        }
    }, [step]);

    return {
        // Navigation
        step, setStep, genMode, setGenMode,
        // Strategy
        contentStrategy, setContentStrategy,
        // SERP & GSC
        serpKeyword, setSerpKeyword, serpLoading, setSerpLoading,
        serpData, setSerpData, serpDone, setSerpDone,
        gscData, setGscData, gscLoading, setGscLoading, gscSite, setGscSite,
        // Prompt
        advancedPrompt, setAdvancedPrompt, promptDone, setPromptDone,
        // Single Article
        singleTitle, setSingleTitle, singleKeywords, setSingleKeywords,
        singleObjective, setSingleObjective, singleGenerating, setSingleGenerating,
        refiningObjective, setRefiningObjective, singleResult, setSingleResult,
        singleScheduledDate, setSingleScheduledDate,
        // Images
        imageSource, setImageSource, imgSearchQuery, setImgSearchQuery,
        imgSearchResults, setImgSearchResults, searchingImages, setSearchingImages,
        singleSelectedImage, setSingleSelectedImage, autoGenerateCover, setAutoGenerateCover,
        activePlanImageIndex, setActivePlanImageIndex,
        adminUploadedImages, setAdminUploadedImages, adminUploading, setAdminUploading,
        globalImages, setGlobalImages, imageUploadLoading, setImageUploadLoading,
        // Silo
        siloClusters, setSiloClusters, suggestingSilo, setSuggestingSilo,
        selectedSiloClusters, setSelectedSiloClusters,
        // Programmatic
        keywords, setKeywords, combinations, setCombinations,
        selectedCombinations, setSelectedCombinations,
        useSpintax, setUseSpintax, programmaticTemplate, setProgrammaticTemplate,
        sidebarTemplate, setSidebarTemplate, ctaConfig, setCtaConfig,
        wizardStep, setWizardStep, isArchitecting, setIsArchitecting,
        webCorrelates, setWebCorrelates, previewContent, setPreviewContent,
        templateStyle, setTemplateStyle,
        // Generation
        generating, setGenerating, results, setResults,
        publishToWp, setPublishToWp, progressPercent, setProgressPercent,
        coverLoading, setCoverLoading, contentType, setContentType,
        activeJobId, setActiveJobId, totalInJob, setTotalInJob,
        internalLinkingEnabled, setInternalLinkingEnabled,
        // Plan
        plan, setPlan, planLoading, setPlanLoading, planGenerating, setPlanGenerating,
        selectedPlanTopics, setSelectedPlanTopics, planView, setPlanView,
        expandedOutlines, setExpandedOutlines, showPlanSettings, setShowPlanSettings,
        deletingPlan, setDeletingPlan, showDeleteConfirm, setShowDeleteConfirm,
        newPlanKeyword, setNewPlanKeyword, numArticles, setNumArticles,
        targetKeywords, setTargetKeywords,
        // UI & Misc
        saving, setSaving, automation, setAutomation, branding, setBranding,
        fullPreview, setFullPreview, refineFeedback, setRefineFeedback,
        refining, setRefining, recentArticles, setRecentArticles,
        recentSidebarOpen, setRecentSidebarOpen,
        showImgChangeModal, setShowImgChangeModal, editingTopic, setEditingTopic,
        competitorBenchmarks, setCompetitorBenchmarks,
        // Derived
        clientConfig, llmConfig, hasApiKey, wpConfig, hasWpConfig,
        gscConnected, strategyDone, allPlanTopics,
    };
}
