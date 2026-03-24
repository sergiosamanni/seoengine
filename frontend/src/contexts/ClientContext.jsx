import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const API = `${(process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")}/api`;

const ClientContext = createContext(null);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within ClientProvider');
  }
  return context;
};

export const ClientProvider = ({ children }) => {
  const { getAuthHeaders, user, isAdmin } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClient = useCallback(async (clientId) => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/clients/${clientId}`, { headers: getAuthHeaders() });
      setClient(res.data);
      return res.data;
    } catch (e) {
      toast.error('Errore caricamento cliente');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const updateConfiguration = useCallback(async (clientId, newConfig) => {
    if (!clientId) return;
    setSaving(true);
    try {
      await axios.put(`${API}/clients/${clientId}/configuration`, newConfig, { headers: getAuthHeaders() });
      setClient(prev => ({ ...prev, configuration: newConfig }));
      toast.success('Configurazione salvata');
      return true;
    } catch (error) {
      toast.error('Errore durante il salvataggio');
      console.error(error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [getAuthHeaders]);

  const addToEditorialQueue = useCallback(async (clientId, keyword) => {
    if (!client || !clientId) return;
    const currentQueue = client.configuration?.editorial_queue || [];
    if (!currentQueue.includes(keyword)) {
      const newQueue = [...currentQueue, keyword];
      const newConfig = { ...client.configuration, editorial_queue: newQueue };
      
      // Optimistic update
      setClient(prev => ({ ...prev, configuration: newConfig }));
      
      try {
        await axios.put(`${API}/clients/${clientId}/configuration`, newConfig, { headers: getAuthHeaders() });
        toast.success("Articolo/Azione aggiunta con successo", { 
          description: "Puoi trovarlo nel Piano Editoriale (Genera Contenuti)." 
        });
      } catch (e) {
        console.error("Error saving queue", e);
        toast.error("Errore salvataggio coda");
        // Rollback state if needed? (optional for now)
      }
    } else {
      toast.info("Elemento già presente in coda.");
    }
  }, [client, getAuthHeaders]);

  const value = {
    client,
    setClient,
    loading,
    saving,
    fetchClient,
    updateConfiguration,
    addToEditorialQueue
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};
