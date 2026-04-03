import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { API_URL as API } from '../config';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Plus, Trash2, Send, Shield, Eye, EyeOff, Bell, BellOff, Server, CheckCircle } from 'lucide-react';

export const EmailNotificationsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // State
  const [recipients, setRecipients] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [resendConfig, setResendConfig] = useState({ api_key: '', sender_email: '' });
  const [toggles, setToggles] = useState({ client_articles: true, autopilot: true });

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/settings/notifications`, { headers: getAuthHeaders() });
      const n = res.data.notifications || {};
      setRecipients(n.recipients || []);
      if (n.resend_config && Object.keys(n.resend_config).length > 0) setResendConfig(n.resend_config);
      if (n.toggles) setToggles(n.toggles);
    } catch (err) {
      console.error('Config fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const addRecipient = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast.error('Inserisci un indirizzo email valido');
      return;
    }
    if (recipients.includes(email)) {
      toast.error('Email già presente nella lista');
      return;
    }
    if (recipients.length >= 10) {
      toast.error('Massimo 10 destinatari');
      return;
    }
    setRecipients([...recipients, email]);
    setNewEmail('');
    toast.success(`${email} aggiunta alla lista`);
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r !== email));
    toast.info(`${email} rimossa`);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/notifications`, {
        notifications: { recipients, resend_config: resendConfig, toggles }
      }, { headers: getAuthHeaders() });
      toast.success('Configurazione notifiche salvata!');
    } catch (err) {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (recipients.length === 0) {
      toast.error('Aggiungi almeno un destinatario prima di testare');
      return;
    }
    if (!resendConfig.api_key) {
      toast.error('Configura la API Key di Resend prima di testare');
      return;
    }
    // Save first, then test
    setSaving(true);
    try {
      await axios.put(`${API}/settings/notifications`, {
        notifications: { recipients, resend_config: resendConfig, toggles }
      }, { headers: getAuthHeaders() });
    } catch (e) {
      toast.error('Errore nel salvataggio config');
      setSaving(false);
      return;
    }
    setSaving(false);

    setTesting(true);
    try {
      await axios.post(`${API}/settings/notifications/test`, {}, { headers: getAuthHeaders() });
      toast.success('Email di test inviata! Controlla la tua casella');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invio email di test fallito');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Notifiche Email</h1>
          <p className="text-sm text-slate-500 mt-1">Ricevi avvisi quando i clienti generano articoli o l'autopilot trova opportunità</p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
          <Mail className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Email Destinatari</h2>
            <p className="text-xs text-slate-400">Le notifiche verranno inviate a tutti gli indirizzi (max 10)</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            type="email"
            placeholder="nome@esempio.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
            className="flex-1 h-11 rounded-xl border-slate-200 text-sm"
          />
          <Button onClick={addRecipient} className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Aggiungi
          </Button>
        </div>

        {recipients.length === 0 ? (
          <div className="text-center py-8 text-slate-300">
            <Mail className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs font-medium">Nessun destinatario configurato</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipients.map((email) => (
              <div key={email} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 group hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                    {email.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{email}</span>
                </div>
                <button onClick={() => removeRecipient(email)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resend Config */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
            <Server className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Provider: Resend</h2>
            <p className="text-xs text-slate-400">Configura la connessione sicura via API</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">API Key (Resend)</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="re_••••••••"
                value={resendConfig.api_key}
                onChange={(e) => setResendConfig({...resendConfig, api_key: e.target.value})}
                className="h-11 rounded-xl border-slate-200 text-sm pr-10"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Email Mittente (opzionale)</label>
            <Input
              placeholder="onboarding@resend.dev (default)"
              value={resendConfig.sender_email}
              onChange={(e) => setResendConfig({...resendConfig, sender_email: e.target.value})}
              className="h-11 rounded-xl border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
          <p className="text-[11px] text-indigo-700 font-medium">
            <Shield className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            Crea gratuitamente la tua chiave API su <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="font-bold underline">resend.com</a>. Le comunicazioni via API (porta 443) bypassano tutti i blocchi SMTP dei server di hosting cloud.
          </p>
        </div>
      </div>

      {/* Toggle Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Bell className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Tipi di Notifica</h2>
            <p className="text-xs text-slate-400">Scegli per quali eventi ricevere email</p>
          </div>
        </div>

        <div className="space-y-3">
          <ToggleRow
            label="Articoli Generati dai Clienti"
            description="Ricevi un'email quando un cliente genera un articolo dal suo portale"
            icon={<Mail className="w-4 h-4" />}
            enabled={toggles.client_articles}
            onChange={(v) => setToggles({...toggles, client_articles: v})}
          />
          <ToggleRow
            label="Suggerimenti Autopilot SEO"
            description="Ricevi un riepilogo quando l'autopilot trova nuove opportunità"
            icon={<Bell className="w-4 h-4" />}
            enabled={toggles.autopilot}
            onChange={(v) => setToggles({...toggles, autopilot: v})}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <Button
          variant="outline"
          onClick={sendTestEmail}
          disabled={testing || recipients.length === 0}
          className="h-11 px-5 rounded-xl text-sm font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          {testing ? (
            <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {testing ? 'Invio in corso...' : 'Invia Email di Test'}
        </Button>
        
        <Button
          onClick={saveConfig}
          disabled={saving}
          className="h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Salvataggio...' : 'Salva Configurazione'}
        </Button>
      </div>
    </div>
  );
};

// Toggle Row Component
const ToggleRow = ({ label, description, icon, enabled, onChange }) => (
  <div 
    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
      enabled ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'
    }`}
    onClick={() => onChange(!enabled)}
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
    <div className={`w-11 h-6 rounded-full p-0.5 transition-all ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

export default EmailNotificationsPage;
