import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Settings2, Globe, Languages } from 'lucide-react';

export const SEOSettingsTab = ({ seo, setSeo }) => {
  const config = seo || { lingua: 'italiano', lunghezza_minima_parole: 1500, include_faq_in_fondo: false };

  const update = (field, value) => {
    setSeo({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-6">
          <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Parametri Globali SEO
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600 ml-1">Lingua Principale</Label>
              <div className="relative">
                <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                    value={config.lingua} 
                    onChange={(e) => update('lingua', e.target.value)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-5 font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                >
                    <option value="italiano">Italiano</option>
                    <option value="inglese">Inglese</option>
                    <option value="spagnolo">Spagnolo</option>
                    <option value="francese">Francese</option>
                    <option value="tedesco">Tedesco</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-600 ml-1">Lunghezza Minima (Parole)</Label>
              <Input 
                type="number" 
                value={config.lunghezza_minima_parole} 
                onChange={(e) => update('lunghezza_minima_parole', parseInt(e.target.value))}
                className="h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold"
              />
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">Consigliato: 1200 - 2000 per articoli Pillar</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-2">
              Sitemap URL
              <Globe className="w-3 h-3 text-slate-400" />
            </Label>
            <Input 
              type="url" 
              placeholder="https://www.tuosito.it/sitemap_index.xml" 
              value={config.sitemap_url || ''} 
              onChange={(e) => update('sitemap_url', e.target.value)}
              className="h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold"
            />
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">URL Assoluto della sitemap per indicizzazione e linking interno</p>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-slate-900">FAQ Schema & Section</Label>
              <p className="text-[10px] text-slate-500 font-medium italic">Includi automaticamente una sezione FAQ alla fine di ogni articolo.</p>
            </div>
            <Switch 
              checked={config.include_faq_in_fondo} 
              onCheckedChange={(val) => update('include_faq_in_fondo', val)}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
