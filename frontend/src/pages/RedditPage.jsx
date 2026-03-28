import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  MessageSquare, Search, ExternalLink, Zap, Users, TrendingUp, 
  Loader2, CheckCircle2, AlertCircle, ArrowRight, Settings 
} from 'lucide-react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const RedditPage = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);
  
  // States for Modals
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [aiProposal, setAiProposal] = useState({ comment_body: "", strategy_reason: "" });
  const [isPosting, setIsPosting] = useState(false);

  const [configForm, setConfigForm] = useState({
    username: '', client_id: '', client_secret: '', refresh_token: ''
  });

  useEffect(() => {
    fetchStatus();
    fetchClients();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/reddit/status`, { headers: getAuthHeaders() });
      setIsConfigured(res.data.configured);
      if (res.data.configured) setConfigForm(prev => ({ ...prev, username: res.data.username }));
    } catch (e) {
      console.error("Failed to fetch reddit status", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`, { headers: getAuthHeaders() });
      setClients(res.data);
    } catch (e) { console.error(e); }
  };

  const handleConfigSave = async () => {
    try {
      await axios.post(`${API}/reddit/config`, configForm, { headers: getAuthHeaders() });
      toast.success("Configurazione Reddit salvata!");
      setIsConfigOpen(false);
      fetchStatus();
    } catch (e) {
      toast.error("Errore salvataggio configurazione");
    }
  };

  const handleScout = async () => {
    if (!searchQuery) { toast.error("Inserisci una parola chiave"); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reddit/scout?query=${searchQuery}`, { headers: getAuthHeaders() });
      setOpportunities(res.data);
    } catch (e) { toast.error("Scouting fallito"); }
    finally { setLoading(false); }
  };

  const handleOpenPropose = (op) => {
    setSelectedThread(op);
    setIsProposalOpen(true);
  };

  const generateAIProposal = async () => {
    if (!selectedClient) { toast.error("Seleziona prima un cliente"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/reddit/propose?client_id=${selectedClient}`, selectedThread, { headers: getAuthHeaders() });
      setAiProposal(res.data);
    } catch (e) { toast.error("Errore generazione proposta AI"); }
    finally { setLoading(false); }
  };

  const handlePost = async () => {
    setIsPosting(true);
    try {
        const payload = {
            client_id: selectedClient,
            subreddit: selectedThread.subreddit,
            thread_url: selectedThread.url,
            comment_body: aiProposal.comment_body
        };
        await axios.post(`${API}/reddit/post`, payload, { headers: getAuthHeaders() });
        toast.success("Commento pubblicato su Reddit!");
        setIsProposalOpen(false);
    } catch (e) {
        toast.error("Errore durante il posting");
    } finally {
        setIsPosting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            G<span className="text-emerald-500">eo</span>S <span className="text-orange-500 italic">Reddit Outreach</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Intervieni nelle community e crea discussioni di valore per i tuoi clienti.</p>
        </div>
        <div className="flex items-center gap-3">
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-2xl h-12 border-slate-200 px-6 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Configurazione
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-xl uppercase tracking-tighter">Reddit API Setup</DialogTitle>
                        <DialogDescription className="text-xs">Inserisci le tue credenziali Reddit App per abilitare lo scouting AI.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input placeholder="Username Reddit" value={configForm.username} onChange={e => setConfigForm({...configForm, username: e.target.value})} className="rounded-xl h-11" />
                        <Input placeholder="Client ID" value={configForm.client_id} onChange={e => setConfigForm({...configForm, client_id: e.target.value})} className="rounded-xl h-11" />
                        <Input placeholder="Client Secret" value={configForm.client_secret} onChange={e => setConfigForm({...configForm, client_secret: e.target.value})} type="password" className="rounded-xl h-11" />
                        <Input placeholder="Refresh Token" value={configForm.refresh_token} onChange={e => setConfigForm({...configForm, refresh_token: e.target.value})} className="rounded-xl h-11" />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleConfigSave} className="bg-orange-500 text-white w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]">Salva Configurazione</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className={`flex items-center gap-2 px-4 py-2 border rounded-2xl ${isConfigured ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                {isConfigured ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className={`text-[10px] font-black uppercase tracking-widest ${isConfigured ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isConfigured ? 'Account Connesso' : 'Disconnesso'}
                </span>
            </div>
        </div>
      </div>

      {/* Stats Board (Omitted for brevity, remains as before) */}

      {/* Main Scout Board */}
      <Card className="rounded-3xl border-none shadow-2xl shadow-slate-100 bg-white p-8">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                 <Input 
                    className="pl-10 h-11 w-64 rounded-xl border-slate-100 text-sm focus:ring-orange-500" 
                    placeholder="Esegui scouting..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScout()}
                 />
              </div>
              <Button onClick={handleScout} disabled={loading || !isConfigured} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-widest">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Avvia Scout"}
              </Button>
           </div>
        </div>

        <div className="space-y-4">
            {opportunities.map(op => (
                <div key={op.id} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-orange-100 text-orange-600 border-none text-[10px] font-black tracking-widest uppercase tracking-[0.1em]">r/{op.subreddit}</Badge>
                            </div>
                            <h4 className="text-lg font-black tracking-tight text-slate-900 leading-tight mb-4">{op.title}</h4>
                            <div className="flex items-center gap-3">
                                <Button onClick={() => window.open(op.url, '_blank')} variant="ghost" className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#1c64f2] hover:bg-blue-50 flex items-center gap-2">
                                    <ExternalLink className="w-3.5 h-3.5" /> Vedi Originale
                                </Button>
                                <Button onClick={() => handleOpenPropose(op)} className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-50 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 fill-white" /> Proponi Risposta AI
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </Card>

      {/* AI Proposal Modal */}
      <Dialog open={isProposalOpen} onOpenChange={setIsProposalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-8 overflow-hidden">
            <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">AI Outreach Proposal</DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500">L'AI ha analizzato il thread. Seleziona un cliente e genera la risposta.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Thread Target</p>
                    <h5 className="font-bold text-slate-900 leading-tight">{selectedThread?.title}</h5>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Seleziona Cliente</label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-100"><SelectValue placeholder="Scegli per chi rispondere..." /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                {aiProposal.comment_body ? (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Proposta Commento AI</label>
                            <textarea 
                                className="w-full p-4 rounded-xl border-slate-100 bg-emerald-50/10 min-h-[120px] text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500"
                                value={aiProposal.comment_body}
                                onChange={e => setAiProposal({...aiProposal, comment_body: e.target.value})}
                            />
                        </div>
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Strategia Suggerita</p>
                            <p className="text-[11px] text-slate-600 font-medium italic">{aiProposal.strategy_reason}</p>
                        </div>
                    </div>
                ) : (
                    <Button onClick={generateAIProposal} disabled={loading} className="w-full bg-slate-900 h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-100">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Genera Risposta Strategica"}
                    </Button>
                )}
            </div>

            <DialogFooter className="mt-8 pt-6 border-t border-slate-50 gap-3">
                <Button variant="ghost" onClick={() => setIsProposalOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Annulla</Button>
                {aiProposal.comment_body && (
                    <Button onClick={handlePost} disabled={isPosting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-100">
                        {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approva e Pubblica su Reddit"}
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RedditPage;
