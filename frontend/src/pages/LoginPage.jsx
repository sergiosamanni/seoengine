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
        <div className="absolute top-12 left-12 flex items-center gap-4 z-20">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-emerald-500/10"></div>
             <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col leading-none pt-0.5 ml-1">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 -mb-0.5">SEO</span>
            <span className="text-[20px] font-black tracking-tighter text-white">Antigravity</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-xl pr-10 pt-48 lg:pt-32">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white leading-none mb-8">
            AI CONTENT <br />
            REVOLUTION <br />
            <span className="text-emerald-500 italic underline decoration-white/5 underline-offset-[12px]">Antigravity</span>.
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-sm mb-16">
            Generazione contenuti e ottimizzazione SEO con intelligenza artificiale di nuova generazione.
          </p>
          
          <div className="space-y-6 max-w-sm">
            {features.map((feature, i) => (
              <div key={feature.title} className="flex items-center gap-4 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{feature.title}</h3>
                    <p className="text-slate-500 text-[10px] font-medium tracking-tight">
                        {feature.title === 'Generazione AI' ? 'Articoli SEO Strategici' : feature.desc}
                    </p>
                  </div>
              </div>
            ))}
          </div>
        </div>
        
        <p className="mt-24 text-slate-600 text-[10px] uppercase font-bold tracking-[0.4em] relative z-10 opacity-50">
          &copy; {new Date().getFullYear()} SEO Antigravity. Premium AI Intelligence.
        </p>
      </div>
      
      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f9fafb]">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12 justify-center text-center">
             <div className="flex flex-col leading-none">
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mb-1 pl-1">SEO</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">Antigravity</span>
             </div>
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
