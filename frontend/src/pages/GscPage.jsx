import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  BarChart3,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  Save,
  Settings2,
  TrendingUp,
  MousePointerClick,
  Eye,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GscPage = () => {
  const { getAuthHeaders } = useAuth();
  const { clientId } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [days, setDays] = useState('28');
  const [showConfig, setShowConfig] = useState(false);
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [client, setClient] = useState(null);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const res = await axios.get(`${API}/clients/${clientId}`, { headers: getAuthHeaders() });
      setClient(res.data);
      const gsc = res.data.configuration?.gsc || {};
      if (gsc.service_account_json) setServiceAccountJson(gsc.service_account_json);
      if (gsc.site_url) setSiteUrl(gsc.site_url);
      if (gsc.service_account_json && gsc.site_url) {
        fetchData();
      } else {
        setShowConfig(true);
      }
    } catch (e) { /* ignore */ }
  };

  const saveConfig = async () => {
    if (!serviceAccountJson.trim() || !siteUrl.trim()) {
      toast.error('Compila tutti i campi');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/clients/${clientId}/gsc-config`, {
        service_account_json: serviceAccountJson,
        site_url: siteUrl,
        enabled: true
      }, { headers: getAuthHeaders() });
      toast.success('Configurazione GSC salvata');
      setShowConfig(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/clients/${clientId}/gsc-data?days=${days}`, {
        headers: getAuthHeaders()
      });
      setData(res.data);
    } catch (error) {
      if (error.response?.status === 400) {
        setShowConfig(true);
      }
      toast.error(error.response?.data?.detail || 'Errore GSC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Google Search Console</h1>
          <p className="text-slate-500 mt-1">{client?.nome} — Dati di posizionamento e performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} data-testid="gsc-config-btn">
            <Settings2 className="w-4 h-4 mr-2" />Configura
          </Button>
          <Select value={days} onValueChange={(v) => { setDays(v); }}>
            <SelectTrigger className="w-[140px]" data-testid="gsc-period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimi 7 giorni</SelectItem>
              <SelectItem value="28">Ultimi 28 giorni</SelectItem>
              <SelectItem value="90">Ultimi 3 mesi</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} disabled={loading} data-testid="gsc-refresh-btn">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Aggiorna
          </Button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg">Configurazione Google Search Console</CardTitle>
            <CardDescription>Inserisci le credenziali del Service Account e l'URL del sito</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL del sito (come appare in GSC)</Label>
              <Input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://www.example.com/ oppure sc-domain:example.com"
                data-testid="gsc-site-url-input"
              />
            </div>
            <div className="space-y-2">
              <Label>JSON Service Account</Label>
              <Textarea
                value={serviceAccountJson}
                onChange={(e) => setServiceAccountJson(e.target.value)}
                placeholder='Incolla qui il contenuto del file JSON del Service Account...'
                rows={6}
                className="font-mono text-xs"
                data-testid="gsc-sa-json-input"
              />
              <p className="text-xs text-slate-500">
                Crea un Service Account in Google Cloud Console, abilita la Search Console API, e aggiungi l'email del SA come utente in GSC.
              </p>
            </div>
            <Button onClick={saveConfig} disabled={saving} className="bg-slate-900" data-testid="gsc-save-btn">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salva Configurazione
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MousePointerClick className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-slate-500">Click totali</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{data.totals?.total_clicks?.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-slate-500">Impressioni</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{data.totals?.total_impressions?.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-500">CTR medio</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{data.totals?.avg_ctr}%</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-slate-500">Posizione media</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']">{data.totals?.avg_position}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keywords Table */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Top Keyword</CardTitle>
                <CardDescription>{data.keywords?.length} keyword posizionate</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr className="text-slate-500 text-xs">
                        <th className="text-left py-2 px-1">Keyword</th>
                        <th className="text-right py-2 px-1">Click</th>
                        <th className="text-right py-2 px-1">Impr.</th>
                        <th className="text-right py-2 px-1">CTR</th>
                        <th className="text-right py-2 px-1">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.keywords || []).map((kw, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-1 font-medium text-slate-900 truncate max-w-[200px]">{kw.keyword}</td>
                          <td className="py-2 px-1 text-right text-blue-600 font-medium">{kw.clicks}</td>
                          <td className="py-2 px-1 text-right text-slate-500">{kw.impressions.toLocaleString()}</td>
                          <td className="py-2 px-1 text-right text-slate-600">{kw.ctr}%</td>
                          <td className="py-2 px-1 text-right">
                            <Badge variant={kw.position <= 3 ? 'default' : kw.position <= 10 ? 'secondary' : 'outline'}
                              className={`text-xs ${kw.position <= 3 ? 'bg-emerald-600' : ''}`}>
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

            {/* Pages Table */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Top Pagine</CardTitle>
                <CardDescription>{data.pages?.length} pagine con traffico</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr className="text-slate-500 text-xs">
                        <th className="text-left py-2 px-1">Pagina</th>
                        <th className="text-right py-2 px-1">Click</th>
                        <th className="text-right py-2 px-1">CTR</th>
                        <th className="text-right py-2 px-1">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.pages || []).map((pg, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="py-2 px-1 truncate max-w-[250px]">
                            <a href={pg.page} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1">
                              {pg.page.replace(/https?:\/\/[^/]+/, '').slice(0, 40) || '/'}
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                          </td>
                          <td className="py-2 px-1 text-right text-blue-600 font-medium">{pg.clicks}</td>
                          <td className="py-2 px-1 text-right text-slate-600">{pg.ctr}%</td>
                          <td className="py-2 px-1 text-right">
                            <Badge variant={pg.position <= 10 ? 'secondary' : 'outline'} className="text-xs">
                              {pg.position}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      ) : !showConfig ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun dato disponibile</h3>
            <p className="text-slate-500 max-w-md mx-auto">Configura le credenziali GSC e clicca "Aggiorna" per caricare i dati.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
