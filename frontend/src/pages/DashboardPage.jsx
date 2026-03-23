import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, ExternalLink, Settings, PenTool,
  BarChart3, Globe, X, FileText, Users, TrendingUp, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const AGENZIE = [
  { id: 'aibrid', label: 'Aibrid', color: 'bg-sky-50 text-sky-700 border-sky-100', dot: 'bg-sky-200' },
  { id: 'lead_ia', label: 'Lead-IA', color: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-200' },
  { id: 'personali', label: 'Personali', color: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-300' },
  { id: 'altro', label: 'Altro / Non Assegnato', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-200' },
];

const SETTORI = [
  { value: 'noleggio_veicoli', label: 'Noleggio Veicoli' },
  { value: 'ristorazione', label: 'Ristorazione' },
  { value: 'salute_benessere', label: 'Salute & Benessere' },
  { value: 'immobiliare', label: 'Immobiliare' },
  { value: 'turismo_hospitality', label: 'Turismo & Hospitality' },
  { value: 'professioni_legali', label: 'Professioni Legali' },
  { value: 'professioni_mediche', label: 'Professioni Mediche' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'artigianato', label: 'Artigianato' },
  { value: 'servizi_aziendali', label: 'Servizi Aziendali' },
  { value: 'altro', label: 'Altro' },
];

export const DashboardPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({ nome: '', settore: 'altro', agenzia: 'aibrid', sito_web: '', siti_web: [], attivo: true });
  const [newSiteInput, setNewSiteInput] = useState('');
  const [collapsedAgencies, setCollapsedAgencies] = useState({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers = getAuthHeaders();
        if (isAdmin) {
          const [clientsRes, statsRes] = await Promise.all([
            axios.get(`${API}/clients`, { headers }),
            axios.get(`${API}/stats/overview`, { headers })
          ]);
          setClients(clientsRes.data);
          setStats(statsRes.data);
        } else {
          // Client user — redirect to generator
          if (user?.client_id) navigate(`/generate`);
        }
      } catch (error) {
        toast.error('Errore nel caricamento');
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`, { headers: getAuthHeaders() });
      setClients(res.data);
    } catch (e) { toast.error('Errore caricamento clienti'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.sito_web && !payload.siti_web.includes(payload.sito_web)) {
      payload.siti_web = [payload.sito_web, ...payload.siti_web];
    }
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.id}`, payload, { headers: getAuthHeaders() });
        toast.success('Cliente aggiornato');
      } else {
        await axios.post(`${API}/clients`, payload, { headers: getAuthHeaders() });
        toast.success('Cliente creato');
      }
      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData({ nome: '', settore: 'altro', agenzia: 'aibrid', sito_web: '', siti_web: [], attivo: true });
      setNewSiteInput('');
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio');
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await axios.delete(`${API}/clients/${clientToDelete}`, { headers: getAuthHeaders() });
      toast.success('Cliente eliminato');
      setIsDeleteConfirmOpen(false);
      setClientToDelete(null);
      fetchClients();
    } catch (e) { toast.error('Errore eliminazione'); }
  };

  const confirmDelete = (clientId) => {
    setClientToDelete(clientId);
    setIsDeleteConfirmOpen(true);
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome, settore: client.settore, agenzia: client.agenzia || 'altro', sito_web: client.sito_web,
      siti_web: client.siti_web || [client.sito_web].filter(Boolean), attivo: client.attivo
    });
    setNewSiteInput('');
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(c =>
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sito_web.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">

      {/* Header with Search & New Client */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#f1f3f6] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <Input placeholder="Cerca clienti..." className="pl-10 h-10 border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm rounded-lg" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} data-testid="client-search-input" />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingClient(null); setFormData({ nome: '', settore: 'altro', agenzia: 'aibrid', sito_web: '', siti_web: [], attivo: true }); setNewSiteInput(''); }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 h-10 rounded-lg px-5 shadow-lg shadow-slate-200" data-testid="new-client-btn">
              <Plus className="w-4 h-4 mr-2" />Nuovo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Crea Nuovo Cliente</DialogTitle>
              <DialogDescription className="text-xs">Inserisci i dettagli per iniziare la generazione contenuti.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Nome Azienda</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Es: Noleggio Auto Salerno" required className="h-10 rounded-lg border-slate-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Agenzia</Label>
                  <Select value={formData.agenzia} onValueChange={(v) => setFormData({ ...formData, agenzia: v })}>
                    <SelectTrigger className="h-10 rounded-lg border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>{AGENZIE.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Settore</Label>
                  <Select value={formData.settore} onValueChange={(v) => setFormData({ ...formData, settore: v })}>
                    <SelectTrigger className="h-10 rounded-lg border-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>{SETTORI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Sito Web principale</Label>
                  <Input value={formData.sito_web} onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })}
                    placeholder="https://esempio.it" required className="h-10 rounded-lg border-slate-100" />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-10 text-xs">Annulla</Button>
                <Button type="submit" className="bg-slate-900 h-10 px-6 rounded-lg text-xs" data-testid="save-client-btn">Salva Cliente</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
          {AGENZIE.map((agenzia) => {
              const clientsInAgency = filteredClients.filter(c => {
                  const clientAgency = c.agenzia || 'altro';
                  if (agenzia.id === 'altro') {
                      return !AGENZIE.find(a => a.id === clientAgency && a.id !== 'altro');
                  }
                  return clientAgency === agenzia.id;
              });

              if (clientsInAgency.length === 0 && (searchQuery || agenzia.id === 'altro')) return null;
              if (clientsInAgency.length === 0) return null;

              const isCollapsed = collapsedAgencies[agenzia.id];

              return (
                  <div key={agenzia.id} className="space-y-4">
                      <div 
                          className="flex items-center justify-between px-4 py-2 bg-slate-50/50 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors group border border-slate-100/50"
                          onClick={() => setCollapsedAgencies(prev => ({ ...prev, [agenzia.id]: !prev[agenzia.id] }))}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`w-1 h-4 rounded-full ${agenzia.dot}`} />
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-900" />}
                              <span className={`text-[11px] font-black uppercase tracking-widest ${isCollapsed ? 'text-slate-400' : 'text-slate-900'}`}>{agenzia.label}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white border border-slate-100 text-slate-500 font-black">{clientsInAgency.length}</span>
                          </div>
                      </div>

                      {!isCollapsed && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                              {clientsInAgency.map(client => (
                                  <Card 
                                      key={client.id} 
                                      className="hover:shadow-xl hover:shadow-indigo-100/20 transition-all border-slate-100 shadow-sm group cursor-pointer active:scale-[0.99] rounded-xl overflow-hidden bg-white border-l-0"
                                      onClick={() => navigate(`/clients/${client.id}`)}
                                  >
                                      <CardContent className="p-0 flex items-stretch h-14">
                                          <div className={`w-1 ${agenzia.dot} group-hover:w-1.5 transition-all`} />
                                          <div className="flex-1 flex items-center justify-between px-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-white group-hover:text-blue-600 transition-all">
                                                      {client.nome?.charAt(0).toUpperCase()}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <h4 className="font-black text-slate-800 uppercase tracking-tighter text-[13px] leading-none group-hover:text-blue-600 transition-colors truncate max-w-[140px]">
                                                          {client.nome}
                                                      </h4>
                                                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[140px]">
                                                          {client.sito_web?.replace('https://', '').replace('www.', '')}
                                                      </p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                  <Button 
                                                      variant="ghost" 
                                                      size="sm" 
                                                      className="h-8 px-2 rounded-lg font-black uppercase tracking-widest text-[7px] flex items-center gap-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all group/btn"
                                                      onClick={(e) => { e.stopPropagation(); navigate(`/reports/client/${client.id}`); }}
                                                  >
                                                      <FileText className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                      <span className="hidden sm:inline">Report</span>
                                                  </Button>
                                                  <Button 
                                                      variant="ghost" 
                                                      size="sm" 
                                                      className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100"
                                                      onClick={(e) => { e.stopPropagation(); openEditDialog(client); }}
                                                  >
                                                      <Edit className="w-3.5 h-3.5" />
                                                  </Button>
                                                  <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      className="h-8 w-8 p-0 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                      onClick={(e) => { e.stopPropagation(); confirmDelete(client.id); }}
                                                  >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                  </Button>
                                                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                                      <ChevronRight className="w-3.5 h-3.5" />
                                                  </div>
                                              </div>
                                          </div>
                                      </CardContent>
                                  </Card>
                              ))}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="font-black tracking-tighter uppercase text-slate-900">Elimina Cliente</DialogTitle>
                <p className="text-xs text-slate-500 font-medium">Sei sicuro di voler eliminare definitivamente questo cliente e tutti i suoi dati? L'azione non è reversibile.</p>
            </DialogHeader>
            <DialogFooter className="flex gap-2 pt-4">
                <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px]">Annulla</Button>
                <Button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl font-black uppercase tracking-widest text-[10px] text-white shadow-lg shadow-red-100">Sì, elimina</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
