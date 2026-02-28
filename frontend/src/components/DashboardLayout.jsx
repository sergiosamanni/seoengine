import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Zap,
  PenTool,
  History,
  ChevronRight,
  Activity,
  UserCog
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Toaster } from 'sonner';

const adminNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clients', icon: Users, label: 'Clienti' },
  { path: '/users', icon: UserCog, label: 'Utenti' },
  { path: '/articles', icon: FileText, label: 'Articoli' },
  { path: '/activity', icon: Activity, label: 'Activity Log' },
];

const clientNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/simple-generator', icon: PenTool, label: 'Crea Articolo' },
  { path: '/articles', icon: FileText, label: 'Articoli' },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const navItems = isAdmin ? adminNavItems : clientNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 noise-bg">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-['Manrope']">SEO Engine</span>
          </div>
        </div>
        
        <Separator className="bg-slate-800" />
        
        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4 dark-scrollbar">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )
                }
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            ))}
          </nav>
          
          {isAdmin && (
            <>
              <div className="mt-8 mb-2 px-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Impostazioni
                </span>
              </div>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )
                }
                data-testid="nav-settings"
              >
                <Settings className="w-5 h-5" />
                <span>Impostazioni</span>
              </NavLink>
            </>
          )}
        </ScrollArea>
        
        {/* User section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Esci
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
