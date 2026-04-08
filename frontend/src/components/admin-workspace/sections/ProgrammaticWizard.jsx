import * as React from 'react';
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { ScrollArea } from '../../ui/scroll-area';
import { 
    Library, ArrowRight, ArrowLeft, Loader2, Sparkles, 
    RefreshCcw, Eye, Play, CheckCircle2, ListPlus, 
    Check, X, Layers, Globe, Zap, Settings2, Database,
    LayoutTemplate
} from 'lucide-react';
import { KeywordsTab } from '../../../pages/configuration/KeywordsTab';

export function ProgrammaticWizard({
    state, generation, effectiveClientId, getAuthHeaders
}) {
    const {
        wizardStep, setWizardStep,
        keywords, setKeywords,
        isArchitecting, programmaticTemplate, setProgrammaticTemplate,
        combinations, selectedCombinations, toggleCombo, selectAll,
        previewContent, generating, progressPercent, results,
        templateStyle, setTemplateStyle, internalLinkingEnabled, setInternalLinkingEnabled,
        useSpintax, setUseSpintax
    } = state;

    const {
        handleArchitectStep, handleGeneratePreview, handleProgrammaticGenerate,
        handleResetProgrammatic, refreshCombinations
    } = generation;

    // Step 1: Configuration of lists
    if (wizardStep === 1) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Step 1: Definizione Ambito bulk</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Configura i servizi e le città per la generazione massiva</p>
                    </div>
                    <Button onClick={() => setWizardStep(0)} variant="ghost" className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase">Annulla</Button>
                </div>

                <KeywordsTab 
                    keywords={keywords} 
                    setKeywords={setKeywords} 
                    effectiveClientId={effectiveClientId} 
                    getAuthHeaders={getAuthHeaders} 
                />

                <div className="flex justify-end pt-4">
                    <Button 
                        onClick={handleArchitectStep}
                        disabled={isArchitecting || !keywords.servizi.length || !keywords.citta_e_zone.length}
                        className="h-12 px-10 bg-slate-950 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex gap-2"
                    >
                        {isArchitecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                        Configura Architettura IA <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Step 2: AI Master Template (Spintax)
    if (wizardStep === 2) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Step 2: Architettura Master Template</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Definisci il template semantico ottimizzato per ogni pagina</p>
                    </div>
                    <Button variant="ghost" onClick={() => setWizardStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Indietro
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b py-4 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold uppercase">Master Spintax Template</CardTitle>
                                    <CardDescription className="text-xs">L'AI ha generato una struttura variabile per massimizzare l'unicità.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleArchitectStep} className="h-8 gap-2 text-[10px] font-black uppercase">
                                    <RefreshCcw className="w-3 h-3" /> Rigenera
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Textarea 
                                    className="min-h-[500px] border-none focus:ring-0 p-8 font-mono text-xs leading-relaxed bg-white"
                                    value={programmaticTemplate}
                                    onChange={(e) => setProgrammaticTemplate(e.target.value)}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                         <Card className="border-slate-200 rounded-2xl shadow-sm bg-slate-900 text-white overflow-hidden">
                             <CardHeader className="border-white/10">
                                 <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                     <Eye className="w-3.5 h-3.5 text-emerald-400" /> Anteprima Rapida
                                 </CardTitle>
                             </CardHeader>
                             <CardContent className="p-6">
                                 <Button 
                                    onClick={handleGeneratePreview}
                                    className="w-full bg-white/10 hover:bg-white/20 text-white border-white/5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 transition-all"
                                 >
                                     Genera Anteprima Casuale
                                 </Button>
                                 <div className="bg-white/5 rounded-xl p-4 min-h-[400px] max-h-[400px] overflow-auto border border-white/5 text-[11px] font-medium leading-relaxed custom-scrollbar-white">
                                     {previewContent ? (
                                         <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                                     ) : (
                                         <div className="h-full flex flex-col items-center justify-center text-white/30 text-center px-6">
                                             <LayoutTemplate className="w-10 h-10 mb-3 opacity-20" />
                                             <p className="font-bold">Nessun rendering.<br/>Clicca su "Genera Anteprima" per testare lo spintax.</p>
                                         </div>
                                     )}
                                 </div>
                             </CardContent>
                         </Card>

                         <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
                             <h4 className="text-[10px] font-black uppercase text-emerald-900 tracking-widest mb-3">Settings Avanzati</h4>
                             <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                     <Label className="text-[10px] font-bold text-emerald-800">Usa Spintax</Label>
                                     <input type="checkbox" checked={useSpintax} onChange={(e) => setUseSpintax(e.target.checked)} className="rounded border-emerald-200" />
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <Label className="text-[10px] font-bold text-emerald-800">Linking Interno</Label>
                                     <input type="checkbox" checked={internalLinkingEnabled} onChange={(e) => setInternalLinkingEnabled(e.target.checked)} className="rounded border-emerald-200" />
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <Button 
                        onClick={() => { refreshCombinations(); setWizardStep(3); }} 
                        className="h-12 px-10 bg-slate-950 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex gap-2"
                    >
                        Selezione Combinazioni <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Step 3: Combinations & Launch
    if (wizardStep === 3) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Step 3: Selezione ed Esecuzione</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lancia il processo bulk per le combinazioni desiderate</p>
                    </div>
                    <Button variant="ghost" onClick={() => setWizardStep(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Indietro
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden">
                             <CardHeader className="bg-slate-50 border-b py-4 flex flex-row items-center justify-between">
                                 <div>
                                     <CardTitle className="text-sm font-bold uppercase">Combinazioni generate</CardTitle>
                                     <CardDescription className="text-xs">Seleziona i target finali per la pubblicazione.</CardDescription>
                                 </div>
                                 <div className="flex gap-2">
                                     <Button variant="outline" size="sm" onClick={refreshCombinations} className="h-8 gap-2 text-[10px] font-black uppercase">
                                         <RefreshCcw className="w-3 h-3" /> Refresh
                                     </Button>
                                     <Button variant="outline" size="sm" onClick={selectAll} className="h-8 gap-2 text-[10px] font-black uppercase">
                                         {selectedCombinations.length === combinations.length ? <X className="w-3 h-3" /> : <ListPlus className="w-3 h-3" />}
                                         {selectedCombinations.length === combinations.length ? 'Deseleziona' : 'Tutti'}
                                     </Button>
                                 </div>
                             </CardHeader>
                             <CardContent className="p-0">
                                 <ScrollArea className="h-[500px]">
                                     <div className="grid grid-cols-1 sm:grid-cols-2 p-4 gap-2">
                                         {combinations.map((combo, i) => {
                                             const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                                             const isSelected = !!selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                                             return (
                                                 <div 
                                                    key={i} 
                                                    onClick={() => toggleCombo(combo)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                        isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                                    }`}
                                                 >
                                                     <div className="flex flex-col gap-0.5">
                                                         <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider leading-none">{combo.servizio}</span>
                                                         <span className="text-xs font-bold text-slate-900 ">{combo.citta}</span>
                                                     </div>
                                                     <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                         {isSelected ? <Check className="w-3 h-3" /> : null}
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                         {combinations.length === 0 && (
                                             <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
                                                 <Layers className="w-12 h-12 mb-3 opacity-20" />
                                                 <p className="text-xs font-black uppercase">Nessuna combinazione trovata</p>
                                             </div>
                                         )}
                                     </div>
                                 </ScrollArea>
                             </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900 rounded-2xl p-8 text-white space-y-6 shadow-xl">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                <Zap className="w-7 h-7 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Esecuzione Bulk</h3>
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest leading-loose">
                                    {selectedCombinations.length} Pagine pronte per la coda <br/>
                                    Sistema: Programmatic v2.1
                                </p>
                            </div>
                            
                            <div className="space-y-4 pt-4">
                                <Button 
                                    onClick={handleProgrammaticGenerate}
                                    disabled={generating || selectedCombinations.length === 0}
                                    className="w-full h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 flex gap-3 transition-all"
                                >
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                    Lancia Motore SEO
                                </Button>
                                
                                <Button 
                                    onClick={handleResetProgrammatic}
                                    variant="ghost" 
                                    className="w-full text-white/30 hover:text-white/60 text-[9px] font-black uppercase tracking-widest gap-2"
                                >
                                    <RefreshCcw className="w-3 h-3" /> Reset Sessione
                                </Button>
                            </div>

                            {generating && (
                                <div className="space-y-3 pt-6 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-white/60">Avanzamento Job</span>
                                        <span className="text-indigo-400">{progressPercent}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 transition-all duration-500" 
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] text-white/40 font-medium italic text-center">Monitora i progressi nel centro task in tempo reale.</p>
                                </div>
                            )}
                        </div>

                        {results.length > 0 && (
                            <Card className="border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden">
                                <CardHeader className="py-3 px-4 border-b bg-slate-50">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest">Risultati Correnti</CardTitle>
                                </CardHeader>
                                <ScrollArea className="h-[200px]">
                                    <div className="p-2 space-y-1">
                                        {results.map((res, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{res.title}</span>
                                                {res.publish_status === 'success' ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
