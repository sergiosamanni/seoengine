import React from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Globe, X } from 'lucide-react';
import { Dialog, DialogContent } from '../../ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { Loader2, Check, Image as ImageIcon, Plus } from 'lucide-react';
import axios from 'axios';
import { API_URL as API } from '../../../config';
import { toast } from 'sonner';

/**
 * Full preview modal for viewing generated article content.
 */
export function FullPreviewModal({ fullPreview, setFullPreview }) {
    if (!fullPreview) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-6">
             <Card className="w-full max-w-6xl h-[92vh] bg-white rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl relative border-none">
                 <div className="p-10 bg-slate-950 text-white flex items-center justify-between">
                     <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg"><Globe className="w-7 h-7" /></div>
                         <h2 className="text-2xl font-black truncate max-w-2xl">{fullPreview.titolo}</h2>
                     </div>
                     <Button variant="ghost" onClick={() => setFullPreview(null)} className="h-14 w-14 rounded-full text-white"><X className="w-8 h-8" /></Button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-16 prose prose-slate max-w-none">
                     <div dangerouslySetInnerHTML={{ __html: fullPreview.contenuto }} />
                 </div>
             </Card>
        </div>
    );
}

/**
 * Image change modal for swapping plan topic images.
 */
export function ImageChangeModal({
    open, onOpenChange, editingTopic,
    searchingImages, imgSearchResults, allPlanTopics,
    effectiveClientId, getAuthHeaders, fetchPlan,
    handleSingleFileUpload
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
                <div className="p-5 bg-slate-950 text-white">
                    <h3 className="text-[11px] font-black uppercase tracking-tight flex items-center gap-2">
                         <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                         Cambia Immagine
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 line-clamp-1">{editingTopic?.titolo}</p>
                </div>
                <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Risultati & Caricamento</p>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => document.getElementById('modal-image-upload-input').click()}
                            className="h-7 px-3 gap-2 border-slate-100 text-slate-600 font-black text-[8px] uppercase tracking-widest rounded-lg"
                        >
                            <Plus className="w-3 h-3" /> Carica Foto
                        </Button>
                        <input 
                            id="modal-image-upload-input"
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                                await handleSingleFileUpload(e);
                                onOpenChange(false); // Close after upload + selection
                            }}
                        />
                    </div>
                </div>
                <ScrollArea className="max-h-[60vh] bg-slate-50">
                    <div className="p-4">
                        {searchingImages ? (
                            <div className="flex flex-col items-center justify-center py-16 animate-pulse">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                <p className="text-[8px] font-black uppercase text-slate-400 mt-4 tracking-widest">Searching...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {imgSearchResults.map((img, i) => (
                                    <div 
                                        key={i} 
                                        onClick={async () => {
                                            const updatedTopic = { ...editingTopic, featured_image: img.image };
                                            const updatedPlanTopics = allPlanTopics.map(t => t.titolo === editingTopic.titolo ? updatedTopic : t);
                                            await axios.post(`${API}/save-plan/${effectiveClientId}`, { topics: updatedPlanTopics }, { headers: getAuthHeaders() });
                                            fetchPlan();
                                            onOpenChange(false);
                                            toast.success("Immagine aggiornata");
                                        }}
                                        className="group relative aspect-square rounded-2xl overflow-hidden bg-white border border-slate-100 cursor-pointer hover:ring-2 hover:ring-slate-900 transition-all shadow-sm"
                                    >
                                        <img src={img.thumbnail || img.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Check className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
