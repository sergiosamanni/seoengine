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
import { toast } from 'sonner';

export const GA4ConnectionTab = ({ clientId, getAuthHeaders, isAdmin }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [status, setStatus] = useState(null);
    const [propertyId, setPropertyId] = useState('');
    const [clientIdInput, setClientIdInput] = useState('');
    const [clientSecretInput, setClientSecretInput] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const fetchStatus = async () => {
        try {
            // Reusing a status logic similar to GSC, but for GA4
            const res = await axios.get(`${API}/clients/${clientId}`, { 
                headers: getAuthHeaders() 
            });
            const ga4Config = res.data.configuration?.ga4 || {};
            setStatus({
                connected: ga4Config.connected,
                configured: ga4Config.oauth_client_id || ga4Config.oauth_client_secret, // Simplification
                property_id: ga4Config.property_id,
                redirect_uri: `${window.location.protocol}//${window.location.host}/api/ga4/callback`
            });
            setPropertyId(ga4Config.property_id || '');
        } catch (e) {
            toast.error('Errore caricamento stato GA4');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) {
            fetchStatus();
            
            const params = new URLSearchParams(window.location.search);
            if (params.get('ga4_connected') === 'true') {
                toast.success('Google Analytics 4 connesso con successo!');
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (params.get('ga4_error')) {
                toast.error('Errore autorizzazione Google GA4. Riprova.');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [clientId]);

    const handleSaveConfig = async () => {
        if (!propertyId.trim()) {
            toast.error("Inserisci il Property ID GA4");
            return;
        }
        setSaving(true);
        try {
            await axios.post(`${API}/clients/${clientId}/ga4-config`, {
                property_id: propertyId.trim(),
                oauth_client_id: clientIdInput.trim() || undefined,
                oauth_client_secret: clientSecretInput.trim() || undefined,
                enabled: true
            }, { headers: getAuthHeaders() });
            toast.success('Configurazione GA4 salvata');
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
        if (!propertyId) {
            toast.error("Salva prima il Property ID");
            return;
        }
        setConnecting(true);
        try {
            const res = await axios.get(`${API}/ga4/authorize/${clientId}`, { 
                headers: getAuthHeaders() 
            });
            window.location.href = res.data.authorization_url;
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Errore avvio connessione Google GA4');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await axios.post(`${API}/clients/${clientId}/ga4-disconnect`, {}, { 
                headers: getAuthHeaders() 
            });
            toast.success('GA4 disconnesso');
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
            {status?.connected && (
                <Card className="border-indigo-200 bg-indigo-50/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-indigo-800">GA4 Connesso</p>
                                <p className="text-sm text-indigo-600 truncate max-w-md">Property ID: {status.property_id}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(true)} className="text-red-500 border-red-200 hover:bg-red-50">
                            <Unlink className="w-4 h-4 mr-2" />Disconnetti
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Key className="w-5 h-5 text-indigo-600" />Credenziali OAuth GA4</CardTitle>
                        <CardDescription>Opzionali se configurate a livello sistema (riusa GSC per default)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Client ID OAuth</Label>
                            <Input 
                                value={clientIdInput} 
                                onChange={(e) => setClientIdInput(e.target.value)}
                                placeholder="Inserisci Google Client ID (se diverso da GSC)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Client Secret OAuth</Label>
                            <Input 
                                type="password"
                                value={clientSecretInput} 
                                onChange={(e) => setClientSecretInput(e.target.value)}
                                placeholder="Inserisci Google Client Secret"
                            />
                        </div>
                        <div className="p-3 bg-slate-50 border rounded-lg space-y-2">
                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">URI di Reindirizzamento GA4</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-white border px-2 py-1.5 rounded text-indigo-700 truncate">{status?.redirect_uri}</code>
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => {navigator.clipboard.writeText(status?.redirect_uri); toast.success('URI copiato!');}}>Copia</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" />Configurazione Proprietà</CardTitle>
                        <CardDescription>Inserisci il Property ID di Google Analytics 4</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>GA4 Property ID</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={propertyId} 
                                    onChange={(e) => setPropertyId(e.target.value)}
                                    placeholder="Es: 123456789"
                                    className="flex-1"
                                />
                                <Button onClick={handleSaveConfig} disabled={saving || !propertyId.trim()} className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-[11px] text-slate-400">Trovi questo ID nelle Impostazioni della Proprietà in Google Analytics.</p>
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-3">
                            <Label className="block text-sm font-semibold">Autorizzazione GA4</Label>
                            <Button 
                                onClick={handleConnect} 
                                disabled={connecting || !propertyId}
                                className={`w-full h-11 ${status?.connected ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {connecting ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Autorizzazione...</>
                                ) : status?.connected ? (
                                    <><CheckCircle2 className="w-5 h-5 mr-2" />Riconnetti GA4</>
                                ) : (
                                    <><BarChart3 className="w-5 h-5 mr-2" />Connetti Google Analytics 4</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-indigo-100 bg-indigo-50/30">
                <CardContent className="p-3 text-xs text-indigo-700 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                        L'integrazione GA4 permette di monitorare le conversioni e le visualizzazioni generate dagli articoli AI direttamente in questa dashboard.
                    </p>
                </CardContent>
            </Card>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDisconnect}
                title="Disconnetti GA4"
                description="Sei sicuro di voler disconnettere Google Analytics 4 per questo cliente?"
            />
        </div>
    );
};

export default GA4ConnectionTab;
