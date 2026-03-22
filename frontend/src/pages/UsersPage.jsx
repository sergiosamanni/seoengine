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
  User
} from 'lucide-react';
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
  const [selectedClientId, setSelectedClientId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);

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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.nome || '—';
  };

  const assignUser = async () => {
    if (!assignDialog || !selectedClientId) return;
    setAssigning(true);
    try {
      await axios.post(`${API}/users/assign-client`, {
        user_id: assignDialog.id,
        client_id: selectedClientId
      }, { headers: getAuthHeaders() });
      toast.success(`${assignDialog.name} assegnato a ${getClientName(selectedClientId)}`);
      setAssignDialog(null);
      setSelectedClientId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore assegnazione');
    } finally {
      setAssigning(false);
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
      (filter === 'unassigned' && !u.client_id) ||
      (filter === 'assigned' && !!u.client_id);
    return matchesSearch && matchesFilter;
  });

  const unassignedCount = users.filter(u => u.role === 'client' && !u.client_id).length;

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
        <div className="flex items-center gap-2">
            <div className="bg-white border border-[#f1f3f6] rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 tracking-tight">{users.length}</span>
            </div>
          {unassignedCount > 0 && (
            <Badge variant="outline" className="border-amber-100 bg-amber-50 text-amber-600 text-[10px] uppercase font-bold tracking-tight px-2 py-1" data-testid="unassigned-badge">
              {unassignedCount} DA ASSEGNARE
            </Badge>
          )}
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
                        <User className={`w-4 h-4 ${user.client_id ? 'text-slate-400' : 'text-amber-400'}`} />
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
                            ) : user.client_id ? (
                                <span className="text-[10px] font-bold text-emerald-600" data-testid={`user-assigned-${user.id}`}>
                                    {getClientName(user.client_id)}
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
                          <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => { setAssignDialog(user); setSelectedClientId(user.client_id || ''); }}>
                            <Link2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            {user.client_id ? 'Cambia cliente' : 'Collega a cliente'}
                          </DropdownMenuItem>
                          {user.client_id && (
                            <DropdownMenuItem className="rounded-lg text-xs font-semibold p-2" onClick={() => unassignUser(user)}>
                              <Unlink className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              Scollega cliente
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
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setSelectedClientId(''); } }}>
        <DialogContent className="rounded-2xl border-[#f1f3f6] max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-slate-50 border-b border-[#f1f3f6]">
            <DialogTitle className="text-lg font-bold">Associa Cliente</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">
              {assignDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
                <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 ml-1">Seleziona Workspace</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="h-11 border-[#f1f3f6] rounded-xl text-xs font-bold" data-testid="assign-client-select">
                    <SelectValue placeholder="Scegli un cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] rounded-xl border-[#f1f3f6]">
                    {clients.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                        {c.nome}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-[#f1f3f6] gap-2 flex-row sm:justify-end">
            <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-slate-400 h-10 px-6 rounded-xl" onClick={() => setAssignDialog(null)}>Annulla</Button>
            <Button onClick={assignUser} disabled={!selectedClientId || assigning} className="bg-slate-900 h-10 px-8 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200" data-testid="assign-confirm-btn">
              {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Conferma'}
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
