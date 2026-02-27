import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ArticlesPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewArticle, setPreviewArticle] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('all');

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

  const handleDelete = async (articleId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo articolo?')) return;

    try {
      await axios.delete(`${API}/articles/${articleId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Articolo eliminato');
      fetchArticles();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
            {isAdmin ? 'Tutti gli Articoli' : 'Storico Articoli'}
          </h1>
          <p className="text-slate-500 mt-1">
            {filteredArticles.length} articoli trovati
          </p>
        </div>

        {selectedArticles.length > 0 && (
          <Button
            onClick={handlePublish}
            className="bg-orange-500 hover:bg-orange-600"
            disabled={publishing}
            data-testid="publish-selected-btn"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Pubblicazione...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Pubblica {selectedArticles.length} Articoli
              </>
            )}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cerca per titolo..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="article-search-input"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter-select">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="generated">Generati</SelectItem>
                <SelectItem value="published">Pubblicati</SelectItem>
                <SelectItem value="failed">Errori</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[200px]" data-testid="client-filter-select">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i clienti</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              onClick={selectAllGenerated}
              data-testid="select-all-generated-btn"
            >
              Seleziona Generati
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card className="border-slate-200" data-testid="articles-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">Nessun articolo trovato</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="font-semibold">Titolo</TableHead>
                  {isAdmin && <TableHead className="font-semibold">Cliente</TableHead>}
                  <TableHead className="font-semibold">Stato</TableHead>
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArticles.map((article) => (
                  <TableRow 
                    key={article.id}
                    className="hover:bg-slate-50"
                    data-testid={`article-row-${article.id}`}
                  >
                    <TableCell>
                      {article.stato === 'generated' && (
                        <Checkbox
                          checked={selectedArticles.includes(article.id)}
                          onCheckedChange={() => toggleArticle(article.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="font-medium text-slate-900 truncate">{article.titolo}</p>
                        {article.wordpress_post_id && (
                          <span className="text-xs text-slate-500 font-mono">
                            WP ID: {article.wordpress_post_id}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <span className="text-slate-600">
                          {clients.find(c => c.id === article.client_id)?.nome || article.client_id}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      {getStatusBadge(article.stato)}
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 text-sm">
                        {formatDate(article.created_at)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`article-actions-${article.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewArticle(article)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Anteprima
                          </DropdownMenuItem>
                          {article.wordpress_post_id && (
                            <DropdownMenuItem asChild>
                              <a 
                                href={`${clients.find(c => c.id === article.client_id)?.sito_web || '#'}/wp-admin/post.php?post=${article.wordpress_post_id}&action=edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Apri in WordPress
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(article.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Article Preview Modal */}
      {previewArticle && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewArticle(null)}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">{previewArticle.titolo}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {getStatusBadge(previewArticle.stato)}
                  <span>{formatDate(previewArticle.created_at)}</span>
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setPreviewArticle(null)}>
                Chiudi
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div 
                  className="article-preview prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewArticle.contenuto }}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
