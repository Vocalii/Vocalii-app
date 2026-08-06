import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { postCheckInTrigger } from './lib/notificationTriggers';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { OnboardingData } from './types/onboarding';
import Header, { AppNotification } from './components/Header';
import HeroSection from './components/HeroSection';
import WeatherWidget from './components/WeatherWidget';
import GoalProgressCard from './components/GoalProgressCard';
import BusyWidget from './components/BusyWidget';
import AcousticWidget from './components/AcousticWidget';
import InteractiveMap from './components/VoiceHealthStatus';
import HabitCard from './components/HabitCard';
import DashboardConsistencyChart from './components/DashboardConsistencyChart';
import RitualsPage, { type HabitCheckEntry } from './components/RitualsPage';
import ReportsPage from './components/ReportsPage';
import UpcomingEventsCard, { type VocalEvent } from './components/UpcomingEventsCard';
import WeeklyReportPage from './components/WeeklyReportPage';
import WeeklyCheckInPage from './components/WeeklyCheckInPage';
import WeeklyReportSummary from './components/WeeklyReportSummary';
import { selectRituals } from './lib/ritualSelection';
import WeeklyReportLoadingScreen from './components/WeeklyReportLoadingScreen';
import { getReflectionWeekStart } from './lib/weeklyCheckin';
import ProfilePage, { type ProfileUpdates } from './components/ProfilePage';
import { DESTINATIONS } from './data';
import { Destination, Attraction, Message, Ritual } from './types';
import { VocalReport, Role, ExperienceLevel, Goal, VoiceBarrier, HabitPair } from './types/onboarding';
import { type BaselineMetrics } from './components/BaselineFlow';
import { EXERCISE_RITUALS } from './ritualsData';
import { X, Sparkles, Shield, Bookmark, Terminal, HelpCircle, ArrowRight } from 'lucide-react';

const DESTINATION_THEMES: Record<string, {
  color: string;
  glowColor: string;
  glowColorLow: string;
  mutedColor: string;
  gradientFrom: string;
  glowBg: string;
}> = {
  santorini: {
    color: '#21e8ff',
    glowColor: '#17A9C9',
    glowColorLow: '#0e6d82',
    mutedColor: '#0b353f',
    gradientFrom: '#11141b',
    glowBg: 'rgba(23, 169, 201, 0.05)'
  },
  kyoto: {
    color: '#f43f5e',
    glowColor: '#be123c',
    glowColorLow: '#881337',
    mutedColor: '#4c0519',
    gradientFrom: '#150f11',
    glowBg: 'rgba(190, 18, 60, 0.05)'
  },
  reykjavik: {
    color: '#a78bfa',
    glowColor: '#7c3aed',
    glowColorLow: '#4c1d95',
    mutedColor: '#2e1065',
    gradientFrom: '#110f17',
    glowBg: 'rgba(124, 58, 237, 0.05)'
  },
  amalfi: {
    color: '#f59e0b',
    glowColor: '#d97706',
    glowColorLow: '#92400e',
    mutedColor: '#451a03',
    gradientFrom: '#13110f',
    glowBg: 'rgba(217, 119, 6, 0.05)'
  }
};

// Map a vocal_reports DB row to the VocalReport TS type
function mapReport(r: {
  id: string;
  name: string | null;
  ritual_name: string;
  category: string;
  date: string;
  duration: string;
  fatigue_level: number;
  feelings: string[];
  notes: string;
  insight: string;
  pitch_hz: number | null;
  pitch_range_hz: number | null;
  resonance_score: number | null;
  clarity_pct: number | null;
  loudness_db: number | null;
  stability_pct: number | null;
  is_favourite: boolean;
}): VocalReport {
  return {
    id: r.id,
    name: r.name ?? undefined,
    ritualName: r.ritual_name,
    category: r.category,
    date: r.date,
    duration: r.duration,
    fatigueLevel: r.fatigue_level,
    feelings: r.feelings || [],
    notes: r.notes || '',
    insight: r.insight || '',
    pitchHz: r.pitch_hz ?? undefined,
    pitchRangeHz: r.pitch_range_hz ?? undefined,
    resonanceScore: r.resonance_score ?? undefined,
    clarityPct: r.clarity_pct ?? undefined,
    loudnessDb: r.loudness_db ?? undefined,
    stabilityPct: r.stability_pct ?? undefined,
    favourite: r.is_favourite,
  };
}

function mapEvent(r: {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  prep_days_before: number | null;
  tailored_ritual_ids: string[];
  ai_insight: string | null;
  chat_transcript: { role: 'user' | 'assistant'; content: string }[];
}): VocalEvent {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    time: r.time ?? undefined,
    location: r.location ?? undefined,
    prepDaysBefore: r.prep_days_before ?? undefined,
    tailoredRitualIds: r.tailored_ritual_ids?.length ? r.tailored_ritual_ids : undefined,
    aiInsight: r.ai_insight ?? undefined,
    chatTranscript: r.chat_transcript?.length ? r.chat_transcript : undefined,
  };
}

