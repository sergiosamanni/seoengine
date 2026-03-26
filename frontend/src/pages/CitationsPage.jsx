import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../config';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { 
  MapPin, Plus, Search, FileDown, FileUp, Loader2, CheckCircle2, 
  Trash2, ExternalLink, Filter, Globe, X, Check, Users
} from 'lucide-react';
import { ConfirmationModal } from '../components/ui/confirmation-modal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';



const AGENZIE = [
  { id: 'all', label: 'Tutte le agenzie', color: 'bg-slate-900 text-white', dot: 'bg-slate-400' },
  { id: 'aibrid', label: 'Aibrid', color: 'bg-sky-50 text-sky-700 border-sky-100', dot: 'bg-sky-400' },
  { id: 'lead_ia', label: 'Lead-IA', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
  { id: 'personali', label: 'Personali', color: 'bg-yellow-50 text-yellow-900 border-yellow-100', dot: 'bg-yellow-500' },
  { id: 'altro', label: 'Altro / Diretto', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-300' },
];

export const CitationsPage = () => {
  const { getAuthHeaders, isAdmin } = useAuth();
  const [portals, setPortals] = useState([]);
  const [clients, setClients] = useState([]);
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientModalSearch, setClientModalSearch] = useState('');
  const [visibleClientIds, setVisibleClientIds] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState('all');
  
  // Modals
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClientSelectModalOpen, setIsClientSelectModalOpen] = useState(false);
  const [newPortal, setNewPortal] = useState({ name: '', url: '', category: 'directory' });
  const [toggling, setToggling] = useState({}); // { portalId_clientId: true }
  const [importing, setImporting] = useState(false);

  // Deletion Confirm
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [portalToDelete, setPortalToDelete] = useState(null);

  // Citation Toggle/Edit Modal
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [activeToggle, setActiveToggle] = useState({ portalId: '', clientId: '', portalName: '', clientName: '', link: '', date: '', notes: '', status: false });

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
      if (visibleClientIds.length === 0) {
        setVisibleClientIds(cRes.data.map(c => c.id));
      }
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

  const handleToggle = async (portalId, clientId, portalName, clientName) => {
    const key = `${portalId}_${clientId}`;
    const current = citations.find(c => c.portal_id === portalId && c.client_id === clientId);
    
    // Always open modal to allow link/date entry
    setActiveToggle({
      portalId,
      clientId,
      portalName,
      clientName,
      link: current?.link || '',
      date: current?.date || new Date().toISOString(),
      notes: current?.notes || '',
      status: !!current
    });
    setIsToggleModalOpen(true);
  };

  const saveCitation = async () => {
    const { portalId, clientId, link, date, notes, status } = activeToggle;
    const key = `${portalId}_${clientId}`;
    
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      const res = await axios.post(`${API}/citations/toggle`, {
        portal_id: portalId,
        client_id: clientId,
        status: status,
        link,
        date,
        notes
      }, { headers: getAuthHeaders() });

      if (!status) {
        setCitations(prev => prev.filter(c => !(c.portal_id === portalId && c.client_id === clientId)));
        toast.info('Citazione rimossa');
      } else {
        setCitations(prev => {
          const filtered = prev.filter(c => !(c.portal_id === portalId && c.client_id === clientId));
          return [...filtered, res.data];
        });
        toast.success('Citazione salvata');
      }
      setIsToggleModalOpen(false);
    } catch (e) {
      toast.error('Errore nel salvataggio');
    } finally {
      setToggling(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDeletePortal = (id) => {
    setPortalToDelete(id);
    setIsConfirmDialogOpen(true);
  };

  const confirmDeletePortal = async () => {
    if (!portalToDelete) return;
    try {
      await axios.delete(`${API}/portals/${portalToDelete}`, { headers: getAuthHeaders() });
      setPortals(prev => prev.filter(p => p.id !== portalToDelete));
      toast.success('Portale eliminato');
    } catch (e) {
      toast.error('Errore');
    } finally {
      setIsConfirmDialogOpen(false);
      setPortalToDelete(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/portals/template`, { 
        headers: getAuthHeaders(),
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_portali.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error('Errore nel download del template');
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

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(clientSearch.toLowerCase());
    const matchesAgency = selectedAgency === 'all' || (c.agenzia || 'altro') === selectedAgency;
    // Visibile solo se selezionato esplicitamente O se non ci sono restrizioni
    const isVisible = visibleClientIds.length === 0 || visibleClientIds.includes(c.id);
    return matchesSearch && matchesAgency && isVisible;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Citazioni Local & Directory</h1>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[9px]">Presenza digitale nei portali di settore e locali</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsClientSelectModalOpen(true)} className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-200 bg-white shadow-sm">
                <Users className="w-3.5 h-3.5 mr-2" /> Gestisci Clienti
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest border-emerald-100 bg-emerald-50/30 text-emerald-600 shadow-sm">
                <FileDown className="w-3.5 h-3.5 mr-2" /> Template Excel
            </Button>
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
                placeholder="Filtra clienti (es: Hotel Roma)" 
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="h-10 pl-9 border-slate-100 bg-white rounded-xl text-xs font-bold"
            />
        </div>
        <div className="relative flex-1 max-w-[200px]">
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="h-10 border-slate-100 bg-white rounded-xl text-xs font-bold focus:ring-0">
                    <SelectValue placeholder="Agenzia" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl overflow-hidden">
                    {AGENZIE.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs font-bold py-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                                {a.label}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
            <ScrollArea className="w-full">
                <div className="min-w-[1200px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-5 py-4 border-b border-slate-100 text-[9px] uppercase font-black text-slate-400 tracking-widest sticky left-0 top-0 z-30 bg-slate-50 backdrop-blur shadow-[2px_2px_5px_rgba(0,0,0,0.03)] min-w-[200px]">
                                    Portale / Directory
                                </th>
                                {filteredClients.map(c => {
                                    const agency = AGENZIE.find(a => a.id === (c.agenzia || 'altro')) || AGENZIE[4];
                                    return (
                                        <th key={c.id} className={`px-1 py-4 border-b border-slate-100 text-[9px] font-bold text-center min-w-[90px] sticky top-0 z-10 backdrop-blur border-l border-slate-100/50 leading-tight ${agency.color.split(' ')[0]}/30`}>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${agency.dot}`} />
                                                <div className="max-w-[75px] mx-auto truncate text-slate-900" title={c.nome}>
                                                    {c.nome}
                                                </div>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPortals.map((p) => {
                                return (
                                    <tr key={p.id} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="px-5 py-4 sticky left-0 z-20 bg-white group-hover:bg-slate-50/95 backdrop-blur shadow-[2px_0_5px_rgba(0,0,0,0.03)] transition-colors border-r border-slate-50">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform flex-shrink-0">
                                                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">{p.name}</p>
                                                    {p.url && (
                                                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-slate-400 font-medium hover:text-blue-500 flex items-center gap-1">
                                                            Lancia <ExternalLink className="w-2 h-2" />
                                                        </a>
                                                    )}
                                                </div>
                                                {isAdmin && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDeletePortal(p.id)}
                                                        className="w-7 h-7 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 ml-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                        {filteredClients.map((c) => {
                                            const key = `${p.id}_${c.id}`;
                                            const citation = citations.find(cit => cit.portal_id === p.id && cit.client_id === c.id);
                                            const isTogglingItem = toggling[key];
                                            
                                            return (
                                                <td key={c.id} className="px-2 py-4 text-center border-l border-slate-50/50">
                                                    <div className="relative inline-block group/cell">
                                                        <button 
                                                            onClick={() => handleToggle(p.id, c.id, p.name, c.nome)}
                                                            disabled={isTogglingItem}
                                                            className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center transition-all ${
                                                                citation 
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner' 
                                                                : 'bg-white text-slate-200 border border-slate-100 hover:border-slate-300 hover:text-slate-400'
                                                            }`}
                                                        >
                                                            {isTogglingItem ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : citation ? (
                                                                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                                                            ) : (
                                                                <Plus className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                        
                                                        {citation?.link && (
                                                            <a 
                                                                href={citation.link} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm z-10"
                                                                title="Vedi citazione"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink className="w-2 h-2" />
                                                            </a>
                                                        )}
                                                        
                                                        {citation && (
                                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-full whitespace-nowrap">
                                                                <p className="text-[7px] font-bold text-emerald-600/50 uppercase tracking-tighter tabular-nums">
                                                                    {(() => {
                                                                        try {
                                                                            const d = new Date(citation.date);
                                                                            return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' }).format(d);
                                                                        } catch (e) {
                                                                            return citation.date?.split('-').slice(0,2).join('/') || 'ACTIVE';
                                                                        }
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
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

      {/* CLIENT SELECT DIALOG */}
      <Dialog open={isClientSelectModalOpen} onOpenChange={setIsClientSelectModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 max-w-lg p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 bg-slate-900 text-white">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">Gestisci Clienti Visibili</DialogTitle>
                <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">
                    Scegli quali colonne mostrare nella tabella delle citazioni
                </DialogDescription>
            </DialogHeader>
            <div className="p-0">
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                        <Input 
                            placeholder="Cerca cliente..." 
                            className="h-10 pl-9 border-slate-100 bg-slate-50/50 rounded-xl text-xs font-bold"
                            value={clientModalSearch}
                            onChange={(e) => setClientModalSearch(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="h-[400px]">
                    <div className="p-4 space-y-2">
                        {clients.filter(c => c.nome.toLowerCase().includes(clientModalSearch.toLowerCase())).map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => {
                                    if (visibleClientIds.includes(c.id)) {
                                        setVisibleClientIds(prev => prev.filter(id => id !== c.id));
                                    } else {
                                        setVisibleClientIds(prev => [...prev, c.id]);
                                    }
                                }}
                                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                                    visibleClientIds.includes(c.id)
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200'
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${visibleClientIds.includes(c.id) ? 'bg-white/10' : 'bg-slate-50'}`}>
                                        <Globe className={`w-4 h-4 ${visibleClientIds.includes(c.id) ? 'text-white' : 'text-slate-400'}`} />
                                    </div>
                                    <span className="text-xs font-black tracking-tight">{c.nome}</span>
                                </div>
                                {visibleClientIds.includes(c.id) ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-100" />
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
                <Button className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-slate-900 shadow-xl shadow-slate-200" onClick={() => setIsClientSelectModalOpen(false)}>
                    Conferma Selezione ({visibleClientIds.length})
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CITATION EDIT DIALOG */}
      <Dialog open={isToggleModalOpen} onOpenChange={setIsToggleModalOpen}>
        <DialogContent className="rounded-3xl border-slate-100 max-w-md p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 bg-slate-900 text-white">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">Gestisci Citazione</DialogTitle>
                <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">
                    {activeToggle.portalName} • {activeToggle.clientName}
                </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Stato Presenza</p>
                        <p className="text-xs font-bold text-slate-700">{activeToggle.status ? "Citazione Attiva" : "Non Segnata"}</p>
                    </div>
                    <Button 
                        onClick={() => setActiveToggle({...activeToggle, status: !activeToggle.status})}
                        variant={activeToggle.status ? "default" : "outline"}
                        className={`h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeToggle.status ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    >
                        {activeToggle.status ? "Attiva" : "Inattiva"}
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link Citazione (URL Pubblico)</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                            <Input 
                                value={activeToggle.link}
                                onChange={e => setActiveToggle({...activeToggle, link: e.target.value})}
                                placeholder="https://www.directory.it/cliente"
                                className="h-12 border-slate-100 bg-slate-50/50 rounded-xl pl-10 pr-5 font-bold text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Data Creazione</label>
                        <Input 
                            type="date"
                            value={activeToggle.date ? activeToggle.date.split('T')[0] : ''}
                            onChange={e => setActiveToggle({...activeToggle, date: e.target.value})}
                            className="h-12 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-bold text-xs"
                        />
                    </div>
                </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex-row gap-3">
                <Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] text-slate-400" onClick={() => setIsToggleModalOpen(false)}>Chiudi</Button>
                <Button onClick={saveCitation} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-slate-900 shadow-xl shadow-slate-200">Salva Tutto</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal 
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={confirmDeletePortal}
        title="Elimina Portale"
        description="Sei sicuro di voler eliminare questo portale? Tutte le citazioni collegate a questo portale andranno perse definitivamente."
      />
    </div>
  );
};
