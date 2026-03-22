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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Settings,
  PenTool,
  BarChart3,
  Globe,
  X,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

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
  { value: 'diretto', label: 'Diretto / Altro' },
];

export const ClientsPage = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    settore: 'altro',
    agenzia: 'diretto',
    sito_web: '',
    siti_web: [],
    attivo: true
  });
  const [newSiteInput, setNewSiteInput] = useState('');

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: getAuthHeaders()
      });
      setClients(response.data);
    } catch (error) {
      toast.error('Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    // Ensure siti_web includes sito_web
    if (payload.sito_web && !payload.siti_web.includes(payload.sito_web)) {
      payload.siti_web = [payload.sito_web, ...payload.siti_web];
    }
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.id}`, payload, {
          headers: getAuthHeaders()
        });
        toast.success('Cliente aggiornato');
      } else {
        await axios.post(`${API}/clients`, payload, {
          headers: getAuthHeaders()
        });
        toast.success('Cliente creato');
      }

      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData({ nome: '', settore: 'altro', agenzia: 'diretto', sito_web: '', siti_web: [], attivo: true });
      setNewSiteInput('');
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante il salvataggio');
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente?')) return;

    try {
      await axios.delete(`${API}/clients/${clientId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Cliente eliminato');
      fetchClients();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome,
      settore: client.settore,
      agenzia: client.agenzia || 'diretto',
      sito_web: client.sito_web,
      siti_web: client.siti_web || [client.sito_web].filter(Boolean),
      attivo: client.attivo
    });
    setNewSiteInput('');
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.sito_web.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Registro Workspace</h1>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">Amministrazione Clienti e Progetti</p>
        </div>

        <div className="flex items-center gap-3">
            <div className="bg-white border border-[#f1f3f6] rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 tracking-tight">{clients.length}</span>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
                setEditingClient(null);
                setFormData({ nome: '', settore: 'altro', agenzia: 'diretto', sito_web: '', siti_web: [], attivo: true });
                setNewSiteInput('');
            }
            }}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200" data-testid="new-client-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Cliente
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-[#f1f3f6]">
                <DialogHeader className="p-8 bg-slate-50 border-b border-[#f1f3f6]">
                <DialogTitle className="text-lg font-bold">
                    {editingClient ? 'Modifica Cliente' : 'Crea Nuovo Cliente'}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">
                    {editingClient ? 'Aggiorna i dati anagrafici' : 'Configura un nuovo workspace'}
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 ml-1">Ragione Sociale</Label>
                            <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Nome Azienda"
                                className="h-10 border-[#f1f3f6] rounded-xl text-xs font-bold shadow-sm"
                                required
                                data-testid="client-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 ml-1">Sito Principale</Label>
                            <Input
                                id="sito_web"
                                value={formData.sito_web}
                                onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })}
                                placeholder="https://esempio.it"
                                className="h-10 border-[#f1f3f6] rounded-xl text-xs font-bold shadow-sm"
                                required
                                data-testid="client-website-input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 ml-1">Settore</Label>
                        <Select
                            value={formData.settore}
                            onValueChange={(value) => setFormData({ ...formData, settore: value })}
                        >
                            <SelectTrigger className="h-10 border-[#f1f3f6] rounded-xl text-xs font-bold shadow-sm" data-testid="client-settore-select">
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] rounded-xl border-[#f1f3f6]">
                            {SETTORI.map((s) => (
                                <SelectItem key={s.value} value={s.value} className="text-xs font-medium">
                                {s.label}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>

                        <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 ml-1">Agenzia / Gruppo</Label>
                        <Select
                            value={formData.agenzia}
                            onValueChange={(value) => setFormData({ ...formData, agenzia: value })}
                        >
                            <SelectTrigger className="h-10 border-[#f1f3f6] rounded-xl text-xs font-bold shadow-sm" data-testid="client-agenzia-select">
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-[#f1f3f6]">
                            {AGENZIE.map((a) => (
                                <SelectItem key={a.value} value={a.value} className="text-xs font-medium">
                                {a.label}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                            <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Siti Aggiuntivi</Label>
                            <span className="text-[9px] font-bold text-slate-300">MULTIDOMAIN</span>
                        </div>
                        <div className="space-y-2">
                            {formData.siti_web.filter(s => s !== formData.sito_web).map((site, i) => (
                            <div key={i} className="flex items-center gap-2 group/site">
                                <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-slate-50 border border-[#f1f3f6] rounded-xl shadow-sm transition-all hover:border-slate-300">
                                    <Globe className="w-3 h-3 text-slate-300" />
                                    <span className="text-[11px] font-bold text-slate-600 truncate">{site}</span>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                    onClick={() => setFormData({ ...formData, siti_web: formData.siti_web.filter(s => s !== site) })}
                                    data-testid={`remove-site-${i}`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            ))}
                            <div className="flex gap-2">
                                <div className="relative flex-1 group/add">
                                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                    <Input
                                        value={newSiteInput}
                                        onChange={(e) => setNewSiteInput(e.target.value)}
                                        placeholder="Nuovo dominio..."
                                        className="h-10 pl-9 border-[#f1f3f6] rounded-xl text-xs font-bold shadow-sm focus:ring-0 focus:border-slate-300"
                                        data-testid="add-site-input"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = newSiteInput.trim();
                                                if (val && !formData.siti_web.includes(val)) {
                                                    setFormData({ ...formData, siti_web: [...formData.siti_web, val] });
                                                    setNewSiteInput('');
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <Button type="button" variant="outline" className="h-10 border-[#f1f3f6] rounded-xl text-xs font-bold"
                                    onClick={() => {
                                        const val = newSiteInput.trim();
                                        if (val && !formData.siti_web.includes(val)) {
                                            setFormData({ ...formData, siti_web: [...formData.siti_web, val] });
                                            setNewSiteInput('');
                                        }
                                    }}
                                    data-testid="add-site-btn"
                                >
                                    Aggiungi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-[#f1f3f6] gap-2 flex-row sm:justify-end">
                    <Button type="button" variant="ghost" className="text-xs font-bold uppercase tracking-widest text-slate-400 h-11 px-6 rounded-xl" onClick={() => setIsDialogOpen(false)}>
                    Annulla
                    </Button>
                    <Button type="submit" className="bg-slate-900 h-11 px-8 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200" data-testid="save-client-btn">
                    {editingClient ? 'Aggiorna' : 'Crea'}
                    </Button>
                </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Search - Minimal */}
      <div className="relative group max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
        <Input
          placeholder="Cerca workspace..."
          className="pl-9 h-10 border-[#f1f3f6] bg-white rounded-xl text-xs font-medium focus:ring-0 focus:border-slate-300 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="client-search-input"
        />
      </div>

      {/* Clients List - Clean Accordion Groups */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-24 bg-white border border-[#f1f3f6] rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Globe className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Nessun workspace trovato</p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={AGENZIE.map(a => a.value)} className="space-y-4">
          {AGENZIE.map((agenzia) => {
            const agencyClients = filteredClients.filter(c =>
              (c.agenzia || 'diretto') === agenzia.value
            );

            if (agencyClients.length === 0) return null;

            return (
              <AccordionItem key={agenzia.value} value={agenzia.value} className="border-none">
                <AccordionTrigger className="hover:no-underline py-0 mb-3 group [&[data-state=open]>div]:rounded-b-none">
                  <div className={`w-full flex items-center justify-between p-4 rounded-2xl border bg-white shadow-sm transition-all border-[#f1f3f6] group-hover:border-slate-200`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border border-transparent ${
                        agenzia.value === 'Lead-IA' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' :
                        agenzia.value === 'Freedom' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                        agenzia.value === 'Aibrid' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                          {agenzia.label}
                        </h2>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {agencyClients.length} WORKSPACES
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="pt-0 pb-2">
                  <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <div className="w-full">
                        <div className="bg-slate-50/50 border-b border-[#f1f3f6] flex items-center text-[9px] uppercase font-bold tracking-widest text-slate-400 px-6 py-2.5">
                            <span className="flex-1">Cliente / Progetto</span>
                            <span className="w-24 px-2">Settore</span>
                            <span className="w-20 px-2">Articoli</span>
                            <span className="w-20 px-2">Stato</span>
                            <span className="w-16 text-right">Azioni</span>
                        </div>
                        <div className="divide-y divide-[#f1f3f6]">
                          {agencyClients.map((client) => (
                            <div key={client.id} className="flex items-center group px-6 py-3.5 hover:bg-slate-50/30 transition-colors">
                              <div className="flex-1 flex items-center gap-4 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shadow-sm border border-[#f1f3f6] shrink-0 ${
                                  agenzia.value === 'Lead-IA' ? 'bg-white text-indigo-500 border-indigo-100' :
                                  agenzia.value === 'Freedom' ? 'bg-white text-emerald-500 border-emerald-100' :
                                  agenzia.value === 'Aibrid' ? 'bg-white text-amber-500 border-amber-100' :
                                  'bg-white text-slate-400'
                                }`}>
                                  {client.nome?.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 tracking-tight group-hover:text-blue-500 transition-colors truncate">{client.nome}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <a href={client.sito_web} target="_blank" rel="noopener noreferrer" 
                                           className="text-[10px] font-medium text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 ">
                                            {client.sito_web.replace('https://', '').replace(/\/$/, '')}
                                            <ExternalLink className="w-2.5 h-2.5 text-slate-300" />
                                        </a>
                                        {(client.siti_web?.length || 0) > 1 && (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-[#f1f3f6]">+{client.siti_web.length - 1} Domini</span>
                                        )}
                                    </div>
                                </div>
                              </div>
                              <div className="w-24 px-2 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 border border-[#f1f3f6] bg-slate-50/50 px-2 py-0.5 rounded-lg truncate block">
                                    {SETTORI.find(s => s.value === client.settore)?.label || client.settore}
                                  </span>
                              </div>
                              <div className="w-20 px-2 shrink-0 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[11px] font-bold text-slate-900 tracking-tight leading-none">{client.totale_articoli || 0}</span>
                                    <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-1">Files</span>
                                  </div>
                              </div>
                              <div className="w-20 px-2 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${client.attivo ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${client.attivo ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {client.attivo ? 'Online' : 'Pause'}
                                    </span>
                                </div>
                              </div>
                              <div className="w-16 shrink-0 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-[#f1f3f6]">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl border border-[#f1f3f6] shadow-xl p-1.5 min-w-[180px]">
                                    <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => navigate(`/clients/${client.id}`)}>
                                      <PenTool className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                      Genera Contenuti
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => navigate(`/clients/${client.id}/workspace?tab=settings`)}>
                                      <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                      Configurazione
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => openEditDialog(client)}>
                                      <Edit className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                      Modifica Anagrafica
                                    </DropdownMenuItem>
                                    <div className="h-px bg-[#f1f3f6] my-1.5 mx-1" />
                                    <DropdownMenuItem
                                      onClick={() => { if (window.confirm('Eliminare questo workspace?')) handleDelete(client.id); }}
                                      className="rounded-lg text-xs font-semibold p-2 text-red-500 focus:text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Elimina Workspace
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
