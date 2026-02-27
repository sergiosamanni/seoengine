import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Plus, X } from 'lucide-react';

export const KnowledgeBaseTab = ({ knowledge, setKnowledge }) => {
  const [newPuntoInteresse, setNewPuntoInteresse] = React.useState('');
  const [newPuntoForza, setNewPuntoForza] = React.useState('');

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

  return (
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
  );
};
