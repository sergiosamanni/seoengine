import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { Zap, BarChart3, FileText, Globe, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    email: '', 
    password: '', 
    name: '',
    confirmPassword: '' 
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(loginData.email, loginData.password);
      toast.success('Accesso effettuato');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante il login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(registerData.email, registerData.password, registerData.name);
      toast.success('Registrazione completata! Effettua il login');
      setRegisterData({ email: '', password: '', name: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: 'Generazione AI', desc: 'Articoli SEO con GPT-4' },
    { icon: BarChart3, title: 'Multi-Cliente', desc: 'Gestisci tutti i tuoi clienti' },
    { icon: FileText, title: 'Keyword Combos', desc: 'Combinazioni automatiche' },
    { icon: Globe, title: 'WordPress', desc: 'Pubblica in un click' }
  ];

  return (
    <div className="min-h-screen flex bg-white">
      <Toaster position="top-right" richColors />
      
      {/* Left Panel - Professional & Minimal */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-400 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-500 rounded-full blur-[100px]"></div>
        </div>

        {/* Brand Tag */}
        <div className="absolute top-10 left-10 flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          </div>
          <span className="text-sm font-bold tracking-tighter text-white">
            G<span className="text-emerald-400">eo</span>S
          </span>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-lg">
          <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-white leading-[0.9] mb-8">
            Intelligenza Artificiale <br />
            per <span className="text-emerald-400 italic underline decoration-emerald-400/30 underline-offset-8">G<span className="text-white">eo</span>S</span>.
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-sm">
            Gestione clienti, generazione contenuti e ottimizzazione GEO e SEO in un unico ambiente minimale.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 max-w-md">
            {features.map((feature, i) => (
              <div 
                key={feature.title}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <feature.icon className="w-5 h-5 text-slate-400 mb-4" />
                <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-1">{feature.title}</h3>
                <p className="text-slate-500 text-[11px] leading-snug">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em] relative z-10">
          &copy; 2024 SEO Engine. Premium Workspace.
        </p>
      </div>
      
      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f9fafb]">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
            <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-widest uppercase text-sm">SEO Engine</span>
          </div>
          
          <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Accesso Riservato</h2>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Inserisci le tue credenziali</p>
            </div>

            <Card className="border-[#f1f3f6] shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                <CardContent className="p-8">
                <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-50 p-1 rounded-xl h-11">
                    <TabsTrigger value="login" className="rounded-lg text-[11px] font-bold uppercase tracking-wider data-[state=active]:shadow-sm">Accedi</TabsTrigger>
                    <TabsTrigger value="register" className="rounded-lg text-[11px] font-bold uppercase tracking-wider data-[state=active]:shadow-sm">Registrati</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Email</Label>
                        <Input
                            id="login-email"
                            type="email"
                            placeholder="email@azienda.it"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            required
                            className="h-11 border-slate-100 bg-slate-50 focus:bg-white rounded-xl text-sm transition-all"
                        />
                        </div>
                        
                        <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Password</Label>
                        <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                            className="h-11 border-slate-100 bg-slate-50 focus:bg-white rounded-xl text-sm transition-all"
                        />
                        </div>
                        
                        <Button 
                        type="submit" 
                        className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-[0.98] mt-2"
                        disabled={isLoading}
                        >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entra'}
                        </Button>
                    </form>
                    
                    <div className="mt-8 pt-6 border-t border-slate-50">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Accesso Demo:</p>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <code className="text-[10px] text-slate-500 font-mono block">
                            admin@seoengine.it<span className="mx-2 text-slate-300">/</span>admin123
                            </code>
                        </div>
                    </div>
                    </TabsContent>
                    
                    <TabsContent value="register">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1.5">
                        <Label htmlFor="register-name" className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Nome</Label>
                        <Input
                            id="register-name"
                            type="text"
                            placeholder="Mario Rossi"
                            value={registerData.name}
                            onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                            required
                            className="h-10 border-slate-100 bg-slate-50 focus:bg-white rounded-xl text-sm"
                        />
                        </div>
                        
                        <div className="space-y-1.5">
                        <Label htmlFor="register-email" className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Email</Label>
                        <Input
                            id="register-email"
                            type="email"
                            placeholder="email@azienda.it"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            required
                            className="h-10 border-slate-100 bg-slate-50 focus:bg-white rounded-xl text-sm"
                        />
                        </div>
                        
                        <div className="space-y-1.5">
                        <Label htmlFor="register-password" className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Password</Label>
                        <Input
                            id="register-password"
                            type="password"
                            placeholder="••••••••"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            required
                            className="h-10 border-slate-100 bg-slate-50 focus:bg-white rounded-xl text-sm"
                        />
                        </div>
                        
                        <div className="space-y-1.5">
                        <Label htmlFor="register-confirm" className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Conferma</Label>
                        <Input
                            id="register-confirm"
                            type="password"
                            placeholder="••••••••"
                            value={registerData.confirmPassword}
                            onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                            required
                            className="h-10 border-slate-100 bg-slate-50 focus:bg-white rounded-xl text-sm"
                        />
                        </div>
                        
                        <Button 
                        type="submit" 
                        className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 mt-4"
                        disabled={isLoading}
                        >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea Account'}
                        </Button>
                    </form>
                    </TabsContent>
                </Tabs>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
