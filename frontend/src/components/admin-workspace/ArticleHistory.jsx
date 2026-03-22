import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
    History, ChevronDown, Loader2, FileText, ExternalLink, Trash2, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ArticleHistory = ({ effectiveClientId, getAuthHeaders, clientConfig }) => {
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
        <div className="mt-6">
            <Button variant="outline" onClick={fetchArticles} className="w-full justify-between" data-testid="toggle-articles-btn">
                <span className="flex items-center gap-2"><History className="w-4 h-4" />Storico Articoli ({articles.length || '...'})</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
            {open && (
                <Card className="mt-3 border-slate-200" data-testid="articles-history">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                        ) : articles.length === 0 ? (
                            <div className="text-center py-8 text-slate-400"><FileText className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">Nessun articolo generato</p></div>
                        ) : (
                            <ScrollArea className="max-h-[500px]">
                                <div className="divide-y divide-slate-100">
                                    {articles.map((a) => (
                                        <div key={a.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleArticle(a.id)}>
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <p className="font-medium text-sm text-slate-900 truncate">{a.titolo}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs">{a.keyword_principale || a.titolo?.split(' ').slice(0, 3).join(' ')}</Badge>
                                                        <Badge variant={a.stato === 'published' ? 'default' : 'secondary'}
                                                            className={`text-xs ${a.stato === 'published' ? 'bg-emerald-100 text-emerald-700' : a.stato === 'generated' ? 'bg-blue-100 text-blue-700' : ''}`}>
                                                            {a.stato === 'published' ? 'Pubblicato' : a.stato === 'generated' ? 'Generato' : a.stato}
                                                        </Badge>
                                                        <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString('it-IT')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {a.wordpress_link && (
                                                        <a href={a.wordpress_link} target="_blank" rel="noreferrer" className="p-1 text-blue-600 hover:bg-blue-50 rounded" onClick={(e) => e.stopPropagation()}>
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    <button className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" onClick={(e) => { e.stopPropagation(); deleteArticle(a.id); }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <Eye className="w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                            {expandedId === a.id && expandedContent && (
                                                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                                                    {expandedContent.meta_description && <p className="text-slate-600 italic mb-2">{expandedContent.meta_description}</p>}
                                                    <div className="prose prose-sm max-w-none text-slate-700 max-h-[300px] overflow-y-auto"
                                                        dangerouslySetInnerHTML={{ __html: expandedContent.contenuto_html || '<p>Nessun contenuto</p>' }} />
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
