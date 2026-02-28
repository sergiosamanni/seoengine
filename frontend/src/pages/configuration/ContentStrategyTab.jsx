import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Target, Users, Zap, Brain, Plus, X } from 'lucide-react';

const FUNNEL_STAGES = [
  { value: 'TOFU', label: 'TOFU — Top of Funnel', desc: 'Awareness: educa, informa, cattura traffico' },
  { value: 'MOFU', label: 'MOFU — Middle of Funnel', desc: 'Considerazione: mostra competenza, genera lead' },
  { value: 'BOFU', label: 'BOFU — Bottom of Funnel', desc: 'Decisione: converti, rimuovi obiezioni' },
];

const COPYWRITING_MODELS = [
  { value: 'AIDA', label: 'AIDA', desc: 'Attenzione - Interesse - Desiderio - Azione' },
  { value: 'PAS', label: 'PAS', desc: 'Problema - Agitazione - Soluzione' },
  { value: 'FAB', label: 'FAB', desc: 'Feature - Advantage - Benefit' },
  { value: 'PASTOR', label: 'PASTOR', desc: 'Problem - Amplify - Story - Testimony - Offer - Response' },
  { value: 'Libero', label: 'Libero', desc: 'Struttura libera, regole SEO attive' },
];

const SEARCH_INTENTS = [
  { value: 'informazionale', label: 'Informazionale', desc: 'Il lettore cerca informazioni' },
  { value: 'commerciale', label: 'Commerciale', desc: 'Il lettore confronta opzioni' },
  { value: 'transazionale', label: 'Transazionale', desc: 'Il lettore vuole comprare/agire' },
  { value: 'navigazionale', label: 'Navigazionale', desc: 'Il lettore cerca un sito specifico' },
];

const PSYCHOLOGICAL_LEVERS = [
  { id: 'riprova_sociale', label: 'Riprova Sociale', desc: 'Numeri clienti, testimonianze, rating' },
  { id: 'autorita', label: 'Autorita', desc: 'Certificazioni, expertise, menzioni media' },
  { id: 'scarsita', label: 'Scarsita', desc: 'Disponibilita limitata (solo se reale)' },
  { id: 'urgenza', label: 'Urgenza', desc: 'Costo dell\'inazione, benefici dell\'agire ora' },
  { id: 'reciprocita', label: 'Reciprocita', desc: 'Offri valore gratuito, consigli pratici' },
  { id: 'simpatia', label: 'Simpatia', desc: 'Storytelling autentico, valori condivisi' },
  { id: 'impegno', label: 'Impegno e Coerenza', desc: 'Micro-CTA progressive' },
];

const OBJECTIVES = [
  { value: 'traffico', label: 'Traffico organico' },
  { value: 'lead', label: 'Generazione lead' },
  { value: 'conversione', label: 'Conversione diretta' },
  { value: 'autorità', label: 'Autorità di brand' },
];

