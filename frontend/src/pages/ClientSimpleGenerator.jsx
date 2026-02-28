import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  PenTool,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  ExternalLink,
  Send,
  FileText,
  Clock,
  Eye,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ClientSimpleGenerator = () => {
  const { getAuthHeaders, user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [topic, setTopic] = useState('');
  const [objective, setObjective] = useState('informazionale');
  const [publishToWp, setPublishToWp] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [recentArticles, setRecentArticles] = useState([]);
  const [previewArticle, setPreviewArticle] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchRecentArticles();
  }, []);

  const fetchRecentArticles = async () => {
    try {
      const res = await axios.get(`${API}/articles?limit=10`, { headers: getAuthHeaders() });
      setRecentArticles(res.data || []);
    } catch (e) { /* ignore */ }
  };

  const handleGenerate = async () => {
    if (!keyword.trim()) {
      toast.error('Inserisci una keyword o un titolo');
      return;
    }
    setGenerating(true);
    setResult(null);

    try {
      const res = await axios.post(`${API}/articles/simple-generate`, {
        keyword: keyword.trim(),
        topic: topic.trim(),
        objective,
        publish_to_wordpress: publishToWp
      }, { headers: getAuthHeaders() });

      const jobId = res.data.job_id;
      toast.info('Generazione avviata...');

      // Poll job status
      const pollJob = async () => {
        try {
          const jobRes = await axios.get(`${API}/jobs/${jobId}`, { headers: getAuthHeaders() });
          const job = jobRes.data;
          if (job.status === 'completed') {
            const r = job.results?.[0];
            setResult(r);
            if (r?.generation_status === 'success') {
              toast.success(r.publish_status === 'success' ? 'Articolo generato e pubblicato!' : 'Articolo generato con successo!');
            } else {
              toast.error('Errore nella generazione');
            }
            setGenerating(false);
            setKeyword('');
            setTopic('');
            fetchRecentArticles();
            return;
          }
          setTimeout(pollJob, 4000);
        } catch (e) {
          setTimeout(pollJob, 5000);
        }
      };
      setTimeout(pollJob, 5000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
      setGenerating(false);
    }
  };

  const loadPreview = async (articleId) => {
    try {
      const res = await axios.get(`${API}/articles/${articleId}/full`, { headers: getAuthHeaders() });
      setPreviewArticle(res.data);
    } catch (e) {
      toast.error('Errore caricamento anteprima');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Crea un articolo</h1>
        <p className="text-slate-500 mt-1">Inserisci una keyword e genereremo un articolo SEO ottimizzato per te</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Generation Form */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="w-5 h-5 text-orange-500" />
              Nuovo Articolo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Keyword / Titolo</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Es: noleggio auto economico salerno"
                disabled={generating}
                data-testid="simple-keyword-input"
                onKeyPress={(e) => e.key === 'Enter' && !generating && handleGenerate()}
              />
              <p className="text-xs text-slate-400">La keyword principale attorno a cui costruire l'articolo</p>
            </div>

            <div className="space-y-2">
              <Label>Di cosa parlare (opzionale)</Label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Descrivi brevemente l'argomento o i punti da trattare..."
                rows={3}
                disabled={generating}
                data-testid="simple-topic-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Obiettivo</Label>
              <Select value={objective} onValueChange={setObjective} disabled={generating}>
                <SelectTrigger data-testid="simple-objective-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informazionale">Informare il lettore</SelectItem>
                  <SelectItem value="commerciale">Confrontare opzioni/servizi</SelectItem>
                  <SelectItem value="conversione">Convertire in cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Pubblica su WordPress</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publishToWp}
                onClick={() => setPublishToWp(!publishToWp)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  publishToWp ? 'bg-blue-600' : 'bg-slate-200'
                }`}
                data-testid="simple-wp-toggle"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  publishToWp ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {generating && (
              <div className="space-y-2">
                <Progress value={30} className="h-2 animate-pulse" />
                <p className="text-xs text-slate-500 text-center">Generazione in corso, potrebbe richiedere qualche minuto...</p>
              </div>
            )}

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-semibold"
              onClick={handleGenerate}
              disabled={generating || !keyword.trim()}
              data-testid="simple-generate-btn"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generazione in corso...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" />Genera Articolo</>
              )}
            </Button>

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-lg border ${
                result.generation_status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`} data-testid="generation-result">
                <div className="flex items-center gap-2 mb-2">
                  {result.generation_status === 'success' 
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <XCircle className="w-5 h-5 text-red-600" />
                  }
                  <span className="font-semibold text-sm">
                    {result.generation_status === 'success' ? 'Articolo creato!' : 'Errore'}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{result.titolo}</p>
                {result.wordpress_link && (
                  <a href={result.wordpress_link} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2">
                    Vedi su WordPress <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {result.generation_error && (
                  <p className="text-xs text-red-600 mt-1">{result.generation_error}</p>
                )}
                {result.id && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => loadPreview(result.id)}>
                    <Eye className="w-4 h-4 mr-1" /> Anteprima
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Articles */}
        <Card className="border-slate-200 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              I tuoi articoli recenti
            </CardTitle>
            <CardDescription>{recentArticles.length} articoli</CardDescription>
          </CardHeader>
          <CardContent>
            {recentArticles.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3" />
                <p>Nessun articolo ancora. Genera il primo!</p>
              </div>
            ) : (
              <ScrollArea className="h-[450px]">
                <div className="space-y-3">
                  {recentArticles.map((article, i) => (
                    <div key={article.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors" data-testid={`recent-article-${i}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{article.titolo}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant={article.stato === 'published' ? 'default' : article.stato === 'generated' ? 'secondary' : 'destructive'} className="text-xs">
                              {article.stato === 'published' ? 'Pubblicato' : article.stato === 'generated' ? 'Generato' : 'Errore'}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {new Date(article.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadPreview(article.id)} data-testid={`preview-btn-${i}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {article.wordpress_link && (
                            <a href={article.wordpress_link} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewArticle(null)}>
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()} data-testid="preview-modal">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">{previewArticle.titolo}</CardTitle>
              <Button variant="outline" onClick={() => setPreviewArticle(null)}>Chiudi</Button>
            </CardHeader>
            <CardContent>
              {previewArticle.seo_metadata && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-3">
                  <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-500" /> Metadati SEO
                  </h4>
                  {previewArticle.seo_metadata.meta_description && (
                    <p className="text-sm text-slate-600 bg-white p-2 rounded border">{previewArticle.seo_metadata.meta_description}</p>
                  )}
                  {previewArticle.seo_metadata.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {previewArticle.seo_metadata.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <ScrollArea className="h-[50vh]">
                <div className="article-preview prose max-w-none" dangerouslySetInnerHTML={{ __html: previewArticle.contenuto }} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
