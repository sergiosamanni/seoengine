import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock,
  TrendingUp,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DashboardPage = () => {
  const { getAuthHeaders, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/stats/overview`, {
          headers: getAuthHeaders()
        });
        setStats(response.data);
      } catch (error) {
        toast.error('Errore nel caricamento delle statistiche');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getAuthHeaders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const adminStats = [
    { 
      label: 'Clienti Totali', 
      value: stats?.total_clients || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Clienti Attivi', 
      value: stats?.active_clients || 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    { 
      label: 'Articoli Totali', 
      value: stats?.total_articles || 0,
      icon: FileText,
      color: 'text-slate-600',
      bg: 'bg-slate-100'
    },
    { 
      label: 'Pubblicati', 
      value: stats?.published_articles || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  const clientStats = [
    { 
      label: 'Articoli Totali', 
      value: stats?.total_articles || 0,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Generati', 
      value: stats?.generated_articles || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      label: 'Pubblicati', 
      value: stats?.published_articles || 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    }
  ];

  const displayStats = isAdmin ? adminStats : clientStats;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-['Manrope'] tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin ? 'Panoramica di tutti i clienti e articoli' : 'Panoramica dei tuoi articoli'}
          </p>
        </div>
        
        {isAdmin && (
          <Button 
            onClick={() => navigate('/clients')}
            className="bg-slate-900 hover:bg-slate-800"
            data-testid="add-client-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Cliente
          </Button>
        )}
        
        {!isAdmin && (
          <Button 
            onClick={() => navigate('/generator')}
            className="bg-orange-500 hover:bg-orange-600"
            data-testid="generate-articles-btn"
          >
            Genera Articoli
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat, i) => (
          <Card 
            key={stat.label} 
            className="border-slate-200 card-hover animate-slide-up"
            style={{ animationDelay: `${i * 0.1}s` }}
            data-testid={`stat-card-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 font-['Manrope']">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Clients (Admin only) */}
      {isAdmin && stats?.recent_clients?.length > 0 && (
        <Card className="border-slate-200" data-testid="recent-clients-card">
          <CardHeader>
            <CardTitle className="text-xl font-['Manrope']">Clienti Recenti</CardTitle>
            <CardDescription>Ultimi clienti aggiunti al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_clients.map((client) => (
                <div 
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/clients/${client.id}`)}
                  data-testid={`client-row-${client.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-600">
                        {client.nome?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{client.nome}</p>
                      <p className="text-sm text-slate-500">{client.sito_web}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={client.attivo ? "default" : "secondary"}
                      className={client.attivo 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-slate-100 text-slate-600 border-slate-200"
                      }
                    >
                      {client.attivo ? 'Attivo' : 'Inattivo'}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions for Client */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="border-slate-200 card-hover cursor-pointer tracing-beam"
            onClick={() => navigate('/configuration')}
            data-testid="quick-action-config"
          >
            <CardContent className="p-6 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Configurazione</h3>
              <p className="text-sm text-slate-500">
                Modifica knowledge base, tono e keyword combinations
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-slate-200 card-hover cursor-pointer tracing-beam"
            onClick={() => navigate('/generator')}
            data-testid="quick-action-generator"
          >
            <CardContent className="p-6 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Genera Articoli</h3>
              <p className="text-sm text-slate-500">
                Crea nuovi articoli SEO dalle combinazioni
              </p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-slate-200 card-hover cursor-pointer tracing-beam"
            onClick={() => navigate('/articles')}
            data-testid="quick-action-history"
          >
            <CardContent className="p-6 flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Storico Articoli</h3>
              <p className="text-sm text-slate-500">
                Visualizza e pubblica gli articoli generati
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
