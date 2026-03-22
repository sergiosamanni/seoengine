import React, { useState } from "react";
import {
    Target,
    Plus,
    X,
    Settings2,
    Calendar,
    ShieldCheck,
    AlertTriangle,
    RefreshCcw,
    Zap,
    Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const TargetsAutomationTab = ({ targetKeywords, setTargetKeywords, automation, setAutomation }) => {
    const [newKeyword, setNewKeyword] = useState("");

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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {/* Target Keywords Management */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Keyword Target SEO
                    </CardTitle>
                    <CardDescription>
                        Inserisci le keyword principali per cui il cliente vuole posizionarsi. Lo Strategist Agent darà loro la priorità assoluta nel piano editoriale.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Esempio: idraulico roma pronto intervento"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                            className="bg-slate-50 border-slate-200 focus:ring-blue-500"
                        />
                        <Button onClick={addKeyword} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" /> Aggiungi
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        {targetKeywords.length > 0 ? (
                            targetKeywords.map((kw, idx) => (
                                <Badge key={idx} variant="secondary" className="px-3 py-1 bg-white border border-slate-200 text-slate-700 flex items-center gap-1 group">
                                    {kw}
                                    <X
                                        className="w-3 h-3 cursor-pointer text-slate-300 hover:text-red-500 transition-colors"
                                        onClick={() => removeKeyword(kw)}
                                    />
                                </Badge>
                            ))
                        ) : (
                            <div className="w-full py-10 text-center flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 rounded-xl">
                                <Target className="w-8 h-8 text-slate-200" />
                                <p className="text-sm text-slate-400 font-medium font-['Manrope']">Nessuna keyword inserita</p>
                            </div>
                        )}
                    </div>

                    <Alert className="bg-blue-50/50 border-blue-100 text-blue-800">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-sm font-bold">Consiglio SEO</AlertTitle>
                        <AlertDescription className="text-xs">
                            Usa keyword specifiche (long-tail) per ottenere conversioni migliori e posizionamenti più rapidi.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Generation Automation */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-600" />
                        Flusso di Automazione
                    </CardTitle>
                    <CardDescription>
                        Configura la generazione automatica dei contenuti. Il sistema sceglierà le keyword target e genererà articoli senza intervento manuale.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
                        <div className="space-y-0.5">
                            <Label className="text-base font-bold text-slate-900">Generazione Automatica</Label>
                            <p className="text-xs text-slate-500">Attiva/Disattiva il pilota automatico per questo cliente.</p>
                        </div>
                        <Switch
                            checked={automation.enabled}
                            onCheckedChange={(val) => setAutomation({ ...automation, enabled: val })}
                            className="data-[state=checked]:bg-indigo-600"
                        />
                    </div>

                    <div className={`space-y-4 transition-all duration-300 ${automation.enabled ? 'opacity-100 translate-y-0' : 'opacity-40 pointer-events-none -translate-y-2'}`}>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Calendar className="w-4 h-4 text-slate-400" /> Frequenza di Pubblicazione
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Articoli a settimana</p>
                                    <Select
                                        value={automation.articles_per_week.toString()}
                                        onValueChange={(val) => setAutomation({ ...automation, articles_per_week: parseInt(val) })}
                                    >
                                        <SelectTrigger className="bg-white border-slate-200">
                                            <SelectValue placeholder="Seleziona..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4, 5, 7, 10].map(n => (
                                                <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'articolo' : 'articoli'}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 self-end">
                                    <Zap className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-600 uppercase">Potenziale</p>
                                        <p className="text-xs font-medium text-indigo-900">~{automation.articles_per_week * 4} articoli / mese</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Alert className="bg-amber-50/50 border-amber-100 text-amber-800">
                            <ShieldCheck className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-sm font-bold">Verifica Integrazioni</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed">
                                Assicurati che **WordPress** e **API Key** siano configurati correttamente prima di attivare l'automazione.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {!automation.enabled && (
                        <div className="flex items-center gap-2 text-amber-600 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <p className="text-xs font-semibold">Automazione disabilitata. Questo cliente richiede interventi manuali.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TargetsAutomationTab;
