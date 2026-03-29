import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API } from '../../config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
    BarChart3, CheckCircle2, Unlink, Loader2, Save, Key, Globe, Info, AlertCircle 
} from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { ConfirmationModal } from '../../components/ui/confirmation-modal';



export const GscConnectionTab = ({ clientId, getAuthHeaders, isAdmin }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [status, setStatus] = useState(null);
    const [siteUrl, setSiteUrl] = useState('');
    const [clientIdInput, setClientIdInput] = useState('');
    const [clientSecretInput, setClientSecretInput] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${API}/clients/${clientId}/gsc-status`, { 
                headers: getAuthHeaders() 
            });
            setStatus(res.data);
            setSiteUrl(res.data.site_url || '');
            // We don't show the secret for security, but we show the ID if it was set per-client
            if (res.data.has_per_client_credentials) {
                // Here we would ideally have the ID returned specifically if we want to show it
                // But generally, we just let them overwrite it.
            }
        } catch (e) {
            toast.error('Errore caricamento stato GSC');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            fetchStatus();
            
            // Listen for GSC callback in the URL
            const params = new URLSearchParams(window.location.search);
            if (params.get('gsc_connected') === 'true') {
                toast.success('Search Console connessa con successo!');
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (params.get('gsc_error')) {
                toast.error('Errore autorizzazione Google. Riprova.');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [clientId]);

    const handleSaveConfig = async () => {
        if (!siteUrl.trim()) {
            toast.error("Inserisci l'URL del sito");
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${API}/clients/${clientId}/gsc-config`, {
                site_url: siteUrl.trim(),
                oauth_client_id: clientIdInput.trim() || undefined,
                oauth_client_secret: clientSecretInput.trim() || undefined,
                enabled: true
            }, { headers: getAuthHeaders() });
            toast.success('Configurazione GSC salvata');
            fetchStatus();
            setClientIdInput('');
            setClientSecretInput('');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore salvataggio');
        } finally {
            setSaving(false);
        }
    };

    const handleConnect = async () => {
        if (!siteUrl) {
            toast.error("Salva prima l'URL del sito");
            return;
        }
        setConnecting(true);
        try {
            // Let the backend determine the best redirect URI based on its own domain
            const res = await axios.get(`${API}/gsc/authorize/${clientId}`, { 
                headers: getAuthHeaders() 
            });
            window.location.href = res.data.authorization_url;
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore avvio connessione Google');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await axios.post(`${API}/clients/${clientId}/gsc-disconnect`, {}, { 
                headers: getAuthHeaders() 
            });
            toast.success('GSC disconnesso');
            fetchStatus();
        } catch (error) {
            toast.error('Errore disconnessione');
        } finally {
            setIsConfirmOpen(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    return (
        <div className="space-y-6">
            {/* Status Header */}
            {status?.connected && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-emerald-800">GSC Connesso</p>
                                <p className="text-sm text-emerald-600 truncate max-w-md">{status.site_url}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(true)} className="text-red-500 border-red-200 hover:bg-red-50">
                            <Unlink className="w-4 h-4 mr-2" />Disconnetti
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Credentials Config */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5 text-blue-600" />Credenziali OAuth</CardTitle>
                        <CardDescription>Configura le credenziali Google Cloud per questo specifico cliente (opzionale se già configurate a livello sistema)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Client ID OAuth</Label>
                            <Input 
                                value={clientIdInput} 
                                onChange={(e) => setClientIdInput(e.target.value)}
                                placeholder={status?.has_per_client_credentials ? "•••••••••••• (Già impostato)" : "Inserisci Google Client ID"}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Client Secret OAuth</Label>
                            <Input 
                                type="password"
                                value={clientSecretInput} 
                                onChange={(e) => setClientSecretInput(e.target.value)}
                                placeholder={status?.has_per_client_credentials ? "•••••••••••• (Già impostato)" : "Inserisci Google Client Secret"}
                            />
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">URI di Reindirizzamento Autorizzato</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-white border px-2 py-1.5 rounded text-blue-700 truncate">{status?.redirect_uri}</code>
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => {navigator.clipboard.writeText(status?.redirect_uri); toast.success('URI copiato!');}}>Copia</Button>
                            </div>
                            <p className="text-[10px] text-slate-400">Verifica che questo URI sia registrato nella Google Cloud Console del cliente.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Property & Authorization */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Globe className="w-5 h-5 text-emerald-600" />Proprietà & Autorizzazione</CardTitle>
                        <CardDescription>Definisci l'URL del sito e autorizza l'accesso ai dati</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>URL Proprietà GSC</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={siteUrl} 
                                    onChange={(e) => setSiteUrl(e.target.value)}
                                    placeholder="https://www.tuosito.it/"
                                    className="flex-1"
                                />
                                <Button onClick={handleSaveConfig} disabled={saving || !siteUrl.trim()} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-[11px] text-slate-400">Deve essere identico a come appare su Google Search Console (es. con o senza slash finale, con o senza https).</p>
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-3">
                            <Label className="block text-sm font-semibold">Passo Finale: Autorizzazione</Label>
                            <Button 
                                onClick={handleConnect} 
                                disabled={connecting || !siteUrl || !status?.configured}
                                className={`w-full h-11 ${status?.connected ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {connecting ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Autorizzazione...</>
                                ) : status?.connected ? (
                                    <><CheckCircle2 className="w-5 h-5 mr-2" />Riconnetti Account Google</>
                                ) : (
                                    <><BarChart3 className="w-5 h-5 mr-2" />Autorizza Account Google</>
                                )}
                            </Button>
                            {!status?.configured && (
                                <Alert className="bg-amber-50 border-amber-200 text-amber-800 p-3">
                                    <AlertCircle className="w-4 h-4" />
                                    <AlertDescription className="text-xs">Credenziali OAuth globali non trovate. Inserisci il Client ID e Secret a sinistra.</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Helper */}
            <Card className="border-blue-100 bg-blue-50/30">
                <CardContent className="p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                        L'integrazione Google Search Console ti permette di importare automaticamente keyword e volumi reali per guidare la generazione dei contenuti. 
                        Una volta connesso, potrai vedere i dati di posizionamento nella scheda principale.
                    </p>
                </CardContent>
            </Card>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDisconnect}
                title="Disconnetti GSC"
                description="Sei sicuro di voler disconnettere Google Search Console per questo cliente? L'accesso ai dati di traffico verrà interrotto."
            />
        </div>
    );
};


export default GscConnectionTab;
