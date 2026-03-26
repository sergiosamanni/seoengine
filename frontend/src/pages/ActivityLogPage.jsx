import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  ExternalLink,
  Filter
} from 'lucide-react';



const ACTION_LABELS = {
  batch_start: 'Avvio batch',
  batch_complete: 'Batch completato',
  article_generate: 'Generazione articolo',
  wordpress_publish: 'Pubblicazione WordPress'
};

const STATUS_COLORS = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  failed: 'bg-red-50 border-red-200 text-red-800',
  running: 'bg-blue-50 border-blue-200 text-blue-800',
  pending: 'bg-slate-50 border-slate-200 text-slate-600'
};

export const ActivityLogPage = () => {
  const { getAuthHeaders } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [filterClient, setFilterClient] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/activity-logs?limit=200`, { headers: getAuthHeaders() }),
        axios.get(`${API}/clients`, { headers: getAuthHeaders() })
      ]);
      setLogs(logsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const getClientName = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    return c?.nome || clientId?.slice(0, 8);
  };

  const filteredLogs = logs.filter(log => {
    if (filterClient !== 'all' && log.client_id !== filterClient) return false;
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    return true;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    wpPublished: logs.filter(l => l.action === 'wordpress_publish' && l.status === 'success').length
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Activity Log</h1>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">Monitoraggio Generazioni e Workflow</p>
        </div>
        <Button variant="ghost" onClick={fetchData} disabled={loading} className="text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-slate-900 h-9 px-4 rounded-xl border border-[#f1f3f6] bg-white shadow-sm" data-testid="refresh-logs-btn">
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />Aggiorna
        </Button>
      </div>

      {/* Stats - Compact & Modern */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totali', value: stats.total, color: 'slate' },
          { label: 'Successi', value: stats.success, color: 'emerald' },
          { label: 'Errori', value: stats.failed, color: 'red' },
          { label: 'Online', value: stats.wpPublished, color: 'blue' }
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#f1f3f6] rounded-2xl p-4 shadow-sm">
            <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold tracking-tight ${
              stat.color === 'emerald' ? 'text-emerald-500' : 
              stat.color === 'red' ? 'text-red-500' : 
              stat.color === 'blue' ? 'text-blue-500' : 'text-slate-900'
            }`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters - Minimal */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Filtri:</span>
            <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-[160px] h-9 border-[#f1f3f6] rounded-xl text-[11px] font-bold bg-white shadow-sm" data-testid="filter-client">
                    <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#f1f3f6]">
                    <SelectItem value="all" className="text-xs font-medium">Tutti i clienti</SelectItem>
                    {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-medium">{c.nome}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[160px] h-9 border-[#f1f3f6] rounded-xl text-[11px] font-bold bg-white shadow-sm" data-testid="filter-action">
                    <SelectValue placeholder="Azione" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#f1f3f6]">
                    <SelectItem value="all" className="text-xs font-medium">Tutte le azioni</SelectItem>
                    <SelectItem value="article_generate" className="text-xs font-medium">Generazione</SelectItem>
                    <SelectItem value="wordpress_publish" className="text-xs font-medium">Pubblicazione WP</SelectItem>
                    <SelectItem value="batch_start" className="text-xs font-medium">Avvio batch</SelectItem>
                    <SelectItem value="batch_complete" className="text-xs font-medium">Batch completato</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">{filteredLogs.length} EVENTI</span>
      </div>

      {/* Log List - Refined */}
      <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white" data-testid="activity-log-list">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-5 h-5 text-slate-200" />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Nessuna attività registrata</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f3f6]">
              {filteredLogs.map((log, i) => (
                <div key={log.id || i} className="px-6 py-4 hover:bg-slate-50/50 transition-colors group" data-testid={`activity-row-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        {log.status === 'success' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : 
                         log.status === 'failed' ? <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> :
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-slate-900 tracking-tight">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {getClientName(log.client_id)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {log.details?.titolo && (
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">{log.details.titolo}</p>
                        )}
                        {log.details?.error && (
                            <p className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 line-clamp-1">{log.details.error}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        {log.details?.link && (
                            <a href={log.details.link} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-600 flex items-center gap-1 transition-colors">
                            Link WP <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        )}
                        {log.details?.total_combinations && (
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                {log.details.total_combinations} COMBOS <span className="mx-1 opacity-30">|</span> {log.details.model}
                            </span>
                        )}
                        {log.action === 'batch_complete' && log.details?.total !== undefined && (
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                {log.details.generated}/{log.details.total} GENERATI <span className="mx-1 opacity-30">|</span> {log.details.published} PUBBLICATI
                            </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 tracking-tighter">
                            {new Date(log.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                            {new Date(log.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                        </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;
