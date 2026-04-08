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
import { toast } from 'sonner';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent } from '../ui/dialog';

// --- Lazy-loaded Configuration Tabs ---
const ContentStrategyTab = lazy(() => import('../../pages/configuration/ContentStrategyTab').then(m => ({ default: m.ContentStrategyTab })));
const KeywordsTab = lazy(() => import('../../pages/configuration/KeywordsTab').then(m => ({ default: m.KeywordsTab })));

// --- Custom Hooks ---
import { useGeneratorState } from './hooks/useGeneratorState';
import { useArticleGeneration } from './hooks/useArticleGeneration';
import { usePlanManagement } from './hooks/usePlanManagement';
import { useSerpAnalysis } from './hooks/useSerpAnalysis';
import { useImageManagement } from './hooks/useImageManagement';

// --- Sub-Components ---
import { EditorialCalendar } from './EditorialCalendar';
import { CompetitorsBenchmarkTab } from '../../pages/configuration/CompetitorsBenchmarkTab';
import { EditorialHubView } from './sections/EditorialHubView';
import { FullPreviewModal, ImageChangeModal } from './sections/Modals';
import { ProgrammaticWizard } from './sections/ProgrammaticWizard';

// ============================================================================
// ADMIN GENERATOR - Main Orchestrator
// ============================================================================
export function AdminGenerator({
    client, effectiveClientId, getAuthHeaders, navigate, externalMode, initialData, onDataUsed
}) {
    // --- 1. STATE (via custom hook) ---
    const state = useGeneratorState({ client, effectiveClientId, externalMode, initialData, onDataUsed });

    const hookDeps = { effectiveClientId, getAuthHeaders, client };

    // --- 2. LOGIC (via custom hooks) ---
    const generation = useArticleGeneration(state, hookDeps);
    const planMgmt = usePlanManagement(state, hookDeps);
    const serp = useSerpAnalysis(state, hookDeps);
    const images = useImageManagement(state, hookDeps);

    // Diagnostics
    console.log("[AdminGenerator] Render:", { effectiveClientId, genMode: state.genMode, clientName: client?.nome });

    // --- Topic Loading (from Editorial Hub) ---
    const handleUseTopicInGenerator = (topic) => {
        state.setGenMode('single');
        state.setSingleTitle(topic.titolo);
        state.setSingleKeywords(topic.keyword || '');
        state.setSingleObjective(topic.final_objective || topic.outline?.map(h => h.text).join('\n') || '');
        state.setSerpDone(!!topic.serp_summary);
        state.setSerpData(topic.serp_summary ? { summary: topic.serp_summary } : null);
        state.setAdvancedPrompt(topic.master_prompt || '');
        state.setPromptDone(!!topic.master_prompt);
        if (topic.featured_image || topic.stock_image_url) {
            state.setSingleSelectedImage({
                url: topic.featured_image || topic.stock_image_url,
                thumb: topic.featured_image || topic.stock_image_thumb
            });
        }
        state.setSerpKeyword(topic.keyword || '');
        state.setSingleScheduledDate(topic.scheduled_date ? topic.scheduled_date.split('T')[0] : '');
        console.log("[GENERATOR DEBUG] Loading topic context:", {
            titolo: topic.titolo, serp_summary: !!topic.serp_summary,
            master_prompt: !!topic.master_prompt, final_objective: !!topic.final_objective
        });
        toast.info(`Contesto caricato: ${topic.titolo}`);
    };

    // --- Silo Helpers ---
    async function handleSuggestSilo() {
        if (!state.singleObjective) { toast.error("Inserisci prima l'obiettivo della Pillar Page"); return; }
        state.setSuggestingSilo(true);
        try {
            const { data } = await axios.post(`${API}/articles/suggest-silo`, {
                objective: state.singleObjective, clientId: effectiveClientId
            }, { headers: getAuthHeaders() });
            state.setSiloClusters(data.clusters || []);
            state.setSelectedSiloClusters(data.clusters || []);
            toast.success("Strategia Silo generata con successo!");
        } catch (err) {
            toast.error("Errore generazione strategia silo");
        } finally {
            state.setSuggestingSilo(false);
        }
    }

    function toggleSiloCluster(cluster) {
        state.setSelectedSiloClusters(prev =>
            prev.find(c => c.titolo === cluster.titolo)
            ? prev.filter(c => c.titolo !== cluster.titolo)
            : [...prev, cluster]
        );
    }

    async function handleGenerateSilo() {
        if (!state.singleObjective) return;
        if (state.selectedSiloClusters.length === 0) { toast.error("Seleziona almeno un cluster di supporto"); return; }
        state.setGenerating(true);
        try {
            await axios.post(`${API}/articles/batch-generate`, {
                client_id: effectiveClientId, is_silo: true,
                pillar_topic: {
                    titolo: state.singleTitle || state.singleObjective, objective: state.singleObjective,
                    type: 'page', scheduled_date: new Date().toISOString()
                },
                clusters: state.selectedSiloClusters.map(c => ({ ...c, type: 'post', scheduled_date: new Date().toISOString() }))
            }, { headers: getAuthHeaders() });
            toast.success(`Batch Silo avviato! ${state.selectedSiloClusters.length + 1} articoli in coda.`);
            state.setStep(1);
        } catch (err) {
            toast.error("Errore avvio generazione Silo");
        } finally {
            state.setGenerating(false);
        }
    }

    async function loadFullPreview(id) {
        try {
            const res = await axios.get(`${API}/articles/${id}/full`, { headers: getAuthHeaders() });
            state.setFullPreview(res.data);
        } catch (e) {
            toast.error('Errore caricamento anteprima');
        }
    }

    // --- Navigation redirect ---
    useEffect(() => {
        if (!effectiveClientId) navigate('/dashboard');
    }, [effectiveClientId, navigate]);

    // --- Step definitions ---
    const steps = [
        { num: 1, label: 'Strategia', icon: Target },
        { num: 2, label: 'Analisi SERP', icon: Search },
        { num: 3, label: 'Configurazione', icon: Lock },
        { num: 4, label: 'Generazione', icon: Zap },
    ];

    if (!effectiveClientId) return null;

    // ========================================================================
    // RENDER
    // ========================================================================
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
                            { id: 'programmatic', label: 'Bulk SEO', icon: Library },
                            { id: 'competitors', label: 'Competitor Study', icon: Target }
                        ].map((mode) => (
                            <button 
                                key={mode.id}
                                onClick={() => { state.setGenMode(mode.id); state.setStep(1); }} 
                                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${
                                    state.genMode === mode.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
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
                {state.genMode === 'plan' && serp.gscInsights.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {serp.gscInsights.map((insight, idx) => (
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
                                    <Button onClick={() => serp.handleApproveInsight(insight)} className="h-8 px-4 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase">Applica</Button>
                                    <Button onClick={() => serp.handleDismissInsight(insight.id)} variant="ghost" className="h-8 px-4 text-slate-400 hover:text-slate-900 rounded-lg text-[9px] font-black uppercase">Archivia</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- WORKSPACE CORE --- */}
            <div className="max-w-6xl mx-auto w-full">
                {/* ===== SINGLE / PILLAR MODE ===== */}
                {(state.genMode === 'single' || state.genMode === 'pillar') && (
                    <div className="space-y-6">
                        {/* STEPPER */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-1 shadow-sm overflow-x-auto overflow-y-hidden custom-scrollbar">
                            {steps.map((s, i) => {
                                const active = state.step === s.num;
                                return (
                                    <Fragment key={s.num}>
                                        <button 
                                            onClick={() => state.setStep(s.num)} 
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

                        {/* STEP 1: Strategy */}
                        {state.step === 1 && (
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
                                            <ContentStrategyTab strategy={state.contentStrategy} setStrategy={state.setContentStrategy} />
                                        </Suspense>
                                    </div>
                                    <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                        <Button onClick={() => state.setStep(2)} className="h-11 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            Analisi SERP <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* STEP 2: SERP Analysis */}
                        {state.step === 2 && (
                            <Card className="border-slate-200 rounded-2xl p-8 shadow-sm bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">SERP Intelligence Analysis</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Scraping competitors &amp; semantic gap</p>
                                    </div>
                                    <div className="flex bg-slate-100 p-3 rounded-2xl w-full max-w-xl">
                                        <Input value={state.serpKeyword} onChange={(e) => state.setSerpKeyword(e.target.value)} placeholder="Focus keyword..." className="h-10 px-4 rounded-xl text-sm border-none bg-transparent focus:ring-0" onKeyDown={(e) => e.key === 'Enter' && serp.runSerpAnalysis()} />
                                        <Button onClick={serp.runSerpAnalysis} disabled={state.serpLoading} className="h-10 px-6 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase">
                                            {state.serpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analizza'}
                                        </Button>
                                    </div>
                                </div>
                                {state.serpData && (
                                    <div className="space-y-6">
                                        {state.serpData.summary && (
                                            <div className="p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-5"><BrainCircuit className="w-16 h-16" /></div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Pre-computed SERP Summary
                                                </h4>
                                                <p className="text-xs font-medium leading-relaxed opacity-90">{state.serpData.summary}</p>
                                            </div>
                                        )}
                                        {state.serpData.competitors && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {state.serpData.competitors.map((comp, idx) => (
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
                                        )}
                                    </div>
                                )}
                                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between">
                                    <Button variant="ghost" onClick={() => state.setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors">Indietro</Button>
                                    <Button onClick={() => state.setStep(3)} className="h-12 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">
                                        Prosegui <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* STEP 3: AI Master Prompt */}
                        {state.step === 3 && (
                            <Card className="border-slate-200 rounded-2xl p-8 shadow-sm bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center shadow-md"><Lock className="w-6 h-6 text-white" /></div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">AI Strategy Master Prompt</h3>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Step 03: Final logic control</p>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-slate-900 rounded-2xl blur opacity-5 group-hover:opacity-10 transition duration-500"></div>
                                    <Textarea
                                        className="min-h-[400px] relative bg-slate-50 border-slate-100 p-8 text-sm font-medium leading-relaxed rounded-2xl shadow-inner focus:ring-1 focus:ring-slate-900 transition-all font-mono"
                                        value={state.advancedPrompt}
                                        onChange={(e) => state.setAdvancedPrompt(e.target.value)}
                                        placeholder="Generating strategy..."
                                    />
                                </div>
                                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                                    <Button variant="ghost" onClick={() => state.setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors">Indietro</Button>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => serp.buildDefaultPrompt(state.serpData, state.gscData)} className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest flex gap-2">
                                            <RefreshCcw className="w-3 h-3" /> Re-build
                                        </Button>
                                        <Button onClick={() => state.setStep(4)} className="h-12 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md">Configura Asset <ChevronRight className="w-4 h-4 ml-2" /></Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* STEP 4: Final Asset Configuration */}
                        {state.step === 4 && (
                             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Card className="border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Final Asset Configuration</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Article Studio</p>
                                            </div>
                                            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
                                                <Button variant="ghost" size="sm" onClick={() => state.setImageSource('ai')} className={`h-8 px-5 rounded-lg text-[9px] font-black uppercase transition-all ${state.imageSource === 'ai' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Gen IA</Button>
                                                <Button variant="ghost" size="sm" onClick={() => state.setImageSource('search')} className={`h-8 px-5 rounded-lg text-[9px] font-black uppercase transition-all ${state.imageSource === 'search' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Search</Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Column 1: Core Config */}
                                        <div className="lg:col-span-7 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Titolo dell'Asset</Label>
                                                <Input className="h-12 text-lg font-black bg-slate-50 border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all" value={state.singleTitle} onChange={(e) => state.setSingleTitle(e.target.value)} placeholder="Inserisci il titolo..." />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Concept Strategico</Label>
                                                    <Button onClick={generation.handleImproveObjective} disabled={state.refiningObjective} variant="outline" className="h-7 px-3 gap-1.5 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black text-[8px] uppercase tracking-widest rounded-lg transition-colors">
                                                        {state.refiningObjective ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                        AI Refine
                                                    </Button>
                                                </div>
                                                <Textarea className="min-h-[220px] max-h-[350px] text-[11px] p-5 bg-slate-50 border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all font-bold leading-relaxed custom-scrollbar shadow-inner" value={state.singleObjective} onChange={(e) => state.setSingleObjective(e.target.value)} placeholder="Describe the strategic goal..." />
                                            </div>
                                        </div>
                                        {/* Column 2: Visual Intelligence */}
                                        <div className="lg:col-span-5 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] px-1">Visual Intelligence</Label>
                                                <div className="relative group overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 min-h-[300px] flex flex-col">
                                                    {state.imageSource === 'ai' ? (
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
                                                                    <Input value={state.imgSearchQuery} onChange={(e) => state.setImgSearchQuery(e.target.value)} placeholder="Search..." className="h-9 pl-9 rounded-xl border-slate-200 bg-white text-[11px] font-bold" onKeyDown={(e) => e.key === 'Enter' && images.handleImageSearch(12)} />
                                                                </div>
                                                                <Button onClick={() => images.handleImageSearch(12)} disabled={state.searchingImages} className="h-9 w-9 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                                                                    {state.searchingImages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                                                </Button>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                                                {state.imgSearchResults.map((img, i) => (
                                                                    <div key={i} onClick={() => images.importExternalImage(img.image)} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-slate-900 transition-all bg-white border border-slate-100">
                                                                        <img src={img.thumbnail || img.image} className="w-full h-full object-cover" />
                                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <Plus className="w-4 h-4 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {state.imgSearchResults.length === 0 && !state.searchingImages && (
                                                                    <div className="col-span-3 py-10 flex flex-col items-center justify-center opacity-30">
                                                                        <ImageIcon className="w-8 h-8 mb-2" />
                                                                        <p className="text-[8px] font-black uppercase">Fai una ricerca</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {state.singleSelectedImage && (
                                                        <div className="absolute inset-0 bg-white z-10 p-2 animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="relative h-full rounded-xl overflow-hidden border-2 border-emerald-500/30 group">
                                                                <img src={state.singleSelectedImage.url} className="w-full h-full object-cover" />
                                                                <div className="absolute top-2 right-2 flex gap-2">
                                                                    <Button size="icon" onClick={() => state.setSingleSelectedImage(null)} variant="destructive" className="h-8 w-8 rounded-lg shadow-lg"><X className="w-4 h-4" /></Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <Button variant="ghost" onClick={() => state.setStep(3)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-950 tracking-widest pl-0">
                                            <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Indietro
                                        </Button>
                                        <Button onClick={generation.handleSingleGenerate} disabled={state.singleGenerating} className="h-14 px-12 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            {state.singleGenerating ? (
                                                <div className="flex items-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /><span>PROCESSING ENGINE...</span></div>
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

                {/* ===== COMPETITOR STUDY MODE ===== */}
                {state.genMode === 'competitors' && (
                    <CompetitorsBenchmarkTab
                        client={client}
                        config={{ ...state.clientConfig, competitor_benchmarks: state.competitorBenchmarks }}
                        setConfig={(newConfig) => {
                            if (newConfig.competitor_benchmarks) {
                                state.setCompetitorBenchmarks(newConfig.competitor_benchmarks);
                            }
                        }}
                        getAuthHeaders={getAuthHeaders}
                        API={API}
                    />
                )}

                {/* ===== EDITORIAL PLAN MODE ===== */}
                {state.genMode === 'plan' && state.planLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hub caricamento...</p>
                    </div>
                )}

                {state.genMode === 'plan' && !state.planLoading && (
                    <EditorialHubView
                        client={client}
                        allPlanTopics={state.allPlanTopics}
                        selectedPlanTopics={state.selectedPlanTopics}
                        setSelectedPlanTopics={state.setSelectedPlanTopics}
                        planView={state.planView}
                        setPlanView={state.setPlanView}
                        planGenerating={state.planGenerating}
                        generating={state.generating}
                        generateNewPlan={planMgmt.generateNewPlan}
                        handleBatchPlanGenerate={generation.handleBatchPlanGenerate}
                        handleDeleteSelectedTopics={planMgmt.handleDeleteSelectedTopics}
                        handleUseTopicInGenerator={handleUseTopicInGenerator}
                        isTopicSelected={planMgmt.isTopicSelected}
                        toggleTopicSelection={planMgmt.toggleTopicSelection}
                        setEditingTopic={state.setEditingTopic}
                        setImgSearchQuery={state.setImgSearchQuery}
                        handleImageSearch={images.handleImageSearch}
                        setShowImgChangeModal={state.setShowImgChangeModal}
                        recentArticles={state.recentArticles}
                    />
                )}

                {/* ===== BULK SEO MODE ===== */}
                {state.genMode === 'programmatic' && (
                    state.wizardStep > 0 ? (
                        <ProgrammaticWizard 
                            state={state} 
                            generation={generation} 
                            effectiveClientId={effectiveClientId} 
                            getAuthHeaders={getAuthHeaders} 
                        />
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-600">
                            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
                                <div className="w-16 h-16 rounded-xl bg-slate-950 flex items-center justify-center mx-auto shadow-lg"><Library className="w-8 h-8 text-white" /></div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-950 tracking-tight">Bulk SEO Studio</h2>
                                    <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto">Generazione massiva di contenuti ottimizzati per silo semantici.</p>
                                </div>
                                <Button onClick={() => state.setWizardStep(1)} className="h-12 px-10 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Lancia Wizard Programmatico</Button>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* ===== MODALS ===== */}
            <FullPreviewModal fullPreview={state.fullPreview} setFullPreview={state.setFullPreview} />

            <ImageChangeModal
                open={state.showImgChangeModal}
                onOpenChange={state.setShowImgChangeModal}
                editingTopic={state.editingTopic}
                searchingImages={state.searchingImages}
                imgSearchResults={state.imgSearchResults}
                allPlanTopics={state.allPlanTopics}
                effectiveClientId={effectiveClientId}
                getAuthHeaders={getAuthHeaders}
                fetchPlan={planMgmt.fetchPlan}
            />
        </div>
    );
}
