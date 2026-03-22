import React from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Plus, X, Globe, Loader2, Sparkles, Home, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const KnowledgeBaseTab = ({ knowledge, setKnowledge, isAdmin, effectiveClientId, getAuthHeaders }) => {
  const [newPuntoInteresse, setNewPuntoInteresse] = React.useState('');
  const [newPuntoForza, setNewPuntoForza] = React.useState('');
  const [scraping, setScraping] = React.useState(false);

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
    const { url_home, url_chi_siamo, url_contatti } = knowledge;
    if (!url_home && !url_chi_siamo && !url_contatti) {
      toast.error('Inserisci almeno un URL per l\'analisi');
      return;
    }

    setScraping(true);
    try {
      const res = await axios.post(`${API}/clients/${effectiveClientId}/scrape-website`, {
        url_home,
        url_chi_siamo,
        url_contatti
      }, { headers: getAuthHeaders() });

      const refinedData = res.data;

      // Map refined data to knowledge base fields
      setKnowledge({
        ...knowledge,
        descrizione_attivita: refinedData.descrizione_attivita || knowledge.descrizione_attivita,
        storia_brand: refinedData.storia_brand || knowledge.storia_brand,
        citta_principale: refinedData.citta_principale || knowledge.citta_principale,
        regione: refinedData.regione || knowledge.regione,
        descrizione_geografica: refinedData.descrizione_geografica || knowledge.descrizione_geografica,
        punti_di_interesse_locali: refinedData.punti_di_interesse_locali || knowledge.punti_di_interesse_locali,
        punti_di_forza: refinedData.punti_di_forza || knowledge.punti_di_forza,
        pubblico_target_primario: refinedData.pubblico_target_primario || knowledge.pubblico_target_primario,
        pubblico_target_secondario: refinedData.pubblico_target_secondario || knowledge.pubblico_target_secondario,
        call_to_action_principale: refinedData.call_to_action_principale || knowledge.call_to_action_principale,
      });

      toast.success('Dati estratti e mappati con successo!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante l\'analisi AI');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Website Scraper (Admin only) */}
      {isAdmin && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Configurazione Analisi Sito
            </CardTitle>
            <CardDescription>Inserisci gli URL chiave per creare la Knowledge Base del cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Home size={14} /> URL Home Page</Label>
                <Input
                  value={knowledge.url_home || ''}
                  onChange={(e) => setKnowledge({ ...knowledge, url_home: e.target.value })}
                  placeholder="https://..."
                  disabled={scraping}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><User size={14} /> URL Chi Siamo</Label>
                <Input
                  value={knowledge.url_chi_siamo || ''}
                  onChange={(e) => setKnowledge({ ...knowledge, url_chi_siamo: e.target.value })}
                  placeholder="https://.../chi-siamo"
                  disabled={scraping}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Phone size={14} /> URL Contatti</Label>
                <Input
                  value={knowledge.url_contatti || ''}
                  onChange={(e) => setKnowledge({ ...knowledge, url_contatti: e.target.value })}
                  placeholder="https://.../contatti"
                  disabled={scraping}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleScrapeWebsite} disabled={scraping} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
                {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {scraping ? 'Analisi AI in corso...' : 'Analizza e Popola Knowledge Base'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader><CardTitle>Informazioni Azienda</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Descrizione Attività</Label>
              <Textarea
                value={knowledge.descrizione_attivita || ''}
                onChange={(e) => setKnowledge({ ...knowledge, descrizione_attivita: e.target.value })}
                placeholder="Descrivi l'attività principale..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Storia del Brand / Vision</Label>
              <Textarea
                value={knowledge.storia_brand || ''}
                onChange={(e) => setKnowledge({ ...knowledge, storia_brand: e.target.value })}
                placeholder="La storia, mission e filosofia..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Call to Action Principale</Label>
              <Input
                value={knowledge.call_to_action_principale || ''}
                onChange={(e) => setKnowledge({ ...knowledge, call_to_action_principale: e.target.value })}
                placeholder="Es: Richiedi un preventivo gratuito"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader><CardTitle>Territorio</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Città Principale</Label>
                <Input
                  value={knowledge.citta_principale || ''}
                  onChange={(e) => setKnowledge({ ...knowledge, citta_principale: e.target.value })}
                  placeholder="Es: Salerno"
                />
              </div>
              <div className="space-y-2">
                <Label>Regione</Label>
                <Input
                  value={knowledge.regione || ''}
                  onChange={(e) => setKnowledge({ ...knowledge, regione: e.target.value })}
                  placeholder="Es: Campania"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrizione Geografica</Label>
              <Textarea
                value={knowledge.descrizione_geografica || ''}
                onChange={(e) => setKnowledge({ ...knowledge, descrizione_geografica: e.target.value })}
                placeholder="Descrizione dell'area di operazione..."
                rows={2}
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
                value={knowledge.pubblico_target_primario || ''}
                onChange={(e) => setKnowledge({ ...knowledge, pubblico_target_primario: e.target.value })}
                placeholder="Profilo cliente ideale..."
              />
            </div>
            <div className="space-y-2">
              <Label>Pubblico Target Secondario</Label>
              <Input
                value={knowledge.pubblico_target_secondario || ''}
                onChange={(e) => setKnowledge({ ...knowledge, pubblico_target_secondario: e.target.value })}
                placeholder="Altri segmenti di mercato..."
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
                    <button onClick={() => removeFromList('punti_di_forza', pf)} className="text-slate-400 hover:text-red-300 transition-colors">
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
