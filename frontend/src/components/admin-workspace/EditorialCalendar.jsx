import * as React from 'react';
import { useState, useMemo } from 'react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays, 
    parseISO,
    isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon,
    Layers,
    Clock,
    Zap,
    ExternalLink,
    CheckCircle2,
    FileText,
    Plus,
    PlusCircle,
    MoreVertical,
    Settings,
    MoreHorizontal
} from 'lucide-react';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

export function EditorialCalendar({ topics = [], onArticleClick, onDateChange, onAddContentClick }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [focusTopic, setFocusTopic] = useState('all');

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Get unique topics for filtering
    const allTopics = useMemo(() => {
        if (!Array.isArray(topics)) return [];
        const unique = [...new Set(topics.map(t => t.topic).filter(Boolean))];
        return unique;
    }, [topics]);

    const renderHeader = () => {
        return (
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 px-4 gap-8">
                <div className="flex flex-col">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-200">
                            <CalendarIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                                {format(currentMonth, 'MMMM yyyy', { locale: it })}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                    Controllo Totale Pianificazione Strategica
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Topic Focus Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-md">
                        <button 
                            onClick={() => setFocusTopic('all')}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${focusTopic === 'all' ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200/50 border border-slate-100 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                            TUTTI
                        </button>
                        {allTopics.slice(0, 4).map(t => (
                            <button 
                                key={t}
                                onClick={() => setFocusTopic(t)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-300 truncate max-w-[120px] ${focusTopic === t ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200/50 border border-slate-100 scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/20">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-[10px] font-black uppercase tracking-[0.2em] px-5 hover:bg-slate-50 rounded-xl">
                            Oggi
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        return (
            <div className="grid grid-cols-7 mb-6">
                {days.map((day, i) => (
                    <div key={i} className="text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-[0.3em]">
                            {day}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { locale: it });
        const endDate = endOfWeek(monthEnd, { locale: it });

        const rows = [];
        let days = [];
        let day = startDate;
        
        // Collect all articles that have a scheduled_date
        const scheduledArticles = Array.isArray(topics) ? topics.filter(t => t.scheduled_date && (focusTopic === 'all' || t.topic === focusTopic)) : [];

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const formattedDate = format(day, 'd');
                
                // Find articles for this day
                const dayArticles = scheduledArticles.filter(art => {
                    const artDate = typeof art.scheduled_date === 'string' ? parseISO(art.scheduled_date) : art.scheduled_date;
                    return isSameDay(artDate, cloneDay);
                });

                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDay = isToday(day);

                days.push(
                    <div
                        key={day.toString()}
                        onClick={() => onAddContentClick && onAddContentClick(cloneDay)}
                        className={`group min-h-[160px] p-3 border-r border-b border-slate-100 transition-all cursor-pointer relative ${
                            !isCurrentMonth ? 'bg-slate-50/40' : 'bg-white'
                        } ${isTodayDay ? 'bg-indigo-50/10' : 'hover:bg-slate-50'}`}
                    >
                        {/* Day Background Highlight for Today */}
                        {isTodayDay && <div className="absolute inset-0 bg-indigo-500/5 z-0" />}

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className={`text-xs font-black transition-all ${
                                isTodayDay ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-xl shadow-xl shadow-indigo-200 scale-110' : 
                                isCurrentMonth ? 'text-slate-900 group-hover:scale-110' : 'text-slate-300'
                            }`}>
                                {formattedDate}
                            </span>
                            
                            {/* Pro-active Schedule Intent Icon */}
                            {isCurrentMonth && (
                                <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <PlusCircle className="w-5 h-5 text-indigo-400 hover:text-indigo-600" title="Aggiungi Contenuto" />
                                </div>
                            )}

                            {dayArticles.length > 0 && !isTodayDay && (
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] h-5 font-black border-none px-2 rounded-lg">
                                    {dayArticles.length}
                                </Badge>
                            )}
                        </div>
                        
                        <div className="space-y-2 overflow-hidden relative z-10">
                            {dayArticles.slice(0, 4).map((art, idx) => {
                                // Assign a color based on the cluster/topic name
                                const topicIdx = topics.findIndex(t => t.topic === art.topic);
                                const clusterColors = [
                                    'border-indigo-100 bg-indigo-50/50 text-indigo-700 shadow-indigo-200/10',
                                    'border-emerald-100 bg-emerald-50/50 text-emerald-700 shadow-emerald-200/10',
                                    'border-orange-100 bg-orange-50/50 text-orange-700 shadow-orange-200/10',
                                    'border-pink-100 bg-pink-50/50 text-pink-700 shadow-pink-200/10',
                                    'border-sky-100 bg-sky-50/50 text-sky-700 shadow-sky-200/10',
                                    'border-purple-100 bg-purple-50/50 text-purple-700 shadow-purple-200/10'
                                ];
                                const colorClass = clusterColors[topicIdx % clusterColors.length] || 'border-slate-100 bg-slate-50 text-slate-600';

                                return (
                                    <TooltipProvider key={idx}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); onArticleClick && onArticleClick(art); }}
                                                    className={`px-3 py-2 rounded-xl border text-[10px] font-black truncate cursor-pointer transition-all hover:scale-[1.05] active:scale-95 shadow-sm ${colorClass}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {art.stato === 'published' ? (
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        ) : (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                                                        )}
                                                        <span className="truncate tracking-tight">{art.titolo}</span>
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" sideOffset={10} className="bg-slate-950 text-white border-none p-6 rounded-[2rem] max-w-sm shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between gap-8">
                                                        <Badge className="bg-indigo-500 text-white border-none text-[8px] font-black uppercase tracking-widest">{art.funnel || 'TOPIC'}</Badge>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] truncate max-w-[150px]">{art.topic}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-black leading-tight text-white mb-2">{art.titolo}</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{art.motivo}</p>
                                                    </div>
                                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-indigo-400" />
                                                            <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">{format(cloneDay, 'dd MMM yyyy', { locale: it })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dettagli</span>
                                                            <ExternalLink className="w-3 h-3 text-indigo-400" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                            {dayArticles.length > 4 && (
                                <p className="text-[10px] text-slate-400 font-bold pl-2 pt-1 uppercase tracking-widest">+{dayArticles.length - 4} Altri</p>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="border border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/50 bg-white ring-1 ring-slate-100">{rows}</div>;
    };

    return (
        <div className="bg-slate-50/50 p-4 rounded-[4rem] animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-2xl shadow-slate-100/40 relative overflow-hidden">
                {/* Subtle Geometric accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl -z-10" />

                {renderHeader()}
                {renderDays()}
                {renderCells()}
                
                <div className="mt-10 flex flex-wrap items-center justify-between px-6 gap-6">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Pianificati</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Live</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-black text-indigo-600 uppercase">Protip:</span>
                            <span className="text-[10px] font-bold text-slate-500 tracking-tight">Clicca un giorno vuoto per programmare</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2 px-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
                        <Zap className="w-4 h-4 text-amber-400 group-hover:scale-125 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">IA Engine Cluster Hub</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">In Sync: {topics.length} Assets</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

