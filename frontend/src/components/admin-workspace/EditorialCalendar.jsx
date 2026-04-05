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
    FileText
} from 'lucide-react';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

export function EditorialCalendar({ topics, onArticleClick, onDateChange }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <CalendarIcon className="w-7 h-7 text-indigo-600" />
                        {format(currentMonth, 'MMMM yyyy', { locale: it })}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Pianificazione mensile dei contenuti e clusterizzazione
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={prevMonth}
                        className="h-9 w-9 rounded-xl hover:bg-slate-50 text-slate-600"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentMonth(new Date())}
                        className="text-[10px] font-black uppercase tracking-widest px-4"
                    >
                        Oggi
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={nextMonth}
                        className="h-9 w-9 rounded-xl hover:bg-slate-50 text-slate-600"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
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
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        // Collect all articles that have a scheduled_date
        const scheduledArticles = topics.filter(t => t.scheduled_date);

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;
                
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
                        className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-all ${
                            !isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'bg-white'
                        } ${isTodayDay ? 'ring-2 ring-inset ring-indigo-500/20 bg-indigo-50/5' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-black ${
                                isTodayDay ? 'bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-md shadow-indigo-200' : 
                                isCurrentMonth ? 'text-slate-900' : 'text-slate-300'
                            }`}>
                                {formattedDate}
                            </span>
                            {dayArticles.length > 0 && (
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[9px] h-4 font-black">
                                    {dayArticles.length}
                                </Badge>
                            )}
                        </div>
                        
                        <div className="space-y-1.5 overflow-y-auto max-h-[100px] scrollbar-hide">
                            {dayArticles.map((art, idx) => {
                                // Assign a color based on the cluster/topic name
                                const topicIdx = topics.findIndex(t => t.topic === art.topic);
                                const clusterColors = [
                                    'border-indigo-200 bg-indigo-50 text-indigo-700',
                                    'border-emerald-200 bg-emerald-50 text-emerald-700',
                                    'border-orange-200 bg-orange-50 text-orange-700',
                                    'border-pink-200 bg-pink-50 text-pink-700',
                                    'border-sky-200 bg-sky-50 text-sky-700',
                                    'border-purple-200 bg-purple-50 text-purple-700',
                                    'border-rose-200 bg-rose-50 text-rose-700'
                                ];
                                const colorClass = clusterColors[topicIdx % clusterColors.length] || 'border-slate-200 bg-slate-50 text-slate-700';

                                return (
                                    <TooltipProvider key={idx}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div 
                                                    onClick={() => onArticleClick && onArticleClick(art)}
                                                    className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md ${colorClass}`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <Layers className="w-2.5 h-2.5 opacity-60" />
                                                        <span className="truncate">{art.titolo}</span>
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 text-white border-none p-3 rounded-xl max-w-xs shadow-2xl">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <Badge className="bg-white/20 text-white border-none text-[8px]">{art.funnel}</Badge>
                                                        <span className="text-[9px] font-bold text-white/60 uppercase tracking-tighter">Cluster: {art.topic}</span>
                                                    </div>
                                                    <h4 className="text-xs font-black leading-tight">{art.titolo}</h4>
                                                    <p className="text-[10px] text-white/70 italic line-clamp-2">{art.motivo}</p>
                                                    <div className="flex items-center gap-2 pt-1 border-t border-white/10 mt-1">
                                                        <Clock className="w-3 h-3 text-white/40" />
                                                        <span className="text-[9px] text-white/60 font-bold uppercase">{format(cloneDay, 'dd MMMM', { locale: it })}</span>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
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
        return <div className="border-t border-l border-slate-100 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-100/20">{rows}</div>;
    };

    return (
        <div className="bg-white p-6 rounded-[2.5rem] border border-[#f1f3f6] shadow-xl shadow-slate-100/50 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
            
            <div className="mt-8 flex items-center justify-between px-2">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cluster Attivi</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pianificati</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-tighter italic">Aggiornato in tempo reale</span>
                </div>
            </div>
        </div>
    );
}
