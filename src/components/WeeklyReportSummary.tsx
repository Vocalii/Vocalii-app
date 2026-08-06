import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  userId: string | null;
  dailyRitualIds: string[];
}

// Always the Monday-Sunday calendar week containing today, matching WeeklyReportPage.tsx's
// computeWeekDates() so this dashboard teaser and the full report always show the same numbers.
function currentWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { mondayIso: monday.toISOString().slice(0, 10), sundayIso: sunday.toISOString().slice(0, 10) };
}

function formatShortDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WeeklyReportSummary({ userId, dailyRitualIds }: Props) {
  const [stats, setStats] = useState<{ checkedInDays: number; ritualsCompleted: number; maxRituals: number } | null>(null);
  const { mondayIso, sundayIso } = currentWeekRange();

  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase.from('daily_checkins').select('date').eq('user_id', userId).gte('date', mondayIso).lte('date', sundayIso),
      supabase.from('ritual_completions').select('date').eq('user_id', userId).gte('date', mondayIso).lte('date', sundayIso),
    ]).then(([checkinsRes, ritualsRes]) => {
      if (cancelled) return;
      setStats({
        checkedInDays: (checkinsRes.data ?? []).length,
        ritualsCompleted: (ritualsRes.data ?? []).length,
        maxRituals: Math.max(dailyRitualIds.length, 1) * 7,
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mondayIso, sundayIso, dailyRitualIds.length]);

  return (
    <>
      <p className="text-[9px] font-mono uppercase tracking-widest text-[#21e8ff]/60 mb-1">
        {formatShortDate(mondayIso)} – {formatShortDate(sundayIso)}
      </p>
      <h4 className="text-[13px] font-medium text-zinc-200 group-hover:text-white transition-colors duration-200">Weekly Report</h4>
      <p className="text-[10px] text-zinc-500 mt-0.5">
        {stats ? `${stats.checkedInDays}/7 check-ins · ${stats.ritualsCompleted}/${stats.maxRituals} rituals` : '…'}
      </p>
    </>
  );
}
