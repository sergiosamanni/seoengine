import React from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Search, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SerpAnalysisTab = ({ apify, effectiveClientId, getAuthHeaders }) => {
  const [serpKeyword, setSerpKeyword] = React.useState('');
  const [serpCountry, setSerpCountry] = React.useState('it');
  const [serpLoading, setSerpLoading] = React.useState(false);
  const [serpResults, setSerpResults] = React.useState([]);

  const runSerpAnalysis = async () => {
    if (!serpKeyword.trim()) { toast.error('Inserisci una keyword'); return; }
    setSerpLoading(true);
    try {
      const response = await axios.post(`${API}/clients/${effectiveClientId}/serp-analysis`, {
        keyword: serpKeyword, country: serpCountry, num_results: 4
      }, { headers: getAuthHeaders() });
      setSerpResults(response.data.results);
      toast.success(`Trovati ${response.data.results.length} risultati`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore analisi SERP');
    } finally {
      setSerpLoading(false);
    }
  };

  if (!apify.enabled) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Apify non abilitato</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-4">
            Per utilizzare l'analisi SERP, abilita Apify nella tab "API Keys" e configura la tua API key.
          </p>
          <Button variant="outline" onClick={() => document.querySelector('[data-testid="tab-api"]')?.click()}>
            Vai alle API Keys
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600" />
            Analisi SERP
          </CardTitle>
          <CardDescription>Scraping dei primi 4 risultati Google per una keyword</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apify.api_key && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Configura prima la API Key Apify nella tab "API Keys"
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Keyword da analizzare</Label>
              <Input
                value={serpKeyword}
                onChange={(e) => setSerpKeyword(e.target.value)}
                placeholder="es: noleggio auto salerno"
                data-testid="serp-keyword-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Paese</Label>
              <Select value={serpCountry} onValueChange={setSerpCountry}>
                <SelectTrigger data-testid="serp-country-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">Italia</SelectItem>
                  <SelectItem value="us">Stati Uniti</SelectItem>
                  <SelectItem value="gb">Regno Unito</SelectItem>
                  <SelectItem value="de">Germania</SelectItem>
                  <SelectItem value="fr">Francia</SelectItem>
                  <SelectItem value="es">Spagna</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={runSerpAnalysis}
              disabled={serpLoading || !apify.api_key}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="serp-analyze-btn"
            >
              {serpLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" />Analizza SERP</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Risultati SERP</CardTitle>
          <CardDescription>Top 4 risultati per la keyword analizzata</CardDescription>
        </CardHeader>
        <CardContent>
          {serpResults.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Esegui un'analisi per vedere i risultati</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {serpResults.map((result, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                        {result.position || i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline line-clamp-1">
                          {result.title}
                        </a>
                        <p className="text-xs text-emerald-600 truncate mt-1">{result.displayed_url}</p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{result.description}</p>
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
  );
};
