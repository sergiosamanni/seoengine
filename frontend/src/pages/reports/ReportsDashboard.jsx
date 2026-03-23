import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Search, Folder, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

export const ReportsDashboard = () => {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-indigo-600 tracking-tighter uppercase mb-1">Report SEO Dashboard</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gestione clienti e report mensili</p>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <Input 
            placeholder="Cerca cliente..." 
            className="pl-10 h-10 border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm rounded-xl font-bold" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
            <Folder className="w-4 h-4 text-blue-500" />
            <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Clienti Attivi</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
                <Card 
                    key={client.id} 
                    className="hover:shadow-xl hover:shadow-indigo-50 transition-all border-slate-100 shadow-sm group cursor-pointer active:scale-[0.98] rounded-2xl overflow-hidden"
                    onClick={() => navigate(`/reports/client/${client.id}`)}
                >
                    <CardContent className="p-0 flex items-stretch h-20">
                        <div className="w-1.5 bg-blue-500" />
                        <div className="flex items-center px-6 font-black text-slate-800 uppercase tracking-tighter text-sm">
                            {client.nome}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
