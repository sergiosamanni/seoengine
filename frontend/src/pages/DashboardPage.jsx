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
  { id: 'aibrid', label: 'Aibrid', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { id: 'lead_ia', label: 'Lead-IA', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'personali', label: 'Personali', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  { id: 'altro', label: 'Altro / Non Assegnato', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
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

  const handleDelete = async (clientId) => {
    if (!window.confirm('Eliminare questo cliente?')) return;
    try {
      await axios.delete(`${API}/clients/${clientId}`, { headers: getAuthHeaders() });
      toast.success('Cliente eliminato');
      fetchClients();
    } catch (e) { toast.error('Errore eliminazione'); }
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
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Clienti', value: stats.total_clients || stats.clients_count || clients.length, icon: Users },
            { label: 'Articoli Totali', value: stats.total_articles || stats.articles_count || 0, icon: FileText },
            { label: 'Pubblicati', value: stats.published_articles || stats.published_count || 0, icon: TrendingUp },
            { label: 'Ultimi 7 giorni', value: stats.recent_count || 0, icon: BarChart3 },
          ].map(s => (
            <Card key={s.label} className="border-[#f1f3f6] shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {/* Clients Table */}
      <Card className="border-[#f1f3f6] shadow-sm overflow-hidden rounded-xl" data-testid="clients-table-card">
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-400 text-sm font-medium">{searchQuery ? 'Nessun risultato' : 'Inizia aggiungendo un cliente'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-4 pl-6 text-slate-400">Cliente</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-4 text-slate-400">Settore</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-4 text-slate-400">Articoli</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-4 text-slate-400">Stato</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-4 text-right pr-6 text-slate-400">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AGENZIE.map((agenzia) => {
                  const clientsInAgency = filteredClients.filter(c => {
                    const clientAgency = c.agenzia || 'altro';
                    if (agenzia.id === 'altro') {
                        return !AGENZIE.find(a => a.id === clientAgency && a.id !== 'altro');
                    }
                    return clientAgency === agenzia.id;
                  });
                  if (clientsInAgency.length === 0 && searchQuery) return null;
                  if (clientsInAgency.length === 0 && agenzia.id === 'altro') return null;
                  
                  const isCollapsed = collapsedAgencies[agenzia.id];
                  
                  return (
                    <React.Fragment key={agenzia.id}>
                      {/* Agency Header Row - More Sober */}
                      <TableRow 
                        className="bg-white hover:bg-slate-50/30 cursor-pointer border-y border-[#f1f3f6]"
                        onClick={() => setCollapsedAgencies(prev => ({ ...prev, [agenzia.id]: !prev[agenzia.id] }))}
                      >
                        <TableCell colSpan={5} className="py-2.5 px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-900" />}
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${isCollapsed ? 'text-slate-400' : 'text-slate-900'}`}>{agenzia.label}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">{clientsInAgency.length}</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Client Rows */}
                      {!isCollapsed && clientsInAgency.map((client) => (
                        <TableRow key={client.id} className="bg-white hover:bg-slate-50/50 cursor-pointer group transition-colors border-b border-[#f1f3f6]/50 last:border-0" 
                          onClick={() => navigate(`/clients/${client.id}`)}>
                          <TableCell className="pl-12 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
                                {client.nome?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-900">{client.nome}</p>
                                <p className="text-[10px] text-slate-400">{client.sito_web}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-[10px] font-medium text-slate-500 px-2 py-0.5 rounded-full bg-white border border-slate-100 uppercase tracking-tighter">{SETTORI.find(s => s.value === client.settore)?.label || client.settore}</span></TableCell>
                          <TableCell><span className="text-xs font-bold text-slate-600 tabular-nums">{client.totale_articoli || 0}</span></TableCell>
                          <TableCell>
                            <div className={`w-1.5 h-1.5 rounded-full ${client.attivo ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                          </TableCell>
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-white" 
                                onClick={() => openEditDialog(client)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                onClick={() => handleDelete(client.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
