import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { 
    Loader2, CheckCircle2, XCircle, Clock, 
    ChevronRight, AlertCircle, Sparkles, Zap, ExternalLink
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
    Popover, PopoverContent, PopoverTrigger 
} from './ui/popover';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';

export const TaskCenter = ({ getAuthHeaders, isAdmin }) => {
    const [jobs, setJobs] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const prevRunningIds = useRef(new Set());

    const fetchActiveJobs = useCallback(async () => {
        try {
            const headers = getAuthHeaders();
            if (!headers || !headers.Authorization) return; // Skip if no auth yet
            
            const res = await axios.get(`${API}/jobs/active`, { headers });
            const currentJobs = res.data.jobs || [];
            
            // Check for new completions to trigger toast
            currentJobs.forEach(job => {
                if (job.status === 'completed' && prevRunningIds.current.has(job.id)) {
                    toast.success(`Task AI Completato!`, {
                        description: `Il job ${job.id.slice(0, 8)} ha generato ${job.summary?.generated_ok || job.total} articoli.`,
                        duration: 8000
                    });
                    prevRunningIds.current.delete(job.id);
                } else if (job.status === 'running') {
                    prevRunningIds.current.add(job.id);
                }
            });

            setJobs(currentJobs);
        } catch (e) {
            // Silently ignore 401/403 on polling (token expired or not ready)
            if (e?.response?.status === 401 || e?.response?.status === 403) return;
            console.error("Error fetching background jobs:", e);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchActiveJobs();
        const interval = setInterval(fetchActiveJobs, 5000);
        return () => clearInterval(interval);
    }, [fetchActiveJobs]);

    const runningJobs = jobs.filter(j => j.status === 'running');
    const completedJobs = jobs.filter(j => j.status === 'completed');

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                >
                    <Zap className={`w-5 h-5 ${runningJobs.length > 0 ? 'text-emerald-500 fill-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                    {runningJobs.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[8px] font-black text-white">
                                {runningJobs.length}
                            </span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-none shadow-2xl rounded-[1.5rem] overflow-hidden" align="end">
                <div className="bg-slate-950 p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Zap className="w-32 h-32 fill-white" />
                    </div>
                    <div className="relative z-10 space-y-1">
                        <h4 className="text-[14px] font-black uppercase tracking-tight flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-400 fill-current" />
                            Task Engine AI
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {runningJobs.length} Attivi • {completedJobs.length} Recenti
                        </p>
                    </div>
                </div>

                <ScrollArea className="max-h-[450px] bg-slate-50/50">
                    <div className="p-3 space-y-3">
                        {jobs.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 shadow-sm">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nessuna attività</p>
                                    <p className="text-[10px] text-slate-300 font-medium italic mt-2 px-8">Puoi avviare generazioni massive e monitorarle qui.</p>
                                </div>
                            </div>
                        ) : (
                            jobs.map((job) => {
                                const isRunning = job.status === 'running';
                                const progress = (job.completed / job.total) * 100;
                                return (
                                    <div key={job.id} className={`p-4 rounded-2xl transition-all border ${isRunning ? 'bg-white border-emerald-100 shadow-md ring-1 ring-emerald-50' : 'bg-white/80 border-slate-100'}`}>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`rounded-md text-[8px] font-black tracking-widest border px-1.5 py-0.5 ${isRunning ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                            {job.status.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                                            ID: {job.id.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    <h5 className="text-[13px] font-black text-slate-900 tracking-tight mt-1">Batch Generation PIANO</h5>
                                                </div>
                                                {isRunning ? (
                                                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                )}
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 px-0.5">
                                                    <span>Progresso Elaborazione</span>
                                                    <span>{job.completed} / {job.total}</span>
                                                </div>
                                                <Progress value={progress} className={`h-2 rounded-full ${isRunning ? 'bg-emerald-50' : 'bg-slate-100'}`} />
                                            </div>

                                            {!isRunning && job.summary && (
                                                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                                                    <p className="text-[10px] font-bold text-emerald-700">Completato con successo</p>
                                                    <div className="flex items-center gap-1 text-emerald-600 font-black text-[10px]">
                                                        <span>{job.summary.generated_ok || job.total} OK</span>
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {isRunning && (
                                                <div className="flex items-center justify-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                                    <div className="flex -space-x-1.5">
                                                        {[...Array(Math.min(job.completed % 5 || 1, 3))].map((_, i) => (
                                                            <div key={i} className="w-4 h-4 rounded-md bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
                                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic translate-y-[0.5px]">AI Writing Content...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-slate-100/50 border-t border-slate-100 flex flex-col items-center gap-2">
                    <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-[0.2em]">
                        Persistence Engine Active
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
};
