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

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

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
    const init = async () => {
      await fetchClient();
      checkIntegration();
      // After OAuth redirect, re-fetch to ensure fresh state
      if (searchParams.get('gsc_connected') === 'true') {
        toast.success('Google Search Console connesso con successo!');
        // Small delay then re-fetch to ensure DB write completed
        setTimeout(() => fetchClient(), 500);
      }
      if (searchParams.get('error') === 'auth_failed') {
        toast.error('Autorizzazione Google fallita. Riprova.');
      }
    };
    init();
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
      const currentRedirectUri = `${window.location.origin}/api/gsc/callback`;
      const res = await axios.get(`${API}/gsc/authorize/${clientId}?redirect_uri=${encodeURIComponent(currentRedirectUri)}`, { headers: getAuthHeaders() });
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
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto" data-testid="gsc-page">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Google Search Console</h1>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">{client?.nome}</p>
        </div>
        <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Integrazione non configurata</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              L'integrazione richiede la configurazione delle credenziali OAuth.
              Contatta l'amministratore per abilitarla.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto" data-testid="gsc-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Google Search Console</h1>
          <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-semibold">{client?.nome} — Performance e Posizionamento</p>
        </div>
        {gscConnected && (
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={(v) => setDays(v)}>
              <SelectTrigger className="w-[150px] h-9 border-[#f1f3f6] rounded-xl text-[11px] font-bold bg-white" data-testid="gsc-period-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#f1f3f6]">
                <SelectItem value="7" className="text-xs font-medium">Ultimi 7 giorni</SelectItem>
                <SelectItem value="28" className="text-xs font-medium">Ultimi 28 giorni</SelectItem>
                <SelectItem value="90" className="text-xs font-medium">Ultimi 3 mesi</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={fetchData} disabled={loading} className="text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-slate-900 h-9 px-4 rounded-xl border border-[#f1f3f6] bg-white shadow-sm" data-testid="gsc-refresh-btn">
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />Aggiorna
            </Button>
          </div>
        )}
      </div>

      {/* Connected Status Banner - Modern & Minimal */}
      {gscConnected && (
        <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-slate-200" data-testid="gsc-connected-banner">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">GSC Connesso</p>
                <p className="text-[10px] text-slate-400 font-medium">{siteUrl}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={disconnectGoogle} className="text-[10px] uppercase font-bold tracking-widest text-red-400 hover:text-red-500 hover:bg-red-500/10 h-9 px-4 rounded-xl" data-testid="gsc-disconnect-btn">
                <Unlink className="w-3.5 h-3.5 mr-2" /> Disconnetti
            </Button>
        </div>
      )}

      {/* Connection Card - Minimal */}
      {!gscConnected ? (
        <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="p-8 bg-slate-50 border-b border-[#f1f3f6]">
            <CardTitle className="text-lg font-bold flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-slate-400" />
              Configura Connessione
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">
              Accedi con Google per importare i dati organici
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 ml-1">Proprietà GSC (URL Sito)</Label>
              <div className="flex gap-2">
                <Input
                  value={siteUrlInput}
                  onChange={(e) => setSiteUrlInput(e.target.value)}
                  placeholder="https://www.esempio.it/"
                  className="h-11 border-[#f1f3f6] rounded-xl text-xs font-bold shadow-sm"
                  data-testid="gsc-site-url-input"
                />
                <Button
                  variant="outline"
                  onClick={saveSiteUrl}
                  disabled={savingSiteUrl || !siteUrlInput.trim()}
                  className="h-11 w-11 p-0 border-[#f1f3f6] rounded-xl text-slate-400 hover:text-slate-900 bg-white"
                  data-testid="gsc-save-url-btn"
                >
                  {savingSiteUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
              {siteUrl && (
                <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL configurato: {siteUrl}</span>
                </div>
              )}
            </div>

            <Button
              size="lg"
              onClick={connectGoogle}
              disabled={connecting || !siteUrl}
              className="w-full bg-slate-900 rounded-xl h-14 text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200"
              data-testid="gsc-connect-btn"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-3">
                  <LogIn className="w-4 h-4" />
                  Connetti Account Google
                </div>
              )}
            </Button>

            {redirectUri && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-[#f1f3f6] space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informazioni per lo Sviluppatore</p>
                <div className="flex items-center gap-3">
                  <code className="text-[10px] font-mono font-bold text-indigo-500 bg-white px-3 py-2 rounded-lg border border-[#f1f3f6] flex-1 truncate" data-testid="gsc-redirect-uri">{redirectUri}</code>
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-slate-400" onClick={() => {navigator.clipboard.writeText(redirectUri); toast.success('Copiato!');}}>
                    Copia
                  </Button>
                </div>
                <p className="text-[10px] text-slate-300 font-medium italic">
                  Assicurati che questo URI sia registrato nella Google Cloud Console.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Data Section */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
        </div>
      ) : data ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Click', value: data.totals?.total_clicks?.toLocaleString(), icon: MousePointerClick, color: 'text-blue-500', testid: 'gsc-total-clicks' },
              { label: 'Impressioni', value: data.totals?.total_impressions?.toLocaleString(), icon: Eye, color: 'text-indigo-500', testid: 'gsc-total-impressions' },
              { label: 'CTR Medio', value: `${data.totals?.avg_ctr}%`, icon: TrendingUp, color: 'text-emerald-500', testid: 'gsc-avg-ctr' },
              { label: 'Pos. Media', value: data.totals?.avg_position, icon: Target, color: 'text-amber-500', testid: 'gsc-avg-position' }
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-[#f1f3f6] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300">{stat.label}</p>
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color} opacity-40`} />
                </div>
                <p className="text-xl font-bold tracking-tight text-slate-900" data-testid={stat.testid}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keywords */}
            <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-[#f1f3f6]">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold">Top Keyword</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{data.keywords?.length || 0} Query trovate</p>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-[#f1f3f6] sticky top-0 z-10">
                      <tr className="text-left">
                        <th className="py-3 px-6 text-[9px] uppercase font-bold tracking-widest text-slate-400">Keyword</th>
                        <th className="py-3 px-6 text-right text-[9px] uppercase font-bold tracking-widest text-slate-400">Click</th>
                        <th className="py-3 px-6 text-right text-[9px] uppercase font-bold tracking-widest text-slate-400">Pos.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f6]">
                      {(data.keywords || []).map((kw, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors" data-testid={`gsc-kw-row-${i}`}>
                          <td className="py-3 px-6">
                            <p className="text-xs font-bold text-slate-900 tracking-tight truncate max-w-[200px]">{kw.keyword}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{kw.impressions.toLocaleString()} IMPR.</p>
                          </td>
                          <td className="py-3 px-6 text-right">
                            <span className="text-[11px] font-bold text-blue-500 tracking-tight">{kw.clicks}</span>
                          </td>
                          <td className="py-3 px-6 text-right">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                               kw.position <= 3 ? 'bg-emerald-50 text-emerald-600' : 
                               kw.position <= 10 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                             }`}>
                               {kw.position}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Pages */}
            <Card className="border-[#f1f3f6] shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-[#f1f3f6]">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold">Top Pagine</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{data.pages?.length || 0} URL attivi</p>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-[#f1f3f6] sticky top-0 z-10">
                      <tr className="text-left">
                        <th className="py-3 px-6 text-[9px] uppercase font-bold tracking-widest text-slate-400">Path</th>
                        <th className="py-3 px-6 text-right text-[9px] uppercase font-bold tracking-widest text-slate-400">Click</th>
                        <th className="py-3 px-6 text-right text-[9px] uppercase font-bold tracking-widest text-slate-400">Pos.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f6]">
                      {(data.pages || []).map((pg, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors" data-testid={`gsc-page-row-${i}`}>
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                                <a href={pg.page} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-bold text-slate-900 tracking-tight hover:text-blue-500 transition-colors truncate max-w-[200px]">
                                {pg.page.replace(/https?:\/\/[^/]+/, '') || '/'}
                                </a>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-300" />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">{pg.ctr}% CTR</p>
                          </td>
                          <td className="py-3 px-6 text-right">
                             <span className="text-[11px] font-bold text-blue-500 tracking-tight">{pg.clicks}</span>
                          </td>
                          <td className="py-3 px-6 text-right">
                             <span className="text-[10px] font-bold text-slate-400">{pg.position}</span>
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

export default GscPage;
