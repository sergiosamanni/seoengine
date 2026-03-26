import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  MapPin, Search, Loader2, ExternalLink, Edit, Save, X, Globe, Filter, Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const AGENZIE = [
  { id: 'all', label: 'Tutte le agenzie', dot: 'bg-slate-400' },
  { id: 'personali', label: 'Personali', dot: 'bg-yellow-500' },
  { id: 'aibrid', label: 'Aibrid', dot: 'bg-sky-400' },
  { id: 'lead_ia', label: 'Lead-IA', dot: 'bg-emerald-500' },
  { id: 'altro', label: 'Altro / Diretto', dot: 'bg-slate-300' },
];

export const GmbPage = () => {
  const { getAuthHeaders } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState('');

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/clients`, { headers: getAuthHeaders() });
      setClients(res.data);
    } catch (e) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getAuthHeaders]);

  const handleStartEdit = (client) => {
    setEditingId(client.id);
    setEditUrl(client.configuration?.gmb_url || '');
  };

  const handleSave = async (clientId) => {
    try {
      await axios.put(`${API}/clients/${clientId}/configuration`, {
        gmb_url: editUrl
      }, { headers: getAuthHeaders() });
      
      setClients(prev => prev.map(c => 
        c.id === clientId 
        ? { ...c, configuration: { ...c.configuration, gmb_url: editUrl } } 
        : c
      ));
      setEditingId(null);
      toast.success('Link GMB aggiornato');
    } catch (e) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || 
                         c.sito_web?.toLowerCase().includes(search.toLowerCase());
    const matchesAgency = selectedAgency === 'all' || (c.agenzia || 'altro') === selectedAgency;
    return matchesSearch && matchesAgency;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schede Google My Business</h1>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-[9px]">Gestione accessi diretti alle schede GMB dei clienti</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <Input 
                placeholder="Cerca cliente o sito..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 pl-9 border-slate-100 bg-white rounded-xl text-xs font-bold shadow-sm"
            />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {AGENZIE.map(a => (
                <button
                    key={a.id}
                    onClick={() => setSelectedAgency(a.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap shadow-sm ${
                        selectedAgency === a.id 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                    }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                    {a.label}
                </button>
            ))}
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">Cliente</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">Sito Web</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">Scheda GMB</th>
                        <th className="px-6 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100 text-right">Azioni</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredClients.map(client => (
                        <tr key={client.id} className="group hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                        {client.nome?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-slate-800 text-sm">{client.nome}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                                    <Globe className="w-3 h-3" />
                                    <span className="text-xs font-medium">{client.sito_web?.replace('https://', '').replace('www.', '')}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                {editingId === client.id ? (
                                    <div className="flex items-center gap-2 max-w-md">
                                        <Input 
                                            value={editUrl} 
                                            onChange={e => setEditUrl(e.target.value)}
                                            placeholder="Inserisci URL profilo GMB..."
                                            className="h-9 rounded-xl text-xs font-bold"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={() => handleSave(client.id)} className="h-9 w-9 text-emerald-500 hover:bg-emerald-50 rounded-xl">
                                            <Save className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-9 w-9 text-slate-300 hover:bg-slate-50 rounded-xl">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    client.configuration?.gmb_url ? (
                                        <div className="flex items-center gap-3">
                                            <a 
                                                href={client.configuration.gmb_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <MapPin className="w-3 h-3" />
                                                Apri Scheda
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                            <button 
                                                onClick={() => handleStartEdit(client)}
                                                className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleStartEdit(client)}
                                            className="h-8 px-3 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 text-[9px] font-bold uppercase tracking-widest"
                                        >
                                            <Plus className="w-3 h-3 mr-1.5" /> Aggiungi Link
                                        </Button>
                                    )
                                )}
                            </td>
                            <td className="px-6 py-5 text-right">
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-lg text-slate-300 hover:text-slate-900 group-hover:bg-slate-50 transition-all"
                                    onClick={() => handleStartEdit(client)}
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                </Button>
                            </td>
                        </tr>
                    ))}
                    {filteredClients.length === 0 && (
                        <tr>
                            <td colSpan="4" className="py-20 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MapPin className="w-6 h-6 text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nessun cliente trovato</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};

export default GmbPage;
