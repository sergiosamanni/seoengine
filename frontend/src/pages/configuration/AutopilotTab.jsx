import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { 
    Zap, Clock, Calendar, CheckCircle2, Globe, AlertCircle, 
    ArrowRight, Loader2, Sparkles, Trash2, RefreshCcw
} from 'lucide-react';
import { API_URL as API } from '../../config';
import { toast } from 'sonner';

export const AutopilotTab = ({ autopilot, setAutopilot, clientId, getAuthHeaders }) => {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);

  const config = autopilot || { 
    enabled: false, 
    strategy: 'editorial_plan_first', 
    frequency: 'weekly', 
    time_of_day: '09:00',
    auto_publish: true 
  };

  const fetchTasks = async () => {
    if (!clientId) return;
    setLoadingTasks(true);
    try {
        const res = await axios.get(`${API}/autopilot-tasks/${clientId}`, { headers: getAuthHeaders() });
        setTasks(res.data.tasks || []);
    } catch (e) {
        console.error("Error fetching tasks:", e);
    } finally {
        setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [clientId]);

  const handleResolve = async (taskId, action) => {
    setResolvingId(taskId);
    try {
        if (action === 'approve') {
            await axios.post(`${API}/autopilot-tasks/${taskId}/approve`, {}, { headers: getAuthHeaders() });
            toast.success("Azione approvata e pronta per l'esecuzione");
        } else {
            await axios.delete(`${API}/autopilot-tasks/${taskId}`, { headers: getAuthHeaders() });
            toast.success("Azione rimossa dalla coda");
        }
        fetchTasks();
    } catch (e) {
        toast.error("Errore durante la risoluzione del task");
        console.error(e);
    } finally {
        setResolvingId(null);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
        const res = await axios.post(`${API}/autopilot-tasks/${clientId}/scan`, {}, { headers: getAuthHeaders() });
        toast.success(res.data.message || "Scansione completata");
        fetchTasks();
    } catch (e) {
        toast.error("Errore durante la scansione SEO");
        console.error(e);
    } finally {
        setScanning(false);
    }
  };

  const handleSeed = async () => {
    try {
        await axios.post(`${API}/autopilot-tasks/${clientId}/seed`, {}, { headers: getAuthHeaders() });
        toast.success("Task di prova generati con successo");
        fetchTasks();
    } catch (e) {
        toast.error("Errore durante il seeding");
    }
  };

  const update = (field, value) => {
    setAutopilot({ ...config, [field]: value });
  };

  const getTypeColor = (type) => {
    switch (type) {
        case 'REVAMP': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'NEW_CONTENT': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'INTERNAL_LINKING': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'CANNIBALIZATION': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'SEMANTIC_GAP': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. Configuration Section */}
      <div className="space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/30 overflow-hidden relative rounded-[2rem]">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-32 h-32 text-emerald-600" />
            </div>
            <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-emerald-900 text-xl font-black uppercase tracking-tight">
                <Zap className="w-6 h-6 text-emerald-600 fill-current" />
                SEO Autopilot
                </CardTitle>
                <Switch 
                    checked={config.enabled} 
                    onCheckedChange={(val) => update('enabled', val)}
                    className="data-[state=checked]:bg-emerald-500"
                />
            </div>
            <CardDescription className="text-emerald-700/70 font-medium max-w-md">
                Il bot agirà autonomamente analizzando GSC e Freshness per proporti ottimizzazioni periodiche da revisionare.
            </CardDescription>
            </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Scheduling Temporale
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-600 ml-1">Frequenza di Scansione Proposte</Label>
                    <select 
                        value={config.frequency} 
                        onChange={(e) => update('frequency', e.target.value)}
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                    >
                        <option value="daily">Ogni Giorno (Proattivo)</option>
                        <option value="biweekly">Due volte a settimana</option>
                        <option value="weekly">Ogni Settimana (Standard)</option>
                        <option value="monthly">Ogni Mese (Conservativa)</option>
                    </select>
                </div>
                
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-600 ml-1">Orario di Esecuzione Job</Label>
                    <Input 
                        type="time" 
                        value={config.time_of_day} 
                        onChange={(e) => update('time_of_day', e.target.value)}
                        className="h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold"
                    />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">Consigliato: 08:30 - 10:00</p>
                </div>
            </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-6">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Strategia & Human-In-The-Loop
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-600 ml-1">Priorità Analisi</Label>
                    <select 
                        value={config.strategy} 
                        onChange={(e) => update('strategy', e.target.value)}
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 font-bold text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all appearance-none"
                    >
                        <option value="editorial_plan_first">Priorità Freshness & GSC (Data-Driven)</option>
                        <option value="keyword_combinations">Priorità Nuove Keyword (Expansion)</option>
                    </select>
                </div>

                <div className="flex items-center justify-between p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-emerald-900">Human-In-The-Loop attivo</Label>
                        <p className="text-[10px] text-emerald-700/70 font-medium italic">Richiedi approvazione manuale prima di agire</p>
                    </div>
                    <Switch 
                        checked={true} 
                        disabled={true}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                </div>

                <Button 
                    onClick={handleScan}
                    disabled={scanning}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                    {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {scanning ? "Scansione in corso..." : "Avvia Scansione SEO Now"}
                </Button>
            </CardContent>
            </Card>
        </div>
      </div>

      {/* 2. HITL Approval Queue */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Revisione Suggerimenti AI
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                    {tasks.length} azioni SEO in attesa di approvazione
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    onClick={handleSeed}
                    className="h-9 border-slate-200 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-50"
                >
                    Seed Test
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={fetchTasks}
                    className="h-9 w-9 text-slate-400 hover:text-slate-900 rounded-xl"
                >
                    <RefreshCcw className={`w-4 h-4 ${loadingTasks ? 'animate-spin' : ''}`} />
                </Button>
            </div>
        </div>

        {tasks.length === 0 && !loadingTasks ? (
            <Card className="border-dashed border-2 border-slate-100 shadow-none bg-slate-50/30 rounded-[2.5rem]">
                <CardContent className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-8 h-8 text-slate-200" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Coda Vuota</p>
                        <p className="text-[11px] text-slate-400 font-medium italic">Nessuna proposta SEO generata al momento. Lo scanner agirà secondo il prossimo scheduling.</p>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {tasks.map((task) => (
                    <Card key={task.id} className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-[1.5rem] bg-white overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="hidden sm:block shrink-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${task.type === 'REVAMP' ? 'bg-amber-50' : task.type === 'INTERNAL_LINKING' ? 'bg-blue-50' : 'bg-emerald-50' } shadow-sm`}>
                                        {task.type === 'REVAMP' ? <Sparkles className="w-5 h-5 text-amber-500" /> : <Globe className="w-5 h-5 text-blue-500" />}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`rounded-md text-[9px] font-black tracking-widest border px-2 py-0.5 ${getTypeColor(task.type)}`}>
                                                    {task.type}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {new Date(task.created_at).toLocaleDateString('it-IT')}
                                                </span>
                                            </div>
                                            <h4 className="text-md font-bold text-slate-900">{task.title}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => handleResolve(task.id, 'reject')}
                                                disabled={resolvingId === task.id}
                                                className="flex-1 sm:flex-none h-10 px-4 rounded-xl text-slate-400 border-slate-100 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all font-bold text-xs"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                onClick={() => handleResolve(task.id, 'approve')}
                                                disabled={resolvingId === task.id}
                                                className="flex-3 sm:flex-none h-10 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95 font-bold text-xs"
                                            >
                                                {resolvingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                Approva
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight">Motivazione Strategica</p>
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed italic">{task.reason}</p>
                                            </div>
                                        </div>
                                        <div className="h-[1px] bg-slate-200/50" />
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 leading-tight">Suggerimento AI</p>
                                                <p className="text-xs text-slate-700 font-bold leading-relaxed">{task.suggestion}</p>
                                                {task.url && (
                                                    <a href={task.url} target="_blank" rel="noreferrer" className="text-[10px] inline-flex items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors underline decoration-dotted mt-1">
                                                        {task.url} <ArrowRight className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )}
      </div>

      {config.last_run && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200">
            <div className="flex-1 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Ultimo Articolo Generato</p>
                <p className="text-lg font-bold flex items-center gap-2">
                   <Calendar className="w-5 h-5 text-slate-500" />
                   {new Date(config.last_run).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="hidden md:block w-[1px] h-12 bg-white/10" />
            <div className="flex-1 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500">Prossimo Scan Autopilot</p>
                <p className="text-lg font-bold flex items-center gap-2">
                   <Clock className="w-5 h-5 text-emerald-500" />
                   {config.next_run ? new Date(config.next_run).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'In calcolo...'}
                </p>
            </div>
        </div>
      )}
    </div>
  );
};