export default function App() {
  // ─── Auth state ────────────────────────────────────────────────────────────
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  // Pre-filled name for users who signed up but haven't finished onboarding
  const [pendingProfile, setPendingProfile] = useState<{ firstName: string; lastName: string } | null>(null);

  // ─── User data (loaded from Supabase after auth) ────────────────────────────
  const [userName, setUserName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [desiredVoiceTraits, setDesiredVoiceTraits] = useState<string[]>([]);
  const [voiceStatement, setVoiceStatement] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [voiceBarrier, setVoiceBarrier] = useState<VoiceBarrier | null>(null);
  const [weeklyCheckinDue, setWeeklyCheckinDue] = useState(false);
  const [reflectionWeekStart, setReflectionWeekStart] = useState('');
  const [userHabits, setUserHabits] = useState<{ daily: string; vocal: string }[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<{ date: string; daily_habit: string; vocal_habit: string; completed: boolean }[]>([]);
  const [reports, setReports] = useState<VocalReport[]>([]);
  const [events, setEvents] = useState<VocalEvent[]>([]);
  const [completedRitualIds, setCompletedRitualIds] = useState<string[]>([]);
  const [checkInDone, setCheckInDone] = useState(false);
  const [todayVocalEffort, setTodayVocalEffort] = useState<number | null>(null);
  const [todayVocalConfidence, setTodayVocalConfidence] = useState<number | null>(null);
  const [todayVoiceDemandLevel, setTodayVoiceDemandLevel] = useState<number | null>(null);
  const [baselineConfidenceAvg, setBaselineConfidenceAvg] = useState<number | null>(null);
  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);
  const [selectedRitualIds, setSelectedRitualIds] = useState<string[] | null>(null);
  const [ritualInsight, setRitualInsight] = useState<string | null>(null);
  const [ritualsLoading, setRitualsLoading] = useState(false);
  const [baselineScore, setBaselineScore] = useState<number | null>(null);
  const [baselineStabilityPct, setBaselineStabilityPct] = useState<number | null>(null);
  const [baselineResonanceScore, setBaselineResonanceScore] = useState<number | null>(null);
  const [baselineClarityPct, setBaselineClarityPct] = useState<number | null>(null);
  const [baselineLoudnessDb, setBaselineLoudnessDb] = useState<number | null>(null);
  const [baselinePitchHz, setBaselinePitchHz] = useState<number | null>(null);
  const [baselinePitchRangeHz, setBaselinePitchRangeHz] = useState<number | null>(null);
  const [baselineSetAt, setBaselineSetAt] = useState<string | null>(null);

  // ─── Notifications (ephemeral, kept in localStorage) ───────────────────────
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem('vocalii_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const addNotification = (text: string, detail?: string) => {
    setNotifications(prev => {
      const next = [{ id: crypto.randomUUID(), text, detail, timestamp: Date.now() }, ...prev].slice(0, 20);
      localStorage.setItem('vocalii_notifications', JSON.stringify(next));
      return next;
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id);
      localStorage.setItem('vocalii_notifications', JSON.stringify(next));
      return next;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('vocalii_notifications');
  };

  // ─── Load all user data from Supabase ──────────────────────────────────────
  const loadUserData = async (uid: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const [
      { data: profile },
      { data: habits },
      { data: checkin },
      { data: completions },
      { data: reportsData },
      { data: eventsData },
      { data: habitCompletionsData },
      { data: confidenceHistory },
      { data: weeklyCheckinRow },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('habit_pairs').select('*').eq('user_id', uid).order('sort_order'),
      supabase.from('daily_checkins').select('*').eq('user_id', uid).eq('date', today).maybeSingle(),
      supabase.from('ritual_completions').select('ritual_id').eq('user_id', uid).eq('date', today),
      supabase.from('vocal_reports').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('events').select('*').eq('user_id', uid).order('date'),
      supabase.from('habit_completions').select('*').eq('user_id', uid).gte('date', sevenDaysAgoStr),
      supabase.from('daily_checkins').select('voice_confidence').eq('user_id', uid).not('voice_confidence', 'is', null).neq('date', today),
      supabase.from('weekly_checkins').select('id').eq('user_id', uid).eq('week_start', getReflectionWeekStart()).maybeSingle(),
    ]);

    setReflectionWeekStart(getReflectionWeekStart());
    setWeeklyCheckinDue(!weeklyCheckinRow);

    if (profile?.onboarding_complete) {
      setUserName(profile.first_name);
      setUserLastName(profile.last_name);
      setUserRole(profile.role || '');
      setExperienceLevel((profile.experience_level as ExperienceLevel | null) ?? null);
      setDesiredVoiceTraits(profile.desired_voice_traits ?? []);
      setVoiceStatement(profile.voice_statement ?? '');
      setGoals((profile.goals as Goal[] | null) ?? []);
      setVoiceBarrier((profile.voice_barrier as VoiceBarrier | null) ?? null);
      setBaselineScore(profile.baseline_score ?? null);
      setBaselineStabilityPct(profile.baseline_stability_pct ?? null);
      setBaselineResonanceScore(profile.baseline_resonance_score ?? null);
      setBaselineClarityPct(profile.baseline_clarity_pct ?? null);
      setBaselineLoudnessDb(profile.baseline_loudness_db ?? null);
      setBaselinePitchHz(profile.baseline_pitch_hz ?? null);
      setBaselinePitchRangeHz(profile.baseline_pitch_range_hz ?? null);
      setBaselineSetAt(profile.baseline_set_at ?? null);
      setUserHabits(habits?.map(h => ({ daily: h.daily_habit, vocal: h.vocal_habit })) ?? []);
      if (checkin) {
        setCheckInDone(true);
        setTodayVocalEffort(checkin.vocal_effort);
        setTodayVocalConfidence(checkin.voice_confidence ?? null);
        setTodayVoiceDemandLevel(checkin.voice_demand_level ?? null);
        setTodaySymptoms(checkin.symptoms ?? []);
        setSelectedRitualIds(checkin.selected_ritual_ids?.length ? checkin.selected_ritual_ids : null);
        setRitualInsight(checkin.ritual_insight || null);
      }
      setCompletedRitualIds(completions?.map(c => c.ritual_id) ?? []);
      setReports(reportsData?.map(mapReport) ?? []);
      setEvents(eventsData?.map(mapEvent) ?? []);
      setHabitCompletions(habitCompletionsData ?? []);
      if (confidenceHistory && confidenceHistory.length > 0) {
        const sum = confidenceHistory.reduce((acc, c) => acc + (c.voice_confidence ?? 0), 0);
        setBaselineConfidenceAvg(sum / confidenceHistory.length);
      }
      setOnboardingDone(true);
    } else if (profile) {
      // Signed up but didn't finish onboarding — pre-fill name for resume
      setPendingProfile({ firstName: profile.first_name, lastName: profile.last_name });
    }
    setAuthLoading(false);
  };

  const clearUserData = () => {
    setOnboardingDone(false);
    setUserName('');
    setUserLastName('');
    setUserRole('');
    setExperienceLevel(null);
    setDesiredVoiceTraits([]);
    setVoiceStatement('');
    setGoals([]);
    setVoiceBarrier(null);
    setWeeklyCheckinDue(false);
    setReflectionWeekStart('');
    setUserHabits([]);
    setHabitCompletions([]);
    setReports([]);
    setEvents([]);
    setCompletedRitualIds([]);
    setCheckInDone(false);
    setTodayVocalEffort(null);
    setTodayVocalConfidence(null);
    setTodayVoiceDemandLevel(null);
    setTodaySymptoms([]);
    setSelectedRitualIds(null);
    setRitualInsight(null);
    setRitualsLoading(false);
    setBaselineScore(null);
    setBaselineStabilityPct(null);
    setBaselineResonanceScore(null);
    setBaselineClarityPct(null);
    setBaselineLoudnessDb(null);
    setBaselinePitchHz(null);
    setBaselinePitchRangeHz(null);
    setBaselineConfidenceAvg(null);
    setPendingProfile(null);
  };

  // ─── Auth lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        loadUserData(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        setUserEmail(session.user.email ?? null);
        loadUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setUserEmail(null);
        clearUserData();
        setAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ─── Quick preview bypass (no account required) ─────────────────────────────
  const handleBypass = () => {
    setOnboardingDone(true);
  };

  // ─── Onboarding complete ────────────────────────────────────────────────────
  const handleOnboardingComplete = async (data: OnboardingData) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Quick-preview bypass — no persistence, just show the app
      setUserName(data.firstName);
      setUserLastName(data.lastName);
      setUserRole(data.role || '');
      setExperienceLevel(data.experienceLevel);
      setDesiredVoiceTraits(data.desiredVoiceTraits);
      setVoiceStatement(data.voiceStatement);
      setGoals(data.goals);
      setVoiceBarrier(data.voiceBarrier);
      setUserHabits(data.habitPairs);
      setOnboardingDone(true);
      return;
    }

    const uid = session.user.id;

    await supabase.from('profiles').upsert({
      id: uid,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role ?? null,
      experience_level: data.experienceLevel ?? null,
      goals: data.goals,
      symptoms: data.symptoms,
      desired_voice_traits: data.desiredVoiceTraits,
      voice_statement: data.voiceStatement || null,
      voice_barrier: data.voiceBarrier,
      voice_identity: data.voiceIdentity ?? null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    });

    await supabase.from('habit_pairs').delete().eq('user_id', uid);
    if (data.habitPairs.length > 0) {
      await supabase.from('habit_pairs').insert(
        data.habitPairs.map((pair, i) => ({
          user_id: uid,
          daily_habit: pair.daily,
          vocal_habit: pair.vocal,
          sort_order: i,
        }))
      );
    }

    if (data.baselineMetrics != null) {
      const m = data.baselineMetrics;
      await supabase.from('profiles').update({
        baseline_score: m.score,
        baseline_stability_pct: m.stabilityPct,
        baseline_resonance_score: m.resonanceScore,
        baseline_clarity_pct: m.clarityPct,
        baseline_loudness_db: m.loudnessDb,
        baseline_pitch_hz: m.pitchHz,
        baseline_pitch_range_hz: m.pitchRangeHz,
      }).eq('id', uid);
      setBaselineScore(m.score);
      setBaselineStabilityPct(m.stabilityPct);
      setBaselineResonanceScore(m.resonanceScore);
      setBaselineClarityPct(m.clarityPct);
      setBaselineLoudnessDb(m.loudnessDb);
      setBaselinePitchHz(m.pitchHz);
      setBaselinePitchRangeHz(m.pitchRangeHz);
    }

    setUserName(data.firstName);
    setUserLastName(data.lastName);
    setUserRole(data.role || '');
    setExperienceLevel(data.experienceLevel);
    setDesiredVoiceTraits(data.desiredVoiceTraits);
    setVoiceStatement(data.voiceStatement);
    setGoals(data.goals);
    setVoiceBarrier(data.voiceBarrier);
    setUserHabits(data.habitPairs);
    setOnboardingDone(true);
  };

  // ─── Profile edits ──────────────────────────────────────────────────────────
  const handleUpdateProfile = async (updates: ProfileUpdates) => {
    if (updates.firstName !== undefined) setUserName(updates.firstName);
    if (updates.lastName !== undefined) setUserLastName(updates.lastName);
    if (updates.role !== undefined) setUserRole(updates.role ?? '');
    if (updates.experienceLevel !== undefined) setExperienceLevel(updates.experienceLevel);
    if (updates.desiredVoiceTraits !== undefined) setDesiredVoiceTraits(updates.desiredVoiceTraits);
    if (updates.voiceStatement !== undefined) setVoiceStatement(updates.voiceStatement);
    if (updates.goals !== undefined) setGoals(updates.goals);
    if (updates.voiceBarrier !== undefined) setVoiceBarrier(updates.voiceBarrier);
    if (updates.habitPairs !== undefined) setUserHabits(updates.habitPairs);

    if (!userId) return;

    if (updates.habitPairs !== undefined) {
      await supabase.from('habit_pairs').delete().eq('user_id', userId);
      if (updates.habitPairs.length > 0) {
        await supabase.from('habit_pairs').insert(
          updates.habitPairs.map((pair, i) => ({
            user_id: userId,
            daily_habit: pair.daily,
            vocal_habit: pair.vocal,
            sort_order: i,
          }))
        );
      }
    }

    const profileFields: {
      first_name?: string;
      last_name?: string;
      role?: string | null;
      experience_level?: string | null;
      desired_voice_traits?: string[];
      voice_statement?: string | null;
      goals?: string[];
      voice_barrier?: string | null;
    } = {};
    if (updates.firstName !== undefined) profileFields.first_name = updates.firstName;
    if (updates.lastName !== undefined) profileFields.last_name = updates.lastName;
    if (updates.role !== undefined) profileFields.role = updates.role;
    if (updates.experienceLevel !== undefined) profileFields.experience_level = updates.experienceLevel;
    if (updates.desiredVoiceTraits !== undefined) profileFields.desired_voice_traits = updates.desiredVoiceTraits;
    if (updates.voiceStatement !== undefined) profileFields.voice_statement = updates.voiceStatement || null;
    if (updates.goals !== undefined) profileFields.goals = updates.goals;
    if (updates.voiceBarrier !== undefined) profileFields.voice_barrier = updates.voiceBarrier;

    if (Object.keys(profileFields).length > 0) {
      await supabase.from('profiles').update(profileFields).eq('id', userId);
    }
  };

  const handleChangePassword = async (newPassword: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? error.message : null;
  };

  // ─── Reports ────────────────────────────────────────────────────────────────
  const handleAddReport = async (report: Omit<VocalReport, 'id'>) => {
    if (!userId) return;
    const { data: row } = await supabase.from('vocal_reports').insert({
      user_id: userId,
      name: report.name ?? null,
      ritual_name: report.ritualName,
      category: report.category,
      date: report.date,
      duration: report.duration,
      fatigue_level: report.fatigueLevel,
      feelings: report.feelings,
      notes: report.notes,
      insight: report.insight,
      pitch_hz: report.pitchHz ?? null,
      pitch_range_hz: report.pitchRangeHz ?? null,
      resonance_score: report.resonanceScore ?? null,
      clarity_pct: report.clarityPct ?? null,
      loudness_db: report.loudnessDb ?? null,
      stability_pct: report.stabilityPct ?? null,
      is_favourite: report.favourite ?? false,
    }).select().single();

    if (row) {
      setReports(prev => [mapReport(row), ...prev]);
      addNotification('Voice analysis report saved');
    }
  };

  const handleDeleteReport = async (id: string) => {
    await supabase.from('vocal_reports').delete().eq('id', id);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleRenameReport = async (id: string, name: string) => {
    await supabase.from('vocal_reports').update({ name }).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, name } : r));
  };

  // ─── Upcoming events ────────────────────────────────────────────────────────
  const handleAddEvent = async (event: Omit<VocalEvent, 'id'>) => {
    if (!userId) return;
    const { data: row } = await supabase.from('events').insert({
      user_id: userId,
      title: event.title,
      date: event.date,
      time: event.time ?? null,
      location: event.location ?? null,
      prep_days_before: event.prepDaysBefore ?? null,
      tailored_ritual_ids: event.tailoredRitualIds ?? [],
      ai_insight: event.aiInsight ?? null,
      chat_transcript: event.chatTranscript ?? [],
    }).select().single();

    if (row) {
      setEvents(prev => [...prev, mapEvent(row)]);
      addNotification('Event created', `"${row.title}" was added to your upcoming events.`);
    }
  };

  const handleUpdateEvent = async (id: string, event: Omit<VocalEvent, 'id'>) => {
    await supabase.from('events').update({
      title: event.title,
      date: event.date,
      time: event.time ?? null,
      location: event.location ?? null,
    }).eq('id', id);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...event, id } : e));
  };

  const handleDeleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleSetBaseline = async (metrics: BaselineMetrics) => {
    const setAt = new Date().toISOString();
    if (userId) {
      await supabase.from('profiles').update({
        baseline_score: metrics.score,
        baseline_stability_pct: metrics.stabilityPct,
        baseline_resonance_score: metrics.resonanceScore,
        baseline_clarity_pct: metrics.clarityPct,
        baseline_loudness_db: metrics.loudnessDb,
        baseline_pitch_hz: metrics.pitchHz,
        baseline_pitch_range_hz: metrics.pitchRangeHz,
        baseline_set_at: setAt,
      }).eq('id', userId);
    }
    setBaselineScore(metrics.score);
    setBaselineStabilityPct(metrics.stabilityPct);
    setBaselineResonanceScore(metrics.resonanceScore);
    setBaselineClarityPct(metrics.clarityPct);
    setBaselineLoudnessDb(metrics.loudnessDb);
    setBaselinePitchHz(metrics.pitchHz);
    setBaselinePitchRangeHz(metrics.pitchRangeHz);
    setBaselineSetAt(setAt);
    addNotification('New baseline set');
  };

  const handleToggleFavourite = async (id: string) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    const newFav = !report.favourite;
    await supabase.from('vocal_reports').update({ is_favourite: newFav }).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, favourite: newFav } : r));
  };

  // ─── Daily check-in ─────────────────────────────────────────────────────────
  const handleCompleteCheckIn = async (vocalEffort: number, confidence: number, symptoms: string[], habitChecks: HabitCheckEntry[], demandLevel: number, notes: string, supportArea: string) => {
    const roundedEffort = Math.round(vocalEffort);
    const today = new Date().toISOString().slice(0, 10);

    if (userId) {
      await supabase.from('daily_checkins').upsert(
        { user_id: userId, date: today, vocal_effort: roundedEffort, voice_confidence: confidence, voice_demand_level: demandLevel, symptoms, notes, support_area: supportArea },
        { onConflict: 'user_id,date' }
      );

      if (habitChecks.length > 0) {
        await supabase.from('habit_completions').upsert(
          habitChecks.map(h => ({
            user_id: userId,
            date: today,
            daily_habit: h.daily,
            vocal_habit: h.vocal,
            completed: h.completed,
          })),
          { onConflict: 'user_id,date,daily_habit,vocal_habit' }
        );
      }
    }

    setCheckInDone(true);
    setTodayVocalEffort(roundedEffort);
    setTodayVocalConfidence(confidence);
    setTodayVoiceDemandLevel(demandLevel);
    setTodaySymptoms(symptoms);
    if (habitChecks.length > 0) {
      setHabitCompletions(prev => [
        ...prev.filter(c => !(c.date === today && habitChecks.some(h => h.daily === c.daily_habit && h.vocal === c.vocal_habit))),
        ...habitChecks.map(h => ({ date: today, daily_habit: h.daily, vocal_habit: h.vocal, completed: h.completed })),
      ]);
    }
    addNotification('Daily check-in complete', postCheckInTrigger(userId ?? 'preview', roundedEffort, symptoms).body);

    setRitualsLoading(true);
    // Enforce a minimum visible loading time so the "AI is building your routine" animation
    // never just flashes — the deterministic fallback path especially can resolve near-instantly.
    const minDelay = new Promise(resolve => setTimeout(resolve, 1400));
    const [selection] = await Promise.all([
      selectRituals(
        userId ?? 'preview',
        { role: userRole || null, experienceLevel, primaryGoal: goals[0] ?? null, voiceBarrier },
        { vocalEffort: roundedEffort, demandLevel, vocalConfidence: confidence, symptoms, supportArea, notes },
        activePrepEvent ? { tailoredRitualIds: activePrepEvent.tailoredRitualIds } : null,
      ),
      minDelay,
    ]);
    setRitualsLoading(false);

    if (selection.status === 'escalate') {
      setSelectedRitualIds([]);
      setRitualInsight(null);
      addNotification('Take it easy today', 'Your check-in suggests it may be worth checking in with a doctor or voice professional before practicing rituals today.');
    } else {
      const ritualIds = selection.rituals.map(r => r.id);
      setSelectedRitualIds(ritualIds);
      setRitualInsight(selection.insight);
      if (userId) {
        await supabase.from('daily_checkins').update({ selected_ritual_ids: ritualIds, ritual_insight: selection.insight ?? '' }).eq('user_id', userId).eq('date', today);
      }
    }
  };

  // Lets a user swap out a specific ritual in today's assigned routine (e.g. the straw
  // phonation ritual, if they don't have a straw) for another one, without waiting for a new
  // AI selection. Persists the same way the original selection did.
  const handleSwapRitual = async (oldRitualId: string, newRitualId: string) => {
    if (!selectedRitualIds) return;
    const updated = selectedRitualIds.map(id => (id === oldRitualId ? newRitualId : id));
    setSelectedRitualIds(updated);
    if (userId) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('daily_checkins').update({ selected_ritual_ids: updated }).eq('user_id', userId).eq('date', today);
    }
  };

  // Dev/testing helper — clears today's check-in so the flow can be re-run same-day
  const handleResetCheckIn = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (userId) {
      await supabase.from('daily_checkins').delete().eq('user_id', userId).eq('date', today);
    }
    setCheckInDone(false);
    setTodayVocalEffort(null);
    setTodayVocalConfidence(null);
    setTodayVoiceDemandLevel(null);
    setTodaySymptoms([]);
    setSelectedRitualIds(null);
    setRitualInsight(null);
    setRitualsLoading(false);
  };

  const handleResetWeeklyCheckIn = async () => {
    if (userId) {
      await supabase.from('weekly_checkins').delete().eq('user_id', userId).eq('week_start', reflectionWeekStart);
    }
    setWeeklyCheckinDue(true);
  };

  // ─── Ritual completions ─────────────────────────────────────────────────────
  const handleCompleteRitual = async (ritualId: string, feelingRating: number | null, difficultyRating: number | null) => {
    if (completedRitualIds.includes(ritualId)) return;
    const today = new Date().toISOString().slice(0, 10);

    if (userId) {
      await supabase.from('ritual_completions').upsert(
        { user_id: userId, date: today, ritual_id: ritualId, feeling_rating: feelingRating, difficulty_rating: difficultyRating },
        { onConflict: 'user_id,date,ritual_id' }
      );
    }

    setCompletedRitualIds(prev => [...prev, ritualId]);
  };

  const handleRestartRoutine = async () => {
    if (userId) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('ritual_completions').delete().eq('user_id', userId).eq('date', today);
    }
    setCompletedRitualIds([]);
  };

  const activePrepEvent = events
    .filter((e): e is VocalEvent & { prepDaysBefore: number; tailoredRitualIds: string[] } =>
      !!e.prepDaysBefore && !!e.tailoredRitualIds?.length)
    .filter(e => {
      const eventDate = new Date(e.date);
      const prepStart = new Date(e.date);
      prepStart.setDate(prepStart.getDate() - e.prepDaysBefore);
      const today = new Date();
      return today >= prepStart && today <= eventDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  // No default ritual list anymore — rituals are only assigned once selectRituals runs, right
  // after today's check-in (or from an active prep event's tailored plan, which always wins).
  const dailyRitualIds = activePrepEvent ? activePrepEvent.tailoredRitualIds : (selectedRitualIds ?? []);

  const activePrepEventSummary = activePrepEvent
    ? {
        title: activePrepEvent.title,
        daysLeft: Math.max(0, Math.ceil((new Date(activePrepEvent.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
      }
    : null;

  useEffect(() => {
    if (!activePrepEvent) return;
    const key = 'vocalii_prep_notified_event_id';
    if (localStorage.getItem(key) === activePrepEvent.id) return;
    localStorage.setItem(key, activePrepEvent.id);
    addNotification('Preparation mode started', `You're now in prep mode for "${activePrepEvent.title}" — your daily rituals have been tailored for it.`);
  }, [activePrepEvent?.id]);

  const dailyRituals = dailyRitualIds
    .map(id => EXERCISE_RITUALS.find(r => r.id === id))
    .filter(Boolean) as Ritual[];

  // ─── Old travel-app destination/theme state (unchanged) ─────────────────────
  const [activeDestination, setActiveDestination] = useState<Destination>(DESTINATIONS[0]);
  const [activeSubTab, setActiveSubTab] = useState<'Overview' | 'Hotels' | 'Itinerary' | 'Flights'>('Overview');
  const [activeAttraction, setActiveAttraction] = useState<Attraction>(DESTINATIONS[0].attractions[0]);

  const currentTheme = DESTINATION_THEMES[activeDestination.id] || DESTINATION_THEMES.santorini;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-accent', currentTheme.color);
    root.style.setProperty('--primary-accent-glow', currentTheme.glowColor);
    root.style.setProperty('--primary-accent-glow-low', currentTheme.glowColorLow);
    root.style.setProperty('--primary-accent-muted', currentTheme.mutedColor);
  }, [currentTheme]);

  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [favoritesList, setFavoritesList] = useState<string[]>(['santorini']);
  const [currentView, setCurrentView] = useState<'home' | 'rituals' | 'reports' | 'weekly-report' | 'weekly-checkin' | 'profile'>('home');
  const [showWeeklyReportLoading, setShowWeeklyReportLoading] = useState(false);
  const [autoStartRituals, setAutoStartRituals] = useState(false);

  useEffect(() => {
    if (activeDestination) setActiveAttraction(activeDestination.attractions[0]);
  }, [activeDestination]);

  useEffect(() => {
    if (activeSubTab === 'Hotels') {
      const hotelNode = activeDestination.attractions.find(a => a.type === 'hotel');
      if (hotelNode) setActiveAttraction(hotelNode);
    } else if (activeSubTab === 'Overview') {
      const sightNode = activeDestination.attractions.find(a => a.type === 'sight');
      if (sightNode) setActiveAttraction(sightNode);
    }
  }, [activeSubTab, activeDestination]);

  const handleAutoSuggest = (type: 'Hotel options' | 'Itinerary' | 'Things to do') => {
    let queryText = '';
    if (type === 'Hotel options') {
      setActiveSubTab('Hotels');
      queryText = `Show me the most spectacular hotel stays and luxury reviews in ${activeDestination.name}, ${activeDestination.country}.`;
    } else if (type === 'Itinerary') {
      setActiveSubTab('Itinerary');
      queryText = `Draft a premium 3-day itinerary for ${activeDestination.name}.`;
    } else {
      setActiveSubTab('Overview');
      queryText = `What are the must-visit attractions in ${activeDestination.name}?`;
    }
    const inputEl = document.querySelector('#assistant-card input') as HTMLInputElement;
    if (inputEl) { inputEl.value = queryText; inputEl.focus(); }
  };

  const handleToggleFavorite = () => {
    const dId = activeDestination.id;
    setFavoritesList(prev =>
      prev.includes(dId) ? prev.filter(id => id !== dId) : [...prev, dId]
    );
  };

  const clearChatHistory = () => { setMessages([]); };
  const isCurrentDestinationFavorited = favoritesList.includes(activeDestination.id);

  // ─── Render gates ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0e11] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#17A9C9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboardingDone) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onBypass={handleBypass}
        skipAuth={!!userId}
        initialData={pendingProfile ?? undefined}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0d0e11] text-zinc-100 transition-all duration-[800ms] pb-16 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(ellipse at top, ${currentTheme.gradientFrom} 0%, #0d0e11 65%, #050608 100%)`
      }}
    >

      {/* Ambient glows */}
      <div
        className="absolute top-0 right-10 w-[700px] h-[500px] rounded-full blur-[140px] pointer-events-none transition-all duration-[800ms]"
        style={{ background: `linear-gradient(180deg, ${currentTheme.glowBg} 0%, transparent 100%)` }}
      />
      <div
        className="absolute top-[20%] left-10 w-[600px] h-[600px] rounded-full blur-[130px] pointer-events-none transition-all duration-[800ms]"
        style={{ background: `radial-gradient(circle, ${currentTheme.color}0a 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-[20%] right-[10%] w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none transition-all duration-[800ms]"
        style={{ background: `radial-gradient(circle, ${currentTheme.mutedColor}06 0%, transparent 75%)` }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none transition-all duration-[800ms]"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${currentTheme.color}15 50%, transparent 100%)` }}
      />

      <Header
        destinations={DESTINATIONS}
        activeDestination={activeDestination}
        setActiveDestination={setActiveDestination}
        onNewChat={() => {
          setMessages([]);
          const inputEl = document.querySelector('#assistant-card input') as HTMLInputElement;
          if (inputEl) inputEl.value = '';
        }}
        onOpenInfo={() => setInfoModalOpen(true)}
        activeTab={activeSubTab}
        setActiveTab={(tab) => {
          if (['Overview', 'Hotels', 'Itinerary', 'Flights'].includes(tab)) {
            setActiveSubTab(tab as 'Overview' | 'Hotels' | 'Itinerary' | 'Flights');
          } else {
            setActiveSubTab('Overview');
          }
        }}
        onClearHistory={clearChatHistory}
        onOpenFavorites={() => setFavoritesModalOpen(true)}
        currentView={currentView === 'weekly-report' || currentView === 'weekly-checkin' || currentView === 'profile' ? 'home' : currentView}
        setCurrentView={(view) => setCurrentView(view)}
        notifications={notifications}
        onClearNotifications={clearNotifications}
        onDismissNotification={dismissNotification}
        onSignOut={handleSignOut}
        onOpenProfile={() => setCurrentView('profile')}
      />

      {currentView === 'weekly-report' && (
        <WeeklyReportPage
          onBack={() => setCurrentView('home')}
          habitPairs={userHabits}
          habitCompletions={habitCompletions}
          userId={userId}
          goal={goals[0] ?? null}
          dailyRitualIds={dailyRitualIds}
          onResetWeeklyCheckIn={async () => {
            await handleResetWeeklyCheckIn();
            setCurrentView('weekly-checkin');
          }}
        />
      )}

      {currentView === 'weekly-checkin' && (
        <WeeklyCheckInPage
          onBack={() => setCurrentView('home')}
          userId={userId}
          goal={goals[0] ?? null}
          trait={desiredVoiceTraits[0] ?? null}
          weekStart={reflectionWeekStart}
          onSubmitted={() => {
            setWeeklyCheckinDue(false);
            setCurrentView('weekly-report');
            setShowWeeklyReportLoading(true);
          }}
        />
      )}

      <AnimatePresence>
        {showWeeklyReportLoading && (
          <WeeklyReportLoadingScreen onDone={() => setShowWeeklyReportLoading(false)} />
        )}
      </AnimatePresence>

      {currentView === 'profile' && (
        <ProfilePage
          onBack={() => setCurrentView('home')}
          firstName={userName}
          lastName={userLastName}
          email={userEmail}
          role={(userRole || null) as Role | null}
          experienceLevel={experienceLevel}
          desiredVoiceTraits={desiredVoiceTraits}
          voiceStatement={voiceStatement}
          goals={goals}
          voiceBarrier={voiceBarrier}
          habitPairs={userHabits}
          onSave={handleUpdateProfile}
          onChangePassword={handleChangePassword}
        />
      )}

      <div className={`pt-[88px] max-w-7xl mx-auto transition-all duration-300 px-6 md:px-12 flex flex-col gap-6 ${currentView === 'weekly-report' || currentView === 'weekly-checkin' || currentView === 'profile' ? 'hidden' : ''}`}>

        {currentView === 'rituals' ? (
          <RitualsPage
            dailyRitualIds={dailyRitualIds}
            activePrepEvent={activePrepEventSummary}
            completedRitualIds={completedRitualIds}
            onCompleteRitual={handleCompleteRitual}
            onRestartRoutine={handleRestartRoutine}
            checkInDone={checkInDone}
            ritualsLoading={ritualsLoading}
            ritualInsight={ritualInsight}
            habitPairs={userHabits}
            onCompleteCheckIn={handleCompleteCheckIn}
            onResetCheckIn={handleResetCheckIn}
            onSwapRitual={handleSwapRitual}
            autoStart={autoStartRituals}
            onAutoStartConsumed={() => setAutoStartRituals(false)}
          />
        ) : currentView === 'reports' ? (
          <ReportsPage
            reports={reports}
            onAddReport={handleAddReport}
            onDeleteReport={handleDeleteReport}
            onRenameReport={handleRenameReport}
            onToggleFavourite={handleToggleFavourite}
            onSetBaseline={handleSetBaseline}
            baseline={{
              pitchHz: baselinePitchHz,
              pitchRangeHz: baselinePitchRangeHz,
              resonanceScore: baselineResonanceScore,
              clarityPct: baselineClarityPct,
              loudnessDb: baselineLoudnessDb,
              stabilityPct: baselineStabilityPct,
              setAt: baselineSetAt,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">

            {/* Left 8 columns */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              <HeroSection
                destination={activeDestination}
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                isFavorited={isCurrentDestinationFavorited}
                onToggleFavorite={handleToggleFavorite}
                onNavigateWeeklyReport={() => setCurrentView('weekly-report')}
                userName={userName}
                userRole={userRole}
                desiredVoiceTraits={desiredVoiceTraits}
                voiceStatement={voiceStatement}
              />

              <div className="flex flex-col gap-4">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 px-1">Performance Statistics</h3>
                <InteractiveMap
                  destination={activeDestination}
                  activeAttraction={activeAttraction}
                  setActiveAttraction={setActiveAttraction}
                  vocalData={{
                    effortScore: todayVocalEffort,
                    demandLevel: todayVoiceDemandLevel,
                    checkInDone,
                    symptoms: todaySymptoms,
                  }}
                  dailyRitualIds={dailyRitualIds}
                  completedRitualIds={completedRitualIds}
                  isPrepActive={!!activePrepEvent}
                  onNavigateRituals={() => { setAutoStartRituals(true); setCurrentView('rituals'); }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <WeatherWidget destination={activeDestination} confidence={todayVocalConfidence} baselineConfidence={baselineConfidenceAvg} />
                  <GoalProgressCard
                    userId={userId}
                    goal={goals[0] ?? null}
                    dailyRitualIds={dailyRitualIds}
                    habitPairsCount={userHabits.length}
                  />
                </div>
                <DashboardConsistencyChart userId={userId} dailyRitualIds={dailyRitualIds} />
              </div>
            </div>

            {/* Right 4 columns */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:pt-[12px]">
              <div className="flex flex-col gap-2.5">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 px-1 pt-1">Your Habits</h3>
                <div className="h-auto">
                  <HabitCard habits={userHabits} onSave={(pairs) => handleUpdateProfile({ habitPairs: pairs })} />
                </div>
              </div>

              <button
                onClick={() => setCurrentView(weeklyCheckinDue ? 'weekly-checkin' : 'weekly-report')}
                className="w-full text-left group cursor-pointer"
              >
                <motion.div
                  className="relative overflow-hidden rounded-[24px] px-5 py-4 border transition-colors duration-300 group-hover:border-[#17A9C9]/40"
                  style={weeklyCheckinDue ? {
                    background: 'linear-gradient(135deg, rgba(23,169,201,0.16) 0%, rgba(23,169,201,0.05) 100%)',
                    borderColor: 'rgba(33,232,255,0.35)',
                  } : {
                    background: 'linear-gradient(135deg, rgba(23,169,201,0.07) 0%, rgba(23,169,201,0.02) 100%)',
                    borderColor: 'rgba(33,232,255,0.15)',
                    boxShadow: '0 0 28px rgba(23,169,201,0.05)',
                  }}
                  animate={weeklyCheckinDue ? {
                    y: [0, -1.5, 0],
                    boxShadow: [
                      '0 0 20px rgba(33,232,255,0.18)',
                      '0 0 36px rgba(33,232,255,0.32)',
                      '0 0 20px rgba(33,232,255,0.18)',
                    ],
                  } : undefined}
                  transition={weeklyCheckinDue ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : undefined}
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent" style={{ background: `linear-gradient(90deg, transparent, rgba(33,232,255,${weeklyCheckinDue ? 0.4 : 0.15}), transparent)` }} />
                  <div className="flex items-center justify-between">
                    {weeklyCheckinDue ? (
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-[#21e8ff]/60 mb-1">Due this week</p>
                        <h4 className="text-[13px] font-medium text-zinc-200 group-hover:text-white transition-colors duration-200">Weekly Check-In</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5">A few quick reflections on your voice</p>
                      </div>
                    ) : (
                      <div>
                        <WeeklyReportSummary userId={userId} dailyRitualIds={dailyRitualIds} />
                      </div>
                    )}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105"
                      style={{ background: 'rgba(33,232,255,0.1)', border: '1px solid rgba(33,232,255,0.2)' }}
                    >
                      <ArrowRight className="w-4 h-4 text-[#21e8ff]" />
                    </div>
                  </div>
                </motion.div>
              </button>

              <UpcomingEventsCard
                events={events}
                onAddEvent={handleAddEvent}
                onUpdateEvent={handleUpdateEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {infoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-md w-full shadow-2xl relative font-sans">
            <button onClick={() => setInfoModalOpen(false)} className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white mb-4">
              <div className="w-8 h-8 rounded-full bg-[#eefc4c] flex items-center justify-center text-zinc-950">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-lg font-black tracking-tight">About Vocalii</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed mb-4">
              Your Voice Intelligence Coach — build healthy vocal habits, track your daily effort, and perform at your best every day.
            </p>
            <button onClick={() => setInfoModalOpen(false)} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors">
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {favoritesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative font-sans">
            <button onClick={() => setFavoritesModalOpen(false)} className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white mb-4">
              <Bookmark className="w-5 h-5 text-rose-500 fill-current" />
              <h3 className="text-lg font-black tracking-tight">Saves & Favorites ({favoritesList.length})</h3>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {favoritesList.length === 0 ? (
                <span className="text-xs text-zinc-400 text-center py-6">Your bookmark list is empty.</span>
              ) : (
                favoritesList.map(id => {
                  const place = DESTINATIONS.find(d => d.id === id);
                  if (!place) return null;
                  return (
                    <div key={id} onClick={() => { setActiveDestination(place); setFavoritesModalOpen(false); }} className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors">
                      <img src={place.imageUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{place.name}</span>
                        <span className="text-[10px] text-zinc-400">{place.country}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button onClick={() => setFavoritesModalOpen(false)} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors">
              Done
            </button>
          </div>
        </div>
      )}

      {settingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-[32px] p-6 max-w-sm w-full shadow-2xl relative font-sans">
            <button onClick={() => setSettingsModalOpen(false)} className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black tracking-tight mb-4">Settings</h3>
            <button onClick={() => setSettingsModalOpen(false)} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
