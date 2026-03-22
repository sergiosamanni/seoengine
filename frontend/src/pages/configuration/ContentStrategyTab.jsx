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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Strategy */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Obiettivo e Struttura
            </CardTitle>
            <CardDescription>Definisci la base strategica del contenuto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fase del Funnel</Label>
              <Select value={strategy.funnel_stage || 'TOFU'} onValueChange={(v) => setStrategy({ ...strategy, funnel_stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="font-medium">{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Modello di Scrittura</Label>
              <Select value={strategy.modello_copywriting || 'PAS'} onValueChange={(v) => setStrategy({ ...strategy, modello_copywriting: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COPYWRITING_MODELS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="font-medium">{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lunghezza Target (parole)</Label>
              <Input
                type="number"
                value={strategy.lunghezza_target || 1500}
                onChange={(e) => setStrategy({ ...strategy, lunghezza_target: parseInt(e.target.value) || 1500 })}
                min={500}
                max={5000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Conversion & Persona */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Conversione e Target
            </CardTitle>
            <CardDescription>A chi stiamo parlando e cosa vogliamo che faccia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Buyer Persona (Profilo Lettore Ideale)</Label>
              <Textarea
                value={strategy.buyer_persona_descrizione || ''}
                onChange={(e) => setStrategy({ ...strategy, buyer_persona_descrizione: e.target.value })}
                placeholder="Es: Imprenditore edile 40-50 anni, cerca soluzioni per isolamento termico..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Call to Action Finale (CTA)</Label>
              <Input
                value={strategy.cta_finale || ''}
                onChange={(e) => setStrategy({ ...strategy, cta_finale: e.target.value })}
                placeholder="Es: Richiedi un preventivo gratuito"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Note e Istruzioni Speciali</CardTitle>
          <CardDescription>Indicazioni aggiuntive per l'AI e keyword extra</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={strategy.note_speciali || ''}
            onChange={(e) => setStrategy({ ...strategy, note_speciali: e.target.value })}
            placeholder="Aggiungi qui eventuali keyword secondarie, dettagli su cosa evitare o focus specifici del brand..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
};
