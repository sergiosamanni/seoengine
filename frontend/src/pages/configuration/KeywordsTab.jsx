import React from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Plus, X, AlertCircle, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const KeywordsTab = ({ keywords, setKeywords, effectiveClientId, getAuthHeaders }) => {
  const [newServizio, setNewServizio] = React.useState('');
  const [newCitta, setNewCitta] = React.useState('');
  const [newTipo, setNewTipo] = React.useState('');
  const [xlsxUploading, setXlsxUploading] = React.useState(false);
  const [xlsxResult, setXlsxResult] = React.useState(null);

  const addToList = (field, value, setValue) => {
    const trimmedValue = value.trim();
    const currentArray = keywords[field] || [];
    if (trimmedValue && !currentArray.includes(trimmedValue)) {
      setKeywords({ ...keywords, [field]: [...currentArray, trimmedValue] });
      setValue('');
    }
  };

  const removeFromList = (field, value) => {
    const currentArray = keywords[field] || [];
    setKeywords({ ...keywords, [field]: currentArray.filter(v => v !== value) });
  };

  const handleXlsxUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setXlsxUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API}/clients/${effectiveClientId}/upload-xlsx`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setXlsxResult(response.data);
      toast.success(`File elaborato: ${response.data.row_count} righe`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore upload file');
    } finally {
      setXlsxUploading(false);
    }
  };

  const applyXlsxSuggestions = async (mergeMode = 'append') => {
    if (!xlsxResult?.upload_id) return;
    const formData = new FormData();
    formData.append('upload_id', xlsxResult.upload_id);
    formData.append('apply_servizi', 'true');
    formData.append('apply_citta', 'true');
    formData.append('apply_tipi', 'true');
    formData.append('merge_mode', mergeMode);
    try {
      await axios.post(`${API}/clients/${effectiveClientId}/apply-xlsx-suggestions`, formData, {
        headers: getAuthHeaders()
      });
      toast.success('Suggerimenti applicati!');
      // window.location.reload(); // Removed to avoid hard refresh
      setXlsxResult(null);
    } catch (error) {
      toast.error('Errore applicazione suggerimenti');
    }
  };

  const servizi = keywords.servizi || [];
  const citta_e_zone = keywords.citta_e_zone || [];
  const tipi = keywords.tipi_o_qualificatori || [];
  const totalCombos = servizi.length * citta_e_zone.length * tipi.length;

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Configuratore SEO Programmatica</CardTitle>
              <CardDescription className="text-xs">Le liste vengono combinate: [Servizio] + [Tipo] + [Citta]</CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                {totalCombos} Combinazioni Possibili
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-x border-b">
            {/* Servizi */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500">1. Servizi (Cosa offri)</Label>
                <Badge variant="outline" className="text-[10px]">{servizi.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Input
                  value={newServizio}
                  onChange={(e) => setNewServizio(e.target.value)}
                  placeholder="Es: noleggio auto"
                  className="h-8 text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addToList('servizi', newServizio, setNewServizio)}
                />
                <Button variant="outline" size="sm" onClick={() => addToList('servizi', newServizio, setNewServizio)} className="h-8 w-8 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {servizi.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-xs">
                      <span className="truncate max-w-[120px]">{s}</span>
                      <X className="w-3 h-3 text-slate-400 cursor-pointer hover:text-red-500" onClick={() => removeFromList('servizi', s)} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Citta */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500">2. Luoghi (Dove operi)</Label>
                <Badge variant="outline" className="text-[10px]">{citta_e_zone.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Input
                  value={newCitta}
                  onChange={(e) => setNewCitta(e.target.value)}
                  placeholder="Es: Salerno"
                  className="h-8 text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addToList('citta_e_zone', newCitta, setNewCitta)}
                />
                <Button variant="outline" size="sm" onClick={() => addToList('citta_e_zone', newCitta, setNewCitta)} className="h-8 w-8 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {citta_e_zone.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-xs">
                      <span className="truncate max-w-[120px]">{c}</span>
                      <X className="w-3 h-3 text-slate-400 cursor-pointer hover:text-red-500" onClick={() => removeFromList('citta_e_zone', c)} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Tipi */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500">3. Qualificatori (Per chi)</Label>
                <Badge variant="outline" className="text-[10px]">{tipi.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Input
                  value={newTipo}
                  onChange={(e) => setNewTipo(e.target.value)}
                  placeholder="Es: economico, lusso"
                  className="h-8 text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && addToList('tipi_o_qualificatori', newTipo, setNewTipo)}
                />
                <Button variant="outline" size="sm" onClick={() => addToList('tipi_o_qualificatori', newTipo, setNewTipo)} className="h-8 w-8 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {tipi.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-xs">
                      <span className="truncate max-w-[120px]">{t}</span>
                      <X className="w-3 h-3 text-slate-400 cursor-pointer hover:text-red-500" onClick={() => removeFromList('tipi_o_qualificatori', t)} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-medium text-indigo-900 italic">Importazione rapida da Excel (opzionale)</span>
             </div>
             <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleXlsxUpload}
                  disabled={xlsxUploading}
                  className="h-8 text-[10px] border-indigo-200 bg-white w-40"
                />
                {xlsxUploading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                {xlsxResult && (
                  <Button size="sm" onClick={() => applyXlsxSuggestions('append')} className="h-8 bg-indigo-600 text-xs">
                    Applica Suggerimenti ({xlsxResult.row_count} righe)
                  </Button>
                )}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
