import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

export const TermsOfServicePage = () => {
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
                            <FileText className="w-48 h-48" />
                        </div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
                                <FileText className="w-8 h-8 text-blue-400" />
                            </div>
                            <CardTitle className="text-4xl font-black tracking-tight mb-2">Termini di Servizio</CardTitle>
                            <p className="text-slate-400 font-medium">Ultimo aggiornamento: 11 Aprile 2026</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 text-slate-600 leading-relaxed text-lg space-y-8">
                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">1. Accettazione dei Termini</h2>
                            <p>
                                Registrandosi o utilizzando il servizio SEO Autopilot ("il Servizio"), l'utente accetta di essere vincolato dai presenti Termini di Servizio. Se non si accettano tali termini, non è consentito l'uso del Servizio.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">2. Descrizione del Servizio</h2>
                            <p>
                                Il Servizio fornisce strumenti basati su Intelligenza Artificiale per l'ottimizzazione SEO, la generazione di contenuti testuali e l'automazione del flusso di lavoro editoriale per siti WordPress. L'utente riconosce che l'output generato dall'AI deve essere revisionato prima della pubblicazione definitiva.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">3. Responsabilità dell'Utente</h2>
                            <p>
                                L'utente è l'unico responsabile per:
                            </p>
                            <ul className="list-disc list-inside mt-4 space-y-2 ml-4 marker:text-blue-500">
                                <li>La veridicità e la qualità dei dati dei clienti inseriti nel sistema.</li>
                                <li>Il rispetto del copyright e delle leggi sui contenuti pubblicati tramite il servizio.</li>
                                <li>La gestione sicura delle proprie credenziali di accesso.</li>
                                <li>Eventuali penalizzazioni SEO derivanti da un uso improprio o eccessivo di contenuti automatizzati sui propri domini.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">4. Limitazione di Responsabilità</h2>
                            <p>
                                Nonostante il nostro impegno per garantire la massima qualità e disponibilità, il Servizio è fornito "così com'è". Antigravity AI non garantisce che i contenuti generati portino a un miglioramento garantito del ranking nei motori di ricerca o che il servizio sia privo di interruzioni.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-black text-slate-900 mb-4">5. Modifiche al Servizio</h2>
                            <p>
                                Ci riserviamo il diritto di modificare, sospendere o terminare il Servizio o parte di esso in qualsiasi momento, con o senza preavviso, per motivi tecnici o di aggiornamento delle policy dei partner (OpenAI, Google, WordPress).
                            </p>
                        </section>

                        <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100 italic">
                            Questi termini sono regolati dalle leggi vigenti e qualsiasi controversia sarà soggetta alla competenza esclusiva del foro di riferimento del fornitore del servizio.
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

export default TermsOfServicePage;
