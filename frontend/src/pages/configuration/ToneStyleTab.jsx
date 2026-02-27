import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Plus, X } from 'lucide-react';

const REGISTRI = [
  { value: 'formale', label: 'Formale', desc: 'Tono istituzionale' },
  { value: 'professionale_accessibile', label: 'Professionale Accessibile', desc: 'Professionale ma comprensibile' },
  { value: 'amichevole_conversazionale', label: 'Amichevole', desc: 'Come parlare con un amico' },
  { value: 'entusiasta_coinvolgente', label: 'Entusiasta', desc: 'Energico e motivante' },
  { value: 'autorevole_tecnico', label: 'Autorevole Tecnico', desc: 'Esperto del settore' },
];

const PERSONA = [
  { value: 'seconda_singolare', label: 'Tu (seconda singolare)', desc: 'Piu personale e diretto' },
  { value: 'prima_plurale', label: 'Noi (prima plurale)', desc: 'Piu istituzionale' },
  { value: 'terza_neutrale', label: 'Neutrale (terza persona)', desc: 'Piu giornalistico' },
];

export const ToneStyleTab = ({ tono, setTono }) => {
  const [newAggettivo, setNewAggettivo] = React.useState('');
  const [newParolaVietata, setNewParolaVietata] = React.useState('');
  const [newFraseVietata, setNewFraseVietata] = React.useState('');

  const addToList = (field, value, setValue) => {
    const trimmedValue = value.trim();
    const currentArray = tono[field] || [];
    if (trimmedValue && !currentArray.includes(trimmedValue)) {
      setTono({ ...tono, [field]: [...currentArray, trimmedValue] });
      setValue('');
    }
  };

  const removeFromList = (field, value) => {
    const currentArray = tono[field] || [];
    setTono({ ...tono, [field]: currentArray.filter(v => v !== value) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-slate-200">
        <CardHeader><CardTitle>Registro e Persona</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Registro</Label>
            <Select value={tono.registro} onValueChange={(v) => setTono({ ...tono, registro: v })}>
              <SelectTrigger data-testid="tone-registro-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGISTRI.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div><span className="font-medium">{r.label}</span><span className="text-slate-500 ml-2 text-xs">{r.desc}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Persona Narrativa</Label>
            <Select value={tono.persona_narrativa} onValueChange={(v) => setTono({ ...tono, persona_narrativa: v })}>
              <SelectTrigger data-testid="tone-persona-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERSONA.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div><span className="font-medium">{p.label}</span><span className="text-slate-500 ml-2 text-xs">{p.desc}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrizione Tono Libera</Label>
            <Textarea
              value={tono.descrizione_tono_libera}
              onChange={(e) => setTono({ ...tono, descrizione_tono_libera: e.target.value })}
              placeholder="Descrivi il tono desiderato in modo libero..."
              rows={3}
              data-testid="tone-desc-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle>Aggettivi del Brand</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newAggettivo}
              onChange={(e) => setNewAggettivo(e.target.value)}
              placeholder="Es: affidabile, professionale"
              onKeyPress={(e) => e.key === 'Enter' && addToList('aggettivi_brand', newAggettivo, setNewAggettivo)}
              data-testid="tone-agg-input"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addToList('aggettivi_brand', newAggettivo, setNewAggettivo)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(tono.aggettivi_brand || []).map((agg) => (
              <Badge key={agg} className="bg-blue-50 text-blue-700 border-blue-200">
                {agg}
                <button onClick={() => removeFromList('aggettivi_brand', agg)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Parole Vietate</CardTitle>
          <CardDescription>Parole da evitare negli articoli</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newParolaVietata}
              onChange={(e) => setNewParolaVietata(e.target.value)}
              placeholder="Es: ovviamente, semplicemente"
              onKeyPress={(e) => e.key === 'Enter' && addToList('parole_vietate', newParolaVietata, setNewParolaVietata)}
              data-testid="tone-parole-input"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addToList('parole_vietate', newParolaVietata, setNewParolaVietata)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(tono.parole_vietate || []).map((pv) => (
              <Badge key={pv} variant="outline" className="text-red-600 border-red-200">
                {pv}
                <button onClick={() => removeFromList('parole_vietate', pv)} className="ml-1 hover:text-red-800"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Frasi Vietate</CardTitle>
          <CardDescription>Frasi da evitare negli articoli</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newFraseVietata}
              onChange={(e) => setNewFraseVietata(e.target.value)}
              placeholder="Es: non esitare a contattarci"
              onKeyPress={(e) => e.key === 'Enter' && addToList('frasi_vietate', newFraseVietata, setNewFraseVietata)}
              data-testid="tone-frasi-input"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addToList('frasi_vietate', newFraseVietata, setNewFraseVietata)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-[120px]">
            <div className="space-y-2">
              {(tono.frasi_vietate || []).map((fv, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-red-700">{fv}</span>
                  <button onClick={() => removeFromList('frasi_vietate', fv)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
