import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Loader2, Save, CheckCircle2, AlertTriangle,
    Unlink, ExternalLink, ChevronDown, ChevronUp,
    Copy, Check, BookOpen, Eye, EyeOff, Plug, Key,
    BarChart3, TrendingUp, Target, Sparkles, Wand2,
    Calendar, MousePointer2, Layers
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <button onClick={copy} className="ml-1 p-1 rounded hover:bg-slate-200 transition-colors flex-shrink-0" title="Copia">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
        </button>
    );
};

const StepBadge = ({ n, done, active }) => (
    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5
        ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
        {done ? <Check className="w-3 h-3" /> : n}
    </span>
);

const GscConnectionTab = ({ clientId, getAuthHeaders, onApplySuggestion = () => {} }) => {
    const [loading, setLoading] = useState(true);
    const [savingCredentials, setSavingCredentials] = useState(false);
    const [savingSiteUrl, setSavingSiteUrl] = useState(false);
    const [connecting, setConnecting] = useState(false);

    // Status from backend
    const [status, setStatus] = useState({ configured: false, connected: false, site_url: '', oauth_client_id_set: false, redirect_uri: '', has_per_client_credentials: false });

    // Form state
    const [oauthClientId, setOauthClientId] = useState('');
    const [oauthClientSecret, setOauthClientSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [siteUrlInput, setSiteUrlInput] = useState('');

    // UI
    const [showInstructions, setShowInstructions] = useState(true);
    const [gscData, setGscData] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, [clientId]);

    useEffect(() => {
        if (status.connected) {
            fetchGscData();
            fetchSuggestions();
        }
    }, [status.connected]);

    const fetchGscData = async () => {
        setLoadingData(true);
        try {
            const res = await axios.get(`${API}/clients/${clientId}/gsc-data`, { headers: getAuthHeaders() });
            setGscData(res.data);
        } catch (e) {
            console.error('GSC data error', e);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchSuggestions = async () => {
        try {
            const res = await axios.get(`${API}/clients/${clientId}/gsc-suggestions`, { headers: getAuthHeaders() });
            setSuggestions(res.data.suggestions || []);
        } catch (e) {
            console.error('GSC suggestions error', e);
        }
    };

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/clients/${clientId}/gsc-status`, { headers: getAuthHeaders() });
            setStatus(res.data);
            if (res.data.site_url) setSiteUrlInput(res.data.site_url);
            // If credentials are already set, don't pre-fill secrets (security)
        } catch (e) {
            console.error('GSC status error', e);
        } finally {
            setLoading(false);
        }
    };

    const saveCredentials = async () => {
        if (!oauthClientId.trim() || !oauthClientSecret.trim()) {
            toast.error('Inserisci Client ID e Client Secret');
            return;
        }
        setSavingCredentials(true);
        try {
            await axios.post(`${API}/clients/${clientId}/gsc-config`, {
                oauth_client_id: oauthClientId.trim(),
                oauth_client_secret: oauthClientSecret.trim(),
            }, { headers: getAuthHeaders() });
            toast.success('Credenziali OAuth salvate');
            setOauthClientId('');
            setOauthClientSecret('');
            await fetchStatus();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore salvataggio credenziali');
        } finally {
            setSavingCredentials(false);
        }
    };

    const saveSiteUrl = async () => {
        if (!siteUrlInput.trim()) { toast.error("Inserisci l'URL del sito"); return; }
        setSavingSiteUrl(true);
        try {
            await axios.post(`${API}/clients/${clientId}/gsc-config`, { site_url: siteUrlInput.trim(), enabled: true }, { headers: getAuthHeaders() });
            toast.success('URL sito salvato');
            await fetchStatus();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore salvataggio');
        } finally { setSavingSiteUrl(false); }
    };

    const connectGoogle = async () => {
        if (!status.site_url) { toast.error("Salva prima l'URL del sito"); return; }
        if (!status.configured) { toast.error('Inserisci prima le credenziali OAuth'); return; }
        setConnecting(true);
        try {
            const currentRedirectUri = status.redirect_uri;
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
            await fetchStatus();
            toast.success('Google Search Console disconnesso');
        } catch (error) { toast.error('Errore disconnessione'); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );

    // ── CONNECTED ────────────────────────────────────────────────────────────
    if (status.connected) return (
        <div className="space-y-6">
            <Card className="border-emerald-200 bg-emerald-50/60 overflow-hidden">
                <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-bold text-emerald-900">Google Search Console Connesso</p>
                            <p className="text-xs text-emerald-700/70 flex items-center gap-1">
                                {status.site_url}
                                <ExternalLink className="w-3 h-3 cursor-pointer hover:text-emerald-900" onClick={() => window.open(status.site_url, '_blank')} />
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={disconnectGoogle} className="text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs">
                            <Unlink className="w-3.5 h-3.5 mr-1.5" /> Scollega
                        </Button>
                        <Badge className="bg-emerald-500 text-white border-none px-3 py-1">Online</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Overview */}
            {gscData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Click Totali', value: gscData.totals?.total_clicks || 0, icon: MousePointer2, color: 'text-blue-600' },
                        { label: 'Impressioni', value: gscData.totals?.total_impressions || 0, icon: Eye, color: 'text-indigo-600' },
                        { label: 'CTR Medio', value: `${gscData.totals?.avg_ctr || 0}%`, icon: TrendingUp, color: 'text-emerald-600' },
                        { label: 'Posiz. Media', value: gscData.totals?.avg_position || 0, icon: Target, color: 'text-amber-600' },
                    ].map(m => (
                        <Card key={m.label} className="border-slate-200 shadow-sm overflow-hidden group hover:border-slate-300 transition-all">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <m.icon className={`w-4 h-4 ${m.color} opacity-70`} />
                                </div>
                                <p className="text-2xl font-black text-slate-900 tracking-tight">{m.value}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{m.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* AI SEO Opportunities (Low Hanging Fruits) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-slate-900">Opportunità SEO (AI Analysis)</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchSuggestions} className="text-xs h-8">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Aggiorna Analisi
                    </Button>
                </div>

                {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {suggestions.map((s, i) => (
                            <Card key={i} className="border-slate-200 border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        <div className="p-5 flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={s.type === 'optimize_content' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}>
                                                        {s.type === 'optimize_content' ? 'Ottimizzazione Contenuto' : 'Nuovo Articolo Pillar'}
                                                    </Badge>
                                                    <Badge variant="outline" className={s.priority === 'high' ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-500'}>
                                                        Priorità {s.priority === 'high' ? 'Alta' : s.priority === 'medium' ? 'Media' : 'Bassa'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                                                    <span>Pos: <strong>{s.metrics.position}</strong></span>
                                                    <span>Impr: <strong>{s.metrics.impressions}</strong></span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900">"{s.keyword}"</h4>
                                                {s.page && <p className="text-[10px] text-blue-600 truncate mt-0.5">{s.page}</p>}
                                                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{s.explanation}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-5 flex flex-col justify-center gap-2 md:w-64 border-t md:border-t-0 md:border-l border-slate-100">
                                            <Button 
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                                                onClick={() => onApplySuggestion(s)}
                                            >
                                                <Wand2 className="w-4 h-4 mr-2" /> Applica Suggerimento
                                            </Button>
                                            {s.page && (
                                                <Button variant="outline" className="w-full text-xs" onClick={() => window.open(s.page, '_blank')}>
                                                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Vedi Pagina
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed border-2 py-12 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                                <Search className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">Nessuna opportunità rilevata al momento. Prova ad aggiornare l'analisi tra qualche istante.</p>
                            <Button variant="ghost" size="sm" onClick={fetchSuggestions} className="text-xs">Aggiorna</Button>
                        </div>
                    </Card>
                )}
            </div>

            {/* Details Table (Legacy list) */}
            <Card className="border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Query Recenti GSC</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                        {gscData?.keywords?.slice(0, 20).map((k, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-white font-mono py-0 h-6">
                                {k.keyword} <span className="ml-1 text-slate-400">({k.clicks})</span>
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <CredentialsCard
                status={status}
                oauthClientId={oauthClientId} setOauthClientId={setOauthClientId}
                oauthClientSecret={oauthClientSecret} setOauthClientSecret={setOauthClientSecret}
                showSecret={showSecret} setShowSecret={setShowSecret}
                savingCredentials={savingCredentials} saveCredentials={saveCredentials}
                redirectUri={status.redirect_uri}
                collapsed
            />
        </div>
    );

    // ── NOT CONNECTED ─────────────────────────────────────────────────────────
    const step1done = status.has_per_client_credentials;
    const step2done = !!status.site_url;
    const step3active = step1done && step2done;

    return (
        <div className="space-y-5">

            {/* ── Instructions toggle ── */}
            <Card className="border-blue-200 bg-blue-50/40">
                <button className="w-full text-left" onClick={() => setShowInstructions(v => !v)}>
                    <CardHeader className="pb-3 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                <CardTitle className="text-base text-blue-900">Come ottenere le credenziali OAuth</CardTitle>
                            </div>
                            {showInstructions ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
                        </div>
                        <CardDescription className="text-blue-700/80 text-xs">
                            Ogni cliente usa le proprie credenziali Google Cloud — segui questi 3 passi una volta per cliente.
                        </CardDescription>
                    </CardHeader>
                </button>

                {showInstructions && (
                    <CardContent className="pt-0 pb-5 space-y-5">
                        <div className="h-px bg-blue-200/60" />

                        <div className="flex gap-3">
                            <StepBadge n="1" active />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-800">Crea un progetto su Google Cloud</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Vai su <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">console.cloud.google.com</a> →
                                    crea un nuovo progetto per questo cliente (o usa uno esistente).
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <StepBadge n="2" active />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-800">Abilita l'API Search Console</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    <strong>API & Servizi → Libreria</strong> → cerca <em>"Google Search Console API"</em> → <strong>Abilita</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <StepBadge n="3" active />
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-slate-800">Crea credenziali OAuth 2.0</p>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    <strong>API & Servizi → Credenziali → Crea credenziali → ID client OAuth 2.0</strong>.
                                    Tipo applicazione: <strong>"Applicazione web"</strong>.
                                    Aggiungi questo URI di reindirizzamento autorizzato:
                                </p>
                                <div className="flex items-center gap-1 bg-white rounded px-2.5 py-2 border border-blue-200">
                                    <code className="text-xs text-blue-700 flex-1 break-all">
                                        {status.redirect_uri}
                                    </code>
                                    <CopyButton text={status.redirect_uri} />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Dopo aver creato le credenziali, copia <strong>Client ID</strong> e <strong>Client Secret</strong> e incollali nel form qui sotto.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* ── Step 1: OAuth Credentials ── */}
            <CredentialsCard
                status={status}
                oauthClientId={oauthClientId} setOauthClientId={setOauthClientId}
                oauthClientSecret={oauthClientSecret} setOauthClientSecret={setOauthClientSecret}
                showSecret={showSecret} setShowSecret={setShowSecret}
                savingCredentials={savingCredentials} saveCredentials={saveCredentials}
                redirectUri={status.redirect_uri}
                collapsed={false}
            />

            {/* ── Step 2: Site URL ── */}
            <Card className={`border-slate-200 transition-opacity ${!step1done ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <StepBadge n="2" done={step2done} active={step1done && !step2done} />
                        URL del sito (come appare in GSC)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                    <div className="flex gap-2">
                        <Input
                            value={siteUrlInput}
                            onChange={(e) => setSiteUrlInput(e.target.value)}
                            placeholder="https://www.tuosito.com/"
                            className="flex-1 bg-slate-50"
                            disabled={!step1done}
                        />
                        <Button variant="outline" onClick={saveSiteUrl} disabled={savingSiteUrl || !siteUrlInput.trim() || !step1done}>
                            {savingSiteUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span className="ml-1.5 text-sm">Salva</span>
                        </Button>
                    </div>
                    {status.site_url && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> URL salvato: {status.site_url}
                        </p>
                    )}
                    {!step1done && <p className="text-xs text-slate-400">Inserisci prima le credenziali OAuth (passo 1)</p>}
                </CardContent>
            </Card>

            {/* ── Step 3: Connect ── */}
            <Card className={`border-slate-200 transition-opacity ${!step3active ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <StepBadge n="3" active={step3active} />
                        Autorizza con Google
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {step3active ? "Clicca il pulsante per avviare il flusso OAuth con l'account Google del cliente." : "Completa i passi 1 e 2 prima di procedere."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <Button
                        size="lg"
                        onClick={() => { setShowInstructions(false); connectGoogle(); }}
                        disabled={connecting || !step3active}
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold disabled:opacity-50"
                    >
                        {connecting ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connessione in corso...</>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Connetti con Google
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

// ── Shared credentials card (reused in connected state too) ──────────────────
const CredentialsCard = ({ status, oauthClientId, setOauthClientId, oauthClientSecret, setOauthClientSecret, showSecret, setShowSecret, savingCredentials, saveCredentials, collapsed }) => {
    const [open, setOpen] = useState(!collapsed);
    const done = status.has_per_client_credentials;

    return (
        <Card className="border-slate-200">
            {collapsed ? (
                <button className="w-full text-left" onClick={() => setOpen(v => !v)}>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Key className="w-4 h-4 text-slate-400" />
                                Credenziali OAuth
                                {done && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs ml-1">Configurate</Badge>}
                            </CardTitle>
                            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                    </CardHeader>
                </button>
            ) : (
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <StepBadge n="1" done={done} active={!done} />
                        Credenziali OAuth Google Cloud
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {done ? 'Le credenziali OAuth sono già configurate. Puoi aggiornarle inserendo nuovi valori.' : 'Inserisci Client ID e Client Secret ottenuti dalla Google Cloud Console.'}
                    </CardDescription>
                </CardHeader>
            )}

            {(!collapsed || open) && (
                <CardContent className="space-y-4 pt-0">
                    {done && !collapsed === false && (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <p className="text-xs font-medium">Credenziali salvate. Inserisci nuovi valori solo se vuoi aggiornarle.</p>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client ID</Label>
                        <Input
                            value={oauthClientId}
                            onChange={(e) => setOauthClientId(e.target.value)}
                            placeholder={done ? '••••••••••••• (già configurato)' : 'Incolla il Client ID da Google Cloud Console'}
                            className="bg-slate-50 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Client Secret</Label>
                        <div className="relative">
                            <Input
                                type={showSecret ? 'text' : 'password'}
                                value={oauthClientSecret}
                                onChange={(e) => setOauthClientSecret(e.target.value)}
                                placeholder={done ? '••••••••••••• (già configurato)' : 'Incolla il Client Secret da Google Cloud Console'}
                                className="bg-slate-50 font-mono text-sm pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSecret(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <Button
                        onClick={saveCredentials}
                        disabled={savingCredentials || (!oauthClientId.trim() && !oauthClientSecret.trim())}
                        className="w-full bg-slate-900 hover:bg-slate-800"
                    >
                        {savingCredentials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {done ? 'Aggiorna credenziali OAuth' : 'Salva credenziali OAuth'}
                    </Button>
                </CardContent>
            )}
        </Card>
    );
};

export default GscConnectionTab;
