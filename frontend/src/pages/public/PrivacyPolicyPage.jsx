import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

export const PrivacyPolicyPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate(-1)} 
                    className="mb-8 hover:bg-white text-slate-500 hover:text-slate-900 transition-all rounded-xl shadow-sm border border-transparent hover:border-slate-100"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Torna indietro
                </Button>

                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10 scale-150 rotate-12">
                            <ShieldCheck className="w-48 h-48" />
                        </div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
                                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                            </div>
                            <CardTitle className="text-4xl font-black tracking-tight mb-2">Norme sulla Privacy</CardTitle>
                            <p className="text-slate-400 font-medium">Ultimo aggiornamento: 11 Aprile 2026</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 text-slate-600 leading-relaxed text-lg space-y-8">
                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">1. Raccolta delle Informazioni</h2>
                            <p>
                                Raccogliamo informazioni fornite direttamente da te quando ti registri, configuri un cliente o utilizzi le nostre funzioni di generazione contenuti. Queste possono includere nome, indirizzo email, credenziali di accesso a WordPress e dati provenienti da servizi di analisi come Google Search Console e GA4 (previa tua autorizzazione OAuth).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">2. Utilizzo dei Dati</h2>
                            <p>
                                Utilizziamo i tuoi dati esclusivamente per fornire, mantenere e migliorare il servizio di SEO Autopilot. Ciò include:
                            </p>
                            <ul className="list-disc list-inside mt-4 space-y-2 ml-4 marker:text-emerald-500">
                                <li>Generazione automatizzata di testi tramite modelli di Intelligenza Artificiale.</li>
                                <li>Analisi delle performance SEO e suggerimenti strategici.</li>
                                <li>Sincronizzazione dei contenuti con il tuo CMS WordPress.</li>
                                <li>Invio di notifiche di sistema relative ai tuoi lavori in corso.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">3. Sicurezza e Conservazione</h2>
                            <p>
                                La sicurezza dei tuoi dati è la nostra priorità. Tutte le API Key e i token di accesso sono crittografati nel nostro database. Non condividiamo mai le tue credenziali o i tuoi dati proprietari con terze parti, ad eccezione dei fornitori di servizi LLM (come OpenAI o Anthropic) necessari per la generazione del testo, i quali processano i dati in forma anonima e sicura secondo le loro policy di privacy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">4. Servizi Google (GSC & GA4)</h2>
                            <p>
                                L'uso dell'integrazione con Google Search Console e Google Analytics 4 avviene tramite protocollo OAuth2. Accediamo ai dati in modalità sola lettura (salvo per l'invio di sitemap e richieste di indicizzazione se esplicitamente richiesto dall'utente). Puoi revocare l'accesso in qualsiasi momento tramite le impostazioni dell'app o dalla pagina di gestione account del tuo profilo Google.
                            </p>
                        </section>

                        <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                            <h2 className="text-xl font-black text-slate-900 mb-4">Contatti</h2>
                            <p className="text-base">
                                Se hai domande su queste Norme sulla Privacy, puoi contattarci all'indirizzo email support@seoengine-antigravity.ai
                            </p>
                        </section>
                    </CardContent>
                </Card>
                <div className="mt-12 text-center text-slate-400 text-sm">
                    &copy; 2026 Antigravity AI SEO Engine. Tutti i diritti riservati.
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