export const ContentStrategyTab = ({ strategy, setStrategy }) => {
  const [newKwSec, setNewKwSec] = React.useState('');
  const [newKwLsi, setNewKwLsi] = React.useState('');

  const toggleLever = (leverId) => {
    const current = strategy.leve_psicologiche || [];
    if (current.includes(leverId)) {
      setStrategy({ ...strategy, leve_psicologiche: current.filter(l => l !== leverId) });
    } else {
      setStrategy({ ...strategy, leve_psicologiche: [...current, leverId] });
    }
  };

  const addToList = (field, value, setValue) => {
    const trimmed = value.trim();
    const current = strategy[field] || [];
    if (trimmed && !current.includes(trimmed)) {
      setStrategy({ ...strategy, [field]: [...current, trimmed] });
      setValue('');
    }
  };

  const removeFromList = (field, value) => {
    setStrategy({ ...strategy, [field]: (strategy[field] || []).filter(v => v !== value) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel & Objective */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Strategia Funnel
            </CardTitle>
            <CardDescription>Definisci il posizionamento nel funnel e l'obiettivo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Funnel Stage</Label>
              <Select value={strategy.funnel_stage || 'TOFU'} onValueChange={(v) => setStrategy({ ...strategy, funnel_stage: v })}>
                <SelectTrigger data-testid="strategy-funnel-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div><span className="font-medium">{s.label}</span><br/><span className="text-xs text-slate-500">{s.desc}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Obiettivo Primario</Label>
              <Select value={strategy.obiettivo_primario || 'traffico'} onValueChange={(v) => setStrategy({ ...strategy, obiettivo_primario: v })}>
                <SelectTrigger data-testid="strategy-objective-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intento di Ricerca</Label>
              <Select value={strategy.search_intent || 'informazionale'} onValueChange={(v) => setStrategy({ ...strategy, search_intent: v })}>
                <SelectTrigger data-testid="strategy-intent-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEARCH_INTENTS.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <div><span className="font-medium">{s.label}</span><span className="text-xs text-slate-500 ml-2">{s.desc}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Copywriting Model */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Modello Copywriting
            </CardTitle>
            <CardDescription>Seleziona il framework persuasivo per i contenuti</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modello</Label>
              <Select value={strategy.modello_copywriting || 'PAS'} onValueChange={(v) => setStrategy({ ...strategy, modello_copywriting: v })}>
                <SelectTrigger data-testid="strategy-model-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COPYWRITING_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <div><span className="font-bold">{m.label}</span><span className="text-xs text-slate-500 ml-2">{m.desc}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Lunghezza Target (parole)</Label>
              <Input
                type="number"
                value={strategy.lunghezza_target || 1500}
                onChange={(e) => setStrategy({ ...strategy, lunghezza_target: parseInt(e.target.value) || 1500 })}
                min={500}
                max={5000}
                data-testid="strategy-length-input"
              />
            </div>
            <div className="space-y-2">
              <Label>CTA Finale</Label>
              <Textarea
                value={strategy.cta_finale || ''}
                onChange={(e) => setStrategy({ ...strategy, cta_finale: e.target.value })}
                placeholder="Es: Richiedi un preventivo gratuito senza impegno"
                rows={2}
                data-testid="strategy-cta-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Buyer Persona */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Buyer Persona
            </CardTitle>
            <CardDescription>Definisci il lettore ideale dei contenuti</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Persona</Label>
              <Input
                value={strategy.buyer_persona_nome || ''}
                onChange={(e) => setStrategy({ ...strategy, buyer_persona_nome: e.target.value })}
                placeholder="Es: Marco, imprenditore PMI"
                data-testid="strategy-persona-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrizione (ruolo, consapevolezza, bisogni)</Label>
              <Textarea
                value={strategy.buyer_persona_descrizione || ''}
                onChange={(e) => setStrategy({ ...strategy, buyer_persona_descrizione: e.target.value })}
                placeholder="Descrivi chi e, cosa cerca, qual e il suo livello di consapevolezza..."
                rows={3}
                data-testid="strategy-persona-desc"
              />
            </div>
            <div className="space-y-2">
              <Label>Obiezioni Tipiche</Label>
              <Textarea
                value={strategy.buyer_persona_obiezioni || ''}
                onChange={(e) => setStrategy({ ...strategy, buyer_persona_obiezioni: e.target.value })}
                placeholder="Es: Costa troppo, non ho tempo, non sono sicuro che funzioni..."
                rows={2}
                data-testid="strategy-persona-objections"
              />
            </div>
          </CardContent>
        </Card>

        {/* Psychological Levers */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Leve Psicologiche
            </CardTitle>
            <CardDescription>Seleziona le leve da integrare nei contenuti (uso etico)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {PSYCHOLOGICAL_LEVERS.map(lever => {
                const isActive = (strategy.leve_psicologiche || []).includes(lever.id);
                return (
                  <button
                    key={lever.id}
                    type="button"
                    onClick={() => toggleLever(lever.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-purple-50 border-purple-300 text-purple-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                    data-testid={`lever-${lever.id}`}
                  >
                    <div>
                      <span className="font-medium text-sm">{lever.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{lever.desc}</p>
                    </div>
                    {isActive && <Badge className="bg-purple-600 text-white text-xs">Attiva</Badge>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Keyword Secondarie</CardTitle>
            <CardDescription>Keyword da integrare naturalmente nel testo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newKwSec}
                onChange={(e) => setNewKwSec(e.target.value)}
                placeholder="Aggiungi keyword secondaria"
                onKeyPress={(e) => e.key === 'Enter' && addToList('keyword_secondarie', newKwSec, setNewKwSec)}
                data-testid="strategy-kw-sec-input"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addToList('keyword_secondarie', newKwSec, setNewKwSec)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(strategy.keyword_secondarie || []).map((kw, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">
                  {kw}
                  <button onClick={() => removeFromList('keyword_secondarie', kw)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Keyword LSI (Semantiche)</CardTitle>
            <CardDescription>Sinonimi e varianti per copertura semantica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newKwLsi}
                onChange={(e) => setNewKwLsi(e.target.value)}
                placeholder="Aggiungi keyword LSI"
                onKeyPress={(e) => e.key === 'Enter' && addToList('keyword_lsi', newKwLsi, setNewKwLsi)}
                data-testid="strategy-kw-lsi-input"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addToList('keyword_lsi', newKwLsi, setNewKwLsi)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(strategy.keyword_lsi || []).map((kw, i) => (
                <Badge key={i} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono">
                  {kw}
                  <button onClick={() => removeFromList('keyword_lsi', kw)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Note Speciali</CardTitle>
          <CardDescription>Istruzioni aggiuntive per la generazione</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={strategy.note_speciali || ''}
            onChange={(e) => setStrategy({ ...strategy, note_speciali: e.target.value })}
            placeholder="Es: Non parlare mai di competitor X, enfatizza sempre il servizio di assistenza 24/7..."
            rows={3}
            data-testid="strategy-notes-input"
          />
        </CardContent>
      </Card>
    </div>
  );
};
