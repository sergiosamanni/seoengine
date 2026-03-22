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
  BarChart3, Globe, X, FileText, Users, TrendingUp, Loader2
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Clienti', value: stats.total_clients || stats.clients_count || clients.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Articoli Totali', value: stats.total_articles || stats.articles_count || 0, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pubblicati', value: stats.published_articles || stats.published_count || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Ultimi 7 giorni', value: stats.recent_count || 0, icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => (
            <Card key={s.label} className="border-slate-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Header with Search & New Client */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cerca clienti..." className="pl-10" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} data-testid="client-search-input" />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingClient(null); setFormData({ nome: '', settore: 'altro', agenzia: 'diretto', sito_web: '', siti_web: [], attivo: true }); setNewSiteInput(''); }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-client-btn">
              <Plus className="w-4 h-4 mr-2" />Nuovo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-['Manrope']">{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</DialogTitle>
              <DialogDescription>{editingClient ? 'Modifica i dati del cliente' : 'Aggiungi un nuovo cliente'}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome Azienda</Label>
                  <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Es: Noleggio Auto Salerno" required data-testid="client-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Settore</Label>
                  <Select value={formData.settore} onValueChange={(v) => setFormData({ ...formData, settore: v })}>
                    <SelectTrigger data-testid="client-settore-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{SETTORI.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agenzia / Gruppo</Label>
                  <Select value={formData.agenzia} onValueChange={(v) => setFormData({ ...formData, agenzia: v })}>
                    <SelectTrigger data-testid="client-agenzia-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{AGENZIE.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sito Web Principale</Label>
                  <Input value={formData.sito_web} onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })}
                    placeholder="https://esempio.it" required data-testid="client-website-input" />
                </div>
                <div className="space-y-2">
                  <Label>Siti Aggiuntivi</Label>
                  <div className="space-y-2">
                    {formData.siti_web.filter(s => s !== formData.sito_web).map((site, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border text-sm">
                          <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="truncate">{site}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"
                          onClick={() => setFormData({ ...formData, siti_web: formData.siti_web.filter(s => s !== site) })}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input value={newSiteInput} onChange={(e) => setNewSiteInput(e.target.value)} placeholder="https://altrosito.it" className="flex-1"
                        data-testid="add-site-input"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newSiteInput.trim() && !formData.siti_web.includes(newSiteInput.trim())) { setFormData({ ...formData, siti_web: [...formData.siti_web, newSiteInput.trim()] }); setNewSiteInput(''); } } }} />
                      <Button type="button" variant="outline" size="sm" data-testid="add-site-btn"
                        onClick={() => { if (newSiteInput.trim() && !formData.siti_web.includes(newSiteInput.trim())) { setFormData({ ...formData, siti_web: [...formData.siti_web, newSiteInput.trim()] }); setNewSiteInput(''); } }}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annulla</Button>
                <Button type="submit" className="bg-slate-900" data-testid="save-client-btn">{editingClient ? 'Salva Modifiche' : 'Crea Cliente'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients Table Grouped by Agency */}
      {filteredClients.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{searchQuery ? 'Nessun cliente trovato' : 'Nessun cliente. Crea il primo!'}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={AGENZIE.map(a => a.value)} className="space-y-4">
          {AGENZIE.map((agenzia) => {
            const agencyClients = filteredClients.filter(c => {
               const clientAgency = (c.agenzia || 'diretto').toLowerCase();
               return clientAgency === agenzia.value.toLowerCase();
            });

            if (agencyClients.length === 0) return null;

            return (
              <AccordionItem key={agenzia.value} value={agenzia.value} className="border-none">
                <AccordionTrigger className="hover:no-underline py-0 mb-4 [&[data-state=open]>div]:rounded-b-none">
                  <div className={`w-full flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all ${agenzia.value === 'Lead-IA' ? 'bg-indigo-50/50 border-indigo-100' :
                    agenzia.value === 'Freedom' ? 'bg-emerald-50/50 border-emerald-100' :
                      agenzia.value === 'Aibrid' ? 'bg-amber-50/50 border-amber-100' :
                        'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${agenzia.value === 'Lead-IA' ? 'bg-indigo-100 text-indigo-600 border-indigo-200' :
                        agenzia.value === 'Freedom' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                          agenzia.value === 'Aibrid' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                            'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-bold text-slate-900 font-['Manrope']">
                          {agenzia.label}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {agencyClients.length} {agencyClients.length === 1 ? 'cliente' : 'clienti'}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent>
                  <Card className="border-slate-200 overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Cliente</TableHead>
                            <TableHead className="font-semibold">Settore</TableHead>
                            <TableHead className="font-semibold">Articoli</TableHead>
                            <TableHead className="font-semibold">Stato</TableHead>
                            <TableHead className="font-semibold text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agencyClients.map((client) => (
                            <TableRow key={client.id} className="hover:bg-slate-50 cursor-pointer" data-testid={`client-row-${client.id}`}
                              onClick={() => navigate(`/clients/${client.id}`)}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${agenzia.value === 'Lead-IA' ? 'bg-indigo-50 text-indigo-600' :
                                    agenzia.value === 'Freedom' ? 'bg-emerald-50 text-emerald-600' :
                                      agenzia.value === 'Aibrid' ? 'bg-amber-50 text-amber-600' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {client.nome?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900">{client.nome}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <a
                                        href={client.sito_web}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {client.sito_web.replace('https://', '').replace(/\/$/, '')}
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                      {(client.siti_web?.length || 0) > 1 && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-200 text-slate-500 bg-white">
                                          +{client.siti_web.length - 1} siti
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell><span className="text-slate-600">{SETTORI.find(s => s.value === client.settore)?.label || client.settore}</span></TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{client.totale_articoli || 0}</span>
                                  <span className="text-[10px] text-slate-400 font-medium">generati</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={client.attivo ? "default" : "secondary"}
                                  className={client.attivo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}>
                                  {client.attivo ? 'Attivo' : 'Inattivo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`client-actions-${client.id}`}><MoreHorizontal className="w-4 h-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}><PenTool className="w-4 h-4 mr-2" />Genera Articoli</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/config`)}><Settings className="w-4 h-4 mr-2" />Configurazione</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/gsc`)}><BarChart3 className="w-4 h-4 mr-2" />Google Search Console</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditDialog(client)}><Edit className="w-4 h-4 mr-2" />Modifica</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-600 focus:text-red-600"><Trash2 className="w-4 h-4 mr-2" />Elimina</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};
