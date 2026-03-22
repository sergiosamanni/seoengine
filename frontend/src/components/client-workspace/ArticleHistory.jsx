import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  Loader2, FileText, History, ChevronDown, Trash2, ExternalLink, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const ArticleHistory = ({ effectiveClientId, getAuthHeaders }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedContent, setExpandedContent] = useState(null);

  const fetchArticles = async () => {
    if (articles.length > 0 && !open) { setOpen(true); return; }
    if (open) { setOpen(false); return; }
    
    setLoading(true);
    setOpen(true);
    try {
      const res = await axios.get(`${API}/articles?client_id=${effectiveClientId}`, { headers: getAuthHeaders() });
      setArticles(res.data || []);
    } catch (e) { toast.error('Errore caricamento articoli'); }
    finally { setLoading(false); }
  };

  const toggleArticle = async (id) => {
    if (expandedId === id) { setExpandedId(null); setExpandedContent(null); return; }
    setExpandedId(id);
    try {
      const res = await axios.get(`${API}/articles/${id}/full`, { headers: getAuthHeaders() });
      setExpandedContent(res.data);
    } catch (e) { setExpandedContent(null); }
  };

  const deleteArticle = async (id) => {
    if (!window.confirm('Eliminare questo articolo?')) return;
    try {
      await axios.delete(`${API}/articles/${id}`, { headers: getAuthHeaders() });
      setArticles(articles.filter(a => a.id !== id));
      toast.success('Articolo eliminato');
    } catch (e) { toast.error('Errore eliminazione'); }
  };

  return (
    <div className="mt-12 pt-12 border-t border-[#f1f3f6] animate-fade-in">
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-[#f1f3f6]">
                <History className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Archivio Contenuti</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchArticles} className="text-[9px] uppercase font-bold tracking-[0.15em] text-slate-400 hover:text-slate-900 h-8 px-4 rounded-xl border border-transparent hover:border-[#f1f3f6] bg-transparent hover:bg-white transition-all">
            {open ? 'Nascondi' : `Esplora Historico (${articles.length || '...'})`}
            <ChevronDown className={`w-3 h-3 ml-2 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      
      {open && (
        <Card className="border-[#f1f3f6] shadow-xl shadow-slate-100/30 rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-200" /></div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20 text-slate-300">
                <FileText className="w-8 h-8 mx-auto mb-4 opacity-10" />
                <p className="text-[10px] uppercase font-bold tracking-[0.2em]">Nessuna traccia di contenuti generati</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="divide-y divide-[#f1f3f6] px-2">
                  {articles.map((a) => (
                    <div key={a.id} className="py-5 px-4 first:pt-6 last:pb-6 hover:bg-white transition-all duration-300 group rounded-2xl my-1 mx-1 first:mt-2 last:mb-2 border border-transparent hover:border-[#f1f3f6] hover:shadow-sm">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleArticle(a.id)}>
                        <div className="flex-1 min-w-0 mr-6">
                          <p className="font-bold text-[13px] text-slate-900 mb-2 tracking-tight group-hover:text-slate-900 transition-colors">{a.titolo}</p>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-slate-50 border-[#f1f3f6] text-slate-500 px-2 py-0.5 rounded-lg">
                                {a.keyword_principale || 'SEO'}
                            </Badge>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${a.stato === 'published' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                                <span className="text-[9px] uppercase font-bold tracking-[0.1em] text-slate-400">
                                    {a.stato === 'published' ? 'Online' : 'Draft'}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-slate-100 mx-1" />
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300">{new Date(a.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            {a.wordpress_link && (
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                <a href={a.wordpress_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteArticle(a.id); }} className="h-8 w-8 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${expandedId === a.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      {expandedId === a.id && expandedContent && (
                        <div className="mt-6 p-8 bg-slate-50/50 rounded-[1.5rem] border border-[#f1f3f6] text-xs shadow-inner animate-in slide-in-from-top-2 duration-500">
                          {expandedContent.meta_description && (
                            <div className="mb-6 pb-6 border-b border-[#f1f3f6]">
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Meta Description</h4>
                                <p className="text-slate-600 leading-relaxed font-medium">{expandedContent.meta_description}</p>
                            </div>
                          )}
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-4">Estratto Contenuto</h4>
                          <div className="prose prose-slate prose-sm max-w-none text-slate-600 max-h-[300px] overflow-y-auto scrollbar-hide"
                            dangerouslySetInnerHTML={{ __html: expandedContent.contenuto_html?.slice(0, 2000) || '<p>Nessun contenuto disponibile</p>' }} />
                          {expandedContent.contenuto_html?.length > 2000 && (
                            <div className="mt-6 pt-6 border-t border-[#f1f3f6] text-center">
                                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300">Testo troncato per l'anteprima rapida</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArticleHistory;
