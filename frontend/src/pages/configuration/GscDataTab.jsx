import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  BarChart3, Loader2, RefreshCw, ExternalLink, TrendingUp,
  MousePointerClick, Eye, Target, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GscDataTab = ({ clientId, getAuthHeaders, client }) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [days, setDays] = useState('28');
    const [gscConnected, setGscConnected] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/clients/${clientId}/gsc-data?days=${days}`, {
                headers: getAuthHeaders()
            });
            setData(res.data);
            setGscConnected(true);
        } catch (error) {
            if (error.response?.status === 401) {
                setGscConnected(false);
                toast.error('Sessione GSC scaduta. Riconnettiti nella scheda Configurazione.');
            } else {
                setGscConnected(false);
                // Silence common 400s if not connected
                if (error.response?.status !== 400) toast.error('Errore caricamento dati GSC');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) fetchData();
    }, [clientId, days]);

    if (!gscConnected && !loading) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                    <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Google Search Console non connesso</h3>
                    <p className="text-slate-500 max-w-lg mx-auto mb-6">
                        Connetti il tuo account Google nella scheda **Configurazione** per visualizzare i dati di performance e posizionamento.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-['Manrope'] pr-4 tracking-tight">Performance di Ricerca</h3>
                  <p className="text-sm text-slate-500">{client?.nome} — Dati organici reali da Google</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={days} onValueChange={(v) => setDays(v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Ultimi 7 giorni</SelectItem>
                        <SelectItem value="28">Ultimi 28 giorni</SelectItem>
                        <SelectItem value="90">Ultimi 3 mesi</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Aggiorna
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Click totali', value: data.totals?.total_clicks, icon: MousePointerClick, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Impressioni', value: data.totals?.total_impressions, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
                            { label: 'CTR medio', value: `${data.totals?.avg_ctr}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Pos. media', value: data.totals?.avg_position, icon: Target, color: 'text-orange-600', bg: 'bg-orange-50' },
                        ].map(s => (
                            <Card key={s.label} className="border-slate-200">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <s.icon className={`w-4 h-4 ${s.color}`} />
                                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{s.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{s.value?.toLocaleString()}</p>
                              </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-slate-200">
                          <CardHeader className="pb-3"><CardTitle className="text-lg">Top Keyword</CardTitle><CardDescription>{data.keywords?.length} keyword posizionate</CardDescription></CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px]">
                              <table className="w-full text-sm">
                                <thead className="border-b border-slate-200 sticky top-0 bg-white">
                                  <tr className="text-slate-500 text-xs text-left uppercase font-semibold">
                                    <th className="py-2 px-1">Keyword</th>
                                    <th className="py-2 px-1 text-right">Click</th>
                                    <th className="py-2 px-1 text-right">CTR</th>
                                    <th className="py-2 px-1 text-right">Pos.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(data.keywords || []).map((kw, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                      <td className="py-2 px-1 font-medium text-slate-900 truncate max-w-[180px]">{kw.keyword}</td>
                                      <td className="py-2 px-1 text-right text-blue-600 font-bold">{kw.clicks}</td>
                                      <td className="py-2 px-1 text-right text-slate-500">{kw.ctr}%</td>
                                      <td className="py-2 px-1 text-right">
                                        <Badge variant={kw.position <= 3 ? 'default' : kw.position <= 10 ? 'secondary' : 'outline'}
                                          className={`text-[10px] sm:text-xs h-5 px-1 ${kw.position <= 3 ? 'bg-emerald-600' : ''}`}>
                                          {kw.position}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                          <CardHeader className="pb-3"><CardTitle className="text-lg">Top Pagine</CardTitle><CardDescription>{data.pages?.length} pagine con traffico</CardDescription></CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px]">
                              <table className="w-full text-sm">
                                <thead className="border-b border-slate-200 sticky top-0 bg-white">
                                  <tr className="text-slate-500 text-xs text-left uppercase font-semibold">
                                    <th className="py-2 px-1">URL</th>
                                    <th className="py-2 px-1 text-right">Click</th>
                                    <th className="py-2 px-1 text-right">Pos.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(data.pages || []).map((pg, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                      <td className="py-2 px-1">
                                        <a href={pg.page} target="_blank" rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1 max-w-[200px] truncate">
                                          {pg.page.replace(/https?:\/\/[^/]+/, '') || '/'}
                                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                        </a>
                                      </td>
                                      <td className="py-2 px-1 text-right text-blue-600 font-bold">{pg.clicks}</td>
                                      <td className="py-2 px-1 text-right"><span className="text-xs text-slate-500">{pg.position}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                    </div>
                </>
            ) : null}
        </div>
    );
};

export default GscDataTab;
