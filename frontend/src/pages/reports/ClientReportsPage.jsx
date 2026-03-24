import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Plus, Globe, FileText, Archive, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const ClientReportsPage = () => {
  const { clientId } = useParams();
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReportDate, setNewReportDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders();
        const [clientRes, reportsRes] = await Promise.all([
          axios.get(`${API}/clients/${clientId}`, { headers }),
          axios.get(`${API}/reports/client/${clientId}`, { headers })
        ]);
        setClient(clientRes.data);
        setReports(reportsRes.data);
      } catch (e) {
        toast.error('Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId, getAuthHeaders]);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!newReportDate) return;
    
    // Convert YYYY-MM to ISO YYYY-MM-01T00:00:00Z
    const isoDate = `${newReportDate}-01T00:00:00Z`;
    const [year, month] = newReportDate.split('-');
    const formattedDate = `${month}-${year}`;
    const title = `Report Mensile - ${formattedDate}`;

    try {
      const res = await axios.post(`${API}/reports/${clientId}`, {
        title,
        date: isoDate,
        modules: {}
      }, { headers: getAuthHeaders() });
      toast.success('Report creato');
      navigate(`/reports/${res.data.id}`);
    } catch (e) {
      toast.error('Errore creazione report');
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      await axios.delete(`${API}/reports/${reportToDelete}`, { headers: getAuthHeaders() });
      setReports(prev => prev.filter(r => r.id !== reportToDelete));
      toast.success('Report eliminato');
      setIsDeleteConfirmOpen(false);
      setReportToDelete(null);
    } catch (e) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const confirmDelete = (reportId, e) => {
    e.stopPropagation();
    setReportToDelete(reportId);
    setIsDeleteConfirmOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} className="h-8 w-8 p-0 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client?.nome}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dashboard Reportistica</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-bold uppercase tracking-tight text-[9px] text-slate-400 hover:text-slate-600">
              <Archive className="w-3.5 h-3.5 mr-1.5" /> Archivia
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg font-bold uppercase tracking-tight text-[9px] border-slate-200 text-slate-500">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Aggiungi Dominio
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="flex items-center justify-between p-6 border-b border-slate-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                      <Globe className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 tracking-tight text-base">{client?.sito_web?.replace('https://', '').replace('http://', '')}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{client?.settore}</p>
                    </div>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-9 px-4 rounded-xl font-bold uppercase tracking-tight text-[10px] shadow-sm">
                            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuovo Report
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="font-bold tracking-tight uppercase text-slate-900">Nuovo Report Mensile</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateReport} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Seleziona Mese/Anno</Label>
                                <Input type="month" value={newReportDate} onChange={(e) => setNewReportDate(e.target.value)} required className="h-11 rounded-xl" />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 h-11 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-blue-100">Crea Report</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="p-6">
                {reports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                            <FileText className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Nessun report creato</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {reports.map(report => (
                            <Card 
                                key={report.id} 
                                className="bg-white hover:border-blue-200 transition-all border-slate-100 shadow-sm cursor-pointer active:scale-[0.99] rounded-2xl overflow-hidden group border-l-0"
                                onClick={() => navigate(`/reports/${report.id}`)}
                            >
                                <CardContent className="p-0 flex items-stretch h-14">
                                    <div className="w-1 bg-slate-100 group-hover:bg-blue-400 transition-colors" />
                                    <div className="flex-1 flex items-center justify-between px-4">
                                        <div className="min-w-0">
                                            <h5 className="font-bold text-slate-800 uppercase tracking-tight text-[12px] group-hover:text-blue-600 transition-colors truncate">
                                                {(() => {
                                                    try {
                                                        const d = new Date(report.date);
                                                        return new Intl.DateTimeFormat('it-IT', { month: '2-digit', year: 'numeric' }).format(d);
                                                    } catch (e) {
                                                        return report.date;
                                                    }
                                                })()}
                                            </h5>
                                            <p className="text-[8px] text-slate-400 font-medium uppercase tracking-widest truncate">Creato: {new Date(report.created_at).toLocaleDateString('it-IT')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={(e) => confirmDelete(report.id, e)}
                                                className="h-7 w-7 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Card>
      </div>
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
            <DialogHeader>
                <DialogTitle className="font-black tracking-tighter uppercase text-slate-900">Conferma Eliminazione</DialogTitle>
                <p className="text-xs text-slate-500 font-medium">Sei sicuro di voler eliminare definitivamente questo report? L'azione non è reversibile.</p>
            </DialogHeader>
            <DialogFooter className="flex gap-2 pt-4">
                <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">Annulla</Button>
                <Button onClick={handleDeleteReport} className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl font-bold uppercase tracking-widest text-[10px] text-white">Elimina ora</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientReportsPage;
