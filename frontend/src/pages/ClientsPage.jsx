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
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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
    sito_web: '',
    attivo: true
  });

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
    
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.id}`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Cliente aggiornato');
      } else {
        await axios.post(`${API}/clients`, formData, {
          headers: getAuthHeaders()
        });
        toast.success('Cliente creato');
      }
      
      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData({ nome: '', settore: 'altro', sito_web: '', attivo: true });
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
      sito_web: client.sito_web,
      attivo: client.attivo
    });
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(client =>
    client.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.sito_web.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
            Clienti
          </h1>
          <p className="text-slate-500 mt-1">
            Gestisci il registro dei clienti
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingClient(null);
            setFormData({ nome: '', settore: 'altro', sito_web: '', attivo: true });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800" data-testid="new-client-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-['Manrope']">
                {editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Modifica i dati del cliente' : 'Aggiungi un nuovo cliente al sistema'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Azienda</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Es: Noleggio Auto Salerno"
                    required
                    data-testid="client-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="settore">Settore</Label>
                  <Select
                    value={formData.settore}
                    onValueChange={(value) => setFormData({ ...formData, settore: value })}
                  >
                    <SelectTrigger data-testid="client-settore-select">
                      <SelectValue placeholder="Seleziona settore" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTORI.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sito_web">Sito Web</Label>
                  <Input
                    id="sito_web"
                    value={formData.sito_web}
                    onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })}
                    placeholder="https://esempio.it"
                    required
                    data-testid="client-website-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-slate-900" data-testid="save-client-btn">
                  {editingClient ? 'Salva Modifiche' : 'Crea Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca per nome o sito web..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="client-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="border-slate-200" data-testid="clients-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">Nessun cliente trovato</p>
            </div>
          ) : (
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
                {filteredClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    data-testid={`client-row-${client.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-slate-600">
                            {client.nome?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{client.nome}</p>
                          <a 
                            href={client.sito_web} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {client.sito_web}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">
                        {SETTORI.find(s => s.value === client.settore)?.label || client.settore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-slate-900">{client.totale_articoli || 0}</span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={client.attivo ? "default" : "secondary"}
                        className={client.attivo 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-100 text-slate-600 border-slate-200"
                        }
                      >
                        {client.attivo ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`client-actions-${client.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Configura
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/generate`)}>
                            <PenTool className="w-4 h-4 mr-2" />
                            Genera Articoli
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/gsc`)}>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Google Search Console
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(client)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(client.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
