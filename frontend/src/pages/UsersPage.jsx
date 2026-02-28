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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    <div className="space-y-6 animate-fade-in" data-testid="users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Gestione Utenti</h1>
          <p className="text-slate-500 mt-1">Gestisci gli account registrati e associali ai clienti</p>
        </div>
        <div className="flex items-center gap-2">
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
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-slate-900' : user.client_id ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <User className={`w-5 h-5 ${user.client_id ? 'text-emerald-700' : 'text-amber-700'}`} />
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
                      user.client_id ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs" data-testid={`user-assigned-${user.id}`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {getClientName(user.client_id)}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs" data-testid={`user-unassigned-${user.id}`}>
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
                          <DropdownMenuItem onClick={() => { setAssignDialog(user); setSelectedClientId(user.client_id || ''); }}>
                            <Link2 className="w-4 h-4 mr-2" />
                            {user.client_id ? 'Cambia cliente' : 'Assegna a cliente'}
                          </DropdownMenuItem>
                          {user.client_id && (
                            <DropdownMenuItem onClick={() => unassignUser(user)}>
                              <Unlink className="w-4 h-4 mr-2" />
                              Rimuovi associazione
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
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setSelectedClientId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assegna a Cliente</DialogTitle>
            <DialogDescription>
              Associa <strong>{assignDialog?.name}</strong> ({assignDialog?.email}) a un cliente esistente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Label>Seleziona Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger data-testid="assign-client-select">
                <SelectValue placeholder="Scegli un cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} — {c.sito_web}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Annulla</Button>
            <Button onClick={assignUser} disabled={!selectedClientId || assigning} className="bg-slate-900" data-testid="assign-confirm-btn">
              {assigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Assegna
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
    </div>
  );
};
