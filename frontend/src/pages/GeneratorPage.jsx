import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Zap, 
  AlertCircle, 
  ChevronRight,
  Loader2,
  FileText,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [combinations, setCombinations] = useState([]);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [generatedArticles, setGeneratedArticles] = useState([]);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [client, setClient] = useState(null);

  const clientId = user?.client_id;

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch client info
        const clientRes = await axios.get(`${API}/clients/${clientId}`, {
          headers: getAuthHeaders()
        });
        setClient(clientRes.data);

        // Fetch combinations
        const combosRes = await axios.get(`${API}/clients/${clientId}/combinations`, {
          headers: getAuthHeaders()
        });
        setCombinations(combosRes.data.combinations || []);
      } catch (error) {
        toast.error('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, getAuthHeaders]);

  const toggleCombination = (combo) => {
    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
    if (selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key)) {
      setSelectedCombinations(selectedCombinations.filter(c => `${c.servizio}-${c.citta}-${c.tipo}` !== key));
    } else {
      setSelectedCombinations([...selectedCombinations, combo]);
    }
  };

  const selectAll = () => {
    if (selectedCombinations.length === combinations.length) {
      setSelectedCombinations([]);
    } else {
      setSelectedCombinations([...combinations]);
    }
  };

  const handleGenerate = async () => {
    if (selectedCombinations.length === 0) {
      toast.error('Seleziona almeno una combinazione');
      return;
    }

    setGenerating(true);
    setGeneratedArticles([]);

    try {
      const response = await axios.post(`${API}/articles/generate`, {
        client_id: clientId,
        combinations: selectedCombinations
      }, {
        headers: getAuthHeaders()
      });

      setGeneratedArticles(response.data.articles || []);
      toast.success(`Generati ${response.data.generated} articoli`);
      setSelectedCombinations([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante la generazione');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nessun cliente associato al tuo account. Contatta l'amministratore.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasApiKey = client?.configuration?.llm?.api_key || client?.configuration?.openai?.api_key;
  const llmConfig = client?.configuration?.llm || client?.configuration?.openai || {};
  const providerName = {
    'openai': 'OpenAI',
    'anthropic': 'Claude',
    'deepseek': 'DeepSeek', 
    'perplexity': 'Perplexity'
  }[llmConfig.provider] || 'OpenAI';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
            Genera Articoli
          </h1>
          <p className="text-slate-500 mt-1">
            Seleziona le combinazioni e genera articoli SEO
          </p>
        </div>
      </div>

      {!hasApiKey && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            API Key OpenAI non configurata. Vai su <strong>Configurazione → API Keys</strong> per inserirla.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Combinations Selection */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Combinazioni Disponibili</CardTitle>
              <CardDescription>{combinations.length} combinazioni totali</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={selectAll}
              data-testid="select-all-btn"
            >
              {selectedCombinations.length === combinations.length ? 'Deseleziona' : 'Seleziona'} Tutte
            </Button>
          </CardHeader>
          <CardContent>
            {combinations.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nessuna combinazione disponibile</p>
                <p className="text-sm text-slate-400 mt-1">
                  Configura le keyword nella sezione Configurazione
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {combinations.map((combo, i) => {
                    const key = `${combo.servizio}-${combo.citta}-${combo.tipo}`;
                    const isSelected = selectedCombinations.find(c => `${c.servizio}-${c.citta}-${c.tipo}` === key);
                    
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => toggleCombination(combo)}
                        data-testid={`combo-${i}`}
                      >
                        <Checkbox 
                          checked={!!isSelected}
                          onCheckedChange={() => toggleCombination(combo)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">{combo.titolo}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs font-mono">{combo.servizio}</Badge>
                            <Badge variant="outline" className="text-xs font-mono">{combo.citta}</Badge>
                            <Badge variant="outline" className="text-xs font-mono">{combo.tipo}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Right: Generation Panel */}
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Riepilogo Generazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Articoli selezionati</span>
                <span className="text-2xl font-bold text-slate-900 font-['Manrope']">
                  {selectedCombinations.length}
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Cliente: <span className="text-slate-900 font-medium">{client?.nome}</span></p>
                <p className="text-sm text-slate-500">Provider: <span className="text-slate-900 font-medium">{providerName}</span></p>
                <p className="text-sm text-slate-500">Modello: <span className="text-slate-900 font-mono">{llmConfig?.modello || 'gpt-4-turbo'}</span></p>
              </div>
              
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg font-semibold"
                onClick={handleGenerate}
                disabled={generating || selectedCombinations.length === 0 || !hasApiKey}
                data-testid="generate-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Genera {selectedCombinations.length} Articoli
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Articles */}
          {generatedArticles.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Articoli Generati
                </CardTitle>
                <CardDescription>
                  {generatedArticles.filter(a => a.stato === 'generated').length} successi, 
                  {generatedArticles.filter(a => a.stato === 'failed').length} falliti
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {generatedArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => setPreviewArticle(article)}
                        data-testid={`generated-article-${article.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{article.titolo}</p>
                          <Badge 
                            variant={article.stato === 'generated' ? 'default' : 'destructive'}
                            className={article.stato === 'generated' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs mt-1' 
                              : 'text-xs mt-1'
                            }
                          >
                            {article.stato === 'generated' ? 'Generato' : 'Errore'}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
                <CardTitle>{previewArticle.titolo}</CardTitle>
                <CardDescription>Anteprima articolo generato</CardDescription>
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
