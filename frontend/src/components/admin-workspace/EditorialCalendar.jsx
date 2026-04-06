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
    Plus
} from 'lucide-react';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

export function EditorialCalendar({ topics, onArticleClick, onDateChange, onAddContentClick }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [focusTopic, setFocusTopic] = useState('all');

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Get unique topics for filtering
    const allTopics = useMemo(() => {
        const unique = [...new Set(topics.map(t => t.topic).filter(Boolean))];
        return unique;
    }, [topics]);

    const renderHeader = () => {
        return (
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 px-2 gap-6">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <CalendarIcon className="w-7 h-7 text-indigo-600" />
                        {format(currentMonth, 'MMMM yyyy', { locale: it })}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Controllo Totale Pianificazione & Autorità Semantica
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Topic Focus Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button 
                            onClick={() => setFocusTopic('all')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${focusTopic === 'all' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            TUTTI
                        </button>
                        {allTopics.slice(0, 3).map(t => (
                            <button 
                                key={t}
                                onClick={() => setFocusTopic(t)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all truncate max-w-[80px] ${focusTopic === t ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9 rounded-xl hover:bg-slate-50 text-slate-600">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-[10px] font-black uppercase tracking-widest px-4">
                            Oggi
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9 rounded-xl hover:bg-slate-50 text-slate-600">
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
            <div className="grid grid-cols-7 mb-4">
                {days.map((day, i) => (
                    <div key={i} className="text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
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
        const scheduledArticles = topics.filter(t => t.scheduled_date && (focusTopic === 'all' || t.topic === focusTopic));

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
                        className={`group min-h-[140px] p-2 border-r border-b border-slate-100 transition-all cursor-pointer hover:bg-slate-50 relative ${
                            !isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'bg-white'
                        } ${isTodayDay ? 'ring-2 ring-inset ring-indigo-500/10 bg-indigo-50/5' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[11px] font-black ${
                                isTodayDay ? 'bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-lg shadow-lg shadow-indigo-200' : 
                                isCurrentMonth ? 'text-slate-900' : 'text-slate-300'
                            }`}>
                                {formattedDate}
                            </span>
                            
                            {/* Pro-active Schedule Intent Icon */}
                            {isCurrentMonth && dayArticles.length === 0 && (
                                <Plus className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}

                            {dayArticles.length > 0 && (
                                <Badge variant="secondary" className="bg-indigo-600 text-white text-[9px] h-4 font-black border-none px-1.5 min-w-[1.25rem] flex justify-center">
                                    {dayArticles.length}
                                </Badge>
                            )}
                        </div>
                        
                        <div className="space-y-1.5 overflow-hidden">
                            {dayArticles.slice(0, 4).map((art, idx) => {
                                // Assign a color based on the cluster/topic name
                                const topicIdx = topics.findIndex(t => t.topic === art.topic);
                                const clusterColors = [
                                    'border-indigo-200 bg-indigo-50/80 text-indigo-800',
                                    'border-emerald-200 bg-emerald-50/80 text-emerald-800',
                                    'border-orange-200 bg-orange-50/80 text-orange-800',
                                    'border-pink-200 bg-pink-50/80 text-pink-800',
                                    'border-sky-200 bg-sky-50/80 text-sky-800',
                                    'border-purple-200 bg-purple-50/80 text-purple-800'
                                ];
                                const colorClass = clusterColors[topicIdx % clusterColors.length] || 'border-slate-200 bg-slate-50 text-slate-700';

                                return (
                                    <TooltipProvider key={idx}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); onArticleClick && onArticleClick(art); }}
                                                    className={`px-2 py-1.5 rounded-xl border text-[9px] font-black truncate cursor-pointer transition-all hover:scale-[1.03] active:scale-95 shadow-sm border-transparent hover:border-current/10 ${colorClass}`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        {art.stato === 'published' ? <CheckCircle2 className="w-2.5 h-2.5 opacity-60" /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
                                                        <span className="truncate tracking-tight">{art.titolo}</span>
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-slate-950 text-white border-none p-4 rounded-3xl max-w-sm shadow-2xl backdrop-blur-xl">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-6">
                                                        <Badge className="bg-indigo-500 text-white border-none text-[8px] font-black uppercase">{art.funnel || 'TOPIC'}</Badge>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{art.topic}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black leading-tight text-white">{art.titolo}</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium mt-1.5 leading-relaxed">{art.motivo}</p>
                                                    </div>
                                                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                                            <span className="text-[10px] text-slate-300 font-bold uppercase">{format(cloneDay, 'dd MMMM yyyy', { locale: it })}</span>
                                                        </div>
                                                        <ExternalLink className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                            {dayArticles.length > 4 && (
                                <p className="text-[9px] text-slate-400 font-black pl-1">+{dayArticles.length - 4} ALTRI</p>
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
        return <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-200/40 bg-white">{rows}</div>;
    };

    return (
        <div className="bg-slate-50/30 p-2 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
                
                <div className="mt-8 flex items-center justify-between px-4">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-md shadow-indigo-200" />
                            <span className="text-[10px] font-black text-slate-950 uppercase tracking-[0.1em]">Pianificati</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-200" />
                            <span className="text-[10px] font-black text-slate-950 uppercase tracking-[0.1em]">Live</span>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 py-1.5 px-4 bg-slate-900 rounded-full border border-slate-800 shadow-lg">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">IA Engine Sync: Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
