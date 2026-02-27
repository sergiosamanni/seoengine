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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Activity Log</h1>
          <p className="text-slate-500 mt-1">Monitora generazioni e pubblicazioni</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading} data-testid="refresh-logs-btn">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Aggiorna
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Operazioni totali</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700 font-['Manrope']">{stats.success}</p>
            <p className="text-xs text-emerald-600 mt-1">Successi</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700 font-['Manrope']">{stats.failed}</p>
            <p className="text-xs text-red-600 mt-1">Errori</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 font-['Manrope']">{stats.wpPublished}</p>
            <p className="text-xs text-blue-600 mt-1">Pubblicati WP</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[200px]" data-testid="filter-client">
              <SelectValue placeholder="Filtra per cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i clienti</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[200px]" data-testid="filter-action">
              <SelectValue placeholder="Filtra per azione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le azioni</SelectItem>
              <SelectItem value="article_generate">Generazione</SelectItem>
              <SelectItem value="wordpress_publish">Pubblicazione WP</SelectItem>
              <SelectItem value="batch_start">Avvio batch</SelectItem>
              <SelectItem value="batch_complete">Batch completato</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">{filteredLogs.length} risultati</Badge>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card className="border-slate-200" data-testid="activity-log-list">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nessuna attivita' registrata</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log, i) => (
                <div key={log.id || i} className="px-6 py-4 hover:bg-slate-50 transition-colors" data-testid={`activity-row-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <Badge variant="outline" className="text-xs">{getClientName(log.client_id)}</Badge>
                        <Badge className={`text-xs ${STATUS_COLORS[log.status] || ''}`}>{log.status}</Badge>
                      </div>
                      {log.details?.titolo && (
                        <p className="text-sm text-slate-600 mt-1 truncate">{log.details.titolo}</p>
                      )}
                      {log.details?.error && (
                        <p className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded line-clamp-2">{log.details.error}</p>
                      )}
                      {log.details?.link && (
                        <a href={log.details.link} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                          {log.details.link.replace('https://', '').slice(0, 50)} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {log.details?.post_id && (
                        <span className="text-xs text-slate-500 mt-0.5 block">WP Post ID: {log.details.post_id}</span>
                      )}
                      {log.details?.total_combinations && (
                        <span className="text-xs text-slate-500">{log.details.total_combinations} combinazioni | {log.details.provider} ({log.details.model})</span>
                      )}
                      {log.action === 'batch_complete' && log.details?.total !== undefined && (
                        <span className="text-xs text-slate-500">{log.details.generated}/{log.details.total} generati, {log.details.published} pubblicati</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
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
