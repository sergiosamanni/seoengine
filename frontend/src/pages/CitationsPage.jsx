import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '../components/ui/dialog';
import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { 
  MapPin, Plus, Search, FileDown, FileUp, Loader2, CheckCircle2, 
  Trash2, ExternalLink, Filter, Globe, X, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const CitationsPage = () => {
  const { getAuthHeaders, isAdmin } = useAuth();
  const [portals, setPortals] = useState([]);
  const [clients, setClients] = useState([]);
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  
  // Modals
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newPortal, setNewPortal] = useState({ name: '', url: '', category: 'directory' });
  const [toggling, setToggling] = useState({}); // { portalId_clientId: true }
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [getAuthHeaders]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes, citRes] = await Promise.all([
        axios.get(`${API}/portals`, { headers: getAuthHeaders() }),
        axios.get(`${API}/clients`, { headers: getAuthHeaders() }),
        axios.get(`${API}/citations`, { headers: getAuthHeaders() })
      ]);
      setPortals(pRes.data);
      setClients(cRes.data);
      setCitations(citRes.data);
    } catch (e) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPortal = async () => {
    if (!newPortal.name) return toast.error('Nome richiesto');
    try {
      const res = await axios.post(`${API}/portals`, newPortal, { headers: getAuthHeaders() });
      setPortals(prev => [...prev, res.data]);
      setIsPortalModalOpen(false);
      setNewPortal({ name: '', url: '', category: 'directory' });
      toast.success('Portale aggiunto');
    } catch (e) {
      toast.error('Errore');
    }
  };

  const handleToggle = async (portalId, clientId) => {
    const key = `${portalId}_${clientId}`;
    const current = citations.find(c => c.portal_id === portalId && c.client_id === clientId);
    
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      const res = await axios.post(`${API}/citations/toggle`, {
        portal_id: portalId,
        client_id: clientId,
        status: !current
      }, { headers: getAuthHeaders() });

      if (current) {
        setCitations(prev => prev.filter(c => !(c.portal_id === portalId && c.client_id === clientId)));
        toast.info('Citazione rimossa');
      } else {
        setCitations(prev => [...prev, res.data]);
        toast.success('Citazione segnata');
      }
    } catch (e) {
      toast.error('Errore nel salvataggio');
    } finally {
      setToggling(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/portals/import`, formData, { 
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } 
      });
      fetchData();
      setIsImportModalOpen(false);
      toast.success('Portali importati con successo');
    } catch (e) {
      toast.error('Errore durante l\'importazione');
    } finally {
      setImporting(false);
    }
  };

  const filteredPortals = portals.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.url?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citazioni Local & Directory</h1>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[9px]">Presenza digitale nei portali di settore e locali</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)} className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-200 bg-white shadow-sm">
                <FileUp className="w-3.5 h-3.5 mr-2" /> Importa Excel
            </Button>
            <Button onClick={() => setIsPortalModalOpen(true)} size="sm" className="h-9 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-slate-900 border-none shadow-lg shadow-slate-200">
                <Plus className="w-3.5 h-3.5 mr-2" /> Nuovo Portale
            </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <Input 
                placeholder="Filtra portali (es: Pagine Gialle)" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 pl-9 border-slate-100 bg-white rounded-xl text-xs font-bold"
            />
        </div>
        <div className="relative flex-1 max-w-sm">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <Input 
                placeholder="Filtra clienti (es: Nurdig)" 
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="h-10 pl-9 border-slate-100 bg-white rounded-xl text-xs font-bold"
            />
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
            <ScrollArea className="w-full">
                <div className="min-w-[1200px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 tracking-widest sticky left-0 z-10 bg-slate-50/90 backdrop-blur shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[250px]">
                                    Portale / Directory
                                </th>
                                {filteredClients.map(c => (
                                    <th key={c.id} className="px-4 py-4 border-b border-slate-100 text-[10px] font-bold text-slate-600 text-center min-w-[140px]">
                                        {c.nome}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPortals.map((p) => {
                                return (
                                    <tr key={p.id} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 backdrop-blur shadow-[2px_0_5px_rgba(0,0,0,0.02)] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                                                    <Globe className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">{p.name}</p>
                                                    {p.url && (
                                                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 font-medium hover:text-blue-500 flex items-center gap-1">
                                                            {p.url.replace('https://','').split('/')[0]} <ExternalLink className="w-2.5 h-2.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {filteredClients.map((c) => {
                                            const key = `${p.id}_${c.id}`;
                                            const citation = citations.find(cit => cit.portal_id === p.id && cit.client_id === c.id);
                                            const isTogglingItem = toggling[key];
                                            
                                            return (
                                                <td key={c.id} className="px-4 py-4 text-center">
                                                    <button 
                                                        onClick={() => handleToggle(p.id, c.id)}
                                                        disabled={isTogglingItem}
                                                        className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center transition-all ${
                                                            citation 
                                                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner' 
                                                            : 'bg-white text-slate-200 border border-slate-100 hover:border-slate-300 hover:text-slate-400'
                                                        }`}
                                                    >
                                                        {isTogglingItem ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : citation ? (
                                                            <Check className="w-4 h-4 stroke-[3px]" />
                                                        ) : (
                                                            <Plus className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    {citation && (
                                                        <p className="text-[8px] mt-1 font-bold text-emerald-600/60 uppercase tracking-tighter">
                                                            {citation.date || 'ATTIVO'}
                                                        </p>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
      </Card>

      {/* NEW PORTAL DIALOG */}
      <Dialog open={isPortalModalOpen} onOpenChange={setIsPortalModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 max-w-md p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 bg-slate-900 text-white">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">Nuovo Portale Directory</DialogTitle>
                <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">
                    Aggiungi un nuovo portale al database globale
                </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Portale</label>
                    <Input 
                        value={newPortal.name}
                        onChange={e => setNewPortal({...newPortal, name: e.target.value})}
                        placeholder="es: Pagine Gialle Locali"
                        className="h-12 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-bold"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link Sito / Directory URL</label>
                    <Input 
                        value={newPortal.url}
                        onChange={e => setNewPortal({...newPortal, url: e.target.value})}
                        placeholder="https://www.esempio.it"
                        className="h-12 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-bold"
                    />
                </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex-row gap-3">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600" onClick={() => setIsPortalModalOpen(false)}>Annulla</Button>
                <Button onClick={handleAddPortal} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-slate-900 shadow-xl shadow-slate-200">Crea Portale</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT DIALOG */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="rounded-2xl border-slate-100 max-w-sm">
            <DialogHeader>
                <DialogTitle className="text-lg font-bold">Importa da Excel</DialogTitle>
                <DialogDescription className="text-xs">
                    Carica un file XLSX/CSV con le colonne <strong>name</strong> e opzionalmente <strong>url</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="py-6">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-slate-300 transition-colors relative group">
                    <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        onChange={handleImport}
                        disabled={importing}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {importing ? (
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
                    ) : (
                        <>
                            <FileDown className="w-8 h-8 mx-auto text-slate-200 mb-2 group-hover:scale-110 transition-transform" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Clicca o trascina il file</p>
                        </>
                    )}
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
