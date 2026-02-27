import React from 'react';
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
import { Key, Globe, Sparkles, Search } from 'lucide-react';

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

export const ApiKeysTab = ({ llm, setLlm, wordpress, setWordpress, apify, setApify }) => {
  const handleProviderChange = (newProvider) => {
    const models = getModelsForProvider(newProvider);
    setLlm({
      ...llm,
      provider: newProvider,
      modello: models.length > 0 ? models[0].id : ''
    });
  };

  return (
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={llm.provider} onValueChange={handleProviderChange}>
                <SelectTrigger data-testid="llm-provider-select">
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
            <div className="space-y-2">
              <Label>Modello</Label>
              <Select value={llm.modello} onValueChange={(v) => setLlm({ ...llm, modello: v })}>
                <SelectTrigger data-testid="llm-model-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getModelsForProvider(llm.provider).map((model) => (
                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={llm.api_key}
                onChange={(e) => setLlm({ ...llm, api_key: e.target.value })}
                placeholder={llm.provider === 'openai' ? 'sk-...' : 'API Key...'}
                data-testid="llm-api-key-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Temperatura ({llm.temperatura})</Label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={llm.temperatura}
                onChange={(e) => setLlm({ ...llm, temperatura: parseFloat(e.target.value) })}
                className="w-full h-10 accent-slate-900"
                data-testid="llm-temp-slider"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">{PROVIDER_DESCRIPTIONS[llm.provider]}</p>
          </div>
        </CardContent>
      </Card>

      {/* WordPress */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-600" />
            </div>
            WordPress
          </CardTitle>
          <CardDescription>Credenziali per la pubblicazione degli articoli</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>URL API</Label>
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
        </CardContent>
      </Card>

      {/* Apify Configuration */}
      <Card className="border-slate-200 lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Search className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle>Apify (SERP Scraping)</CardTitle>
                <CardDescription>Analisi dei risultati di ricerca Google</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="apify-toggle" className="text-sm text-slate-600">
                {apify.enabled ? 'Abilitato' : 'Disabilitato'}
              </Label>
              <button
                id="apify-toggle"
                type="button"
                role="switch"
                aria-checked={apify.enabled}
                onClick={() => setApify({ ...apify, enabled: !apify.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  apify.enabled ? 'bg-purple-600' : 'bg-slate-200'
                }`}
                data-testid="apify-toggle"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    apify.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardHeader>
        {apify.enabled && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Key Apify</Label>
                <Input
                  type="password"
                  value={apify.api_key}
                  onChange={(e) => setApify({ ...apify, api_key: e.target.value })}
                  placeholder="apify_api_..."
                  data-testid="apify-api-key-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Actor ID</Label>
                <Input
                  value={apify.actor_id}
                  onChange={(e) => setApify({ ...apify, actor_id: e.target.value })}
                  placeholder="apify/google-search-scraper"
                  data-testid="apify-actor-input"
                />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Ottieni la tua API key su <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">apify.com</a>
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
