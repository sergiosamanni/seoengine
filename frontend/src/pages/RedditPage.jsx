import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { MessageSquare, Search, ExternalLink, Zap, Users, TrendingUp } from 'lucide-react';

const RedditPage = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            Reddit <span className="text-emerald-500 italic">Community Outreach</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Intervieni nelle community e crea discussioni di valore per i tuoi clienti.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-8 h-12 shadow-lg shadow-orange-100 font-bold uppercase tracking-widest text-[10px]">
          Collega Account Reddit
        </Button>
      </div>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-xl shadow-slate-100 bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <TrendingUp className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Karma Generato</p>
                  <h3 className="text-2xl font-black text-slate-900">+1.2k</h3>
               </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Il karma positivo aiuta l'indicizzazione dei link nei tuoi commenti.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-100 bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <MessageSquare className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Commenti Attivi</p>
                  <h3 className="text-2xl font-black text-slate-900">42</h3>
               </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Discussioni in cui i tuoi bot/account stanno partecipando.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-xl shadow-slate-100 bg-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Zap className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nuove Opportunità</p>
                  <h3 className="text-2xl font-black text-slate-900">12</h3>
               </div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Thread rilevanti scoperti nelle community locali e di settore.</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Board */}
      <Card className="rounded-3xl border-none shadow-2xl shadow-slate-100 bg-white p-8">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                 <Input className="pl-10 h-11 w-64 rounded-xl border-slate-100 text-sm" placeholder="Cerca Subreddit o Thread..." />
              </div>
              <Badge className="bg-slate-50 text-slate-500 border-none px-4 py-1.5 h-11 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                 <Users className="w-3.5 h-3.5" /> Community Suggerite
              </Badge>
           </div>
           <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Moduli Attivi: <span className="text-emerald-500 italic font-black">AI Scout</span></p>
           </div>
        </div>

        <div className="space-y-4">
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
               <MessageSquare className="w-16 h-16 text-slate-200 mb-6" />
               <h3 className="text-lg font-black tracking-tight text-slate-400">In attesa dell'integrazione API</h3>
               <p className="text-sm max-w-sm font-medium text-slate-400">Collega un account Reddit per iniziare la scansione delle discussioni rilevanti per i tuoi clienti.</p>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default RedditPage;
