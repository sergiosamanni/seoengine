import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  LayoutDashboard, LogOut, FileText, Users, Activity, Menu, X
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminNav = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Reportistica', icon: FileText, path: '/reports' },
    { label: 'Utenti', icon: Users, path: '/users' },
    { label: 'Activity Log', icon: Activity, path: '/activity-log' },
  ];
  const clientNav = [
    { label: 'Genera', icon: FileText, path: '/generate' },
  ];
  const navItems = isAdmin ? adminNav : clientNav;

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
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
               <span className="text-sm font-bold tracking-tighter italic">AG</span>
            </div>
            <div className="leading-none">
              <h1 className="text-sm font-bold tracking-tight text-slate-900">Antigravity</h1>
              <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-bold">{isAdmin ? 'Enterprise' : 'Workspace'}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-2">
          <div className="space-y-8">
            <div>
              <p className="px-4 text-[9px] uppercase font-bold tracking-[0.2em] text-slate-300 mb-4">Main Menu</p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path === '/dashboard' && location.pathname.startsWith('/clients'));
                  return (
                    <Link key={item.path} to={item.path}
                       onClick={() => setSidebarOpen(false)}
                       className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-tight transition-all duration-200 ${
                         isActive 
                         ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                         : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                       }`}
                       data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                      <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 opacity-60'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
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
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#f1f3f6] px-6 py-4 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#f1f3f6]" data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <span className="text-sm font-bold text-slate-900 tracking-tight">Antigravity Console</span>
        </div>

        {/* Dynamic Content Container */}
        <div className="p-6 sm:p-10 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
