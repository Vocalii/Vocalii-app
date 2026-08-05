import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Check, ArrowUp, ArrowDown, Minus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DayData {
  name: string;
  date: string;
  dateStr: string;
  completed: number;
}

interface Props {
  userId: string | null;
  dailyRitualIds: string[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DayData }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#12141a] border border-zinc-800/80 px-3 py-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-sans">
        <p className="text-[10px] text-zinc-500 font-mono mb-0.5">{data.date} ({label})</p>
        <p className="text-xs font-semibold text-[#21e8ff] flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
          {data.completed} {data.completed === 1 ? 'Ritual' : 'Rituals'} Completed
        </p>
      </div>
    );
  }
  return null;
};

function buildWeekTemplate(): DayData[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const days: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      dateStr: d.toISOString().slice(0, 10),
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: 0,
    });
  }
  return days;
}

export default function DashboardConsistencyChart({ userId, dailyRitualIds }: Props) {
  const [data, setData] = useState<DayData[]>(buildWeekTemplate);
  const [loading, setLoading] = useState(true);
  const [weeklyTrendPct, setWeeklyTrendPct] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData(buildWeekTemplate());
      setWeeklyTrendPct(null);
      setLoading(false);
      return;
    }

    const week = buildWeekTemplate();
    const thisMonday = week[0].dateStr;
    const mondayDate = new Date(thisMonday + 'T00:00:00');
    const historyStart = new Date(mondayDate);
    historyStart.setDate(mondayDate.getDate() - 28);
    const historyStartStr = historyStart.toISOString().slice(0, 10);

    supabase
      .from('ritual_completions')
      .select('date, ritual_id')
      .eq('user_id', userId)
      .gte('date', historyStartStr)
      .then(({ data: rows }) => {
        if (rows) {
          const countsByDate: Record<string, number> = {};
          for (const row of rows) {
            countsByDate[row.date] = (countsByDate[row.date] ?? 0) + 1;
          }
          setData(week.map(day => ({
            ...day,
            completed: countsByDate[day.dateStr] ?? 0,
          })));

          const priorRows = rows.filter(r => r.date < thisMonday);
          if (priorRows.length > 0) {
            const pastWeekTotals = [0, 0, 0, 0];
            for (const row of priorRows) {
              const diffDays = Math.floor((new Date(row.date + 'T00:00:00').getTime() - historyStart.getTime()) / 86400000);
              const weekIdx = Math.floor(diffDays / 7);
              if (weekIdx >= 0 && weekIdx < 4) pastWeekTotals[weekIdx]++;
            }
            const maxPossiblePerWeek = 7 * Math.max(dailyRitualIds.length, 1);
            const avgPastPct = (pastWeekTotals.reduce((a, b) => a + b, 0) / 4 / maxPossiblePerWeek) * 100;
            const currentTotal = week.reduce((sum, d) => sum + (countsByDate[d.dateStr] ?? 0), 0);
            const currentPct = (currentTotal / maxPossiblePerWeek) * 100;
            setWeeklyTrendPct(currentPct - avgPastPct);
          } else {
            setWeeklyTrendPct(null);
          }
        }
        setLoading(false);
      });
  }, [userId, dailyRitualIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = data.reduce((sum, d) => sum + d.completed, 0);
  const maxPossible = 7 * Math.max(dailyRitualIds.length, 1);
  const habitHealth = Math.round((total / maxPossible) * 100);

  const yMax = Math.max(...data.map(d => d.completed), 3);
  const yTicks = Array.from({ length: yMax + 1 }, (_, i) => i);

  const TrendIcon = weeklyTrendPct == null || Math.abs(weeklyTrendPct) < 3 ? Minus : weeklyTrendPct > 0 ? ArrowUp : ArrowDown;
  const trendColor = weeklyTrendPct == null || Math.abs(weeklyTrendPct) < 3 ? '#a1a1aa' : weeklyTrendPct > 0 ? '#34d399' : '#f87171';

  return (
    <>
      <div className="bg-[#181b22]/90 backdrop-blur-[12px] border border-zinc-800/80 rounded-[28px] p-5 hover:bg-[#1d212a]/95 hover:border-zinc-700/60 transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col gap-4 group">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/35 to-transparent" />
        <div className="absolute -bottom-16 -left-44 w-64 h-32 bg-[#17A9C9]/10 rounded-full blur-[45px] pointer-events-none transition-all duration-500 group-hover:bg-[#17A9C9]/10 group-hover:scale-110 z-0" />

        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div>
              <div className='flex items-center gap-2'>
                <h3 className="text-sm font-medium text-zinc-200 tracking-wide">Weekly Practice Consistency</h3>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all duration-150 cursor-pointer flex-shrink-0"
                  aria-label="What do these stats mean?"
                >
                  <span className="text-[9px] font-bold leading-none">?</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">Ritual completions this week (Mon–Sun).</p>
            </div>
          </div>
        </div>

        <div className="h-36 w-full z-10">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#17A9C9] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 6, right: 8, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashColorCompletions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17A9C9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#17A9C9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashStrokeSheen" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#17A9C9" />
                    <stop offset="50%" stopColor="#21e8ff" />
                    <stop offset="100%" stopColor="#17A9C9" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b1e2a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} domain={[0, yMax]} ticks={yTicks} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#17A9C9', strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="none"
                  fillOpacity={1}
                  fill="url(#dashColorCompletions)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="url(#dashStrokeSheen)"
                  strokeWidth={2.5}
                  fill="none"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(33,232,255,0.65)) drop-shadow(0 0 12px rgba(23,169,201,0.5))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border-t border-zinc-800/60 pt-3.5 flex items-start gap-0 divide-x divide-zinc-800/60 z-10">
          <div className="flex-1 flex flex-col items-center gap-0.5 px-2 first:pl-0 last:pr-0">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-sans">Average Pace</span>
            <span className="text-[11px] font-medium text-center leading-snug text-white">
              {(total / 7).toFixed(1)} / day
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 px-2 first:pl-0 last:pr-0">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-sans">Weekly Trend</span>
            {weeklyTrendPct == null ? (
              <span className="text-[11px] font-medium text-center leading-snug text-white">Needs more data</span>
            ) : (
              <span className="flex items-center justify-center gap-1 text-[11px] font-medium leading-snug" style={{ color: trendColor }}>
                <TrendIcon className="w-3 h-3 flex-shrink-0" strokeWidth={3} />
                {Math.abs(weeklyTrendPct) < 3 ? 'On par' : `${Math.round(Math.abs(weeklyTrendPct))}%`}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 px-2 first:pl-0 last:pr-0">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-sans">Habit Health</span>
            <span className="text-[11px] font-medium text-center leading-snug text-white">{habitHealth}%</span>
          </div>
        </div>
      </div>

      {/* Help modal */}
      {helpOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHelpOpen(false)}>
          <div
            className="relative max-w-sm w-full rounded-[28px] p-6 flex flex-col gap-5"
            style={{
              background: 'linear-gradient(to bottom, rgba(20,24,32,1) 0%, rgba(13,14,17,1) 100%)',
              border: '1px solid rgba(33,232,255,0.15)',
              boxShadow: '0 0 40px rgba(23,169,201,0.08), 0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px] bg-gradient-to-r from-transparent via-[#21e8ff]/20 to-transparent" />

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[14px] font-semibold text-white tracking-tight">How These Stats Work</h3>
                <p className="text-[10px] text-zinc-500">Based on your ritual completions this week</p>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="w-7 h-7 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-all cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: 'Average Pace', desc: 'Total rituals completed this week divided by 7 — how many you\'re averaging per day.' },
                { label: 'Weekly Trend', desc: 'This week\'s completion rate compared to your average over the last 4 weeks. Up means you\'re doing more than usual, down means less.' },
                { label: 'Habit Health', desc: 'The percentage of all possible ritual completions this week that you actually completed.' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-zinc-200">{label}</span>
                  <span className="text-[10px] text-zinc-500 leading-relaxed">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
