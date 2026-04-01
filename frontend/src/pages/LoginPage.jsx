import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { Globe, BarChart3, FileText, Target, Shield, Activity, TrendingUp, Sparkles } from 'lucide-react';

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
    { icon: Sparkles, title: 'AI Content Engine', desc: 'Contenuti SEO-first con GPT-4 Turbo' },
    { icon: Target, title: 'Strategic Planning', desc: 'Keyword research e editorial plan' },
    { icon: TrendingUp, title: 'Growth Analytics', desc: 'Monitoraggio GSC e performance' },
    { icon: Shield, title: 'Enterprise Ready', desc: 'Sicurezza e gestione multi-account' }
  ];

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      <Toaster position="top-right" richColors />
      
      {/* Left Panel - Premium Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] p-16 flex-col justify-between relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full -ml-32 -mb-32" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-['Manrope'] tracking-tight">SEO Engine</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-8 font-['Manrope'] leading-[1.15] tracking-tight">
            L'intelligenza artificiale <br />
            <span className="text-blue-400">al servizio della SEO.</span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-16 max-w-md leading-relaxed">
            La piattaforma definitiva per agenzie e professionisti che vogliono scalare la produzione di contenuti senza sacrificare la qualità.
          </p>
          
          <div className="grid grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div 
                key={feature.title}
                className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-white font-bold text-sm mb-1">{feature.title}</h3>
                <p className="text-slate-500 text-xs leading-normal">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-8">
          <p className="text-slate-500 text-xs font-medium">
            &copy; 2024 SEO Engine Software. Premium Quality.
          </p>
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">System Online</span>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-slate-50">
        <div className="w-full max-w-[400px]">
          {/* Mobile Brand */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-slate-900 font-['Manrope']">SEO Engine</h1>
              <p className="text-sm text-slate-500">Premium Content Platform</p>
            </div>
          </div>
          
          <div className="space-y-8 animate-fade-in">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-slate-900">Benvenuto</h2>
              <p className="text-slate-500 mt-2">Accedi al tuo workspace per iniziare</p>
            </div>

            <Card className="border-slate-200/60 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden border-none bg-white">
              <CardContent className="p-8">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-xl mb-8">
                    <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold transition-all">Accedi</TabsTrigger>
                    <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold transition-all">Registrati</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login" className="space-y-6">
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email aziendale</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="email@esempio.it"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          required
                          className="h-12 px-4 rounded-xl border-slate-200 focus:ring-blue-600 focus:border-blue-600 transition-all bg-slate-50"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <Label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</Label>
                          <button type="button" className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700">Dimenticata?</button>
                        </div>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                          className="h-12 px-4 rounded-xl border-slate-200 focus:ring-blue-600 focus:border-blue-600 transition-all bg-slate-50"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-slate-950 hover:bg-black text-white h-12 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 animate-spin" />
                            <span>Verifica...</span>
                          </div>
                        ) : 'Entra nel Portale'}
                      </Button>
                    </form>
                    
                    <div className="pt-6 border-t border-slate-100">
                      <div className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accesso Demo</p>
                        <code className="text-xs text-slate-700 font-mono font-medium">
                          admin@seoengine.it / admin123
                        </code>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="register" className="space-y-6">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-name" className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</Label>
                          <Input
                            id="register-name"
                            placeholder="Mario Rossi"
                            value={registerData.name}
                            onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                            required
                            className="h-11 rounded-xl bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-email" className="text-xs font-bold text-slate-500 uppercase ml-1">Email</Label>
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="azienda@esempio.it"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            required
                            className="h-11 rounded-xl bg-slate-50"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="register-password" className="text-xs font-bold text-slate-500 uppercase ml-1">Password</Label>
                            <Input
                              id="register-password"
                              type="password"
                              value={registerData.password}
                              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                              required
                              className="h-11 rounded-xl bg-slate-50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="register-confirm" className="text-xs font-bold text-slate-500 uppercase ml-1">Conferma</Label>
                            <Input
                              id="register-confirm"
                              type="password"
                              value={registerData.confirmPassword}
                              onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                              required
                              className="h-11 rounded-xl bg-slate-50"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold mt-4"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creazione...' : 'Crea Account'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-slate-400">
              Hai bisogno di aiuto? <button className="text-blue-600 font-bold hover:underline">Supporto Tecnico</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
