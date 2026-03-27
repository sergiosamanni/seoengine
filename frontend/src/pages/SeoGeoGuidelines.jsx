import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  BookOpen, Plus, Trash2, Save, Link as LinkIcon, 
  RefreshCcw, CheckCircle2, AlertCircle, Loader2, Sparkles, Globe
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';

export const SeoGeoGuidelines = () => {
  const { getAuthHeaders } = useAuth();
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchGuidelines();
  }, []);

  const fetchGuidelines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/settings/seo-guidelines`, { headers: getAuthHeaders() });
      setGuidelines(res.data.seo_geo_guidelines || []);
    } catch (err) {
      toast.error("Errore nel caricamento delle linee guida");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error("Inserisci titolo e contenuto");
      return;
    }
    
    try {
      const payload = editingId ? { ...formData, id: editingId } : formData;
      await axios.post(`${API}/settings/seo-guidelines`, payload, { headers: getAuthHeaders() });
      toast.success(editingId ? "Linee guida aggiornate" : "Nuove linee guida aggiunte");
      setFormData({ title: '', content: '' });
      setEditingId(null);
      fetchGuidelines();
    } catch (err) {
      toast.error("Errore durante il salvataggio");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa linea guida?")) return;
    try {
      await axios.delete(`${API}/settings/seo-guidelines/${id}`, { headers: getAuthHeaders() });
      toast.success("Linea guida eliminata");
      fetchGuidelines();
    } catch (err) {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleSync = async (id) => {
    setSyncing(id);
    try {
      const res = await axios.post(`${API}/settings/seo-guidelines/${id}/sync`, {}, { headers: getAuthHeaders() });
      if (res.data.status === 'success') {
        toast.success(`Sincronizzazione completata: ${res.data.links_found} link analizzati`);
      } else {
        toast.info(res.data.message);
      }
      fetchGuidelines();
    } catch (err) {
      toast.error("Errore durante la sincronizzazione dei link");
    } finally {
      setSyncing(false);
    }
  };

  const startEdit = (g) => {
    setEditingId(g.id);
    setFormData({ title: g.title, content: g.content });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            SEO/GEO Global Guidelines
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Definisci le regole globali che l'intera piattaforma deve seguire per la generazione di contenuti.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Form */}
        <div className="lg:col-span-5">
          <Card className="border-slate-200 shadow-xl shadow-slate-200/50 sticky top-8 transition-all hover:shadow-2xl hover:shadow-slate-200/60">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
              <CardTitle className="text-lg flex items-center gap-2">
                {editingId ? <Sparkles className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-slate-900" />}
                {editingId ? "Modifica Linea Guida" : "Nuova Linea Guida"}
              </CardTitle>
              <CardDescription>
                Inserisci regole SEO o GEO. Puoi includere URL (es. Google Docs, Blog post) da cui l'IA imparerà.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-bold text-slate-700">Titolo Regola</Label>
                <Input 
                  id="title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Es: Local SEO Core Guidelines 2026"
                  className="rounded-xl border-slate-200 h-10 shadow-sm focus:ring-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content" className="font-bold text-slate-700">Contenuto e Link</Label>
                <Textarea 
                  id="content" 
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Descrivi la regola e incolla i link ufficiali (uno per riga o nel testo)..."
                  className="rounded-xl border-slate-200 min-h-[300px] shadow-sm resize-none focus:ring-slate-900 leading-relaxed"
                />
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  <strong>Suggerimento:</strong> Incolla i link alle guide ufficiali di Google o articoli di settore. Dopo il salvataggio, usa il tasto "Sincronizza" per permettere all'IA di analizzarne il contenuto.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 border-t border-slate-100 bg-slate-50/20 py-4">
              <Button onClick={handleSave} className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-xl h-11 font-bold shadow-lg shadow-slate-200">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Salva Modifiche" : "Aggiungi al Sistema"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={() => { setEditingId(null); setFormData({title:'', content:''}); }} className="rounded-xl h-11 border-slate-200">
                  Annulla
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* List of Guidelines */}
        <div className="lg:col-span-7 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 italic text-slate-400 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
              Caricamento guidelines...
            </div>
          ) : guidelines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 border-dashed gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold">Nessuna linea guida presente</p>
              <p className="text-slate-400 text-sm">Inizia creando la tua prima regola SEO globale.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="px-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Regole Attive ({guidelines.length})</p>
              </div>
              {guidelines.map((g) => (
                <Card key={g.id} className="border-slate-100 group transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 rounded-2xl overflow-hidden">
                  <div className="p-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{g.title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleSync(g.id)} disabled={syncing === g.id} className="h-8 rounded-lg hover:bg-white text-slate-500 hover:text-blue-600 transition-colors">
                        {syncing === g.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        <span className="ml-2 text-[10px] font-black uppercase">Sincronizza</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(g)} className="h-8 w-8 rounded-lg hover:bg-white text-slate-400 hover:text-slate-900 transition-colors">
                        <Sparkles className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)} className="h-8 w-8 rounded-lg hover:bg-white text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4 italic bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {g.content}
                      </p>
                    </div>
                    
                    {g.links_data && g.links_data.length > 0 && (
                      <div className="border-t border-slate-100 bg-slate-50/30 p-4 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                          {g.links_data.map((l, i) => (
                            <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600 transition-all cursor-default flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm max-w-[200px]">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate text-[10px] font-bold">{l.title || l.url}</span>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 shrink-0 ml-4">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Sync: {g.last_synced ? new Date(g.last_synced).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
