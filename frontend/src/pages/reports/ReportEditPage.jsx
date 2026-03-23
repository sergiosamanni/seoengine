import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  ArrowLeft, Save, Plus, Trash2, Layout, Table, 
  BarChart3, Target, MousePointer2, Link, Quote, 
  MapPin, Loader2, CheckCircle2, Globe, ExternalLink,
  UploadCloud, Printer
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const MODULE_DEFS = [
  { id: 'attivita', label: 'Attività Svolte', icon: Layout, description: 'Articoli, Landing Page, Categorie, Automatismi e Altro' },
  { id: 'keywords_local', label: 'Posizionamento Keywords Local', icon: Target, description: 'Monitoraggio del posizionamento delle parole chiave locali' },
  { id: 'traffico', label: 'Traffico Generale', icon: BarChart3, description: 'Dati di traffico da Google Search Console' },
  { id: 'keywords', label: 'Posizionamento Keywords', icon: Target, description: 'Monitoraggio del posizionamento nazionale delle parole chiave' },
  { id: 'leads', label: 'Lead Ricevuti', icon: MousePointer2, description: 'Elenco e conteggio dei lead ricevuti nel mese' },
  { id: 'link_building', label: 'Link Building', icon: Link, description: 'Link e anchor text acquisiti su siti esterni' },
  { id: 'citazioni', label: 'Citazioni nei Portali', icon: Quote, description: 'Citazioni e presenza su portali locali' },
  { id: 'gmb', label: 'Google My Business', icon: MapPin, description: 'Attività e post su Google My Business' },
];

