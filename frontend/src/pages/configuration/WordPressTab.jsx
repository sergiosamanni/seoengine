import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Globe, User, Key, FileJson } from 'lucide-react';

export const WordPressTab = ({ wordpress, setWordpress }) => {
  const config = wordpress || { url_api: '', utente: '', password_applicazione: '', stato_pubblicazione: 'draft' };

  const update = (field, value) => {
    setWordpress({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-6">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Integrazione WordPress
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600 ml-1">URL API (Endpoint Posts)</Label>
              <div className="relative">
                <FileJson className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    value={config.url_api} 
                    onChange={(e) => update('url_api', e.target.value)}
                    placeholder="https://sito.it/wp-json/wp/v2/posts"
                    className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-5 font-bold"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600 ml-1">Utente Autore</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    value={config.utente} 
                    onChange={(e) => update('utente', e.target.value)}
                    placeholder="E es: admin_seo"
                    className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-5 font-bold"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600 ml-1">Password Applicazione</Label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    type="password"
                    value={config.password_applicazione} 
                    onChange={(e) => update('password_applicazione', e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-5 font-bold"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">Generala nel profilo utente su WordPress</p>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600 ml-1">Stato Pubblicazione</Label>
              <Select 
                value={config.stato_pubblicazione} 
                onValueChange={(val) => update('stato_pubblicazione', val)}
              >
                <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold text-sm outline-none shadow-none">
                    <SelectValue placeholder="Scegli stato" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                    <SelectItem value="draft" className="rounded-xl font-bold">Bozza (Sicuro)</SelectItem>
                    <SelectItem value="publish" className="rounded-xl font-bold text-emerald-600">Pubblica Subito (Live)</SelectItem>
                    <SelectItem value="pending" className="rounded-xl font-bold">In Revisione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50 flex justify-end">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm text-right">
                Ricorda di premere il tasto di salvataggio generale nella barra in alto per rendere effettive le modifiche su Arredo Horeca.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
