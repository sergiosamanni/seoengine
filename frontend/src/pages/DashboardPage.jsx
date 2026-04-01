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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, ExternalLink, Settings, PenTool,
  BarChart3, Globe, X, FileText, Users, TrendingUp, Loader2, Shield, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

const AGENZIE = [
  { value: 'Lead-IA', label: 'Lead-IA' },
  { value: 'Freedom', label: 'Freedom' },
  { value: 'Aibrid', label: 'Aibrid' },
  { value: 'personali', label: 'Personali' },
  { value: 'diretto', label: 'Diretto / Altro' },
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
  const [formData, setFormData] = useState({ nome: '', settore: 'altro', agenzia: 'diretto', sito_web: '', siti_web: [], attivo: true });
  const [newSiteInput, setNewSiteInput] = useState('');

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
      setFormData({ nome: '', settore: 'altro', agenzia: 'diretto', sito_web: '', siti_web: [], attivo: true });
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
      nome: client.nome, settore: client.settore, agenzia: client.agenzia || 'diretto', sito_web: client.sito_web,
      siti_web: client.siti_web || [client.sito_web].filter(Boolean), attivo: client.attivo
    });
    setNewSiteInput('');
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(c =>
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sito_web.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-['Manrope']">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Gestisci i tuoi clienti e monitora le performance SEO.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            {clients.length} Clienti Attivi
          </Badge>
        </div>
      </div>

      {/* Stats Row - Premium and Compact */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Clienti', value: stats.total_clients || stats.clients_count || clients.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
            { label: 'Articoli', value: stats.total_articles || stats.articles_count || 0, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
            { label: 'Pubblicati', value: stats.published_articles || stats.published_count || 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Trend (7gg)', value: `+${stats.recent_count || 0}`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900 font-['Manrope']">{s.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Cerca cliente o sito web..." 
            className="pl-10 h-11 bg-slate-50/50 border-slate-200/60 focus:bg-white transition-all rounded-xl text-sm" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200/60 text-slate-500 hover:text-blue-600" onClick={() => navigate('/users')}>
              <Users className="w-4.5 h-4.5" />
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingClient(null); setFormData({ nome: '', settore: 'altro', agenzia: 'diretto', sito_web: '', siti_web: [], attivo: true }); setNewSiteInput(''); }
          }}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-semibold shadow-lg shadow-slate-900/10 group transition-all" data-testid="new-client-btn">
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" /> Nuovo Cliente
              </Button>
            </DialogTrigger>
            {/* Dialog Content stays similar but with improved UI tokens if needed */}
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-['Manrope']">{editingClient ? 'Modifica Cliente' : 'Crea Nuovo Cliente'}</DialogTitle>
                <DialogDescription className="text-slate-500">Configura i dettagli dell'azienda e i siti web associati.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Ragione Sociale</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="h-12 rounded-xl" placeholder="Nome dell'azienda..." required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Settore</Label>
                    <Select value={formData.settore} onValueChange={(v) => setFormData({ ...formData, settore: v })}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{SETTORI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Agenzia</Label>
                    <Select value={formData.agenzia} onValueChange={(v) => setFormData({ ...formData, agenzia: v })}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{AGENZIE.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Sito Web (Root)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={formData.sito_web} onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })}
                      className="h-12 rounded-xl pl-10" placeholder="https://..." required />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Annulla</Button>
                  <Button type="submit" className="bg-slate-950 rounded-xl px-8">{editingClient ? 'Aggiorna' : 'Crea Cliente'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-6">
        {filteredClients.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Nessun risultato</h3>
            <p className="text-slate-500 text-sm">Non abbiamo trovato clienti che corrispondono alla tua ricerca.</p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={AGENZIE.map(a => a.value)} className="space-y-6">
            {AGENZIE.map((agenzia) => {
              const agencyClients = filteredClients.filter(c => (c.agenzia || 'diretto').toLowerCase() === agenzia.value.toLowerCase());
              if (agencyClients.length === 0) return null;

              return (
                <AccordionItem key={agenzia.value} value={agenzia.value} className="border-none">
                  <AccordionTrigger className="hover:no-underline p-0 flex items-center gap-4 group">
                    <div className="flex items-center gap-3 py-1">
                      <div className={`w-1.5 h-6 rounded-full transition-all duration-300 ${
                        agenzia.value === 'Lead-IA' ? 'bg-indigo-500' :
                        agenzia.value === 'Freedom' ? 'bg-emerald-500' :
                        agenzia.value === 'Aibrid' ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`} />
                      <h3 className="text-base font-bold text-slate-900 font-['Manrope']">{agenzia.label}</h3>
                      <Badge variant="outline" className="text-[10px] font-bold rounded-full border-slate-200 text-slate-500">
                        {agencyClients.length}
                      </Badge>
                    </div>
                    <div className="h-[1px] flex-1 bg-slate-200/60 group-hover:bg-slate-300/60 transition-colors" />
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {agencyClients.map((client) => (
                        <div 
                          key={client.id}
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-4 h-4 text-blue-500" />
                          </div>
                          
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                              <Globe className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{client.nome}</h4>
                              <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                {client.sito_web.replace(/^https?:\/\//, '')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[10px] uppercase font-bold px-2">
                              {client.settore || 'Altro'}
                            </Badge>
                            {client.config_check?.gsc && (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-bold px-2">
                                GSC OK
                              </Badge>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); openEditDialog(client); }}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
};
