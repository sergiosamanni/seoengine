import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  Search, 
  MoreHorizontal, 
  Eye,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ConfirmationModal } from '../components/ui/confirmation-modal';



export const ArticlesPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewArticle, setPreviewArticle] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('all');
  
  // Delete Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('stato', statusFilter);
      if (isAdmin && clientFilter !== 'all') params.append('client_id', clientFilter);

      const response = await axios.get(`${API}/articles?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      setArticles(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento degli articoli');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!isAdmin) return;
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: getAuthHeaders()
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchClients();
  }, [statusFilter, clientFilter]);

  // Load full article data for preview
  const loadArticlePreview = async (articleId) => {
    setPreviewLoading(true);
    setPreviewArticle(null);
    try {
      const response = await axios.get(`${API}/articles/${articleId}/full`, {
        headers: getAuthHeaders()
      });
      setPreviewArticle(response.data);
    } catch (error) {
      // Fallback to basic article data
      const article = articles.find(a => a.id === articleId);
      if (article) setPreviewArticle(article);
      toast.error('Errore nel caricamento dei dettagli completi');
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleArticle = (articleId) => {
    if (selectedArticles.includes(articleId)) {
      setSelectedArticles(selectedArticles.filter(id => id !== articleId));
    } else {
      setSelectedArticles([...selectedArticles, articleId]);
    }
  };

  const selectAllGenerated = () => {
    const generatedIds = filteredArticles
      .filter(a => a.stato === 'generated')
      .map(a => a.id);
    
    if (selectedArticles.length === generatedIds.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(generatedIds);
    }
  };

  const handlePublish = async () => {
    if (selectedArticles.length === 0) {
      toast.error('Seleziona almeno un articolo');
      return;
    }

    setPublishing(true);

    try {
      const response = await axios.post(`${API}/articles/publish`, {
        article_ids: selectedArticles
      }, {
        headers: getAuthHeaders()
      });

      const { published, failed } = response.data;
      
      if (published.length > 0) {
        toast.success(`Pubblicati ${published.length} articoli`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} articoli non pubblicati`);
      }

      setSelectedArticles([]);
      fetchArticles();
    } catch (error) {
      toast.error('Errore durante la pubblicazione');
    } finally {
      setPublishing(false);
    }
  };

  const confirmDelete = (articleId) => {
    setArticleToDelete(articleId);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async (articleId) => {
    try {
      await axios.delete(`${API}/articles/${articleId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Articolo eliminato');
      fetchArticles();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeleteConfirmOpen(false);
      setArticleToDelete(null);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.titolo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (stato) => {
    switch (stato) {
      case 'generated':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Generato</Badge>;
      case 'published':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Pubblicato</Badge>;
      case 'publish_failed':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Pubblicazione Fallita</Badge>;
      case 'failed':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Errore</Badge>;
      default:
        return <Badge variant="secondary">{stato}</Badge>;
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: it });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Archivio Articoli</h1>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">Gestione e Revisione Contenuti</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="bg-white border border-[#f1f3f6] rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 tracking-tight">{filteredArticles.length}</span>
            </div>
            {selectedArticles.length > 0 && (
                <Button
                    onClick={handlePublish}
                    className="bg-slate-900 h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200"
                    disabled={publishing}
                    data-testid="publish-selected-btn"
                >
                    {publishing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Upload className="w-3.5 h-3.5 mr-2" />
                            Pubblica ({selectedArticles.length})
                        </>
                    )}
                </Button>
            )}
        </div>
      </div>

      {/* Filters - Minimal & Compact */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative group text-slate-400 focus-within:text-slate-900">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors" />
          <Input
            placeholder="Cerca per titolo..."
            className="pl-9 h-10 border-[#f1f3f6] bg-white rounded-xl text-xs font-medium focus:ring-0 focus:border-slate-300 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="article-search-input"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 border-[#f1f3f6] bg-white rounded-xl text-xs font-bold shadow-sm" data-testid="status-filter-select">
            <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-slate-300" />
                <SelectValue placeholder="Stato" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#f1f3f6]">
            <SelectItem value="all" className="text-xs font-medium">Tutti gli stati</SelectItem>
            <SelectItem value="generated" className="text-xs font-medium">Generati</SelectItem>
            <SelectItem value="published" className="text-xs font-medium">Pubblicati</SelectItem>
            <SelectItem value="failed" className="text-xs font-medium">Errori</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin ? (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-10 border-[#f1f3f6] bg-white rounded-xl text-xs font-bold shadow-sm" data-testid="client-filter-select">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] rounded-xl border-[#f1f3f6]">
              <SelectItem value="all" className="text-xs font-medium">Tutti i clienti</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
           <Button
            variant="ghost"
            onClick={selectAllGenerated}
            className="h-10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl px-4 border border-[#f1f3f6] bg-white shadow-sm"
            data-testid="select-all-generated-btn"
          >
            Seleziona Generati
          </Button>
        )}
      </div>

      {/* Articles List */}
      <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white" data-testid="articles-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-24">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Nessun articolo trovato</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="bg-slate-50/50 border-b border-[#f1f3f6] flex items-center text-[9px] uppercase font-bold tracking-widest text-slate-400 px-6 py-2.5">
                  <div className="w-10"></div>
                  <span className="flex-1">Titolo Articolo</span>
                  {isAdmin && <span className="w-32 px-2">Cliente</span>}
                  <span className="w-24 px-2">Stato</span>
                  <span className="w-32 px-2">Data Generazione</span>
                  <span className="w-16 text-right">Azioni</span>
              </div>
              <div className="divide-y divide-[#f1f3f6]">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="flex items-center group px-6 py-3.5 hover:bg-slate-50/30 transition-colors" data-testid={`article-row-${article.id}`}>
                    <div className="w-10">
                      {article.stato === 'generated' && (
                        <Checkbox
                          checked={selectedArticles.includes(article.id)}
                          onCheckedChange={() => toggleArticle(article.id)}
                          className="rounded-md border-[#f1f3f6] w-4 h-4 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-bold text-slate-900 tracking-tight group-hover:text-blue-500 transition-colors truncate">{article.titolo}</p>
                        {article.wordpress_post_id && (
                          <div className="flex items-center gap-1.5 mt-0.5 opacity-40">
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">ID: {article.wordpress_post_id}</span>
                          </div>
                        )}
                    </div>
                    {isAdmin && (
                      <div className="w-32 px-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate block">
                          {clients.find(c => c.id === article.client_id)?.nome || article.client_id}
                        </span>
                      </div>
                    )}
                    <div className="w-24 px-2">
                      {article.stato === 'generated' ? (
                          <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Generato</span>
                          </div>
                      ) : article.stato === 'published' ? (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Errore</span>
                        </div>
                      )}
                    </div>
                    <div className="w-32 px-2 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {formatDate(article.created_at)}
                        </span>
                    </div>
                    <div className="w-16 shrink-0 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-[#f1f3f6]" data-testid={`article-actions-${article.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border border-[#f1f3f6] shadow-xl p-1.5 min-w-[180px]">
                          <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => loadArticlePreview(article.id)}>
                            <Eye className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            Anteprima
                          </DropdownMenuItem>
                          {article.wordpress_post_id && (
                            <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" asChild>
                              <a 
                                href={`${clients.find(c => c.id === article.client_id)?.sito_web || '#'}/wp-admin/post.php?post=${article.wordpress_post_id}&action=edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                Apri in WordPress
                              </a>
                            </DropdownMenuItem>
                          )}
                          <div className="h-px bg-[#f1f3f6] my-1.5 mx-1" />
                          <DropdownMenuItem 
                            onClick={() => confirmDelete(article.id)}
                            className="rounded-lg text-xs font-semibold p-2 text-red-500 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article Preview Modal - Premium Style */}
      {(previewArticle || previewLoading) && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => { setPreviewArticle(null); setPreviewLoading(false); }}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border-[#f1f3f6] shadow-2xl bg-white flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid="article-preview-modal"
          >
            {previewLoading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
              </div>
            ) : previewArticle && (
              <>
            <CardHeader className="p-8 bg-slate-50 border-b border-[#f1f3f6] flex flex-row items-start justify-between">
              <div className="flex-1 min-w-0 pr-8">
                <CardTitle className="text-xl font-bold text-slate-900 tracking-tight leading-snug">{previewArticle.titolo}</CardTitle>
                <div className="flex items-center gap-3 mt-3">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${
                        previewArticle.stato === 'published' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                        <div className={`w-1 h-1 rounded-full ${previewArticle.stato === 'published' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{previewArticle.stato}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{formatDate(previewArticle.created_at)}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-900 rounded-full h-8 w-8" onClick={() => { setPreviewArticle(null); setPreviewLoading(false); }} data-testid="close-preview-btn">
                <Trash2 className="w-4 h-4 rotate-45" />
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1">
                <CardContent className="p-8 space-y-8">
                {/* SEO Metadata Section - Compact Cards */}
                {previewArticle.seo_metadata && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="seo-metadata-section">
                        <div className="bg-slate-50 border border-[#f1f3f6] p-5 rounded-2xl flex flex-col gap-3">
                            <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 inline-flex items-center gap-2">
                                <Search className="w-3.5 h-3.5" />
                                Metadati SEO
                            </h4>
                            {previewArticle.seo_metadata.meta_description && (
                                <div data-testid="seo-meta-description">
                                    <p className="text-[11px] font-semibold text-slate-900 leading-relaxed italic border-l-2 border-indigo-200 pl-3">
                                        "{previewArticle.seo_metadata.meta_description}"
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {previewArticle.seo_metadata.focus_keyword && (
                                    <span className="text-[9px] font-bold text-indigo-500 bg-white border border-indigo-100 px-2 py-1 rounded-lg uppercase tracking-widest">{previewArticle.seo_metadata.focus_keyword}</span>
                                )}
                                {previewArticle.seo_metadata.slug && (
                                    <span className="text-[9px] font-bold text-slate-400 bg-white border border-[#f1f3f6] px-2 py-1 rounded-lg uppercase tracking-widest">/{previewArticle.seo_metadata.slug}</span>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-[#f1f3f6] p-5 rounded-2xl flex flex-col gap-4">
                            {previewArticle.seo_metadata.tags && previewArticle.seo_metadata.tags.length > 0 && (
                                <div data-testid="seo-tags">
                                    <p className="text-[9px] uppercase font-bold tracking-widest text-slate-300 mb-2">TAGS</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {previewArticle.seo_metadata.tags.map((tag, i) => (
                                            <span key={i} className="text-[9px] font-bold bg-white text-slate-500 border border-[#f1f3f6] px-2 py-0.5 rounded-md">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {previewArticle.seo_metadata.categories && previewArticle.seo_metadata.categories.length > 0 && (
                                <div data-testid="seo-categories">
                                    <p className="text-[9px] uppercase font-bold tracking-widest text-slate-300 mb-2">CATEGORIES</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {previewArticle.seo_metadata.categories.map((cat, i) => (
                                            <span key={i} className="text-[9px] font-bold bg-white text-emerald-500 border border-emerald-100 px-2 py-0.5 rounded-md">{cat}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* WordPress Link */}
                {previewArticle.wordpress_link && (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between" data-testid="wordpress-link-section">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                                <ExternalLink className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Articolo Online</span>
                        </div>
                        <a href={previewArticle.wordpress_link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-600 bg-white px-4 py-2 rounded-lg border border-emerald-100 shadow-sm hover:bg-emerald-50 transition-colors uppercase tracking-widest">
                            Visualizza Sito
                        </a>
                    </div>
                )}
                
                {/* Content Preview */}
                <div 
                    className="article-preview prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-600 prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewArticle.contenuto }}
                    data-testid="article-content-preview"
                />
                </CardContent>
            </ScrollArea>
              </>
            )}
          </Card>
        </div>
      )}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => handleDelete(articleToDelete)}
        title="Elimina Articolo"
        description="Sei sicuro di voler eliminare definitivamente questo articolo? L'azione non può essere annullata."
      />
    </div>
  );
};
