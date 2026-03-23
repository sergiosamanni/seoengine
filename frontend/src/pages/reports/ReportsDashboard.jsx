import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Search, Folder, Loader2, ChevronDown, ChevronRight, FileText, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const AGENZIE = [
  { id: 'aibrid', label: 'Aibrid', color: 'bg-indigo-500' },
  { id: 'lead_ia', label: 'Lead-IA', color: 'bg-emerald-500' },
  { id: 'personali', label: 'Personali', color: 'bg-rose-500' },
  { id: 'altro', label: 'Altro / Non Assegnato', color: 'bg-slate-400' },
];

export const ReportsDashboard = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedAgencies, setCollapsedAgencies] = useState({});

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await axios.get(`${API}/clients`, { headers: getAuthHeaders() });
        setClients(res.data);
      } catch (e) {
        toast.error('Errore caricamento clienti');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [getAuthHeaders]);

  const filteredClients = clients.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAgency = (id) => {
    setCollapsedAgencies(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reportistica SEO</h1>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[9px]">Gestione centralizzata report mensili</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <Input 
            placeholder="Cerca cliente..." 
            className="pl-10 h-10 border-slate-100 bg-white focus:bg-white transition-all text-sm rounded-xl font-bold shadow-sm" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {AGENZIE.map((agenzia) => {
            const clientsInAgency = filteredClients.filter(c => {
                const clientAgency = c.agenzia || 'altro';
                if (agenzia.id === 'altro') {
                    return !AGENZIE.find(a => a.id === clientAgency && a.id !== 'altro');
                }
                return clientAgency === agenzia.id;
            });

            if (clientsInAgency.length === 0 && (searchQuery || agenzia.id === 'altro')) return null;
            if (clientsInAgency.length === 0) return null;

            const isCollapsed = collapsedAgencies[agenzia.id];

            return (
                <div key={agenzia.id} className="space-y-4">
                    <div 
                        className="flex items-center justify-between px-4 py-2 bg-slate-50/50 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors group border border-slate-100/50"
                        onClick={() => toggleAgency(agenzia.id)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-1 h-4 rounded-full ${agenzia.color}`} />
                            {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-900" />}
                            <span className={`text-[11px] font-black uppercase tracking-widest ${isCollapsed ? 'text-slate-400' : 'text-slate-900'}`}>{agenzia.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-100 text-slate-500 font-black">{clientsInAgency.length}</span>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                            {clientsInAgency.map(client => (
                                <Card 
                                    key={client.id} 
                                    className="hover:border-indigo-200 transition-all border-slate-100 shadow-sm group cursor-pointer active:scale-[0.99] rounded-xl overflow-hidden bg-white"
                                    onClick={() => navigate(`/reports/client/${client.id}`)}
                                >
                                    <CardContent className="p-0 flex items-stretch h-16">
                                        <div className={`w-1 ${agenzia.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                                        <div className="flex-1 flex items-center justify-between px-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-50 flex items-center justify-center text-[11px] font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                                                    {client.nome?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-tight group-hover:text-blue-600 transition-colors">
                                                        {client.nome}
                                                    </h4>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[120px]">
                                                        {client.sito_web?.replace('https://', '').replace('www.', '')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            );
        })}

        {filteredClients.length === 0 && (
            <div className="text-center py-24 bg-white border-2 border-dashed border-slate-100 rounded-[2rem]">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Folder className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nessun cliente trovato</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
