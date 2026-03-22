import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  LayoutDashboard, LogOut, FileText, Users, Activity, Menu, X, Camera, BookOpen, Globe
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminNav = [
    { label: 'Clienti', icon: Globe, path: '/clients' },
    { label: 'Utenti', icon: Users, path: '/users' },
  ];
  const bottomNav = isAdmin ? [
    { label: 'Activity Log', icon: Activity, path: '/activity-log' },
    { label: 'Guida', icon: BookOpen, path: '/guide' },
  ] : [];

  const clientNav = [
    { label: 'I miei Clienti', icon: Globe, path: '/clients' },
    { label: 'Genera da testo', icon: FileText, path: '/generate', mode: 'text' },
    { label: 'Genera da foto', icon: Camera, path: '/generate', mode: 'photo' },
  ];
  const navItems = isAdmin ? adminNav : clientNav;

  const renderNavLink = (item, isSmall = false) => {
    const searchParams = new URLSearchParams(location.search);
    const isActive = (location.pathname === item.path && (!item.mode || searchParams.get('mode') === item.mode));
    return (
      <Link key={item.path + (item.mode || '')}
        to={item.mode ? `${item.path}?mode=${item.mode}` : item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${isSmall ? 'text-xs' : 'text-sm'} ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
        <item.icon className={isSmall ? "w-3.5 h-3.5" : "w-4.5 h-4.5"} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - hidden on mobile by default */}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'} lg:flex lg:static lg:z-auto w-60 bg-slate-900 text-white flex-col flex-shrink-0`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold font-['Manrope'] tracking-tight">SEO Engine</h1>
            <p className="text-xs text-slate-400 mt-0.5">{isAdmin ? 'Admin Panel' : 'Client Panel'}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => renderNavLink(item))}
          </nav>
        </ScrollArea>

        {bottomNav.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-800/50">
            <nav className="space-y-0.5">
              {bottomNav.map((item) => renderNavLink(item, true))}
            </nav>
          </div>
        )}

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.nome || 'Utente'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
            onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-4 h-4 mr-2" />Esci
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100" data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <span className="font-semibold text-slate-900 font-['Manrope']">SEO Engine</span>
        </div>
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
