import { useEffect } from 'react';
import axios from 'axios';
import { API_URL as API, BASE_URL } from '../../../config';
import { toast } from 'sonner';

/**
 * Custom hook for article generation logic:
 * single generate, batch plan generate, refine, polling, cover generation
 */
export function useArticleGeneration(state, { effectiveClientId, getAuthHeaders, client }) {

    const {
        singleKeywords, singleTitle, singleObjective, publishToWp, imageSource,
        singleSelectedImage, adminUploadedImages, singleScheduledDate,
        gscData, serpData, genMode, contentType, autoGenerateCover,
        advancedPrompt, contentStrategy, useSpintax, templateStyle,
        setSingleGenerating, setSingleResult, setGenerating, setResults,
        setProgressPercent, setActiveJobId, setTotalInJob,
        setSelectedPlanTopics, setCoverLoading, setRefining, setRefineFeedback,
        activeJobId, generating, totalInJob, selectedPlanTopics,
        singleGenerating, saving, setSaving, keywords, globalImages,
        sidebarTemplate, ctaConfig, internalLinkingEnabled,
        selectedCombinations, programmaticTemplate, wizardStep,
        setKeywords, setWizardStep, setProgrammaticTemplate, setSidebarTemplate,
        setPreviewContent, setGlobalImages, setWebCorrelates,
        setIsArchitecting, isArchitecting, webCorrelates,
        refineFeedback, singleResult, refining,
    } = state;

    // --- Save Configuration ---
    const saveConfig = async () => {
        try {
            const currentConfig = client?.configuration || {};
            const payload = {
                ...currentConfig,
                content_strategy: state.contentStrategy,
                advanced_prompt: {
                    secondo_livello_prompt: state.advancedPrompt
                },
                keyword_combinations: state.keywords,
                automation: state.automation,
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

    // --- Single Article Generation ---
    const handleSingleGenerate = async (typeOverride = null) => {
        if (!String(singleKeywords || "").trim() && !String(singleTitle || "").trim()) {
            toast.error('Inserisci almeno keywords o titolo'); return;
        }
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

    // --- Batch Plan Generation ---
    async function handleBatchPlanGenerate() {
        if (selectedPlanTopics.length === 0) { toast.error('Seleziona almeno un articolo'); return; }
        setGenerating(true); setResults([]); setProgressPercent(0);
        await saveConfig();
        try {
            const topicsToProcess = selectedPlanTopics.map(t => ({
                ...t, featured_image_url: t.featured_image || t.stock_image_url
            }));
            const res = await axios.post(`${API}/articles/batch-plan`, {
                client_id: effectiveClientId, topics: topicsToProcess,
                publish_to_wordpress: publishToWp, content_type: contentType,
                generate_cover: true
            }, { headers: getAuthHeaders() });

            const queueItemsInBatch = selectedPlanTopics.filter(t => t.isQueueItem).map(t => t.originalText || t.titolo);
            if (queueItemsInBatch.length > 0) {
                const currentConfig = client?.configuration || {};
                const currentQueue = currentConfig.editorial_queue || [];
                const newQueue = currentQueue.filter(k => !queueItemsInBatch.includes(k));
                axios.put(`${API}/clients/${effectiveClientId}/configuration`, { ...currentConfig, editorial_queue: newQueue }, { headers: getAuthHeaders() })
                     .catch(e => console.error("Could not cleanup queue", e));
            }

            const planTitlesInBatch = selectedPlanTopics.filter(t => !t.isQueueItem).map(t => t.titolo);
            if (planTitlesInBatch.length > 0) {
                axios.post(`${API}/editorial-plan/${effectiveClientId}/delete-topics`, { titles: planTitlesInBatch }, { headers: getAuthHeaders() })
                     .catch(e => console.error("Could not cleanup plan topics", e));
                     
                if (state.plan && state.setPlan) {
                    const remainingTopics = state.plan.topics.filter(t => !planTitlesInBatch.includes(t.titolo));
                    state.setPlan({ ...state.plan, topics: remainingTopics });
                }
            }

            toast.success(`Job avviato con successo: ${res.data.total} articoli in elaborazione in background.`, {
                description: "Puoi monitorare lo stato nel Centro Task in alto a destra.",
                duration: 6000
            });
            setGenerating(false);
            setSelectedPlanTopics([]);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore generazione batch');
            setGenerating(false);
        }
    }

    // --- Programmatic Generation ---
    async function handleProgrammaticGenerate() {
        if (selectedCombinations.length === 0) { toast.error('Seleziona almeno una combinazione'); return; }
        setGenerating(true); setResults([]); setProgressPercent(0);
        await saveConfig();
        const effectiveContentType = genMode === 'programmatic' ? 'landing_page' : contentType;
        try {
            const res = await axios.post(`${API}/articles/generate-and-publish`, {
                client_id: effectiveClientId, combinations: selectedCombinations,
                publish_to_wordpress: publishToWp, content_type: effectiveContentType,
                use_spintax: genMode === 'programmatic' ? useSpintax : false,
                gsc_context: gscData ? { top_keywords: gscData.keywords?.slice(0, 10), totals: gscData.totals } : undefined,
                serp_context: serpData ? { competitors: serpData.competitors, extracted: serpData.extracted } : undefined,
                generate_cover: autoGenerateCover,
                template_style: genMode === 'programmatic' ? templateStyle : undefined
            }, { headers: getAuthHeaders() });
            setActiveJobId(res.data.job_id);
            setTotalInJob(res.data.total);
            toast.info(`Job avviato: ${res.data.total} ${genMode === 'programmatic' ? 'pagine' : 'articoli'} in elaborazione...`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore generazione');
            setGenerating(false);
            setActiveJobId(null);
        }
    }

    // --- Refine ---
    async function handleRefine() {
        if (!String(refineFeedback || "").trim()) {
            toast.error("Inserisci un feedback per l'agente");
            return;
        }
        setRefining(true);
        try {
            const res = await axios.post(`${API}/articles/refine`, {
                client_id: effectiveClientId,
                article_id: singleResult.id,
                feedback: refineFeedback,
                publish_to_wordpress: true
            }, { headers: getAuthHeaders() });
            if (res.data.status === 'success') {
                toast.success('Contenuto aggiornato con successo!');
                setRefineFeedback('');
            }
        } catch (error) {
            toast.error('Errore durante il raffinamento: ' + (error.response?.data?.detail || error.message));
        } finally {
            setRefining(false);
        }
    }

    // --- Improve Objective ---
    async function handleImproveObjective() {
        if (!effectiveClientId) return;
        state.setRefiningObjective(true);
        try {
            const res = await axios.post(`${API}/articles/refine-objective`, {
                client_id: effectiveClientId,
                objective: singleObjective,
                strategy: contentStrategy,
                prompt_context: advancedPrompt.substring(0, 500)
            }, { headers: getAuthHeaders() });
            if (res.data.refined_objective) {
                state.setSingleObjective(res.data.refined_objective);
                toast.success("Obiettivo migliorato con l'IA!");
            }
        } catch (error) {
            toast.error("Errore durante il miglioramento dell'obiettivo");
        } finally {
            state.setRefiningObjective(false);
        }
    }

    // --- Cover Generation ---
    const handleGenerateCover = async (articleId, title) => {
        setCoverLoading(prev => ({ ...prev, [articleId]: true }));
        try {
            const res = await axios.post(`${API}/articles/generate-cover`, {
                client_id: effectiveClientId, title
            }, { headers: getAuthHeaders() });
            setResults(prev => prev.map(r => r.id === articleId ? { ...r, image_url: res.data.url } : r));
            toast.success("Immagine di copertina generata!");
        } catch (error) {
            toast.error("Errore generazione immagine");
        } finally {
            setCoverLoading(prev => ({ ...prev, [articleId]: false }));
        }
    };

    // --- Architect Step (Programmatic) ---
    const handleArchitectStep = async () => {
        if (!state.keywords.servizi.length || !state.keywords.citta_e_zone.length) {
            toast.error("Seleziona almeno un servizio e una città nello Step 1.");
            return;
        }
        setIsArchitecting(true);
        try {
            const res = await axios.post(`${API}/articles/programmatic/architect`, {
                client_id: effectiveClientId,
                topic: state.keywords.servizi[0],
                service: state.keywords.servizi[0],
                cities: state.keywords.citta_e_zone
            }, { headers: getAuthHeaders() });
            state.setWebCorrelates(res.data.correlates || []);
            state.setProgrammaticTemplate(res.data.master_spintax || "");
            state.setWizardStep(2);
            toast.success("Architettura AI generata con successo!");
        } catch (e) {
            toast.error("Errore durante la generazione dell'architettura.");
        } finally {
            setIsArchitecting(false);
        }
    };

    // --- Preview (Programmatic) ---
    const handleGeneratePreview = async () => {
        if (!programmaticTemplate) return;
        try {
            const randomItem = {
                servizio: state.keywords.servizi[0] || "Servizio",
                citta: state.keywords.citta_e_zone[0] || "Città",
                keyword: (state.keywords.servizi[0] || "") + " " + (state.keywords.citta_e_zone[0] || "")
            };
            const res = await axios.post(`${API}/articles/programmatic/preview`, {
                template: programmaticTemplate, item: randomItem,
                global_images: globalImages.map(img => img.url)
            }, { headers: getAuthHeaders() });
            state.setPreviewContent(res.data.html);
        } catch (e) {
            toast.error("Errore nell'anteprima");
        }
    };

    // --- Reset Programmatic ---
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

    // --- Combination Helpers ---
    const refreshCombinations = async () => {
        try {
            await saveConfig();
            const res = await axios.get(`${API}/clients/${effectiveClientId}/combinations`, { headers: getAuthHeaders() });
            state.setCombinations(res.data.combinations || []);
            toast.success(`${res.data.combinations?.length || 0} combinazioni`);
        } catch (e) { toast.error('Errore aggiornamento combinazioni'); }
    };

    const toggleCombo = (combo) => {
        const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
        if (state.selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key))
            state.setSelectedCombinations(state.selectedCombinations.filter(c => `${c.servizio}-${c.citta}-${c.tipo}` !== key));
        else state.setSelectedCombinations([...state.selectedCombinations, combo]);
    };

    const selectAll = () => state.setSelectedCombinations(state.selectedCombinations.length === state.combinations.length ? [] : [...state.combinations]);

    // --- Resumable Polling Effect ---
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
                        if ((s.generated_ok || 0) === 0) toast.error(`Generazione terminata senza successo.`);
                        else toast.success(`Completato: ${s.generated_ok || 0} generate`);
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
        if (activeJobId && generating) poll();
        return () => { isStopped = true; };
    }, [activeJobId, generating, totalInJob]);

    return {
        saveConfig, onSaveConfig,
        handleSingleGenerate, handleBatchPlanGenerate, handleProgrammaticGenerate,
        handleRefine, handleImproveObjective, handleGenerateCover,
        handleArchitectStep, handleGeneratePreview, handleResetProgrammatic,
        refreshCombinations, toggleCombo, selectAll,
    };
}
