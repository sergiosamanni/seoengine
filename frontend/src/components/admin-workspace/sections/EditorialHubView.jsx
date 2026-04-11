import React from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
    Zap, Loader2, Search, Calendar, Check, Sparkles, 
    Trash2, Edit2, Play, BrainCircuit
} from 'lucide-react';
import { EditorialCalendar } from '../EditorialCalendar';

/**
 * Editorial Hub View - renders the plan list/calendar with all controls.
 */
export function EditorialHubView({
    client, allPlanTopics, selectedPlanTopics, setSelectedPlanTopics,
    planView, setPlanView, planGenerating, generating,
    generateNewPlan, handleBatchPlanGenerate, handleDeleteSelectedTopics,
    handleUseTopicInGenerator, isTopicSelected, toggleTopicSelection,
    setEditingTopic, setImgSearchQuery, handleImageSearch, setShowImgChangeModal,
    recentArticles,
}) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-600">
            {/* Header Bar */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-md"><Calendar className="w-5 h-5 text-white" /></div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Editorial Hub</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{client?.nome || 'Studio'} Strategy</p>
                            {selectedPlanTopics.length > 0 && (
                                <Badge className="bg-indigo-600 border-none text-[8px] font-black">{selectedPlanTopics.length} SELEZIONATI</Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {selectedPlanTopics.length > 0 ? (
                        <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                             <Button onClick={handleBatchPlanGenerate} disabled={generating} className="h-10 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase px-6 tracking-widest shadow-lg shadow-indigo-100 flex gap-2">
                                 {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                 GENERA SELEZIONATI
                             </Button>
                             <Button onClick={handleDeleteSelectedTopics} variant="outline" className="h-10 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-black text-[9px] uppercase px-4 flex gap-2">
                                 <Trash2 className="w-3 h-3" />
                             </Button>
                             <Button onClick={() => setSelectedPlanTopics([])} variant="ghost" className="h-10 text-slate-400 hover:text-slate-900 rounded-xl font-black text-[9px] uppercase">Annulla</Button>
                        </div>
                    ) : (
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <Button variant="ghost" size="sm" onClick={() => setPlanView('list')} className={`h-8 px-4 rounded-lg text-[9px] uppercase font-black ${planView === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>List</Button>
                            <Button variant="ghost" size="sm" onClick={() => setPlanView('calendar')} className={`h-8 px-4 rounded-lg text-[9px] uppercase font-black ${planView === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Calendar</Button>
                        </div>
                    )}
                    <Button onClick={generateNewPlan} disabled={planGenerating} className="h-10 bg-slate-950 text-white rounded-xl font-black text-[9px] px-6 uppercase tracking-widest">
                        {planGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh Hub'}
                    </Button>
                </div>
            </div>

            {/* Calendar View */}
            {allPlanTopics.length > 0 && planView === 'calendar' && (
                <div className="bg-white rounded-[3.5rem] border border-slate-200 p-10 shadow-2xl">
                    <EditorialCalendar topics={allPlanTopics} onArticleClick={handleUseTopicInGenerator} />
                </div>
            )}

            {/* List View */}
            {allPlanTopics.length > 0 && planView === 'list' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-6 py-2">
                         <div className="flex items-center gap-2">
                             <button 
                                onClick={() => {
                                    if (selectedPlanTopics.length === allPlanTopics.length) setSelectedPlanTopics([]);
                                    else setSelectedPlanTopics(allPlanTopics);
                                }}
                                className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center hover:border-slate-900 transition-colors"
                             >
                                 {selectedPlanTopics.length === allPlanTopics.length && <div className="w-2.5 h-2.5 bg-slate-900 rounded-[2px]" />}
                             </button>
                             <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">SELEZIONA TUTTI ({allPlanTopics.length})</span>
                         </div>
                         <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">STATUS / AZIONE</div>
                    </div>

                    {allPlanTopics.map((item, idx) => {
                        const isSelected = isTopicSelected(item);
                        return (
                            <div key={idx} className={`bg-white p-4 rounded-2xl border transition-all relative overflow-hidden group ${isSelected ? 'border-indigo-600 ring-1 ring-indigo-50 shadow-md' : 'border-slate-100 hover:border-slate-300 shadow-sm'}`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <button 
                                            onClick={() => toggleTopicSelection(item)}
                                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 hover:border-slate-400'}`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </button>

                                        <div 
                                            className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 group/img cursor-pointer"
                                            onClick={() => {
                                                setEditingTopic(item);
                                                const query = item.keyword || item.titolo;
                                                setImgSearchQuery(query);
                                                handleImageSearch(12, query);
                                                setShowImgChangeModal(true);
                                            }}
                                        >
                                            <img src={item.featured_image || item.stock_image_url || item.stock_image_thumb || `https://loremflickr.com/150/150/${encodeURIComponent(item.keyword || item.titolo)}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1.5 focus-within:z-10">
                                                 <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-tight truncate leading-none">{item.titolo}</h4>
                                                 <Badge variant="outline" className={`text-[7px] font-black uppercase px-2 h-3.5 border-none shadow-none ${item.isQueueItem ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                                                    {item.isQueueItem ? 'SUGGESTED' : 'PLAN'}
                                                 </Badge>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{item.funnel || 'Awareness'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Search className="w-2.5 h-2.5 text-slate-300" />
                                                    <span className="text-[9px] text-slate-500 font-black tracking-tight">{item.keyword || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="hidden sm:flex flex-col items-end px-4 border-r border-slate-100">
                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">ESTIMATED</p>
                                            <p className="font-bold text-slate-600 text-[10px] tabular-nums">~1,500 words</p>
                                        </div>
                                        <Button 
                                            onClick={(e) => { e.stopPropagation(); handleUseTopicInGenerator(item); }}
                                            variant="outline"
                                            className="h-10 w-10 p-0 border-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPlanTopics([item]);
                                                setTimeout(handleBatchPlanGenerate, 100);
                                            }}
                                            disabled={generating}
                                            className="h-10 w-10 p-0 bg-slate-950 hover:bg-slate-900 text-white rounded-xl transition-all shadow-lg group/play"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
