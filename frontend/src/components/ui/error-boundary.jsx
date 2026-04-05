import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Generator Critical Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 bg-red-50 border border-red-200 rounded-[2rem] text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-200/50">
            <AlertCircle className="w-10 h-10 text-red-600 drop-shadow-sm" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-red-950 tracking-tighter">ERRORE DI RENDERING</h2>
            <p className="text-red-700/80 text-sm max-w-md mx-auto font-medium leading-relaxed">Si è verificato un errore critico durante l'inizializzazione del generatore. Questo potrebbe essere dovuto a una dipendenza non caricata o dati incompleti.</p>
          </div>
          <div className="p-6 bg-white/90 backdrop-blur-md rounded-2xl text-left border border-red-200/50 overflow-auto max-h-64 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Log Dettagliato:</p>
            </div>
            <code className="text-[11px] text-red-900 font-mono whitespace-pre-wrap break-all block leading-tight">{this.state.error?.toString()}</code>
          </div>
          <div className="flex justify-center gap-4 pt-6">
            <Button onClick={() => window.location.reload()} className="rounded-xl px-10 h-14 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95">
              Ricarica Workspace
            </Button>
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="rounded-xl px-8 h-14 border-red-200 text-red-600 hover:bg-red-50 font-bold uppercase tracking-widest text-[10px]">
              Riprova
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
