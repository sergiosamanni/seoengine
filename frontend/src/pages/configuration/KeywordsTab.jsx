import React from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
      toast.success('Suggerimenti applicati! Ricarica per vedere le modifiche.');
      window.location.reload();
    } catch (error) {
      toast.error('Errore applicazione suggerimenti');
    }
  };

  const servizi = keywords.servizi || [];
  const citta_e_zone = keywords.citta_e_zone || [];
  const tipi = keywords.tipi_o_qualificatori || [];

  return (
    <>
      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Le tre liste vengono combinate automaticamente. Ogni combinazione = un articolo possibile.
          <br />
          <strong>Strategia:</strong> Servizi = cosa offri | Citta = dove sei | Tipi = per chi/quale tipo
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Servizi */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Servizi</CardTitle>
            <CardDescription>Cosa offri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newServizio}
                onChange={(e) => setNewServizio(e.target.value)}
                placeholder="Es: noleggio auto"
                onKeyPress={(e) => e.key === 'Enter' && addToList('servizi', newServizio, setNewServizio)}
                data-testid="kw-servizi-input"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addToList('servizi', newServizio, setNewServizio)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {servizi.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg font-mono text-sm">
                    <span>{s}</span>
                    <button onClick={() => removeFromList('servizi', s)} className="text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-slate-500 text-center">{servizi.length} servizi</p>
          </CardContent>
        </Card>

        {/* Citta e Zone */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Citta e Zone</CardTitle>
            <CardDescription>Dove operi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCitta}
                onChange={(e) => setNewCitta(e.target.value)}
                placeholder="Es: Salerno"
                onKeyPress={(e) => e.key === 'Enter' && addToList('citta_e_zone', newCitta, setNewCitta)}
                data-testid="kw-citta-input"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addToList('citta_e_zone', newCitta, setNewCitta)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {citta_e_zone.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg font-mono text-sm">
                    <span>{c}</span>
                    <button onClick={() => removeFromList('citta_e_zone', c)} className="text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-slate-500 text-center">{citta_e_zone.length} localita</p>
          </CardContent>
        </Card>

        {/* Tipi/Qualificatori */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Tipi/Qualificatori</CardTitle>
            <CardDescription>Per chi/quale tipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value)}
                placeholder="Es: economico, di lusso"
                onKeyPress={(e) => e.key === 'Enter' && addToList('tipi_o_qualificatori', newTipo, setNewTipo)}
                data-testid="kw-tipi-input"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addToList('tipi_o_qualificatori', newTipo, setNewTipo)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {tipi.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg font-mono text-sm">
                    <span>{t}</span>
                    <button onClick={() => removeFromList('tipi_o_qualificatori', t)} className="text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-slate-500 text-center">{tipi.length} qualificatori</p>
          </CardContent>
        </Card>
      </div>

      {/* Combinations Preview */}
      <Card className="border-slate-200 mt-6">
        <CardHeader>
          <CardTitle>Anteprima Combinazioni</CardTitle>
          <CardDescription>
            {servizi.length} servizi x {citta_e_zone.length} citta x {tipi.length} tipi ={' '}
            <strong className="text-slate-900 ml-1">{servizi.length * citta_e_zone.length * tipi.length} articoli possibili</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {servizi.slice(0, 2).map(s =>
              citta_e_zone.slice(0, 2).map(c =>
                tipi.slice(0, 2).map(t => (
                  <Badge key={`${s}-${c}-${t}`} variant="outline" className="font-mono text-xs">
                    {s} {t} a {c}
                  </Badge>
                ))
              )
            )}
            {(servizi.length * citta_e_zone.length * tipi.length) > 8 && (
              <Badge variant="secondary" className="font-mono text-xs">
                +{(servizi.length * citta_e_zone.length * tipi.length) - 8} altre
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* XLSX Upload Section */}
      <Card className="border-slate-200 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-slate-600" />
            Import da XLSX
          </CardTitle>
          <CardDescription>Carica un file Excel per importare keyword automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleXlsxUpload}
              disabled={xlsxUploading}
              className="max-w-sm"
              data-testid="xlsx-upload-input"
            />
            {xlsxUploading && <Loader2 className="w-5 h-5 animate-spin text-slate-500" />}
          </div>
          {xlsxResult && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{xlsxResult.filename}</p>
                  <p className="text-sm text-slate-500">{xlsxResult.row_count} righe - {xlsxResult.columns.length} colonne</p>
                </div>
              </div>
              {xlsxResult.suggestions && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Servizi rilevati</p>
                    <p className="text-lg font-bold text-slate-900">{xlsxResult.suggestions.servizi?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Citta rilevate</p>
                    <p className="text-lg font-bold text-slate-900">{xlsxResult.suggestions.citta_e_zone?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Tipi rilevati</p>
                    <p className="text-lg font-bold text-slate-900">{xlsxResult.suggestions.tipi_o_qualificatori?.length || 0}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => applyXlsxSuggestions('append')} className="bg-slate-900" data-testid="xlsx-append-btn">
                  Aggiungi ai dati esistenti
                </Button>
                <Button onClick={() => applyXlsxSuggestions('replace')} variant="outline" data-testid="xlsx-replace-btn">
                  Sostituisci dati esistenti
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
