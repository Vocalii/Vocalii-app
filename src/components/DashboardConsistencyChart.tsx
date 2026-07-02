import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Check } from 'lucide-react';

const DATA = [
  { name: 'Mon', completed: 1, date: 'Jun 23' },
  { name: 'Tue', completed: 2, date: 'Jun 24' },
  { name: 'Wed', completed: 1, date: 'Jun 25' },
  { name: 'Thu', completed: 3, date: 'Jun 26' },
  { name: 'Fri', completed: 0, date: 'Jun 27' },
  { name: 'Sat', completed: 2, date: 'Jun 28' },
  { name: 'Today', completed: 2, date: 'Jun 29' },
];

const total = DATA.reduce((sum, d) => sum + d.completed, 0);

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; completed: number; date: string } }>;
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

export default function DashboardConsistencyChart() {
  return (
    <div className="bg-[#181b22]/90 backdrop-blur-[12px] border border-zinc-800/80 rounded-[28px] p-5 hover:bg-[#1d212a]/95 hover:border-zinc-700/60 transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col gap-4 group">
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/35 to-transparent" />
      <div className="absolute -bottom-16 -left-12 w-64 h-32 bg-[#17A9C9]/10 rounded-full blur-[45px] pointer-events-none transition-all duration-500 group-hover:bg-[#17A9C9]/15 group-hover:scale-110 z-0" />

      <div className="flex items-center justify-between z-10">
        <div>
          <h3 className="text-sm font-medium text-zinc-200 tracking-wide">7-Day Practice Consistency</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Ritual completions over the last 7 days.</p>
        </div>
      </div>

      <div className="h-36 w-full z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 6, right: 8, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="dashColorCompletions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#17A9C9" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#17A9C9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b1e2a" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1c343d', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="completed" stroke="#21e8ff" strokeWidth={2} fillOpacity={1} fill="url(#dashColorCompletions)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-zinc-800/60 pt-3.5 grid grid-cols-3 gap-3 text-center z-10">
        {[
          { label: 'Average Pace', value: `${(total / 7).toFixed(1)}`, unit: '/ day' },
          { label: 'Total Complete', value: `${total}`, unit: 'tasks' },
          { label: 'Habit Health', value: `${Math.round((total / 21) * 100)}%`, unit: '', accent: true },
        ].map(s => (
          <div key={s.label} className="bg-gradient-to-br from-[#101217] to-[#0d0e13]/90 border border-zinc-800/60 rounded-2xl p-2.5 shadow-inner hover:border-zinc-700/60 transition-colors duration-300">
            <span className="block text-[8.5px] font-mono uppercase tracking-wider text-zinc-500">{s.label}</span>
            <span className={`block text-xs font-semibold mt-0.5 ${s.accent ? 'text-[#21e8ff]' : 'text-white'}`}>
              {s.value}{s.unit && <span className="text-[9px] text-zinc-500 font-normal ml-1">{s.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