export const ReportEditPage = () => {
  const { reportId } = useParams();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);
  const [modules, setModules] = useState({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`${API}/reports/${reportId}`, { headers: getAuthHeaders() });
        setReport(res.data);
        setModules(res.data.modules || {});
      } catch (e) {
        toast.error('Errore nel caricamento del report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId, getAuthHeaders]);

  const toggleModule = (id) => {
    setModules(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = { enabled: true, data: {} };
      }
      return next;
    });
  };

  const updateModuleData = (id, data) => {
    setModules(prev => ({
      ...prev,
      [id]: { ...prev[id], data }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/reports/${reportId}`, {
        modules
      }, { headers: getAuthHeaders() });
      toast.success('Report salvato con successo');
    } catch (e) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
        await axios.delete(`${API}/reports/${reportId}`, { headers: getAuthHeaders() });
        toast.success('Report eliminato');
        navigate(`/reports/client/${report.client_id}`);
    } catch (e) {
        toast.error('Errore durante l\'eliminazione');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-20 print:p-0 print:max-w-none">
      <style>{`
        @media print {
            .no-print, nav, aside, button, .print-hide { display: none !important; }
            body { background: white !important; }
            .print-full { width: 100% !important; max-width: none !important; border: none !important; box-shadow: none !important; }
            .print-break { page-break-after: always; }
            .card { border: 1px solid #eee !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/client/${report.client_id}`)} className="h-8 w-8 p-0 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{report.title}</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Editor Report Mensile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={() => window.print()} variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-bold uppercase tracking-tight text-[9px] text-slate-500 hover:bg-slate-50">
                <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>
            <Button onClick={() => setIsDeleteConfirmOpen(true)} variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-bold uppercase tracking-tight text-[9px] text-red-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 px-4 rounded-xl font-bold uppercase tracking-tight text-[10px] shadow-sm ml-2">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Salva Report
            </Button>
        </div>
      </div>

      <div className="print:block hidden mb-10 border-b-2 border-slate-100 pb-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">{report.title}</h1>
        <div className="flex justify-between items-center">
            <p className="text-blue-600 font-black uppercase tracking-widest text-sm">Report SEO Mensile</p>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Data Report: {report.date}</p>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden p-5 bg-white no-print">
        <div className="mb-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-tight text-[11px] mb-1">Moduli Report</h3>
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Seleziona i moduli da includere</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2">
          {MODULE_DEFS.map(m => {
            const isEnabled = !!modules[m.id];
            return (
              <div 
                key={m.id} 
                onClick={() => toggleModule(m.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer group relative flex items-center gap-2.5 ${
                  isEnabled 
                  ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100 shadow-sm' 
                  : 'bg-white border-slate-100 hover:border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center transition-all ${isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                    <m.icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                    <h5 className={`font-bold uppercase tracking-tight text-[9px] truncate ${isEnabled ? 'text-blue-700' : 'text-slate-500'}`}>{m.label}</h5>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Modules Forms */}
      <div className="space-y-6">
        {MODULE_DEFS.filter(m => modules[m.id]).map(m => (
          <ModuleForm 
            key={m.id} 
            module={m} 
            data={modules[m.id].data || {}} 
            updateData={(d) => updateModuleData(m.id, d)} 
          />
        ))}
      </div>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="font-black tracking-tighter uppercase text-slate-900">Conferma Eliminazione</DialogTitle>
                <p className="text-xs text-slate-500 font-medium">Sei sicuro di voler eliminare definitivamente questo report? L'azione non è reversibile.</p>
            </DialogHeader>
            <DialogFooter className="flex gap-2 pt-4">
                <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">Annulla</Button>
                <Button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl font-bold uppercase tracking-widest text-[10px] text-white">Elimina ora</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ModuleForm = ({ module, data, updateData }) => {
    switch (module.id) {
        case 'attivita': return <AttivitaForm module={module} data={data} updateData={updateData} />;
        case 'citazioni': return <CitazioniForm module={module} data={data} updateData={updateData} />;
        case 'gmb': return <GmbForm module={module} data={data} updateData={updateData} />;
        case 'traffico': return <GscForm module={module} data={data} updateData={updateData} />;
        case 'keywords_local':
        case 'keywords':
        case 'leads':
        case 'link_building':
            return <GenericSheetsForm module={module} data={data} updateData={updateData} />;
        default: return null;
    }
};

const AttivitaForm = ({ module, data, updateData }) => {
    const items = data.items || [];
    const addItem = () => updateData({ ...data, items: [...items, { title: '', date: '', type: 'articolo' }] });
    const removeItem = (i) => updateData({ ...data, items: items.filter((_, idx) => idx !== i) });
    const setItem = (i, f, v) => {
        const next = [...items];
        next[i] = { ...next[i], [f]: v };
        updateData({ ...data, items: next });
    };

    return (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                        <module.icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <CardTitle className="text-[12px] font-bold uppercase tracking-tight text-slate-700">{module.label}</CardTitle>
                </div>
                <Button size="sm" onClick={addItem} variant="ghost" className="h-7 px-2 rounded-lg text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-tight text-[9px]"><Plus className="w-3 h-3 mr-1" /> Aggiungi</Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {items.length === 0 && <p className="text-[11px] text-slate-400 italic text-center py-4">Nessuna attività aggiunta.</p>}
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 group">
                        <Input value={item.title} onChange={(e) => setItem(i, 'title', e.target.value)} placeholder="Titolo attività (es: Articolo Blog...)" className="flex-1 h-9 rounded-xl text-xs font-bold" />
                        <Input type="date" value={item.date} onChange={(e) => setItem(i, 'date', e.target.value)} className="w-36 h-9 rounded-xl text-xs font-bold" />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

const CitazioniForm = ({ module, data, updateData }) => {
    const items = data.items || [];
    const addItem = () => updateData({ ...data, items: [...items, { portal: '', url: '', date: '' }] });
    const removeItem = (i) => updateData({ ...data, items: items.filter((_, idx) => idx !== i) });
    const setItem = (i, f, v) => {
        const next = [...items];
        next[i] = { ...next[i], [f]: v };
        updateData({ ...data, items: next });
    };

    return (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                        <module.icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <CardTitle className="text-[12px] font-bold uppercase tracking-tight text-slate-700">{module.label}</CardTitle>
                </div>
                <Button size="sm" onClick={addItem} variant="ghost" className="h-7 px-2 rounded-lg text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-tight text-[9px]"><Plus className="w-3 h-3 mr-1" /> Aggiungi</Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50/50 rounded-2xl relative group">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Nome Portale</Label>
                            <Input value={item.portal} onChange={(e) => setItem(i, 'portal', e.target.value)} placeholder="es: Hotfrog" className="h-9 rounded-xl text-xs font-bold" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">URL</Label>
                            <Input value={item.url} onChange={(e) => setItem(i, 'url', e.target.value)} placeholder="https://..." className="h-9 rounded-xl text-xs font-bold" />
                        </div>
                        <div className="space-y-1 relative">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data</Label>
                            <div className="flex items-center gap-2">
                                <Input type="date" value={item.date} onChange={(e) => setItem(i, 'date', e.target.value)} className="h-9 rounded-xl text-xs font-bold" />
                                <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

const GmbForm = ({ module, data, updateData }) => {
    const items = data.items || [];
    const addItem = () => updateData({ ...data, items: [...items, { description: '', url: '', date: '', type: 'Post Pubblicato' }] });
    const removeItem = (i) => updateData({ ...data, items: items.filter((_, idx) => idx !== i) });
    const setItem = (i, f, v) => {
        const next = [...items];
        next[i] = { ...next[i], [f]: v };
        updateData({ ...data, items: next });
    };

    return (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                        <module.icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <CardTitle className="text-[12px] font-bold uppercase tracking-tight text-slate-700">{module.label}</CardTitle>
                </div>
                <Button size="sm" onClick={addItem} variant="ghost" className="h-7 px-2 rounded-lg text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-tight text-[9px]"><Plus className="w-3 h-3 mr-1" /> Aggiungi</Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Link Profilo GMB (opzionale)</Label>
                    <Input value={data.profile_url || ''} onChange={(e) => updateData({ ...data, profile_url: e.target.value })} placeholder="https://business.google.com/..." className="h-9 rounded-xl text-xs font-bold" />
                </div>
                {items.map((item, i) => (
                    <div key={i} className="p-4 bg-slate-50/50 rounded-2xl space-y-3 relative group border border-slate-100">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="absolute top-2 right-2 h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></Button>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tipo Attività</Label>
                                <Input value={item.type} onChange={(e) => setItem(i, 'type', e.target.value)} className="h-9 rounded-xl text-xs font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data</Label>
                                <Input type="date" value={item.date} onChange={(e) => setItem(i, 'date', e.target.value)} className="h-9 rounded-xl text-xs font-bold" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Descrizione / Titolo</Label>
                            <Input value={item.description} onChange={(e) => setItem(i, 'description', e.target.value)} placeholder="es: Post sulle disinfestazioni..." className="h-9 rounded-xl text-xs font-bold" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Link Post (opzionale)</Label>
                            <Input value={item.url} onChange={(e) => setItem(i, 'url', e.target.value)} placeholder="https://..." className="h-9 rounded-xl text-xs font-bold" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

const GscForm = ({ module, data, updateData }) => {
    return (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center border-b border-slate-100 p-4">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 mr-3">
                    <module.icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <CardTitle className="text-[12px] font-bold uppercase tracking-tight text-slate-700">{module.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                    <Button variant="outline" className="bg-white border-slate-200 h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm">
                        <UploadCloud className="w-4 h-4 mr-2 text-blue-500" /> Carica Screenshot GSC
                    </Button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-3">Carica l'andamento mensile di Search Console</p>
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Link Google Sheets (Dati Traffico)</Label>
                    <Input value={data.sheets_url || ''} onChange={(e) => updateData({ ...data, sheets_url: e.target.value })} placeholder="https://docs.google.com/spreadsheets/..." className="h-9 rounded-xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Commento sull'andamento (opzionale)</Label>
                    <Textarea 
                        value={data.comment || ''} 
                        onChange={(e) => updateData({ ...data, comment: e.target.value })} 
                        placeholder="Descrivi l'andamento del traffico visualizzato..." 
                        className="rounded-2xl text-xs min-h-[100px] border-slate-100" 
                    />
                    <div className="flex justify-between mt-1 text-[8px] text-slate-300 font-bold uppercase tracking-widest">
                        <span>Supporta MarkDown: **grasssetto** *corsivo*</span>
                        <span>Shift + Enter per a capo</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const GenericSheetsForm = ({ module, data, updateData }) => {
    return (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center border-b border-slate-100 p-4">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 mr-3">
                    <module.icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <CardTitle className="text-[12px] font-bold uppercase tracking-tight text-slate-700">{module.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Link Google Sheets ({module.label})</Label>
                    <Input value={data.sheets_url || ''} onChange={(e) => updateData({ ...data, sheets_url: e.target.value })} placeholder="https://docs.google.com/spreadsheets/..." className="h-9 rounded-xl text-xs font-bold" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Commento sull'andamento</Label>
                    <Textarea 
                        value={data.comment || ''} 
                        onChange={(e) => updateData({ ...data, comment: e.target.value })} 
                        placeholder="Inscerisci un commento..." 
                        className="rounded-2xl text-xs min-h-[80px] border-slate-100" 
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default ReportEditPage;
