import { useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../../config';
import { toast } from 'sonner';
import { MousePointerClick, Target, TrendingUp } from 'lucide-react';

/**
 * Custom hook for SERP analysis, GSC data loading, prompt building, and GSC insights.
 */
export function useSerpAnalysis(state, { effectiveClientId, getAuthHeaders, client }) {

    const {
        serpKeyword, setSerpLoading, setSerpData, serpData,
        gscData, setGscData, setGscLoading, gscLoading,
        advancedPrompt, setAdvancedPrompt,
        singleTitle, singleKeywords, contentStrategy,
        gscConnected,
    } = state;

    // --- SERP Analysis ---
    async function runSerpAnalysis() {
        if (!String(serpKeyword || "").trim()) { toast.error('Inserisci una keyword'); return; }
        setSerpLoading(true);
        try {
            const res = await axios.post(`${API}/serp/analyze-full`, {
                keyword: serpKeyword, num_results: 4, country: 'it'
            }, { headers: getAuthHeaders() });
            setSerpData(res.data);
            toast.success(`Analizzati ${res.data.count} competitor per "${serpKeyword}"`);
            if (!advancedPrompt || advancedPrompt.length < 100 || window.confirm("Le analisi sono cambiate. Vuoi rigenerare il prompt strategico?")) {
                buildDefaultPrompt(res.data, gscData);
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore analisi SERP');
        } finally { setSerpLoading(false); }
    }

    // --- GSC Data ---
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
    }

    // --- Build Default Prompt ---
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
        lines.push("IMPORTANTE: Questo contenuto deve rappresentare ESCLUSIVAMENTE l'azienda descritta. Non inventare servizi o caratteristiche non presenti qui.");
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
        lines.push("1. PRIORITÀ AZIENDALE: Integra le informazioni della Knowledge Base in ogni paragrafo. L'azienda è l'autorità assoluta nel testo.");
        lines.push('2. FILTRO SERP: Usa gli heading dei competitor solo se sono coerenti con i servizi offerti dall\'azienda.');
        lines.push(`3. TONE OF VOICE: ${kb.tono_voce || 'Professionale e orientato al brand'}.`);
        lines.push("4. CONVERSIONE: Orienta il lettore verso la CTA aziendale, non limitarti all'informazione pura.");
        lines.push('5. AUTENTICITÀ: Evita genericismi. Usa i punti di forza aziendali per differenziarti radicalmente dai competitor.');

        setAdvancedPrompt(lines.join('\n'));
        toast.info("Prompt strategico generato con dati Brand KB!");
    };

    // --- GSC Insights (Memoized) ---
    const [localDismissed, setLocalDismissed] = React.useState([]);

    const gscInsights = useMemo(() => {
        if (!gscData?.keywords) return [];
        const insights = [];
        const kws = gscData.keywords;
        const dismissed = client?.configuration?.dismissed_insights || [];

        const lowCtr = kws.filter(k => k.impressions > 1000 && k.ctr < 0.02)
            .sort((a,b) => b.impressions - a.impressions).slice(0, 2);
        if (lowCtr.length > 0) {
            const id = `ctr_opt_${lowCtr.map(k=>k.keyword).join('_')}`;
            if (!dismissed.includes(id) && !localDismissed.includes(id)) {
                insights.push({
                    id, type: 'optimization', title: 'CTR Optimization Support',
                    desc: `High visibility detected for "${lowCtr.map(k=>k.keyword).join(', ')}". Update Meta Titles to capture search intent.`,
                    icon: MousePointerClick, color: 'text-amber-600', bg: 'bg-amber-50', context: lowCtr
                });
            }
        }

        const pageTwo = kws.filter(k => k.position > 10 && k.position < 25)
            .sort((a,b) => b.impressions - a.impressions).slice(0, 2);
        if (pageTwo.length > 0) {
            const id = `growth_${pageTwo.map(k=>k.keyword).join('_')}`;
            if (!dismissed.includes(id) && !localDismissed.includes(id)) {
                insights.push({
                    id, type: 'growth', title: 'Semantic Expansion Required',
                    desc: `"${pageTwo.map(k=>k.keyword).join(', ')}" are ranking on page 2. Create supporting cluster content to push into Top 10.`,
                    icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50', context: pageTwo
                });
            }
        }

        const emerging = kws.filter(k => k.impressions > 500 && k.clicks === 0)
            .sort((a,b) => b.impressions - a.impressions).slice(0, 1);
        if (emerging.length > 0) {
            const id = `trend_${emerging[0].keyword}`;
            if (!dismissed.includes(id) && !localDismissed.includes(id)) {
                insights.push({
                    id, type: 'trend', title: 'Market Trend Detected',
                    desc: `Growing interest in "${emerging[0].keyword}". Build an authoritative guide now to secure early market position.`,
                    icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', context: emerging
                });
            }
        }

        return insights;
    }, [gscData, client?.configuration?.dismissed_insights, localDismissed]);

    // --- Auto-load GSC ---
    useEffect(() => {
        if (effectiveClientId && gscConnected && !gscData && !gscLoading) {
            loadGscData();
        }
    }, [effectiveClientId, gscConnected]);

    // --- Dismiss / Approve Insights ---
    const handleDismissInsight = async (id, silent = false) => {
        setLocalDismissed(prev => [...prev, id]);
        const config = client?.configuration || {};
        const currentDismissed = config.dismissed_insights || [];
        if (currentDismissed.includes(id)) return;
        const newConfig = { ...config, dismissed_insights: [...currentDismissed, id] };
        try {
            await axios.put(`${API}/clients/${effectiveClientId}/configuration`, newConfig, { headers: getAuthHeaders() });
            if (!silent) toast.success("Suggerimento archiviato.");
        } catch (e) {
            if (!silent) toast.error("Errore salvataggio scelta");
        }
    };

    const handleApproveInsight = (insight) => {
        if (insight.type === 'growth' || insight.type === 'trend') {
            const firstKw = insight.context?.[0]?.keyword || "";
            state.setGenMode('single');
            state.setSingleKeywords(firstKw);
            state.setSingleTitle(firstKw);
            state.setSingleObjective(`Espansione semantica per keyword emergente: ${firstKw}`);
            state.setStep(5);
            toast.success(`Configurazione caricata per: ${firstKw}`);
            handleDismissInsight(insight.id, true);
        } else if (insight.type === 'optimization') {
            toast.info("Funzione ottimizzazione Meta Title in arrivo.");
            handleDismissInsight(insight.id, true);
        }
    };

    return {
        runSerpAnalysis, loadGscData, buildDefaultPrompt,
        gscInsights, handleDismissInsight, handleApproveInsight,
    };
}
