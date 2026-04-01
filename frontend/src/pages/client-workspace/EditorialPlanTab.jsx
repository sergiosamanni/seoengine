import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Sparkles,
    Calendar,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Loader2,
    CheckCircle2,
    TrendingUp,
    BrainCircuit,
    Target,
    Plus,
    X,
    Settings2,
    Zap,
    Info,
    ShieldCheck,
    AlertTriangle,
    Calendar as CalendarIcon,
    RefreshCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EditorialPlanTab = ({ clientId, getAuthHeaders, onGenerateArticle, targetKeywords, setTargetKeywords, automation, setAutomation, onSaveConfig, saving }) => {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newKeyword, setNewKeyword] = useState("");
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        fetchPlan();
    }, [clientId]);

    const fetchPlan = async () => {
        try {
            const res = await axios.get(`${API}/editorial-plan/${clientId}`, {
                headers: getAuthHeaders()
            });
            setPlan(res.data);
        } catch (error) {
            console.error("Error fetching editorial plan:", error);
        } finally {
            setLoading(false);
        }
    };

    const generateNewPlan = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(`${API}/generate-plan/${clientId}`, {}, {
                headers: getAuthHeaders()
            });
            setPlan(res.data);
            toast.success("Piano editoriale generato con successo!");
        } catch (error) {
            toast.error("Errore durante la generazione del piano");
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        if (targetKeywords.includes(newKeyword.trim())) {
            toast.error("Keyword già presente");
            return;
        }
        setTargetKeywords([...targetKeywords, newKeyword.trim()]);
        setNewKeyword("");
    };

    const removeKeyword = (kw) => {
        setTargetKeywords(targetKeywords.filter(k => k !== kw));
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-slate-500 font-medium">Caricamento piano strategico...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── Target & Automation collapsible panel ── */}
            <Card className="border-slate-200 overflow-hidden">
                <button
                    className="w-full text-left"
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <CardHeader className="pb-4 hover:bg-slate-50/70 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Target & Automazione</CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        {targetKeywords.length > 0
                                            ? `${targetKeywords.length} keyword target · ${automation.enabled ? `Automazione: ${automation.articles_per_week} art/sett.` : 'Automazione disabilitata'}`
                                            : 'Configura keyword target e automazione'}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {targetKeywords.length > 0 && (
                                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-xs">
                                        {targetKeywords.length} keyword
                                    </Badge>
                                )}
                                {automation.enabled && (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-xs">
                                        <Zap className="w-3 h-3 mr-1 fill-emerald-500" />Auto
                                    </Badge>
                                )}
                                {showSettings
                                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                                }
                            </div>
                        </div>
                    </CardHeader>
                </button>

                {showSettings && (
                    <CardContent className="pt-0 pb-5 border-t border-slate-100">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                            {/* Keywords */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-slate-400" /> Keyword Target SEO
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Esempio: idraulico roma pronto intervento"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                        className="bg-slate-50 border-slate-200 focus:ring-indigo-500 text-sm"
                                    />
                                    <Button onClick={addKeyword} size="sm" className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 min-h-[40px]">
                                    {targetKeywords.length > 0 ? (
                                        targetKeywords.map((kw, idx) => (
                                            <Badge key={idx} variant="secondary" className="px-2 py-1 bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                                                {kw}
                                                <X className="w-3 h-3 cursor-pointer text-slate-300 hover:text-red-500 transition-colors" onClick={() => removeKeyword(kw)} />
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic py-1">Nessuna keyword — l'agente userà i dati GSC</p>
                                    )}
                                </div>
                                <Alert className="bg-blue-50/50 border-blue-100">
                                    <Info className="h-3.5 w-3.5 text-blue-600" />
                                    <AlertDescription className="text-xs text-blue-800">
                                        L'agente Strategist darà priorità assoluta a queste keyword nel piano.
                                    </AlertDescription>
                                </Alert>
                            </div>

                            {/* Automation */}
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-slate-400" /> Flusso di Automazione
                                </Label>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Generazione automatica</p>
                                        <p className="text-xs text-slate-500">Pilota automatico per questo cliente</p>
                                    </div>
                                    <Switch
                                        checked={automation.enabled}
                                        onCheckedChange={(val) => setAutomation({ ...automation, enabled: val })}
                                        className="data-[state=checked]:bg-indigo-600"
                                    />
                                </div>

                                <div className={`space-y-3 transition-all duration-300 ${automation.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Articoli a settimana</Label>
                                    <div className="flex items-center gap-3">
                                        <Select
                                            value={automation.articles_per_week.toString()}
                                            onValueChange={(val) => setAutomation({ ...automation, articles_per_week: parseInt(val) })}
                                        >
                                            <SelectTrigger className="bg-white border-slate-200 flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 7, 10].map(n => (
                                                    <SelectItem key={n} value={n.toString()}>
                                                        {n} {n === 1 ? 'articolo' : 'articoli'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50/50 rounded-lg border border-indigo-100 flex-shrink-0">
                                            <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                                            <span className="text-xs font-semibold text-indigo-700">~{automation.articles_per_week * 4}/mese</span>
                                        </div>
                                    </div>
                                </div>

                                {!automation.enabled && (
                                    <div className="flex items-center gap-2 text-amber-600 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                        <p className="text-xs font-medium">Automazione disabilitata — interventi manuali richiesti</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                            <Button onClick={onSaveConfig} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                {saving ? 'Salvataggio...' : 'Salva Target & Automazione'}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* ── Editorial Plan header ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        Piano Editoriale AI <Sparkles className="w-5 h-5 text-blue-500 fill-blue-500" />
                    </h2>
                    <p className="text-sm text-slate-500">Suggerimenti basati su Search Console e Knowledge Base.</p>
                </div>
                <Button
                    onClick={generateNewPlan}
                    disabled={generating}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md border-none"
                >
                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                    {plan?.topics?.length > 0 ? "Aggiorna Piano" : "Genera Piano Strategico"}
                </Button>
            </div>

            {/* ── Topics list ── */}
            {plan?.topics?.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {plan.topics.map((topic, index) => (
                        <Card key={index} className="group hover:border-blue-200 transition-all hover:shadow-md overflow-hidden border-slate-200">
                            <CardContent className="p-0">
                                <div className="flex items-stretch">
                                    <div className="w-1 bg-slate-100 group-hover:bg-blue-500 transition-colors" />
                                    <div className="p-5 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-100 bg-blue-50">
                                                    {topic.funnel}
                                                </Badge>
                                                <span className="text-xs font-medium text-slate-400">
                                                    Keyword: <span className="text-slate-600">{topic.keyword}</span>
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                {topic.titolo}
                                            </h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 italic">
                                                <TrendingUp className="w-3 h-3 text-emerald-500" /> {topic.motivo}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-full text-xs font-semibold hover:bg-slate-50"
                                                onClick={() => onGenerateArticle(topic)}
                                            >
                                                Usa nel Generatore <ChevronRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Calendar className="w-8 h-8 text-slate-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Nessun piano attivo</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                Clicca "Genera Piano Strategico" per permettere allo <strong>Strategist Agent</strong> di analizzare i tuoi dati e proporre i migliori contenuti.
                            </p>
                        </div>
                        <Button variant="outline" onClick={generateNewPlan} disabled={generating} className="rounded-full px-8">
                            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                            Inizia Analisi
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default EditorialPlanTab;
