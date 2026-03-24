import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Zap, Clock, Calendar, CheckCircle2, Globe } from 'lucide-react';

export const AutopilotTab = ({ autopilot, setAutopilot }) => {
  const config = autopilot || { 
    enabled: false, 
    strategy: 'editorial_plan_first', 
    frequency: 'weekly', 
    time_of_day: '09:00',
    auto_publish: true 
  };

  const update = (field, value) => {
    setAutopilot({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50/30 overflow-hidden relative rounded-[2rem]">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap className="w-32 h-32 text-emerald-600" />
        </div>
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-emerald-900 text-xl font-black uppercase tracking-tight">
              <Zap className="w-6 h-6 text-emerald-600 fill-current" />
              SEO Autopilot
            </CardTitle>
            <Switch 
                checked={config.enabled} 
                onCheckedChange={(val) => update('enabled', val)}
                className="data-[state=checked]:bg-emerald-500"
            />
          </div>
          <CardDescription className="text-emerald-700/70 font-medium max-w-md">
            Il bot agirà autonomamente pubblicando nuovi contenuti sul blog WordPress del cliente secondo la frequenza desiderata.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-6">
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Scheduling Temporale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-600 ml-1">Frequenza di Pubblicazione</Label>
                <select 
                    value={config.frequency} 
                    onChange={(e) => update('frequency', e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                >
                    <option value="daily">Ogni Giorno (Massima spinta SEO)</option>
                    <option value="biweekly">Due volte a settimana</option>
                    <option value="weekly">Ogni Settimana (Standard)</option>
                    <option value="monthly">Ogni Mese (Conservativa)</option>
                </select>
            </div>
            
            <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-600 ml-1">Orario di Esecuzione Job</Label>
                <Input 
                    type="time" 
                    value={config.time_of_day} 
                    onChange={(e) => update('time_of_day', e.target.value)}
                    className="h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">Consigliato: 08:30 - 10:00</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-6">
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Strategia & Pubblicazione
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-600 ml-1">Modalità Selezione Contenuto</Label>
                <select 
                    value={config.strategy} 
                    onChange={(e) => update('strategy', e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                >
                    <option value="editorial_plan_first">Priorità al Piano Editoriale (Consigliato)</option>
                    <option value="keyword_combinations">Solo Combinazioni Programmative Random</option>
                </select>
                <p className="text-[10px] text-slate-400 font-medium italic pl-1 leading-relaxed">
                  Agisce sui topic suggeriti dall'Analisi Freshness. Se il piano è vuoto, genera automaticamente per le combinazioni Keyword.
                </p>
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-900">Pubblicazione Automatica</Label>
                    <p className="text-[10px] text-slate-500 font-medium italic">Invia subito in BOZZA su WordPress</p>
                </div>
                <Switch 
                    checked={config.auto_publish} 
                    onCheckedChange={(val) => update('auto_publish', val)}
                    className="data-[state=checked]:bg-emerald-500"
                />
            </div>
          </CardContent>
        </Card>
      </div>

      {config.last_run && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
            <div className="flex-1 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Ultimo Articolo Generato</p>
                <p className="text-lg font-bold flex items-center gap-2">
                   <Calendar className="w-5 h-5 text-slate-500" />
                   {new Date(config.last_run).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="hidden md:block w-[1px] h-12 bg-white/10" />
            <div className="flex-1 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500">Prossima Esecuzione Stimata</p>
                <p className="text-lg font-bold flex items-center gap-2">
                   <Clock className="w-5 h-5 text-emerald-500" />
                   {config.next_run ? new Date(config.next_run).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'In calcolo...'}
                </p>
            </div>
        </div>
      )}
    </div>
  );
};
