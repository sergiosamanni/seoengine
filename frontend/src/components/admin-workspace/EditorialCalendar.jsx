import React, { useState, useMemo } from 'react';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
    eachDayOfInterval, parseISO, isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { 
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Zap,
    Target, Play, Clock, CheckCircle2, ChevronUp, ChevronDown,
    TrendingUp, Search, Info, Plus, PlusCircle, MoreHorizontal,
    ArrowsPointingOut
} from 'lucide-react';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export function EditorialCalendar({ 
    topics = [], onArticleClick, onDateChange, onAddContentClick,
    movingTopic, onMoveStart
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [focusTopic, setFocusTopic] = useState('all');
    
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const allTopics = useMemo(() => {
        if (!Array.isArray(topics)) return [];
        const unique = [...new Set(topics.map(t => t.topic).filter(Boolean))];
        return unique;
    }, [topics]);

    const { articlesByDay, undatedArticles } = useMemo(() => {
        const map = {};
        const undated = [];
        if (!Array.isArray(topics)) return { articlesByDay: map, undatedArticles: undated };
        
        topics.forEach((topic) => {
            if (focusTopic !== 'all' && topic.topic !== focusTopic) return;
            
            let dayStr = null;
            if (topic.scheduled_date) {
                dayStr = format(parseISO(topic.scheduled_date), 'yyyy-MM-dd');
            } else if (topic.created_at) {
                dayStr = format(parseISO(topic.created_at), 'yyyy-MM-dd');
            }
            
            if (dayStr) {
                if (!map[dayStr]) map[dayStr] = [];
                map[dayStr].push(topic);
            } else {
                undated.push(topic);
            }
        });
        return { articlesByDay: map, undatedArticles: undated };
    }, [topics, focusTopic]);

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
                        <div className="w-px h-8 bg-slate-100" />
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
        return (
            <div className="grid grid-cols-7 mb-4">
                {weekdays.map(day => (
                    <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4" key={day}>
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const daysArr = eachDayOfInterval({ start: startDate, end: endDate });
        
        const rows = [];
        for (let i = 0; i < daysArr.length; i += 7) {
            const week = daysArr.slice(i, i + 7);
            rows.push(
                <div className="grid grid-cols-7 border-b border-slate-100 last:border-none" key={i}>
                    {week.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayTopics = articlesByDay[dayStr] || [];
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        
                        return (
                            <div
                                className={`min-h-[160px] p-4 border-r border-slate-100 last:border-none transition-all duration-500 relative group overflow-hidden ${
                                    !isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'
                                } ${isToday(day) ? 'bg-indigo-50/5' : ''}`}
                                key={dayStr}
                                onClick={() => onDateChange && onDateChange(day)}
                            >
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <span className={`text-sm font-black transition-colors ${
                                        !isCurrentMonth ? 'text-slate-300' : isToday(day) ? 'text-indigo-600' : 'text-slate-900'
                                    }`}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayTopics.length > 0 && (
                                        <Badge className="bg-indigo-500 text-white border-none text-[8px] font-black h-5 w-5 rounded-full flex items-center justify-center p-0 shadow-lg shadow-indigo-200">
                                            {dayTopics.length}
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="space-y-2 max-h-[110px] overflow-y-auto no-scrollbar relative z-10">
                                    {dayTopics.map((topic, index) => (
                                        <div 
                                            key={index}
                                            onClick={(e) => { e.stopPropagation(); onArticleClick(topic); }}
                                            className={`p-2.5 rounded-xl bg-white border shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group/item cursor-pointer overflow-hidden ${
                                                movingTopic?.titolo === topic.titolo ? 'border-indigo-600 scale-105 ring-2 ring-indigo-100 animate-pulse bg-indigo-50/30' : 'border-slate-100'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                                        topic.stato === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`} />
                                                    <p className="text-[9px] font-bold text-slate-700 leading-tight line-clamp-2 group-hover/item:text-indigo-600 transition-colors uppercase">
                                                        {topic.titolo}
                                                    </p>
                                                </div>
                                                {onMoveStart && topic.stato !== 'published' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMoveStart(movingTopic?.titolo === topic.titolo ? null : topic);
                                                        }}
                                                        className={`p-1 rounded-lg transition-all ${
                                                            movingTopic?.titolo === topic.titolo ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'
                                                        }`}
                                                    >
                                                        <ArrowsPointingOut className="w-2.5 h-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div 
                                    className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center cursor-pointer pointer-events-none"
                                    onClick={(e) => { e.stopPropagation(); onAddContentClick && onAddContentClick(day); }}
                                >
                                    <PlusCircle className="w-10 h-10 text-indigo-500 scale-75 group-hover:scale-100 transition-transform duration-500 pointer-events-auto" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return <div className="rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/20">{rows}</div>;
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {renderHeader()}
            <div className="bg-white/40 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white shadow-2xl shadow-slate-200/40">
                {renderDays()}
                {renderCells()}
            </div>

            {/* Coda Strategica: Topics without date */}
            {undatedArticles.length > 0 && (
                <div className="mt-16 space-y-8 animate-in fade-in duration-1000 px-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-200">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Coda Strategica</h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Contenuti approvati in attesa di schedulazione (Fallback Diseko)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {undatedArticles.map((topic, idx) => (
                            <Card 
                                key={idx} 
                                onClick={() => onArticleClick(topic)}
                                className="p-6 rounded-[2rem] border-none shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] cursor-pointer group bg-gradient-to-br from-white to-slate-50"
                            >
                                <div className="flex flex-col h-full justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-slate-900 text-white rounded-full text-[8px] px-3 py-1 uppercase font-black tracking-widest border-none">
                                                {topic.topic || 'Custom'}
                                            </Badge>
                                            <Zap className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <h4 className="text-xs font-black text-slate-900 leading-snug uppercase group-hover:text-indigo-600 transition-colors">
                                            {topic.titolo}
                                        </h4>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{topic.funnel || 'Awareness'}</span>
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
