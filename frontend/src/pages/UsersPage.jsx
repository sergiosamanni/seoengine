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
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'client' });

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

  const updateClients = async () => {
    if (!assignDialog) return;
    setAssigning(true);
    try {
      await axios.post(`${API}/users/assign-clients`, {
        user_id: assignDialog.id,
        client_ids: selectedClientIds
      }, { headers: getAuthHeaders() });
      toast.success('Associazioni aggiornate');
      setAssignDialog(null);
      setSelectedClientIds([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore');
    } finally {
      setAssigning(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const unassignAll = async (user) => {
    try {
      await axios.post(`${API}/users/unassign-clients`, {
        user_id: user.id
      }, { headers: getAuthHeaders() });
      toast.success('Tutte le associazioni rimosse');
      fetchData();
    } catch (error) {
      toast.error('Errore');
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

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API}/auth/register`, newUser, { headers: getAuthHeaders() });
      toast.success('Utente creato con successo');
      setShowCreateDialog(false);
      setNewUser({ name: '', email: '', password: '', role: 'client' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore creazione utente');
    } finally {
      setCreating(false);
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
    <div className="space-y-6 animate-fade-in" data-testid="users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Gestione Utenti</h1>
          <p className="text-slate-500 mt-1">Gestisci gli account registrati e associali ai clienti</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-slate-900 hover:bg-slate-800" data-testid="new-user-btn">
            <UserPlus className="w-4 h-4 mr-2" /> Nuovo Utente
          </Button>
          <Badge variant="outline" className="text-sm py-1 px-3">
            {users.length} utenti totali
          </Badge>
          {unassignedCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 py-1 px-3" data-testid="unassigned-badge">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {unassignedCount} da assegnare
            </Badge>
          )}
        </div>
      </div>

      {/* Alert for unassigned users */}
      {unassignedCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/70" data-testid="unassigned-alert">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{unassignedCount} utent{unassignedCount === 1 ? 'e' : 'i'}</strong> registrat{unassignedCount === 1 ? 'o' : 'i'} senza un cliente associato.
              Assegna{unassignedCount === 1 ? 'lo' : 'li'} a un cliente per abilitare l'accesso.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cerca per nome o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="users-search"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="users-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli utenti</SelectItem>
            <SelectItem value="unassigned">Da assegnare</SelectItem>
            <SelectItem value="assigned">Assegnati</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nessun utente trovato</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors" data-testid={`user-row-${user.id}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-slate-900' : (user.client_ids && user.client_ids.length > 0) ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <User className={`w-5 h-5 ${(user.client_ids && user.client_ids.length > 0) ? 'text-emerald-700' : 'text-amber-700'}`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role badge */}
                    <Badge variant="outline" className={`text-xs ${user.role === 'admin' ? 'border-slate-400 text-slate-700' : 'border-slate-200 text-slate-500'}`}>
                      {user.role === 'admin' ? 'Admin' : 'Cliente'}
                    </Badge>

                    {/* Assignment status */}
                    {user.role !== 'admin' && (
                      (user.client_ids && user.client_ids.length > 0) ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                          {user.client_ids.map(cid => (
                            <Badge key={cid} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
                              {getClientName(cid)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Non assegnato
                        </Badge>
                      )
                    )}

                    {/* Actions */}
                    {user.role !== 'admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`user-actions-${user.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setAssignDialog(user); setSelectedClientIds(user.client_ids || []); }}>
                            <Link2 className="w-4 h-4 mr-2" />
                            Gestisci clienti
                          </DropdownMenuItem>
                          {user.client_ids && user.client_ids.length > 0 && (
                            <DropdownMenuItem onClick={() => unassignAll(user)}>
                              <Unlink className="w-4 h-4 mr-2" />
                              Scollega tutto
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDeleteDialog(user)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimina utente
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

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setSelectedClientIds([]); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gestisci Clienti</DialogTitle>
            <DialogDescription>
              Seleziona quali clienti può gestire <strong>{assignDialog?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-3 block text-xs uppercase tracking-wider text-slate-400 font-bold">Clienti disponibili</Label>
            <ScrollArea className="h-[300px] border rounded-lg p-2 bg-slate-50/50">
              <div className="space-y-2">
                {clients.map(c => (
                  <div key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedClientIds.includes(c.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}`}
                    onClick={() => toggleClientSelection(c.id)}>
                    <Checkbox
                      id={`client-${c.id}`}
                      checked={selectedClientIds.includes(c.id)}
                      onCheckedChange={() => toggleClientSelection(c.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`client-${c.id}`} className="text-sm font-bold text-slate-900 block cursor-pointer truncate">
                        {c.nome}
                      </label>
                      <p className="text-[10px] text-slate-500 truncate italic">
                        {c.sito_web.replace('https://', '')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="mt-3 text-[10px] text-slate-400 text-center">
              L'utente avrà accesso a tutti i dati e gli strumenti per i clienti selezionati.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Annulla</Button>
            <Button onClick={updateClients} disabled={assigning} className="bg-slate-900 min-w-[100px]">
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Utente</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare <strong>{deleteDialog?.name}</strong> ({deleteDialog?.email})?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Annulla</Button>
            <Button variant="destructive" onClick={deleteUser} data-testid="delete-user-confirm-btn">
              <Trash2 className="w-4 h-4 mr-2" />Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nuovo Utente</DialogTitle>
            <DialogDescription>Crea un nuovo account per un collaboratore o un cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Mario Rossi"
                required
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="mario@esempio.it"
                required
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={newUser.password}
                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select value={newUser.role} onValueChange={val => setNewUser({ ...newUser, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente (Standard)</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Annulla</Button>
              <Button type="submit" className="bg-slate-900" disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Crea Utente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
