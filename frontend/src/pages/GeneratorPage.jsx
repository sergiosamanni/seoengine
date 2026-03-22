import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Loader2, ArrowLeft, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

import AdminGenerator from '../components/admin-workspace/AdminGenerator';
import ArticleHistory from '../components/admin-workspace/ArticleHistory';
import ClientGenerator from '../components/client-workspace/ClientGenerator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const GeneratorPage = () => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const { clientId: routeClientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);

  const effectiveClientId = routeClientId || (user?.client_ids && user.client_ids.length > 0 ? user.client_ids[0] : null);

  useEffect(() => {
    const fetch = async () => {
      if (!effectiveClientId) { setLoading(false); return; }
      try {
        const res = await axios.get(`${API}/clients/${effectiveClientId}`, { headers: getAuthHeaders() });
        setClient(res.data);
      } catch (e) { toast.error('Errore caricamento cliente'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [effectiveClientId]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  if (!effectiveClientId) {
    return <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>{isAdmin ? 'Seleziona un cliente dalla lista Clienti.' : 'Nessun cliente associato. Contatta l\'amministratore.'}</AlertDescription></Alert>;
  }

  const hasApiKey = client?.configuration?.llm?.api_key || client?.configuration?.openai?.api_key;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - only for admin when not in the workspace view */}
      {isAdmin && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} data-testid="back-btn"><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">Genera Articoli</h1>
            <p className="text-slate-500 mt-1">{client?.nome}</p>
          </div>
        </div>
      )}

      {isAdmin && !hasApiKey && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            API Key LLM non configurata. <Button variant="link" className="px-1 h-auto text-amber-800 font-semibold" onClick={() => navigate(isAdmin ? `/clients/${effectiveClientId}/config` : '/config')}>Vai alla Configurazione</Button>
          </AlertDescription>
        </Alert>
      )}

      {isAdmin ? (
        <>
          <AdminGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} />
          <ArticleHistory effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} />
        </>
      ) : (
        <ClientGenerator client={client} effectiveClientId={effectiveClientId} getAuthHeaders={getAuthHeaders} navigate={navigate} />
      )}
    </div>
  );
};
