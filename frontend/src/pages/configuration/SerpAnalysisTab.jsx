import React from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const SerpAnalysisTab = ({ effectiveClientId, getAuthHeaders }) => {
  const [serpKeyword, setSerpKeyword] = React.useState('');
  const [serpCountry, setSerpCountry] = React.useState('it');
  const [serpLoading, setSerpLoading] = React.useState(false);
  const [serpResults, setSerpResults] = React.useState([]);

  const runSerpAnalysis = async () => {
    if (!serpKeyword.trim()) { toast.error('Inserisci una keyword'); return; }
    setSerpLoading(true);
    try {
      const response = await axios.post(`${API}/serp/search`, {
        keyword: serpKeyword, country: serpCountry, num_results: 5
      }, { headers: getAuthHeaders() });
      setSerpResults(response.data.results);
      toast.success(`Trovati ${response.data.results.length} risultati`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore analisi SERP');
    } finally {
      setSerpLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600" />
            Analisi SERP
          </CardTitle>
          <CardDescription>Scraping dei primi risultati Google per una keyword (nessuna API key necessaria)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Keyword da analizzare</Label>
              <Input
                value={serpKeyword}
                onChange={(e) => setSerpKeyword(e.target.value)}
                placeholder="es: noleggio auto salerno"
                onKeyPress={(e) => e.key === 'Enter' && !serpLoading && runSerpAnalysis()}
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
              disabled={serpLoading}
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
          <CardDescription>Top risultati Google con headings e contenuto</CardDescription>
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
                        {result.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline line-clamp-1 flex items-center gap-1">
                          {result.title} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        <p className="text-xs text-emerald-600 truncate mt-0.5">{result.url}</p>
                        <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{result.description}</p>
                        {result.headings && result.headings.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {result.headings.slice(0, 4).map((h, j) => (
                              <Badge key={j} variant="outline" className="text-xs font-normal">{h}</Badge>
                            ))}
                          </div>
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
  );
};
