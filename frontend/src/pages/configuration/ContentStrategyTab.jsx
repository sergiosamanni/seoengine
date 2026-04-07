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
    const trimmed = String(newKw || "").trim();
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Impostazioni Core */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              Obiettivo e Stile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 px-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Funnel Step</Label>
                <Select value={strategy.funnel_stage || 'TOFU'} onValueChange={(v) => setStrategy({ ...strategy, funnel_stage: v })}>
                  <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-slate-50/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNNEL_STAGES.map(s => <SelectItem key={s.value} value={s.value} className="text-[11px]">{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Modello Copy</Label>
                <Select value={strategy.modello_copywriting || 'PAS'} onValueChange={(v) => setStrategy({ ...strategy, modello_copywriting: v })}>
                  <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-slate-50/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COPYWRITING_MODELS.map(m => <SelectItem key={m.value} value={m.value} className="text-[11px]">{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">CTA Finale (Call to Action)</Label>
              <Input
                value={strategy.cta_finale || ''}
                onChange={(e) => setStrategy({ ...strategy, cta_finale: e.target.value })}
                placeholder="Es: Richiedi un preventivo gratuito"
                className="h-8 text-[11px] font-bold border-slate-200 bg-slate-50/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Leve Psicologiche</Label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {PSYCHOLOGICAL_LEVERS.map(lever => {
                  const isActive = (strategy.leve_psicologiche || []).includes(lever.id);
                  return (
                    <button
                      key={lever.id}
                      onClick={() => toggleLever(lever.id)}
                      className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tight transition-all border ${
                        isActive 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
                      }`}
                    >
                      {lever.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Target & Keywords */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="pb-2 pt-4 px-5 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-900">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Target e Semantica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 px-5">
            <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider italic">Buyer Persona & Bisogni</Label>
                <Textarea
                  value={strategy.buyer_persona_descrizione || ''}
                  onChange={(e) => setStrategy({ ...strategy, buyer_persona_descrizione: e.target.value })}
                  placeholder="Es: Imprenditore locale che cerca sicurezza..."
                  rows={2}
                  className="text-[11px] font-medium resize-none min-h-[50px] border-slate-200 bg-slate-50/30"
                />
            </div>

            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider italic">Keyword Semantiche & Varianti (LSI)</Label>
              <div className="flex gap-2">
                <Input
                  value={newKw}
                  onChange={(e) => setNewKw(e.target.value)}
                  placeholder="Aggiungi keyword..."
                  className="h-8 text-[11px] border-slate-200 bg-slate-50/30"
                  onKeyPress={(e) => e.key === 'Enter' && addKw()}
                />
                <Button type="button" variant="outline" size="sm" onClick={addKw} className="h-8 w-8 p-0 border-slate-200">
                  <Plus className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(strategy.keyword_secondarie || []).map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-[8.5px] font-bold bg-indigo-50 border-indigo-100 text-indigo-600 px-1.5 py-0.5 h-auto">
                    {kw}
                    <X className="w-2.5 h-2.5 ml-1 cursor-pointer hover:text-red-500" onClick={() => removeKw(kw)} />
                  </Badge>
                ))}
                {(strategy.keyword_secondarie || []).length === 0 && <span className="text-[9px] text-slate-300 font-medium">Nessuna keyword aggiunta</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Lunghezza</Label>
                  <Select value={(strategy.lunghezza_target || 1500).toString()} onValueChange={(v) => setStrategy({ ...strategy, lunghezza_target: parseInt(v) })}>
                    <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-slate-50/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000" className="text-[11px]">Breve (1k)</SelectItem>
                      <SelectItem value="1500" className="text-[11px]">Standard (1.5k)</SelectItem>
                      <SelectItem value="2500" className="text-[11px]">Pillar (2.5k)</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Intento</Label>
                  <Select value={strategy.search_intent || 'informazionale'} onValueChange={(v) => setStrategy({ ...strategy, search_intent: v })}>
                    <SelectTrigger className="h-8 text-[11px] font-bold border-slate-200 bg-slate-50/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="informazionale" className="text-[11px]">Informa</SelectItem>
                      <SelectItem value="commerciale" className="text-[11px]">Compara</SelectItem>
                      <SelectItem value="transazionale" className="text-[11px]">Azione</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-slate-900 rounded-xl blur opacity-0 group-hover:opacity-[0.02] transition duration-500"></div>
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white relative">
          <div className="bg-slate-50/50 border-b px-5 py-2 flex items-center justify-between">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Note Speciali e Istruzioni</Label>
              <Zap className="w-3 h-3 text-emerald-500 opacity-30" />
          </div>
          <CardContent className="p-0">
            <Textarea
              value={strategy.note_speciali || ''}
              onChange={(e) => setStrategy({ ...strategy, note_speciali: e.target.value })}
              placeholder="Istruzioni aggiuntive (es: tono formale, non citare il prezzo...)"
              rows={2}
              className="border-none focus-visible:ring-0 text-[11px] font-medium p-4 resize-none min-h-[60px] bg-white scrollbar-hide"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
