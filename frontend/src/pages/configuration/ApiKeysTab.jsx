import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import { Key, Globe, Sparkles, Search, Activity } from 'lucide-react';

const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '0x1',
    models: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Raccomandato)' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Economico)' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    icon: '0x2',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku 3.5' },
      { id: 'claude-3-opus-20240229', name: 'Claude Opus 3' }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '0x3',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' }
    ]
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '0x4',
    models: [
      { id: 'sonar-pro', name: 'Sonar Pro (Con Ricerca Web)' },
      { id: 'sonar', name: 'Sonar' },
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama 3.1 Sonar Large' }
    ]
  }
];

const getModelsForProvider = (providerId) => {
  const provider = LLM_PROVIDERS.find(p => p.id === providerId);
  return provider ? provider.models : [];
};

const PROVIDER_DESCRIPTIONS = {
  openai: 'OpenAI offre i modelli GPT piu avanzati per generazione di contenuti di alta qualita.',
  anthropic: 'Claude di Anthropic eccelle nella scrittura naturale e nel rispetto delle istruzioni complesse.',
  deepseek: 'DeepSeek offre modelli potenti a costi competitivi, ideali per grandi volumi di contenuti.',
  perplexity: 'Perplexity integra ricerca web real-time, perfetto per contenuti sempre aggiornati.'
};

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : 'http://localhost:8000/api';

export const ApiKeysTab = ({ llm, setLlm, llmKeys, setLlmKeys, wordpress, setWordpress, seo, setSeo, onIndexSite, onSave, clientConfig, clientId }) => {
  const { getAuthHeaders } = useAuth();
  const [indexing, setIndexing] = React.useState(false);

  const handleIndex = async () => {
    setIndexing(true);
    await onIndexSite();
    setIndexing(false);
  };

  const handleProviderChange = (newProvider) => {
    setLlm({
      ...llm,
      provider: newProvider,
      modello: llmKeys[newProvider]?.modello || getModelsForProvider(newProvider)[0].id
    });
  };

  const handleKeyChange = (providerId, key) => {
    setLlmKeys({
      ...llmKeys,
      [providerId]: { ...llmKeys[providerId], api_key: key }
    });
  };

  const handleModelChange = (providerId, modelId) => {
    const updatedKeys = {
      ...llmKeys,
      [providerId]: { ...llmKeys[providerId], modello: modelId }
    };
    setLlmKeys(updatedKeys);
    
    // If this is the primary provider, sync it to main llm state
    if (llm.provider === providerId) {
      setLlm({ ...llm, modello: modelId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Stato LLM (AI)</p>
              <p className="text-sm font-bold text-slate-900">{clientConfig?.llm?.api_key || clientConfig?.openai?.api_key ? 'Configurato' : 'Mancante'}</p>
            </div>
          </div>
          <Badge variant={clientConfig?.llm?.api_key || clientConfig?.openai?.api_key ? "default" : "destructive"}>
            {clientConfig?.llm?.api_key || clientConfig?.openai?.api_key ? 'OK' : 'ERROR'}
          </Badge>
        </div>

        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Stato WordPress</p>
              <p className="text-sm font-bold text-slate-900">{clientConfig?.wordpress?.url_api ? 'Connesso' : 'Disconnesso'}</p>
            </div>
          </div>
          <Badge variant={clientConfig?.wordpress?.url_api ? "default" : "destructive"}>
            {clientConfig?.wordpress?.url_api ? 'OK' : 'ERROR'}
          </Badge>
        </div>

        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
              <Search className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Search Console</p>
              <p className="text-sm font-bold text-slate-900">{clientConfig?.gsc?.connected ? 'Sincronizzato' : 'Non Collegato'}</p>
            </div>
          </div>
          <Badge variant={clientConfig?.gsc?.connected ? "default" : "secondary"}>
            {clientConfig?.gsc?.connected ? 'OK' : 'OFF'}
          </Badge>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LLM Configuration */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            Modello LLM per Generazione
          </CardTitle>
          <CardDescription>Scegli il provider e il modello per generare gli articoli SEO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Provider Primario</p>
                <p className="text-xs text-slate-500">L'articolo verrà scritto con questo provider. In caso di errore, il sistema proverà gli altri configurati.</p>
              </div>
            </div>
            <Select value={llm.provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-48 bg-white" data-testid="llm-provider-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <span>{provider.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {LLM_PROVIDERS.map((provider) => (
              <div key={provider.id} className="p-4 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                       <Key className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="font-bold text-sm">{provider.name}</span>
                  </div>
                  {llm.provider === provider.id && (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Primario</Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">API Key</Label>
                    <Input
                      type="password"
                      value={llmKeys[provider.id]?.api_key || ''}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      placeholder={`${provider.name} API Key...`}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Modello</Label>
                    <Select 
                      value={llmKeys[provider.id]?.modello || provider.models[0].id} 
                      onValueChange={(v) => handleModelChange(provider.id, v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {provider.models.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
             <Label>Temperatura Creativa ({llm.temperatura})</Label>
             <input
               type="range"
               min="0"
               max="1"
               step="0.1"
               value={llm.temperatura}
               onChange={(e) => setLlm({ ...llm, temperatura: parseFloat(e.target.value) })}
               className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
               data-testid="llm-temp-slider"
             />
             <div className="flex justify-between text-[10px] text-slate-400 font-medium">
               <span>Più Preciso</span>
               <span>Più Creativo</span>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* WordPress & SEO */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            WordPress & SEO
          </CardTitle>
          <div className="flex items-center gap-2">
            <CardDescription>Configura WordPress e le risorse SEO del sito</CardDescription>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-bold gap-1 ml-auto"
              onClick={handleIndex}
              disabled={indexing}
            >
              <Activity className={`w-3 h-3 ${indexing ? 'animate-spin' : ''}`} />
              {indexing ? 'Indicizzazione...' : 'Aggiorna Indice Contenuti'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>URL API WordPress</Label>
              <Input
                value={wordpress.url_api}
                onChange={(e) => setWordpress({ ...wordpress, url_api: e.target.value })}
                placeholder="https://sito.it/wp-json/wp/v2/posts"
                data-testid="wp-url-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Utente</Label>
              <Input
                value={wordpress.utente}
                onChange={(e) => setWordpress({ ...wordpress, utente: e.target.value })}
                placeholder="username"
                data-testid="wp-user-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Password Applicazione</Label>
              <Input
                type="password"
                value={wordpress.password_applicazione}
                onChange={(e) => setWordpress({ ...wordpress, password_applicazione: e.target.value })}
                placeholder="xxxx xxxx xxxx xxxx"
                data-testid="wp-pass-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Stato Pubblicazione</Label>
              <Select
                value={wordpress.stato_pubblicazione}
                onValueChange={(v) => setWordpress({ ...wordpress, stato_pubblicazione: v })}
              >
                <SelectTrigger data-testid="wp-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="publish">Pubblica</SelectItem>
                  <SelectItem value="pending">In Revisione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-slate-400" />
                  Sitemap URL (per Linking Interno)
                </Label>
                <Input
                  value={seo.sitemap_url || ''}
                  onChange={(e) => setSeo({ ...seo, sitemap_url: e.target.value })}
                  placeholder="https://sito.it/sitemap_index.xml"
                />
                <p className="text-[10px] text-slate-500">
                  L'agente userà la sitemap per trovare articoli correlati da linkare automaticamente.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
};
