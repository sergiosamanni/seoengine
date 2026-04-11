import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import SeoChatTab from '../pages/client-workspace/SeoChatTab';
import { MessageCircle, X } from 'lucide-react';
import { Button } from './ui/button';

const FloatingSeoChat = () => {
    const { user, getAuthHeaders } = useAuth();
    const { client } = useClient();
    const [isOpen, setIsOpen] = useState(false);

    // Determina il client_id: se l'utente è client usa il suo id, 
    // se è admin usa il client selezionato
    const clientId = client?.id || (user?.role === 'client' ? user.client_ids?.[0] : 'global');

    if (!user) return null;

    return (
        <>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[450px] h-[700px] max-h-[85vh] max-w-[90vw] bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-200 z-[9999] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
                    <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span className="text-white font-black text-sm tracking-widest uppercase">SEO Strategist AI</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-xl transition-colors">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex-1 relative min-h-0 bg-slate-50/50">
                        <SeoChatTab 
                            clientId={clientId} 
                            getAuthHeaders={getAuthHeaders} 
                            client={client} 
                            compact={true} 
                        />
                    </div>
                </div>
            )}

            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)] z-[9999] transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-white/20 ${isOpen ? 'bg-slate-800 hover:bg-slate-900 border-slate-700' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'}`}
            >
                {isOpen ? <X className="w-5 h-5 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
            </Button>
        </>
    );
};

export default FloatingSeoChat;
