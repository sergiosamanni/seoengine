import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  History,
  MoreHorizontal,
  Eye,
  RotateCcw,
  Trash2,
  Calendar,
  FileText,
  Search,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ConfirmationModal } from '../components/ui/confirmation-modal';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const SessionHistoryPage = () => {
  const { getAuthHeaders, isAdmin, user } = useAuth();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  
  // Deletion States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const effectiveClientId = isAdmin ? clientId : user?.client_id;

  const fetchSessions = async () => {
    if (!effectiveClientId) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/clients/${effectiveClientId}/seo-sessions`, {
        headers: getAuthHeaders()
      });
      setSessions(response.data.sessions || []);
    } catch (error) {
      toast.error('Errore nel caricamento dello storico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [effectiveClientId]);

  const handleRestore = async (sessionId) => {
    try {
      await axios.post(`${API}/clients/${effectiveClientId}/seo-sessions/${sessionId}/restore`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Sessione ripristinata! Vai alla Configurazione per vedere i dati.');
    } catch (error) {
      toast.error('Errore nel ripristino della sessione');
    }
  };

  const confirmDelete = (sessionId) => {
    setSessionToDelete(sessionId);
    setIsConfirmOpen(true);
  };

  const handleDelete = async (sessionId) => {
    try {
      await axios.delete(`${API}/clients/${effectiveClientId}/seo-sessions/${sessionId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Sessione eliminata');
      fetchSessions();
    } catch (error) {
      toast.error('Errore nell\'eliminazione');
    } finally {
      setIsConfirmOpen(false);
      setSessionToDelete(null);
    }
  };

  const viewDetail = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/clients/${effectiveClientId}/seo-sessions/${sessionId}`, {
        headers: getAuthHeaders()
      });
      setSelectedSession(response.data);
      setShowDetail(true);
    } catch (error) {
      toast.error('Errore nel caricamento dei dettagli');
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm', { locale: it });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(isAdmin ? '/clients' : '/configuration')}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
              Storico Sessioni SEO
            </h1>
            <p className="text-slate-500 mt-1">
              Visualizza e ripristina le sessioni salvate
            </p>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <Card className="border-slate-200" data-testid="sessions-table-card">
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nessuna sessione salvata</p>
              <p className="text-sm text-slate-400 mt-1">
                Usa "Salva e Genera" nella Configurazione per creare una sessione
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Sessione</TableHead>
                  <TableHead className="font-semibold">Keywords</TableHead>
                  <TableHead className="font-semibold">SERP</TableHead>
                  <TableHead className="font-semibold">Prompt</TableHead>
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const keywordCount = (session.keywords?.servizi?.length || 0) +
                    (session.keywords?.citta_e_zone?.length || 0) +
                    (session.keywords?.tipi_o_qualificatori?.length || 0);
                  const hasPrompt = !!(session.advanced_prompt?.secondo_livello_prompt);
                  
                  return (
                    <TableRow 
                      key={session.id}
                      className="hover:bg-slate-50"
                      data-testid={`session-row-${session.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{session.session_name}</p>
                          {session.notes && (
                            <p className="text-sm text-slate-500 truncate max-w-[200px]">{session.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {keywordCount} keywords
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={session.serp_analyses?.length > 0 
                            ? "bg-purple-50 text-purple-700 border-purple-200" 
                            : ""
                          }
                        >
                          {session.serp_analyses?.length || 0} analisi
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasPrompt ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Presente
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Assente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`session-actions-${session.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewDetail(session.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizza Dettagli
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRestore(session.id)}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Ripristina
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => confirmDelete(session.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {selectedSession?.session_name}
            </DialogTitle>
            <DialogDescription>
              Creata il {selectedSession && formatDate(selectedSession.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Keywords */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Keywords Salvate
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-2">Servizi</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.keywords?.servizi?.map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        )) || <span className="text-slate-400 text-sm">Nessuno</span>}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-2">Città</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.keywords?.citta_e_zone?.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                        )) || <span className="text-slate-400 text-sm">Nessuna</span>}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-500 mb-2">Tipi</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.keywords?.tipi_o_qualificatori?.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                        )) || <span className="text-slate-400 text-sm">Nessuno</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SERP Analyses */}
                {selectedSession.serp_analyses?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Analisi SERP ({selectedSession.serp_analyses.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedSession.serp_analyses.map((serp, i) => (
                        <div key={i} className="p-3 bg-purple-50 rounded-lg">
                          <p className="font-medium text-purple-900">{serp.keyword}</p>
                          <p className="text-sm text-purple-600">
                            {serp.results?.length || 0} risultati • {serp.country?.toUpperCase()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advanced Prompt */}
                {selectedSession.advanced_prompt?.secondo_livello_prompt && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Prompt Avanzato
                    </h4>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-800 font-mono whitespace-pre-wrap">
                        {selectedSession.advanced_prompt.secondo_livello_prompt}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSession.notes && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Note</h4>
                    <p className="text-slate-600">{selectedSession.notes}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              Chiudi
            </Button>
            <Button 
              onClick={() => {
                handleRestore(selectedSession.id);
                setShowDetail(false);
              }}
              className="bg-slate-900"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Ripristina Sessione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => handleDelete(sessionToDelete)}
        title="Elimina Sessione"
        description="Sei sicuro di voler eliminare definitivamente questa sessione? L'azione non può essere annullata."
      />
    </div>
  );
};
