import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Users,
  UserPlus,
  Link2,
  Unlink,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Loader2,
  Shield,
  User,
  Plus
} from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const UsersPage = () => {
  const { getAuthHeaders } = useAuth();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, unassigned, assigned
  const [assignDialog, setAssignDialog] = useState(null); // user to assign
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  
  // Create User State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'client', client_ids: [] });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, clientsRes] = await Promise.all([
        axios.get(`${API}/users`, { headers: getAuthHeaders() }),
        axios.get(`${API}/clients`, { headers: getAuthHeaders() })
      ]);
      setUsers(usersRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Errore caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const getClientNames = (clientIds) => {
    if (!clientIds || clientIds.length === 0) return '—';
    const names = clientIds.map(id => clients.find(c => c.id === id)?.nome).filter(Boolean);
    return names.join(', ');
  };

  const assignUser = async () => {
    if (!assignDialog) return;
    setAssigning(true);
    try {
      await axios.post(`${API}/users/assign-client`, {
        user_id: assignDialog.id,
        client_ids: selectedClientIds
      }, { headers: getAuthHeaders() });
      toast.success(`${assignDialog.name} aggiornato`);
      setAssignDialog(null);
      setSelectedClientIds([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore assegnazione');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
        toast.error("Compila tutti i campi obbligatori");
        return;
    }
    setCreating(true);
    try {
        await axios.post(`${API}/auth/register`, newUser, { headers: getAuthHeaders() });
        toast.success(`Utente ${newUser.name} creato con successo`);
        setCreateDialogOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'client', client_ids: [] });
        fetchData();
    } catch (error) {
        toast.error(error.response?.data?.detail || "Errore creazione utente");
    } finally {
        setCreating(false);
    }
  };

  const unassignUser = async (user) => {
    try {
      await axios.post(`${API}/users/unassign-client`, {
        user_id: user.id
      }, { headers: getAuthHeaders() });
      toast.success(`${user.name} rimosso dal cliente`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    }
  };

  const deleteUser = async () => {
    if (!deleteDialog) return;
    try {
      await axios.delete(`${API}/users/${deleteDialog.id}`, { headers: getAuthHeaders() });
      toast.success(`Utente ${deleteDialog.name} eliminato`);
      setDeleteDialog(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore eliminazione');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'unassigned' && (!u.client_ids || u.client_ids.length === 0)) ||
      (filter === 'assigned' && u.client_ids && u.client_ids.length > 0);
    return matchesSearch && matchesFilter;
  });

  const unassignedCount = users.filter(u => u.role === 'client' && (!u.client_ids || u.client_ids.length === 0)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto" data-testid="users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Gestione Workspace</h1>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">Amministrazione Utenti e Permessi</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-white border border-[#f1f3f6] rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 tracking-tight">{users.length}</span>
            </div>
          {unassignedCount > 0 && (
            <Badge variant="outline" className="border-amber-100 bg-amber-50 text-amber-600 text-[10px] uppercase font-bold tracking-tight px-2 py-1" data-testid="unassigned-badge">
              {unassignedCount} DA ASSEGNARE
            </Badge>
          )}
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Nuovo Utente
          </Button>
        </div>
      </div>

      {/* Alert for unassigned users - Simplified */}
      {unassignedCount > 0 && (
        <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-slate-200" data-testid="unassigned-alert">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
             </div>
             <p className="text-xs text-slate-300 font-medium">
               Hai <strong>{unassignedCount} utent{unassignedCount === 1 ? 'e' : 'i'}</strong> in attesa di assegnazione.
             </p>
           </div>
           <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-white hover:bg-white/10 h-8" onClick={() => setFilter('unassigned')}>
                Vedi tutti
           </Button>
        </div>
      )}

      {/* Filters - Minimal */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xs group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
          <Input
            placeholder="Cerca utente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 border-[#f1f3f6] bg-white rounded-xl text-xs focus:ring-0 focus:border-slate-300 transition-all shadow-sm"
            data-testid="users-search"
          />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Filtra per:</span>
            <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px] h-10 border-[#f1f3f6] rounded-xl text-xs font-bold bg-white shadow-sm" data-testid="users-filter">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#f1f3f6]">
                    <SelectItem value="all" className="text-xs font-medium">Tutti</SelectItem>
                    <SelectItem value="unassigned" className="text-xs font-medium">Da assegnare</SelectItem>
                    <SelectItem value="assigned" className="text-xs font-medium">Assegnati</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* Users List - Clean Table-like view */}
      <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="divide-y divide-[#f1f3f6]">
            {filteredUsers.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-5 h-5 text-slate-200" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Nessun utente trovato</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors group" data-testid={`user-row-${user.id}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${user.role === 'admin' ? 'bg-slate-900 shadow-lg shadow-slate-200' : 'bg-slate-50'}`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-4 h-4 text-white" />
                      ) : (
                        <User className={`w-4 h-4 ${user.client_ids && user.client_ids.length > 0 ? 'text-slate-400' : 'text-amber-400'}`} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 tracking-tight">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Role & Status info bar */}
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300 mb-0.5">Ruolo</span>
                            <span className={`text-[10px] font-bold ${user.role === 'admin' ? 'text-slate-900' : 'text-slate-500'}`}>
                                {user.role === 'admin' ? 'Administrator' : 'Client User'}
                            </span>
                        </div>
                        <div className="w-px h-6 bg-[#f1f3f6]"></div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300 mb-0.5">Associazione</span>
                            {user.role === 'admin' ? (
                                <span className="text-[10px] font-bold text-slate-400">Tutti i Clienti</span>
                            ) : user.client_ids && user.client_ids.length > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[150px] block" data-testid={`user-assigned-${user.id}`}>
                                    {getClientNames(user.client_ids)}
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-amber-500" data-testid={`user-unassigned-${user.id}`}>
                                    In attesa
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions - Subtle */}
                    {user.role !== 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-[#f1f3f6]" data-testid={`user-actions-${user.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border border-[#f1f3f6] shadow-xl p-1.5 min-w-[180px]">
                          <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => { setAssignDialog(user); setSelectedClientIds(user.client_ids || []); }}>
                            <Link2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            {user.client_ids && user.client_ids.length > 0 ? 'Gestisci siti' : 'Collega a siti'}
                          </DropdownMenuItem>
                          {user.client_ids && user.client_ids.length > 0 && (
                            <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => unassignUser(user)}>
                              <Unlink className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              Scollega tutto
                            </DropdownMenuItem>
                          )}
                          <div className="h-px bg-[#f1f3f6] my-1.5 mx-1" />
                          <DropdownMenuItem onClick={() => setDeleteDialog(user)} className="rounded-lg text-xs font-semibold p-2 text-red-500 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Elimina Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs - Consistent Minimal Style */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setSelectedClientIds([]); setClientSearch(''); } }}>
        <DialogContent className="rounded-3xl border-[#f1f3f6] max-w-xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 border-b border-[#f1f3f6] text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">Associa Siti Web</DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                  Permessi per {assignDialog?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                  placeholder="Cerca dominio o cliente..." 
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10 h-11 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-medium transition-all focus:bg-white"
                />
              </div>

              <ScrollArea className="h-[320px] pr-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clients.filter(c => 
                        c.nome.toLowerCase().includes(clientSearch.toLowerCase()) || 
                        c.sito_web?.toLowerCase().includes(clientSearch.toLowerCase())
                    ).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            if (selectedClientIds.includes(c.id)) setSelectedClientIds(selectedClientIds.filter(id => id !== c.id));
                            else setSelectedClientIds([...selectedClientIds, c.id]);
                          }}
                          className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedClientIds.includes(c.id) 
                            ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${selectedClientIds.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'}`}>
                                {selectedClientIds.includes(c.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-bold truncate ${selectedClientIds.includes(c.id) ? 'text-blue-700' : 'text-slate-700'}`}>{c.nome}</p>
                                <p className="text-[9px] text-slate-400 font-medium tracking-tight truncate">{c.sito_web?.replace('https://','')}</p>
                            </div>
                        </div>
                    ))}
                </div>
              </ScrollArea>
              
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {selectedClientIds.length} siti selezionati
                </p>
                {selectedClientIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClientIds([])} className="h-6 text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 px-2">
                    Deseleziona tutti
                  </Button>
                )}
              </div>
          </div>
          <DialogFooter className="p-8 bg-slate-50 border-t border-[#f1f3f6] gap-3 flex-row sm:justify-end">
            <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-10 px-6 rounded-xl" onClick={() => setAssignDialog(null)}>Annulla</Button>
            <Button onClick={assignUser} disabled={assigning} className="bg-slate-900 h-10 px-8 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200" data-testid="assign-confirm-btn">
              {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salva Permessi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if(!open) setClientSearch(''); }}>
        <DialogContent className="rounded-3xl border-[#f1f3f6] max-w-xl p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 bg-slate-900 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold tracking-tight">Crea Nuovo Utente</DialogTitle>
                        <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-60">
                            Definisci le credenziali e il ruolo
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                        <Input 
                            value={newUser.name} 
                            onChange={e => setNewUser({...newUser, name: e.target.value})}
                            placeholder="Es: Mario Rossi" 
                            className="h-11 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-medium focus:bg-white"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Email Aziendale</Label>
                            <Input 
                                value={newUser.email} 
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                placeholder="mario@esempio.it" 
                                className="h-11 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-medium focus:bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Password Accesso</Label>
                            <Input 
                                type="password"
                                value={newUser.password} 
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                placeholder="••••••••" 
                                className="h-11 border-slate-100 bg-slate-50/50 rounded-xl px-4 font-medium focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Ruolo Sistema</Label>
                        <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                            <SelectTrigger className="h-11 border-slate-100 bg-slate-50/50 rounded-xl px-5 font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="client" className="text-xs font-bold py-2.5">Cliente (Accesso Limitato)</SelectItem>
                                <SelectItem value="admin" className="text-xs font-bold py-2.5">Administrator (Accesso Totale)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {newUser.role === 'client' && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Associa Siti Web</Label>
                                <span className="text-[9px] text-blue-500 font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100">{newUser.client_ids.length} selezionati</span>
                            </div>
                            
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                    placeholder="Cerca dominio o cliente..." 
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                    className="pl-10 h-10 border-slate-100 bg-slate-50/50 rounded-xl px-5 text-[11px] font-medium transition-all focus:bg-white"
                                />
                            </div>

                            <ScrollArea className="h-[220px] rounded-2xl border border-slate-50 bg-slate-50/30 p-4 shadow-inner">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {clients.filter(c => 
                                        c.nome.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                        c.sito_web?.toLowerCase().includes(clientSearch.toLowerCase())
                                    ).map(c => (
                                        <div 
                                            key={c.id} 
                                            onClick={() => {
                                                if (newUser.client_ids.includes(c.id)) setNewUser({...newUser, client_ids: newUser.client_ids.filter(id => id !== c.id)});
                                                else setNewUser({...newUser, client_ids: [...newUser.client_ids, c.id]});
                                            }}
                                            className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                                newUser.client_ids.includes(c.id) 
                                                ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-50' 
                                                : 'opacity-70 border-transparent hover:opacity-100 hover:bg-white hover:border-slate-100'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${newUser.client_ids.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-slate-300'}`}>
                                                {newUser.client_ids.includes(c.id) && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[10px] font-bold truncate ${newUser.client_ids.includes(c.id) ? 'text-blue-700' : 'text-slate-600'}`}>{c.nome}</p>
                                                <p className="text-[8px] text-slate-400 font-medium truncate tracking-tight">{c.sito_web?.replace('https://','')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter className="p-8 bg-slate-50 border-t border-[#f1f3f6] gap-3 flex-row sm:justify-end">
                <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-11 px-6 rounded-xl" onClick={() => setCreateDialogOpen(false)}>Annulla</Button>
                <Button onClick={handleCreateUser} disabled={creating} className="bg-slate-900 text-white h-11 px-10 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all">
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Shield className="w-3.5 h-3.5 mr-2" />} Crea Account
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog - Consistent Minimal Style */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="rounded-2xl border-[#f1f3f6] max-w-sm p-0 overflow-hidden">
            <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Elimina Utente</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Stai per eliminare definitivamente <strong>{deleteDialog?.name}</strong>. Tutti i dati relativi all'account andranno persi.
                </p>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t border-[#f1f3f6] gap-2 flex-row">
                <Button variant="ghost" className="flex-1 text-xs font-bold uppercase tracking-widest text-slate-400 h-11 rounded-xl" onClick={() => setDeleteDialog(null)}>Annulla</Button>
                <Button variant="destructive" className="flex-1 text-xs font-bold uppercase tracking-widest bg-red-500 hover:bg-red-600 h-11 rounded-xl shadow-lg shadow-red-100" onClick={deleteUser} data-testid="delete-user-confirm-btn">
                    Elimina
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
