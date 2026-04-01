import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  LayoutDashboard, LogOut, FileText, Users, Activity, Menu, X, Camera, BookOpen, Globe, Home, ChevronRight, Settings
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminNav = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/clients' },
    { label: 'Utenti', icon: Users, path: '/users' },
  ];
  
  const bottomNav = isAdmin ? [
    { label: 'Activity Log', icon: Activity, path: '/activity-log' },
    { label: 'Guida', icon: BookOpen, path: '/guide' },
  ] : [];

  const clientNav = [
    { label: 'I miei Clienti', icon: Home, path: '/clients' },
    { label: 'Generatore Testo', icon: FileText, path: '/generate', mode: 'text' },
    { label: 'Generatore Foto', icon: Camera, path: '/generate', mode: 'photo' },
  ];
  
  const navItems = isAdmin ? adminNav : clientNav;

  const renderNavLink = (item, isSmall = false) => {
    const searchParams = new URLSearchParams(location.search);
    const isActive = (location.pathname === item.path && (!item.mode || searchParams.get('mode') === item.mode));
    return (
      <Link key={item.path + (item.mode || '')}
        to={item.mode ? `${item.path}?mode=${item.mode}` : item.path}
        onClick={() => setSidebarOpen(false)}
        className={`group flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all duration-200 border border-transparent ${isSmall ? 'text-xs' : 'text-sm'} ${
          isActive 
          ? 'bg-blue-600/10 text-blue-100 border-blue-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
        <div className="flex items-center gap-3">
          <item.icon className={`${isSmall ? "w-3.5 h-3.5" : "w-4 h-4"} ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400 transition-colors'}`} />
          <span>{item.label}</span>
        </div>
        {isActive && <div className="w-1 h-1 rounded-full bg-blue-400" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Compact and Professional */}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:flex lg:static lg:z-auto w-64 bg-slate-950 border-r border-white/5 text-white flex-col flex-shrink-0`}>
        <div className="px-6 py-8 border-b border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold font-['Manrope'] tracking-tight leading-tight">SEO Engine</h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isAdmin ? 'Enterprise' : 'Workspace'}</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-6">
            <div>
              <p className="px-3 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Generale</p>
              <nav className="space-y-1">
                {navItems.map((item) => renderNavLink(item))}
              </nav>
            </div>
            
            {bottomNav.length > 0 && (
              <div>
                <p className="px-3 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Tools</p>
                <nav className="space-y-1">
                  {bottomNav.map((item) => renderNavLink(item, true))}
                </nav>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 mt-auto border-t border-white/5 bg-slate-950/30">
          <div className="flex items-center gap-3 mb-4 px-2 p-3 rounded-xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-sm font-bold border border-white/10">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.nome || 'Utente'}</p>
              <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-1 px-1">
            <Button variant="ghost" className="flex-1 h-9 justify-start text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
              onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-3.5 h-3.5 mr-2" />Esci
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Mobile header / Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between lg:justify-end">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 lg:hidden" data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="lg:hidden font-bold text-slate-800 font-['Manrope'] text-sm tracking-tight">SEO Engine</div>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden lg:block" />
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold uppercase tracking-wider hidden sm:flex">
              Live v1.4
            </Badge>
          </div>
        </header>

        <div className="flex-1 overflow-auto scroll-smooth">
          <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
