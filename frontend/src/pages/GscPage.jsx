import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  ExternalLink,
  Save,
  TrendingUp,
  MousePointerClick,
  Eye,
  Target,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  LogIn
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GscPage = () => {
  const { getAuthHeaders } = useAuth();
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [savingSiteUrl, setSavingSiteUrl] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [data, setData] = useState(null);
  const [days, setDays] = useState('28');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteUrlInput, setSiteUrlInput] = useState('');
  const [client, setClient] = useState(null);
  const [gscConnected, setGscConnected] = useState(false);
  const [integrationConfigured, setIntegrationConfigured] = useState(true);
  const [redirectUri, setRedirectUri] = useState('');

  useEffect(() => {
    fetchClient();
    checkIntegration();
    if (searchParams.get('gsc_connected') === 'true') {
      toast.success('Google Search Console connesso con successo!');
    }
    if (searchParams.get('error') === 'auth_failed') {
      toast.error('Autorizzazione Google fallita. Riprova.');
    }
  }, [clientId]);

  const checkIntegration = async () => {
    try {
      const res = await axios.get(`${API}/gsc/status`, { headers: getAuthHeaders() });
      setIntegrationConfigured(res.data.configured);
      if (res.data.redirect_uri) setRedirectUri(res.data.redirect_uri);
    } catch (e) { /* ignore */ }
  };

  const fetchClient = async () => {
    try {
      const res = await axios.get(`${API}/clients/${clientId}`, { headers: getAuthHeaders() });
      setClient(res.data);
      const gsc = res.data.configuration?.gsc || {};
      if (gsc.site_url) {
        setSiteUrl(gsc.site_url);
        setSiteUrlInput(gsc.site_url);
      }
      setGscConnected(!!gsc.connected);
      if (gsc.connected && gsc.site_url) {
        fetchData();
      }
    } catch (e) { /* ignore */ }
  };

  const saveSiteUrl = async () => {
    if (!siteUrlInput.trim()) {
      toast.error('Inserisci l\'URL del sito');
      return;
    }
    setSavingSiteUrl(true);
    try {
      await axios.post(`${API}/clients/${clientId}/gsc-config`, {
        site_url: siteUrlInput.trim(),
        enabled: true
      }, { headers: getAuthHeaders() });
      setSiteUrl(siteUrlInput.trim());
      toast.success('URL sito salvato');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio');
    } finally {
      setSavingSiteUrl(false);
    }
  };

  const connectGoogle = async () => {
    if (!siteUrl) {
      toast.error('Salva prima l\'URL del sito');
      return;
    }
    setConnecting(true);
    try {
      const res = await axios.get(`${API}/gsc/authorize/${clientId}`, { headers: getAuthHeaders() });
      window.location.href = res.data.authorization_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore avvio connessione Google');
      setConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    try {
      await axios.post(`${API}/clients/${clientId}/gsc-disconnect`, {}, { headers: getAuthHeaders() });
      setGscConnected(false);
      setData(null);
      toast.success('Google Search Console disconnesso');
    } catch (error) {
      toast.error('Errore disconnessione');
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
      if (error.response?.status === 401) {
        setGscConnected(false);
        toast.error('Sessione GSC scaduta. Riconnettiti.');
      } else {
        toast.error(error.response?.data?.detail || 'Errore caricamento dati GSC');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!integrationConfigured) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="gsc-page">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Google Search Console</h1>
          <p className="text-slate-500 mt-1">{client?.nome}</p>
        </div>
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Integrazione GSC non configurata</h3>
            <p className="text-slate-500 max-w-lg mx-auto">
              L'integrazione con Google Search Console richiede la configurazione delle credenziali OAuth a livello di sistema.
              Contatta l'amministratore di sistema per abilitarla.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="gsc-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Google Search Console</h1>
          <p className="text-slate-500 mt-1">{client?.nome} — Dati di posizionamento e performance</p>
        </div>
        {gscConnected && (
          <div className="flex items-center gap-3">
            <Select value={days} onValueChange={(v) => setDays(v)}>
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
        )}
      </div>

      {/* Connection Card */}
      {!gscConnected ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Connetti Google Search Console
            </CardTitle>
            <CardDescription>
              Accedi con il tuo account Google per visualizzare keyword, posizionamenti e performance del sito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Step 1: Site URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">URL del sito (come appare in GSC)</Label>
              <div className="flex gap-2">
                <Input
                  value={siteUrlInput}
                  onChange={(e) => setSiteUrlInput(e.target.value)}
                  placeholder="https://www.tuosito.com/"
                  className="flex-1"
                  data-testid="gsc-site-url-input"
                />
                <Button
                  variant="outline"
                  onClick={saveSiteUrl}
                  disabled={savingSiteUrl || !siteUrlInput.trim()}
                  data-testid="gsc-save-url-btn"
                >
                  {savingSiteUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
              {siteUrl && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> URL salvato: {siteUrl}
                </p>
              )}
            </div>

            {/* Step 2: Connect */}
            <Button
              size="lg"
              onClick={connectGoogle}
              disabled={connecting || !siteUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
              data-testid="gsc-connect-btn"
            >
              {connecting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connessione in corso...</>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Connetti Google Search Console
                </>
              )}
            </Button>

            {!siteUrl && (
              <p className="text-xs text-slate-400 text-center">Inserisci e salva l'URL del sito prima di connetterti</p>
            )}
            {redirectUri && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-medium text-slate-600 mb-1">URI di reindirizzamento autorizzato (da aggiungere in Google Cloud Console):</p>
                <code className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded break-all block" data-testid="gsc-redirect-uri">{redirectUri}</code>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Connected Status Bar */
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-sm text-slate-900">Connesso a Google Search Console</p>
                <p className="text-xs text-slate-500">{siteUrl}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectGoogle}
              className="text-red-600 border-red-200 hover:bg-red-50"
              data-testid="gsc-disconnect-btn"
            >
              <Unlink className="w-4 h-4 mr-2" />Disconnetti
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Section */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MousePointerClick className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-slate-500">Click totali</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']" data-testid="gsc-total-clicks">{data.totals?.total_clicks?.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-slate-500">Impressioni</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']" data-testid="gsc-total-impressions">{data.totals?.total_impressions?.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-slate-500">CTR medio</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']" data-testid="gsc-avg-ctr">{data.totals?.avg_ctr}%</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-slate-500">Posizione media</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-['Manrope']" data-testid="gsc-avg-position">{data.totals?.avg_position}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50" data-testid={`gsc-kw-row-${i}`}>
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
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50" data-testid={`gsc-page-row-${i}`}>
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
      ) : null}
    </div>
  );
};
