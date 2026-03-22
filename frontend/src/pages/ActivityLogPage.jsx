import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Activity Log</h1>
            <p className="text-xs text-slate-500">Monitoraggio real-time delle operazioni</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-3 text-slate-500">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Totali', value: stats.total, color: 'slate' },
          { label: 'Successi', value: stats.success, color: 'emerald' },
          { label: 'Errori', value: stats.failed, color: 'red' },
          { label: 'WP', value: stats.wpPublished, color: 'blue' }
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm">
            <span className="text-xl font-bold font-['Manrope'] text-slate-900">{s.value}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-8 w-fit min-w-[140px] text-xs bg-white border-slate-200">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all text-xs">Tutti i clienti</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="h-8 w-fit min-w-[140px] text-xs bg-white border-slate-200">
            <SelectValue placeholder="Azione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all text-xs">Tutte le azioni</SelectItem>
            <SelectItem value="article_generate" className="text-xs">Generazione</SelectItem>
            <SelectItem value="wordpress_publish" className="text-xs">Pubblicazione WP</SelectItem>
            <SelectItem value="batch_start" className="text-xs">Avvio batch</SelectItem>
            <SelectItem value="batch_complete" className="text-xs">Batch completato</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="h-8 px-3 ml-auto text-[10px] font-medium text-slate-500 bg-white border-slate-200">
          {filteredLogs.length} LOGS
        </Badge>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden" data-testid="activity-log-list">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20">
                <Activity className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Nessuna attività</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                  <tr className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    <th className="py-2.5 px-4 font-bold">Stato</th>
                    <th className="py-2.5 px-4 font-bold">Azione / Cliente</th>
                    <th className="py-2.5 px-4 font-bold">Dettagli</th>
                    <th className="py-2.5 px-4 text-right font-bold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-slate-50/50 transition-colors group" data-testid={`activity-row-${i}`}>
                      <td className="py-3 px-4 w-16">
                        <div className="flex justify-center">{getStatusIcon(log.status)}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">
                            {getClientName(log.client_id)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col max-w-[400px]">
                          {log.details?.titolo && (
                            <span className="text-xs text-slate-600 truncate font-semibold">{log.details.titolo}</span>
                          )}
                          {log.details?.error && (
                            <span className="text-[11px] text-red-500 line-clamp-1 italic">{log.details.error}</span>
                          )}
                          {log.details?.link && (
                            <a href={log.details.link} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 w-fit mt-0.5">
                              Link WordPress <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {log.details?.total_combinations && (
                            <span className="text-[10px] text-slate-400">{log.details.total_combinations} combinazioni • {log.details.model}</span>
                          )}
                          {log.action === 'batch_complete' && log.details?.total !== undefined && (
                            <span className="text-[10px] text-slate-400">{log.details.generated}/{log.details.total} generati • {log.details.published} pubblicati</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                          {new Date(log.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
};
