import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
    BookOpen, Globe, Settings, Zap, BarChart3,
    CheckCircle2, AlertCircle, Info, Bookmark, RefreshCw, Link as LinkIcon
} from 'lucide-react';

export const GuidePage = () => {
    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-blue-600" />
                    Guida Utente Admin
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Configurazione, integrazioni e flusso di lavoro professionale di SEO Engine.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Section 1: Workspace */}
                    <Card id="workspace" className="border-slate-200 shadow-sm scroll-mt-20">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">1</Badge>
                                Panoramica Workspace
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-slate-600">Il <strong>Client Workspace</strong> è stato ottimizzato per eliminare i tempi morti. Ora atterrerai direttamente sulla configurazione operativa:</p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <li className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                                        <Settings className="w-4 h-4 text-slate-500" /> Configurazione
                                    </div>
                                    <p className="text-sm text-slate-500">API, WordPress e Stato Integrazioni Live.</p>
                                </li>
                                <li className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                                        <Zap className="w-4 h-4 text-blue-500" /> Generatore
                                    </div>
                                    <p className="text-sm text-slate-500">Flusso guidato e Storico Articoli Recenti.</p>
                                </li>
                                <li className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                                        <RefreshCw className="w-4 h-4 text-emerald-500" /> Freshness
                                    </div>
                                    <p className="text-sm text-slate-500">Ottimizzazione contenuti esistenti via AI.</p>
                                </li>
                                <li className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                                        <BarChart3 className="w-4 h-4 text-sky-500" /> Analisi SEO
                                    </div>
                                    <p className="text-sm text-slate-500">Performance keyword e dati Search Console.</p>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Section 2: Internal Linking */}
                    <Card id="linking" className="border-slate-200 shadow-sm scroll-mt-20 border-l-4 border-l-blue-500">
                        <CardHeader className="bg-blue-50/30">
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-blue-600 text-white hover:bg-blue-600 border-none text-[10px]">NEW</Badge>
                                Smart Internal Linking Agent
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-slate-600 font-medium">L'agente non si limita a scrivere, ma crea una ragnatela di contenuti autorevole:</p>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                        <LinkIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Outbound Linking Automatico</p>
                                        <p className="text-sm text-slate-500">Durante la scrittura, l'AI analizza il sito e inserisce link verso articoli correlati per migliorare l'E-E-A-T.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                        <RefreshCw className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Inbound (Reverse) Linking</p>
                                        <p className="text-sm text-slate-500">Al momento della pubblicazione, l'agente "torna indietro" negli articoli vecchi e inserisce un link verso il nuovo articolo appena nato.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                                <p className="text-xs text-slate-500 italic">"Evita i contenuti orfani e velocizza l'indicizzazione delle nuove pagine."</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: WordPress */}
                    <Card id="wordpress" className="border-slate-200 shadow-sm scroll-mt-20">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">2</Badge>
                                Connettere WordPress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-3">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm text-blue-600">Step su WordPress:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-slate-600 ml-2 text-sm">
                                    <li>Vai in <strong>Utenti {' > '} Profilo</strong> nell'admin WordPress.</li>
                                    <li>Trova <strong>Password delle applicazioni</strong>.</li>
                                    <li>Crea una nuova password chiamata "SEO Engine".</li>
                                    <li>Copia il codice di 24 caratteri.</li>
                                </ol>
                            </div>

                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <h4 className="font-bold text-blue-900 mb-2 text-sm">Step su SEO Engine:</h4>
                                <p className="text-sm text-blue-800 mb-4 italic">Vai in Configurazione {' > '} API & Business</p>
                                <ul className="space-y-2 text-xs text-blue-800">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span><strong>URL API</strong>: Generalmente <code>https://nomedominio.it/wp-json/wp/v2/posts</code></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span><strong>Password</strong>: Inserisci il codice a 24 caratteri senza spazi.</span>
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 4: Workflow */}
                    <Card id="generation" className="border-slate-200 shadow-sm scroll-mt-20">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">3</Badge>
                                Flusso di Generazione Semplificato
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-slate-600">Abbiamo ridotto i campi per permetterti di lanciare job di scrittura in pochi secondi:</p>
                            <div className="space-y-4">
                                {[
                                    { step: 'Strategia (Semplificata)', desc: 'Scegli Funnel, Modello Copy, Lunghezza e CTA. Niente più configurazioni infinite.' },
                                    { step: 'Analisi SERP', desc: 'Estrai la struttura vincente dai top competitor su Google.' },
                                    { step: 'Google Search Console', desc: 'Integra keyword reali per rafforzare il posizionamento esistente.' },
                                    { step: 'Prompt Avanzato', desc: 'Rifinisci le istruzioni finali con il supporto dell\'AI.' },
                                    { step: 'Generazione & Linking', desc: 'L\'AI scrive, pubblica e crea la rete di link interni (Inbound/Outbound).' },
                                ].map((s, i) => (
                                    <div key={i} className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-l-2 border-transparent hover:border-slate-200">
                                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{s.step}</p>
                                            <p className="text-sm text-slate-500">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 5: Freshness */}
                    <Card id="freshness" className="border-slate-200 shadow-sm scroll-mt-20">
                        <CardHeader className="bg-emerald-50/30">
                            <CardTitle className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">4</Badge>
                                Content Freshness & AI Edit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-slate-600">Mantieni i contenuti sempre aggiornati senza uscire da SEO Engine:</p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Zap className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">Modifica Manuale Assistita</p>
                                        <p className="text-xs text-slate-500 mt-1">Scrivi un prompt (es. "Rendi il testo più professionale") e l'AI specializzata in SEO Copywriting eseguirà la modifica mantenendo il contesto dell'articolo.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">Badge Persistenti</p>
                                        <p className="text-xs text-slate-500 mt-1">Il sistema ricorda quali articoli hai già ottimizzato, mostrandoti il badge "Migliorato" in modo persistente.</p>
                                    </div>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Navigation */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-sm sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Bookmark className="w-4 h-4" /> Indice Rapido
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 pb-4">
                            <nav className="flex flex-col">
                                <a href="#workspace" className="px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-2 border-transparent hover:border-blue-500 transition-colors">
                                    1. Panoramica Workspace
                                </a>
                                <a href="#linking" className="px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-2 border-transparent font-bold text-blue-600 hover:border-blue-500 transition-colors">
                                    LINKING INTERNO (New)
                                </a>
                                <a href="#wordpress" className="px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-2 border-transparent hover:border-blue-500 transition-colors">
                                    2. Connettere WordPress
                                </a>
                                <a href="#generation" className="px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-2 border-transparent hover:border-blue-500 transition-colors">
                                    3. Flusso Generazione
                                </a>
                                <a href="#freshness" className="px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 border-l-2 border-transparent hover:border-emerald-500 transition-colors">
                                    4. Freshness & AI Edit
                                </a>
                            </nav>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 text-white border-none shadow-xl shadow-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Info className="w-5 h-5 text-blue-400" /> Stato Integrazioni
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-300">
                            Non cercare più i dati in dashboard. Controlla i <strong>Badge di Stato</strong> (Verdi/Rossi) direttamente nella tab <strong>Configurazione</strong> per sapere se il sito è connesso correttamente.
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
