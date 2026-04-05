import * as React from 'react';
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
  const [newKw, setNewKw] = React.useState('');

  const toggleLever = (leverId) => {
    const current = strategy.leve_psicologiche || [];
    if (current.includes(leverId)) {
      setStrategy({ ...strategy, leve_psicologiche: current.filter(l => l !== leverId) });
    } else {
      setStrategy({ ...strategy, leve_psicologiche: [...current, leverId] });
    }
  };

  const addKw = () => {
    const trimmed = newKw.trim();
    const current = strategy.keyword_secondarie || [];
    if (trimmed && !current.includes(trimmed)) {
      setStrategy({ ...strategy, keyword_secondarie: [...current, trimmed] });
      setNewKw('');
    }
  };

  const removeKw = (val) => {
    setStrategy({ ...strategy, keyword_secondarie: (strategy.keyword_secondarie || []).filter(v => v !== val) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impostazioni Core */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Obiettivo e Stile
            </CardTitle>
            <CardDescription className="text-xs">Definisci cosa vuoi ottenere e come</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Funnel Step</Label>
                <Select value={strategy.funnel_stage || 'TOFU'} onValueChange={(v) => setStrategy({ ...strategy, funnel_stage: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Modello Copy</Label>
                <Select value={strategy.modello_copywriting || 'PAS'} onValueChange={(v) => setStrategy({ ...strategy, modello_copywriting: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COPYWRITING_MODELS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">CTA Finale (Call to Action)</Label>
              <Input
                value={strategy.cta_finale || ''}
                onChange={(e) => setStrategy({ ...strategy, cta_finale: e.target.value })}
                placeholder="Es: Richiedi un preventivo gratuito"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leve Psicologiche</Label>
              <div className="flex flex-wrap gap-2">
                {PSYCHOLOGICAL_LEVERS.map(lever => {
                  const isActive = (strategy.leve_psicologiche || []).includes(lever.id);
                  return (
                    <Badge
                      key={lever.id}
                      variant={isActive ? "default" : "outline"}
                      className={`cursor-pointer px-3 py-1 text-[10px] transition-all ${isActive ? 'bg-indigo-600' : 'hover:bg-slate-50'}`}
                      onClick={() => {
                        const current = strategy.leve_psicologiche || [];
                        setStrategy({ 
                          ...strategy, 
                          leve_psicologiche: isActive ? current.filter(l => l !== lever.id) : [...current, lever.id] 
                        });
                      }}
                    >
                      {lever.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target & Keywords */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Target e Semantica
            </CardTitle>
            <CardDescription className="text-xs">Per chi scrivi e quali concetti toccare</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold italic">Chi e il tuo lettore ideale? (Bisogni e Consapevolezza)</Label>
                <Textarea
                  value={strategy.buyer_persona_descrizione || ''}
                  onChange={(e) => setStrategy({ ...strategy, buyer_persona_descrizione: e.target.value })}
                  placeholder="Es: Imprenditore locale che cerca sicurezza e velocita, teme i costi nascosti..."
                  rows={2}
                  className="text-xs resize-none"
                />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold italic text-slate-600">Keyword Semantiche & Varianti (LSI)</Label>
              <div className="flex gap-2">
                <Input
                  value={newKw}
                  onChange={(e) => setNewKw(e.target.value)}
                  placeholder="Aggiungi keyword..."
                  className="h-8 text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addKw()}
                />
                <Button type="button" variant="outline" size="sm" onClick={addKw} className="h-8 w-8 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 min-h-[2.5rem] p-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                {(strategy.keyword_secondarie || []).map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] bg-white border-slate-200 text-slate-700">
                    {kw}
                    <X className="w-3 h-3 ml-1 cursor-pointer hover:text-red-500" onClick={() => removeKw(kw)} />
                  </Badge>
                ))}
                {(strategy.keyword_secondarie || []).length === 0 && <span className="text-[10px] text-slate-400">Nessuna keyword aggiunta</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lunghezza Target</Label>
                  <Select value={(strategy.lunghezza_target || 1500).toString()} onValueChange={(v) => setStrategy({ ...strategy, lunghezza_target: parseInt(v) })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000" className="text-xs">Breve (1000 p.)</SelectItem>
                      <SelectItem value="1500" className="text-xs">Standard (1500 p.)</SelectItem>
                      <SelectItem value="2500" className="text-xs">Pilastro (2500 p.)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Intento</Label>
                  <Select value={strategy.search_intent || 'informazionale'} onValueChange={(v) => setStrategy({ ...strategy, search_intent: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informazionale" className="text-xs">Informa</SelectItem>
                      <SelectItem value="commerciale" className="text-xs">Vendi/Compara</SelectItem>
                      <SelectItem value="transazionale" className="text-xs">Azione</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b px-6 py-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Note Speciali e Istruzioni</Label>
        </div>
        <CardContent className="p-0">
          <Textarea
            value={strategy.note_speciali || ''}
            onChange={(e) => setStrategy({ ...strategy, note_speciali: e.target.value })}
            placeholder="Istruzioni aggiuntive (es: tono formale, non citare il prezzo...)"
            rows={2}
            className="border-none focus-visible:ring-0 text-sm p-4 resize-none min-h-[80px]"
          />
        </CardContent>
      </Card>
    </div>
  );
};
