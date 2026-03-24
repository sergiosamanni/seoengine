import React from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Plus, X, Globe, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const KnowledgeBaseTab = ({ knowledge, setKnowledge, isAdmin, effectiveClientId, getAuthHeaders }) => {
  const [newPuntoInteresse, setNewPuntoInteresse] = React.useState('');
  const [newPuntoForza, setNewPuntoForza] = React.useState('');
  const [scrapeUrls, setScrapeUrls] = React.useState([]);
  const [currentUrl, setCurrentUrl] = React.useState('');
  const [scraping, setScraping] = React.useState(false);
  const [scrapeResult, setScrapeResult] = React.useState(null);

  const addUrl = () => {
    const trimmed = currentUrl.trim();
    if (!trimmed) return;
    
    // Support comma or space separated URLs
    const urls = trimmed.split(/[\s,]+/).filter(u => u.startsWith('http'));
    
    if (urls.length > 0) {
      setScrapeUrls(prev => {
        const newUrls = [...prev];
        urls.forEach(u => {
          if (!newUrls.includes(u)) newUrls.push(u);
        });
        return newUrls;
      });
      setCurrentUrl('');
    } else if (trimmed.length > 0 && !trimmed.startsWith('http')) {
      toast.error('Gli URL devono iniziare con http:// o https://');
    }
  };

  const removeUrl = (url) => {
    setScrapeUrls(scrapeUrls.filter(u => u !== url));
  };

  const addToList = (field, value, setValue) => {
    const trimmedValue = value.trim();
    const currentArray = knowledge[field] || [];
    if (trimmedValue && !currentArray.includes(trimmedValue)) {
      setKnowledge({ ...knowledge, [field]: [...currentArray, trimmedValue] });
      setValue('');
    }
  };

  const removeFromList = (field, value) => {
    const currentArray = knowledge[field] || [];
    setKnowledge({ ...knowledge, [field]: currentArray.filter(v => v !== value) });
  };

  const handleScrapeWebsite = async () => {
    // Collect all URLs: from the list and from the input
    let finalUrls = [...scrapeUrls];
    const trimmedCurrent = currentUrl.trim();
    
    if (trimmedCurrent) {
        const inputUrls = trimmedCurrent.split(/[\s,]+/).filter(u => u.startsWith('http'));
        inputUrls.forEach(u => {
            if (!finalUrls.includes(u)) finalUrls.push(u);
        });
    }

    if (finalUrls.length === 0) { 
      toast.error('Inserisci almeno un URL valido (che inizi con http)'); 
      return; 
    }

    setScraping(true);
    setScrapeResult(null);
    if (trimmedCurrent) setCurrentUrl(''); // Clear input if it was used
    try {
      const res = await axios.post(`${API}/clients/${effectiveClientId}/scrape-website`, {
        urls: finalUrls
      }, { headers: getAuthHeaders() });
      setScrapeResult(res.data);
      toast.success(`Sito analizzato: ${res.data.pagine_analizzate?.length || 0} pagine`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante lo scraping');
    } finally {
      setScraping(false);
    }
  };

  const applyScrapeData = () => {
    if (!scrapeResult) return;
    const updated = { ...knowledge };
    if (scrapeResult.descrizione_attivita && !updated.descrizione_attivita) {
      updated.descrizione_attivita = scrapeResult.descrizione_attivita.slice(0, 500);
    }
    if (scrapeResult.citta_principale && !updated.citta_principale) {
      updated.citta_principale = scrapeResult.citta_principale;
    }
    // Add headings as potential punti di forza
    const existingForza = updated.punti_di_forza || [];
    const newForza = (scrapeResult.raw_headings || [])
      .filter(h => h.length > 5 && h.length < 80 && !existingForza.includes(h))
      .slice(0, 5);
    updated.punti_di_forza = [...existingForza, ...newForza];
    setKnowledge(updated);
    toast.success('Dati applicati alla Knowledge Base');
    setScrapeResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Knowledge Base Input Sources (Admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                Estrai dati dal sito web
              </CardTitle>
              <CardDescription>Inserisci l'URL del sito del cliente per estrarre automaticamente le informazioni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  placeholder="Es: https://www.example.com/chi-siamo"
                  disabled={scraping}
                  onKeyDown={(e) => e.key === 'Enter' && addUrl()}
                />
                <Button variant="outline" size="icon" onClick={addUrl} disabled={scraping}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button onClick={handleScrapeWebsite} disabled={scraping} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
                  {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {scraping ? 'Analisi...' : 'Analizza tutto'}
                </Button>
              </div>
              
              {scrapeUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {scrapeUrls.map((u, i) => (
                    <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-100">
                      <span className="max-w-[200px] truncate">{u}</span>
                      <button onClick={() => removeUrl(u)} className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {scrapeResult && (
                <div className="p-4 bg-white rounded-lg border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-slate-900">
                      {scrapeResult.pagine_analizzate?.length || 0} pagine analizzate
                    </p>
                    <Button size="sm" onClick={applyScrapeData} className="bg-blue-600" data-testid="apply-scrape-btn">
                      <Sparkles className="w-4 h-4 mr-1" /> Applica dati
                    </Button>
                  </div>
                  {scrapeResult.citta_principale && (
                    <p className="text-sm text-slate-600">Citta rilevata: <strong>{scrapeResult.citta_principale}</strong></p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Carica Documenti
              </CardTitle>
              <CardDescription>Carica PDF, DOCX, CSV o XLSX per istruire l'AI sul business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-emerald-200 rounded-xl p-8 text-center bg-white/50 hover:bg-white transition-colors cursor-pointer relative"
                  onClick={() => document.getElementById('kb-file-upload').click()}
                >
                  <input
                    id="kb-file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      setScraping(true);
                      try {
                        const res = await axios.post(`${API}/clients/${effectiveClientId}/upload-kb-document`, formData, {
                          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                        });
                        setScrapeResult(res.data.extracted_data);
                        toast.success(`Dati estratti con successo da ${file.name}`);
                      } catch (error) {
                        toast.error(error.response?.data?.detail || 'Errore durante il caricamento');
                      } finally {
                        setScraping(false);
                      }
                    }}
                  />
                  {scraping ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                      <p className="text-sm font-medium text-emerald-700">Elaborazione documento...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-1">
                        <Plus className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Clicca per caricare un file</p>
                      <p className="text-xs text-slate-400">Supporta PDF, DOCX, CSV, Excel</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-slate-200">
        <CardHeader><CardTitle>Informazioni Azienda</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Descrizione Attivita</Label>
            <Textarea
              value={knowledge.descrizione_attivita}
              onChange={(e) => setKnowledge({ ...knowledge, descrizione_attivita: e.target.value })}
              placeholder="Descrivi l'attivita principale..."
              rows={3}
              data-testid="kb-descrizione-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Storia del Brand</Label>
            <Textarea
              value={knowledge.storia_brand}
              onChange={(e) => setKnowledge({ ...knowledge, storia_brand: e.target.value })}
              placeholder="La storia dell'azienda..."
              rows={3}
              data-testid="kb-storia-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Call to Action Principale</Label>
            <Input
              value={knowledge.call_to_action_principale}
              onChange={(e) => setKnowledge({ ...knowledge, call_to_action_principale: e.target.value })}
              placeholder="Es: Richiedi un preventivo gratuito"
              data-testid="kb-cta-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle>Territorio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Citta Principale</Label>
              <Input
                value={knowledge.citta_principale}
                onChange={(e) => setKnowledge({ ...knowledge, citta_principale: e.target.value })}
                placeholder="Es: Salerno"
                data-testid="kb-citta-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Regione</Label>
              <Input
                value={knowledge.regione}
                onChange={(e) => setKnowledge({ ...knowledge, regione: e.target.value })}
                placeholder="Es: Campania"
                data-testid="kb-regione-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrizione Geografica</Label>
            <Textarea
              value={knowledge.descrizione_geografica}
              onChange={(e) => setKnowledge({ ...knowledge, descrizione_geografica: e.target.value })}
              placeholder="Descrizione del territorio..."
              rows={2}
              data-testid="kb-geo-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Punti di Interesse Locali</Label>
            <div className="flex gap-2">
              <Input
                value={newPuntoInteresse}
                onChange={(e) => setNewPuntoInteresse(e.target.value)}
                placeholder="Aggiungi punto di interesse"
                onKeyPress={(e) => e.key === 'Enter' && addToList('punti_di_interesse_locali', newPuntoInteresse, setNewPuntoInteresse)}
                data-testid="kb-poi-input"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addToList('punti_di_interesse_locali', newPuntoInteresse, setNewPuntoInteresse)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(knowledge.punti_di_interesse_locali || []).map((poi) => (
                <Badge key={poi} variant="secondary" className="pl-2">
                  {poi}
                  <button onClick={() => removeFromList('punti_di_interesse_locali', poi)} className="ml-1 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle>Target</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pubblico Target Primario</Label>
            <Input
              value={knowledge.pubblico_target_primario}
              onChange={(e) => setKnowledge({ ...knowledge, pubblico_target_primario: e.target.value })}
              placeholder="Es: Turisti italiani e stranieri"
              data-testid="kb-target1-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Pubblico Target Secondario</Label>
            <Input
              value={knowledge.pubblico_target_secondario}
              onChange={(e) => setKnowledge({ ...knowledge, pubblico_target_secondario: e.target.value })}
              placeholder="Es: Aziende locali"
              data-testid="kb-target2-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle>Punti di Forza</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newPuntoForza}
              onChange={(e) => setNewPuntoForza(e.target.value)}
              placeholder="Aggiungi punto di forza"
              onKeyPress={(e) => e.key === 'Enter' && addToList('punti_di_forza', newPuntoForza, setNewPuntoForza)}
              data-testid="kb-forza-input"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addToList('punti_di_forza', newPuntoForza, setNewPuntoForza)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {(knowledge.punti_di_forza || []).map((pf, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm">{pf}</span>
                  <button onClick={() => removeFromList('punti_di_forza', pf)} className="text-slate-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
    </div>
  );
};
