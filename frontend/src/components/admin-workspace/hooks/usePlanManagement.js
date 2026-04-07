import { useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../../config';
import { toast } from 'sonner';

/**
 * Custom hook for Editorial Plan management:
 * fetch, generate, delete, save, topic selection, batch operations
 */
export function usePlanManagement(state, { effectiveClientId, getAuthHeaders, client }) {

    const {
        plan, setPlan, planLoading, setPlanLoading, planGenerating, setPlanGenerating,
        selectedPlanTopics, setSelectedPlanTopics, allPlanTopics,
        deletingPlan, setDeletingPlan, showDeleteConfirm, setShowDeleteConfirm,
        advancedPrompt, numArticles, recentArticles, setRecentArticles,
        saving, setSaving, expandedOutlines, setExpandedOutlines,
    } = state;

    // --- Fetch Plan ---
    async function fetchPlan() {
        if (!effectiveClientId) return;
        setPlanLoading(true);
        try {
            const res = await axios.get(`${API}/editorial-plan/${effectiveClientId}`, { headers: getAuthHeaders() });
            setPlan(res.data || null);
        } catch (error) {
            console.error("Error fetching editorial plan:", error);
            setPlan(null);
        } finally {
            setPlanLoading(false);
        }
    }

    // --- Fetch Recent Articles ---
    async function fetchRecentArticles() {
        if (!effectiveClientId) return;
        try {
            const res = await axios.get(`${API}/articles?client_id=${effectiveClientId}`, { headers: getAuthHeaders() });
            setRecentArticles(res.data.slice(0, 50));
        } catch (error) {
            console.error("Error fetching recent articles:", error);
        }
    }

    // --- Generate New Plan ---
    async function generateNewPlan() {
        setPlanGenerating(true);
        state.setResults([]);
        try {
            const res = await axios.post(`${API}/generate-plan/${effectiveClientId}`, {
                objective: typeof advancedPrompt === 'string' ? advancedPrompt : (advancedPrompt?.secondo_livello_prompt || JSON.stringify(advancedPrompt)),
                num_topics: numArticles
            }, { headers: getAuthHeaders() });
            setPlan(res.data);
            toast.success("Piano editoriale generato con successo!");
        } catch (error) {
            toast.error("Errore durante la generazione del piano");
            console.error(error);
        } finally {
            setPlanGenerating(false);
        }
    }

    // --- Delete Plan ---
    function handleDeletePlan() { setShowDeleteConfirm(true); }

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
    }

    // --- Save Plan ---
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
    }

    // --- Topic Selection ---
    const toggleTopicSelection = (topic) => {
        const isSelected = selectedPlanTopics.some(t => t.titolo === topic.titolo);
        if (isSelected) {
            setSelectedPlanTopics(selectedPlanTopics.filter(t => t.titolo !== topic.titolo));
        } else {
            setSelectedPlanTopics([...selectedPlanTopics, topic]);
        }
    };

    const isTopicSelected = (topic) => selectedPlanTopics.some(t => t.titolo === topic.titolo);

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

    const toggleOutline = (idx) => {
        setExpandedOutlines(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // --- Delete Selected Topics ---
    const handleDeleteSelectedTopics = async () => {
        if (selectedPlanTopics.length === 0) return;
        if (!confirm(`Sei sicuro di voler eliminare ${selectedPlanTopics.length} contenuti dal piano?`)) return;
        setPlanLoading(true);
        try {
            const queueTitles = selectedPlanTopics.filter(t => t.isQueueItem).map(t => t.originalText || t.titolo);
            if (queueTitles.length > 0) {
                const currentConfig = client?.configuration || {};
                const currentQueue = currentConfig.editorial_queue || [];
                const newQueue = currentQueue.filter(k => !queueTitles.includes(k));
                await axios.put(`${API}/clients/${effectiveClientId}/configuration`, { ...currentConfig, editorial_queue: newQueue }, { headers: getAuthHeaders() });
            }
            const planTitles = selectedPlanTopics.filter(t => !t.isQueueItem).map(t => t.titolo);
            if (planTitles.length > 0) {
                await axios.post(`${API}/editorial-plan/${effectiveClientId}/delete-topics`, { titles: planTitles }, { headers: getAuthHeaders() });
            }
            toast.success("Contenuti rimossi con successo");
            setSelectedPlanTopics([]);
            fetchPlan();
        } catch (error) {
            toast.error("Errore durante l'eliminazione");
        } finally {
            setPlanLoading(false);
        }
    };

    // --- Remove from Queue ---
    const handleRemoveFromQueue = async (item) => {
        const textToRemove = item.originalText || item.titolo;
        const currentConfig = client?.configuration || {};
        const currentQueue = currentConfig.editorial_queue || [];
        const newQueue = currentQueue.filter(k => k !== textToRemove);
        const newConfig = { ...currentConfig, editorial_queue: newQueue };
        try {
            await axios.put(`${API}/clients/${effectiveClientId}/configuration`, newConfig, { headers: getAuthHeaders() });
            toast.success("Rimosso dalla coda");
        } catch (e) {
            toast.error("Errore durante la rimozione");
        }
    };

    // --- Keywords Management ---
    const addTargetKeyword = () => {
        if (!String(state.newPlanKeyword || "").trim()) return;
        if (state.targetKeywords.includes(String(state.newPlanKeyword || "").trim())) {
            toast.error("Keyword già presente"); return;
        }
        state.setTargetKeywords([...state.targetKeywords, String(state.newPlanKeyword || "").trim()]);
        state.setNewPlanKeyword("");
    };

    const removeTargetKeyword = (kw) => {
        state.setTargetKeywords(state.targetKeywords.filter(k => k !== kw));
    };

    // Load plan and articles on client change
    useEffect(() => {
        if (effectiveClientId) {
            fetchPlan();
            fetchRecentArticles();
        }
    }, [effectiveClientId]);

    return {
        fetchPlan, fetchRecentArticles, generateNewPlan,
        handleDeletePlan, confirmDeletePlan, handleSavePlan,
        toggleTopicSelection, isTopicSelected, togglePlanTopic,
        selectAllPlanTopics, removeTopicFromPlan, toggleOutline,
        handleDeleteSelectedTopics, handleRemoveFromQueue,
        addTargetKeyword, removeTargetKeyword,
    };
}
