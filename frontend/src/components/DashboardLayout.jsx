import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  LayoutDashboard, LogOut, FileText, Users, Activity, Menu, X, Globe, MapPin, BookOpen, Zap, MessageSquare, Mail
} from 'lucide-react';
import axios from 'axios';
import { API_URL as API } from '../config';
import { Badge } from './ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';



export const DashboardLayout = ({ children }) => {
  const { user, isAdmin, logout, switchClient, getAuthHeaders } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clients, setClients] = useState([]);
  
  // Autopilot Notifications State
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [redditNotifCount, setRedditNotifCount] = useState(0); // Set to 0 (real state)
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [checkingNotifs, setCheckingNotifs] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  React.useEffect(() => {
    if (!isAdmin && user?.client_ids?.length >= 1) {
      axios.get(`${API}/clients`, { headers: getAuthHeaders() })
        .then(res => setClients(res.data))
        .catch(err => console.error('Error fetching plants for switcher', err));
    }
  }, [user?.client_ids, isAdmin, getAuthHeaders]);

  // Notifications Polling
  const fetchNotifications = React.useCallback(async () => {
    if (!isAdmin || !user) return;
    try {
      setCheckingNotifs(true);
      const res = await axios.get(`${API}/autopilot/notifications`, { headers: getAuthHeaders() });
      setNotifications(res.data.notifications || []);
      setNotifCount(res.data.count || 0);
    } catch (e) {
      console.error("Notif fetch failed", e);
    } finally {
      setCheckingNotifs(false);
    }
  }, [isAdmin, user, getAuthHeaders]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 1000 * 60 * 5); // 5 mins
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkSeen = async () => {
    try {
      await axios.post(`${API}/autopilot/notifications/mark-seen`, {}, { headers: getAuthHeaders() });
      setNotifCount(0);
      setNotifications([]);
    } catch (e) {
      console.error("Mark seen failed", e);
    }
  };

  const mainNav = [
    { label: 'Clienti', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'GMB', icon: MapPin, path: '/gmb' },
    { label: 'Citazioni', icon: Globe, path: '/citations' },
    { label: 'Reddit', icon: MessageSquare, path: '/reddit', count: redditNotifCount },
    { label: 'SEO Autopilot', icon: Zap, path: '#', count: notifCount }, // Path dummy, apre il modal
  ];
  const secondaryNav = [
    { label: 'SEO/GEO Guidelines', icon: BookOpen, path: '/seo-geo-guidelines' },
    { label: 'Notifiche Email', icon: Mail, path: '/email-notifications' },
    ...(isAdmin ? [{ label: 'Utenti', icon: Users, path: '/users' }] : []),
    { label: 'Activity Log', icon: Activity, path: '/activity-log' },
  ];
  const clientNav = [
    { label: 'Genera', icon: FileText, path: '/generate' },
  ];
  const navItems = isAdmin 
    ? [...mainNav, { label: 'Genera', icon: PenTool, path: '/generate' }] 
    : clientNav;

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:flex lg:static lg:z-auto w-64 bg-white border-r border-[#f1f3f6] flex-col flex-shrink-0 transition-all`}>
        {/* Brand */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center border border-slate-700/30 shadow-xl overflow-hidden relative">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]"></div>
               <Globe className="w-4 h-4 text-emerald-500/80 relative z-10" />
            </div>
            <div className="leading-none flex flex-col pt-0.5 ml-1">
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400 -mb-0.5">SEO</span>
              <h1 className="text-[17px] font-black tracking-tighter text-slate-900 leading-none">
                Antigravity
              </h1>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-8">
            {/* Site Switcher for Clients */}
            {!isAdmin && (
              <div className="px-4">
                <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300 mb-3">Workspace</p>
                {user?.client_ids?.length > 1 ? (
                  <Select value={user.client_id} onValueChange={switchClient}>
                    <SelectTrigger className="w-full bg-slate-50 border-[#f1f3f6] text-[11px] font-bold rounded-xl h-10 shadow-sm">
                      <SelectValue placeholder="Seleziona sito" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-[11px] font-medium">
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-slate-50 border border-[#f1f3f6] rounded-xl p-3 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-600 truncate">
                      {clients.find(c => c.id === user?.client_id)?.nome || 'Sito Attivo'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="px-4 text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300 mb-4">Main Menu</p>
              <nav className="space-y-1">
                {(isAdmin ? mainNav : clientNav).map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path === '/dashboard' && location.pathname.startsWith('/clients'));
                  
                  const isAutopilot = item.label === 'SEO Autopilot';
                  
                  return (
                    <div key={item.label} 
                      onClick={() => {
                        if (isAutopilot) {
                          setShowNotifModal(true);
                        } else {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }
                      }}
                      className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                         isActive 
                         ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                         : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                       }`}>
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 opacity-60'}`} />
                      <span className="flex-1">{item.label}</span>
                      
                      {isAdmin && item.count !== undefined && (
                        <div className="relative flex items-center justify-center">
                           {item.count > 0 ? (
                             <>
                               <div className={`absolute inset-0 blur-[6px] opacity-40 animate-pulse ${item.label === 'Reddit' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                               <div className={`relative flex items-center gap-1 px-2 h-5 text-white rounded-full border border-white/20 ${item.label === 'Reddit' ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                                  <span className="text-[9px] font-black">{item.count}</span>
                                  <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
                               </div>
                             </>
                           ) : (
                             // Minimalist "Premium Monitoring" Dot for Reddit or Autopilot when idle
                             <div className="relative flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform">
                                <div className={`absolute w-1.5 h-1.5 rounded-full blur-[2px] animate-pulse ${item.label === 'Reddit' ? 'bg-orange-500/60' : 'bg-emerald-500/60'}`}></div>
                                <div className={`w-1 h-1 rounded-full ${item.label === 'Reddit' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-slate-50">
                <p className="px-4 text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300 mb-4">Governance</p>
                <nav className="space-y-1">
                  {secondaryNav.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link key={item.path} to={item.path}
                         onClick={() => setSidebarOpen(false)}
                         className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-tight transition-all duration-200 ${
                           isActive 
                           ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                           : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                         }`}>
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 opacity-60'}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* User Info & Actions */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-[#f1f3f6] rounded-2xl p-4 flex items-center gap-4 group transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#f1f3f6] flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm group-hover:scale-105 transition-transform">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-none mb-1">{user?.nome || 'Utente'}</p>
              <p className="text-[9px] text-slate-400 font-medium truncate tracking-tight">{user?.email}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50/50 h-11 px-4 rounded-xl transition-colors"
            onClick={handleLogout} 
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-3 opacity-60" />
            Esci dall'app
          </Button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-[#f8fafc]">
        {/* Mobile Navbar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100/60 px-5 py-3 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200 active:scale-95 transition-all">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col leading-none">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">SEO</span>
                <span className="text-lg font-black tracking-tighter text-slate-900">Antigravity</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
             <Globe className="w-4 h-4 text-emerald-500/60" />
          </div>
        </div>

        {/* Dynamic Content Container */}
        <div className="p-6 sm:p-10 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {/* Autopilot Notifications Dialog */}
      <Dialog open={showNotifModal} onOpenChange={setShowNotifModal}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <Zap className="w-48 h-48 fill-white" />
             </div>
             <div className="relative z-10">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-none mb-3 text-[10px] font-bold uppercase tracking-widest px-3">Aggiornamento {new Date().toLocaleDateString()}</Badge>
                <DialogTitle className="text-2xl font-black tracking-tighter">SEO Autopilot Intelligence</DialogTitle>
                <DialogDescription className="text-slate-400 mt-2 text-sm font-medium">Abbiamo analizzato i tuoi domini e trovato nuove opportunità di ottimizzazione.</DialogDescription>
             </div>
          </div>
          
          <ScrollArea className="max-h-[60vh] p-6">
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100">
                      <LayoutDashboard className="w-8 h-8" />
                   </div>
                   <p className="text-sm font-bold text-slate-400">Nessuna nuova segnalazione autopilot.</p>
                </div>
              ) : (
                notifications.map((task) => (
                  <div 
                    key={task.id} 
                    className="group bg-slate-50/50 border border-slate-100 p-5 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-100 hover:border-slate-200 transition-all cursor-pointer"
                    onClick={() => {
                        setShowNotifModal(false);
                        navigate(`/clients/${task.client_id}/generate?tab=autopilot`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#1c64f2] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{task.client_name}</span>
                                <span className="text-[10px] font-bold text-slate-400">• {new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-[14px] font-black tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">{task.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-2 font-medium leading-relaxed italic">"{task.reason}"</p>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900"
                onClick={() => { handleMarkSeen(); setShowNotifModal(false); }}
              >
                Segna tutti come visti
              </Button>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 h-10 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200"
                onClick={() => setShowNotifModal(false)}
              >
                Chiudi
              </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
