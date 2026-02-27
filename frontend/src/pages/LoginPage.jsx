import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { Zap, BarChart3, FileText, Globe } from 'lucide-react';

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
    <div className="min-h-screen flex noise-bg">
      <Toaster position="top-right" richColors />
      
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white font-['Manrope']">SEO Engine</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-['Manrope'] leading-tight">
            Programmatic SEO<br />
            <span className="text-orange-500">Automatizzato</span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-12 max-w-md">
            Genera centinaia di articoli SEO ottimizzati partendo dalle tue keyword combinations. Pubblicali su WordPress con un click.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div 
                key={feature.title}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <feature.icon className="w-8 h-8 text-orange-500 mb-3" />
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-slate-500 text-sm">
          &copy; 2024 Programmatic SEO Engine. Built for scale.
        </p>
      </div>
      
      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 font-['Manrope']">SEO Engine</span>
          </div>
          
          <Card className="border-slate-200 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-['Manrope']">Benvenuto</CardTitle>
              <CardDescription>Accedi o crea un nuovo account</CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">Accedi</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Registrati</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nome@azienda.it"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        data-testid="login-email-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        data-testid="login-password-input"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-slate-900 hover:bg-slate-800 h-11"
                      disabled={isLoading}
                      data-testid="login-submit-btn"
                    >
                      {isLoading ? 'Accesso in corso...' : 'Accedi'}
                    </Button>
                  </form>
                  
                  <div className="mt-6 p-4 bg-slate-100 rounded-lg">
                    <p className="text-sm text-slate-600 mb-2">Demo Admin:</p>
                    <code className="text-xs text-slate-500 font-mono">
                      admin@seoengine.it / admin123
                    </code>
                  </div>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nome</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Mario Rossi"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                        data-testid="register-name-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="nome@azienda.it"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        data-testid="register-email-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        data-testid="register-password-input"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm">Conferma Password</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                        data-testid="register-confirm-input"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-slate-900 hover:bg-slate-800 h-11"
                      disabled={isLoading}
                      data-testid="register-submit-btn"
                    >
                      {isLoading ? 'Registrazione...' : 'Crea Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
