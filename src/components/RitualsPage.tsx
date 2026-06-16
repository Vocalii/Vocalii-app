import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Trophy, 
  Volume2, 
  Clock, 
  Activity, 
  TrendingUp, 
  Flame, 
  Compass, 
  HeartCrack,
  Droplet,
  ArrowRight,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { EXERCISE_RITUALS } from '../ritualsData';
import { Ritual, TodoItem } from '../types';

interface RitualsPageProps {
  primaryAccent: string;
  todos: TodoItem[];
  onToggleTodo: (id: string) => void;
}

export default function RitualsPage({ primaryAccent, todos, onToggleTodo }: RitualsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const completedCount = todos.filter(todo => todo.completed).length;
  
  // Workspace player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60s practice cycle
  const [activeStep, setActiveStep] = useState(0);
  const [pitchValue, setPitchValue] = useState(220); // standard low A note pitch (Hz) key
  const [showCompletedOverlay, setShowCompletedOverlay] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Exhale' | 'Hum / Hold'>('Inhale');
  const [breathProgress, setBreathProgress] = useState(0); // 0 to 100 for circle sizing

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['All', 'Warm-up', 'Calibrate', 'Resonance', 'Relief', 'Hydration'];

  // Match ritual to list to-do based on category
  const getMatchingTodo = (ritual: Ritual | null): TodoItem | undefined => {
    if (!ritual) return undefined;
    return todos.find(todo => todo.category.toLowerCase() === ritual.category.toLowerCase());
  };

  const isCompletedInTodoList = (ritual: Ritual): boolean => {
    const matchedTodo = getMatchingTodo(ritual);
    return matchedTodo ? matchedTodo.completed : false;
  };

  // Filter rituals
  const filteredRituals = EXERCISE_RITUALS.filter(ritual => {
    const matchesCategory = selectedCategory === 'All' || ritual.category === selectedCategory;
    const matchesSearch = ritual.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ritual.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ritual.primaryFocus.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle workspace exercise activation
  const startRitual = (ritual: Ritual) => {
    setSelectedRitual(ritual);
    setActiveStep(0);
    setIsPlaying(false);
    setTimeLeft(60);
    setShowCompletedOverlay(false);
    setBreathingPhase('Inhale');
    setBreathProgress(10);
  };

  const getFirstIncompleteRitual = (): Ritual | null => {
    const incomplete = EXERCISE_RITUALS.find(ritual => !isCompletedInTodoList(ritual));
    return incomplete || EXERCISE_RITUALS[0] || null;
  };

  const handleStartDailyRituals = () => {
    const nextRitual = getFirstIncompleteRitual();
    if (nextRitual) {
      startRitual(nextRitual);
    }
  };

  // Timer loop
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleCompleteRitual();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, timeLeft]);

  // Breathing Guide Loop
  useEffect(() => {
    if (isPlaying) {
      let step = 0;
      breathIntervalRef.current = setInterval(() => {
        step += 2;
        // Inhale cyclic animation (first 4 seconds)
        const subCycle = step % 12; // 12 second total breath rhythm
        if (subCycle < 4) {
          setBreathingPhase('Inhale');
          setBreathProgress(20 + (subCycle / 4) * 80); // expands
        } else if (subCycle < 8) {
          setBreathingPhase('Hum / Hold');
          setBreathProgress(100); // hold maximum resonant expansion
        } else {
          setBreathingPhase('Exhale');
          setBreathProgress(100 - ((subCycle - 8) / 4) * 80); // contracts gently
        }
      }, 200);
    } else {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      setBreathProgress(35);
    }

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [isPlaying]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const resetPractice = () => {
    setIsPlaying(false);
    setTimeLeft(60);
    setActiveStep(0);
    setBreathingPhase('Inhale');
    setBreathProgress(35);
  };

  const handleCompleteRitual = () => {
    setIsPlaying(false);
    setShowCompletedOverlay(true);
    
    // Find the matching todo in the grid list and mark it complete if it isn't already
    const matchedTodo = getMatchingTodo(selectedRitual);
    if (matchedTodo && !matchedTodo.completed) {
      onToggleTodo(matchedTodo.id);
    }
  };

  const formattedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calendar states/data
  const dateObj = new Date(); // Dynamic date
  const currentMonthName = dateObj.toLocaleString('default', { month: 'long' });
  const currentYearNum = dateObj.getFullYear();
  const currentDayNum = dateObj.getDate();

  // Days in calendar
  const startDayOfWeek = new Date(currentYearNum, dateObj.getMonth(), 1).getDay(); // first day of month (0-6)
  const totalDaysInMonth = new Date(currentYearNum, dateObj.getMonth() + 1, 0).getDate();
  
  // Array of days
  const calendarDays = [];
  for (let s = 0; s < startDayOfWeek; s++) {
    calendarDays.push(null); // padding
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarDays.push(d);
  }

  // Generate a list of completed days in the current month before today.
  const getMockCompletedDays = () => {
    const currentDay = dateObj.getDate();
    const days = [3, 5, 9, 12, 14].filter(d => d < currentDay);
    if (days.length === 0) {
      return [1, 2].filter(d => d < currentDay);
    }
    return days;
  };
  
  const completedDaysList = getMockCompletedDays();

  return (
    <div className="w-full pb-10" id="rituals-page-container">
      {/* Editorial Page Welcome Banner */}
      <div className="mb-8 mt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white mb-2 font-display">
            The Medicine Room
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            Select high-fidelity clinical larynx routines, diaphragmatic pacing loops, and mucosal moisture regimens designed to neutralize vocal stress and prevent micro-wear.
          </p>
        </div>
      </div>

      {/* Daily Rituals Progress Banner */}
      {!selectedRitual && (
        <div className="mb-8 bg-gradient-to-r from-[#17A9C9]/15 via-[#17A9C9]/8 to-[#12141a]/95 border border-[#17A9C9]/35 rounded-[30px] p-5.5 relative overflow-hidden group select-none shadow-[0_0_25px_rgba(23,169,201,0.06)] transition-all duration-300 hover:border-[#17A9C9]/45">
          {/* Subtle top/sides bright ambient glow */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#21e8ff]/35 to-transparent" />
          <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-[#21e8ff]/20 to-transparent" />
          
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-[#17A9C9]/10 rounded-full blur-[40px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11.5 h-11.5 rounded-2xl bg-[#17A9C9]/15 border border-[#17A9C9]/40 flex items-center justify-center text-[#21e8ff] flex-shrink-0 shadow-[0_0_15px_rgba(23,169,201,0.2)] mt-0.5">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[13px] font-semibold text-white tracking-wide mb-1 flex items-center flex-wrap gap-2.5">
                  Daily Voice Prescription Active
                </h3>
                <p className="text-[11.5px] text-zinc-400 max-w-2xl leading-relaxed mb-3">
                  Your larynx requires targeted warm-up calibrations, hydration cycle lubrication, and deep pharyngeal expansion to protect delicate mucosal tissues during physical demand.
                </p>
                {/* Active/Start Daily Ritual Button */}
                <button
                  onClick={handleStartDailyRituals}
                  className="relative overflow-hidden group/btn bg-[#131722]/50 hover:bg-[#1b2130]/75 border border-[#17A9C9]/30 hover:border-[#21e8ff]/60 text-[#21e8ff] hover:text-white px-5 py-2.5 text-[10px] font-mono tracking-widest uppercase rounded-xl flex items-center gap-2.5 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.02)] hover:shadow-[0_0_15px_rgba(33,232,255,0.15)] cursor-pointer w-fit"
                >
                  {/* Premium ambient shining overlay */}
                  <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -skew-x-12 translate-x-[-150%] group-hover/btn:translate-x-[250%] transition-transform duration-[1200ms] ease-in-out" />
                  
                  <Play className="w-3 h-3 fill-current opacity-80 group-hover/btn:scale-110 transition-transform duration-300" />
                  <span className="font-semibold tracking-widest text-[#21e8ff] group-hover/btn:text-white transition-colors duration-300">
                    {completedCount === 0 ? 'Start Daily Rituals' : completedCount === todos.length ? 'Restart Routine' : 'Continue Routine'}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-4.5 w-full md:w-auto md:border-l border-zinc-800/80 md:pl-6.5 flex-shrink-0 justify-between md:justify-start">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
                  Today's Routine
                </span>
                <span className="text-[18px] font-light text-zinc-400 font-mono leading-none">
                  <span className="text-[#21e8ff] font-medium">{completedCount}</span>
                  <span className="text-zinc-700 mx-1">/</span>
                  <span>{todos.length}</span>
                </span>
              </div>
              
              {/* Circular progress wheel badge */}
              <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    className="stroke-zinc-900/80"
                    strokeWidth="3"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    className="stroke-[#21e8ff] transition-all duration-500"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - (completedCount / Math.max(todos.length, 1)))}`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-[9px] font-mono font-medium text-zinc-300">
                  {Math.round((completedCount / Math.max(todos.length, 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ritual Library section header and filters/search inline */}
      {!selectedRitual && (
        <div className="mt-8 mb-4">
          <h2 className="text-base font-light tracking-tight text-white mb-3 font-display">
            Ritual Library
          </h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-zinc-900/40 pb-5">
            {/* Category filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs rounded-xl transition-all duration-300 border cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-[#17A9C9]/15 border-[#17A9C9]/45 text-[#21e8ff] font-semibold tracking-wide shadow-[0_0_12px_rgba(23,169,201,0.08)]' 
                      : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Bar Input (moved inline) */}
            <div className="w-full md:w-72 relative">
              <input 
                type="text" 
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-4 pr-10 rounded-2xl bg-[#13151c]/70 border border-zinc-800 focus:border-[#17A9C9]/50 focus:outline-none text-xs text-white"
              />
              <div className="absolute right-3.5 top-3.5 text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedRitual ? (
        /* ================= LIBRARY VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRituals.length === 0 ? (
            <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/20">
              <span className="text-zinc-500 text-sm block mb-1">No rituals found matching your query</span>
              <button 
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                className="text-xs text-[#21e8ff] hover:underline"
              >
                Reset search criteria
              </button>
            </div>
          ) : (
            filteredRituals.map((ritual) => {
              const matchedTodo = getMatchingTodo(ritual);
              const isDone = isCompletedInTodoList(ritual);
              
              // Define colored dots for each category
              let dotColor = "bg-[#21e8ff]";
              if (ritual.category === 'Warm-up') {
                dotColor = "bg-amber-400";
              } else if (ritual.category === 'Hydration') {
                dotColor = "bg-blue-400";
              } else if (ritual.category === 'Relief') {
                dotColor = "bg-rose-450";
              } else if (ritual.category === 'Resonance') {
                dotColor = "bg-violet-400";
              } else if (ritual.category === 'Calibrate') {
                dotColor = "bg-cyan-400";
              }
              const categoryTextCol = 'text-zinc-400';

              // Custom color themes mapped dynamically based on categorization tags
              let itemTheme = {
                wrapperClass: "bg-gradient-to-b from-[#17A9C9]/15 to-[#12141a]/90 hover:from-[#17A9C9]/22 hover:to-[#12141a]/95 border border-[#17A9C9]/30 hover:border-[#17A9C9]/50 shadow-[0_0_20px_rgba(23,169,201,0.06)] hover:shadow-[0_0_30px_rgba(23,169,201,0.12)]",
                lightEdgeClass: "via-[#17A9C9]/55",
                orbClass: "bg-[#17A9C9]/12 group-hover:bg-[#17A9C9]/25",
                textAndActionColor: "text-[#21e8ff]"
              };

              if (ritual.category === 'Warm-up') {
                itemTheme = {
                  wrapperClass: "bg-gradient-to-b from-amber-500/12 to-[#12141a]/90 hover:from-amber-500/20 hover:to-[#12141a]/95 border border-amber-500/25 hover:border-amber-500/45 shadow-[0_0_20px_rgba(245,158,11,0.04)] hover:shadow-[0_0_30px_rgba(245,158,11,0.10)]",
                  lightEdgeClass: "via-amber-400/45",
                  orbClass: "bg-amber-500/8 group-hover:bg-amber-500/18",
                  textAndActionColor: "text-amber-400"
                };
              } else if (ritual.category === 'Hydration') {
                itemTheme = {
                  wrapperClass: "bg-gradient-to-b from-blue-500/12 to-[#12141a]/90 hover:from-blue-500/20 hover:to-[#12141a]/95 border border-blue-500/25 hover:border-blue-500/45 shadow-[0_0_20px_rgba(59,130,246,0.04)] hover:shadow-[0_0_30px_rgba(59,130,246,0.10)]",
                  lightEdgeClass: "via-blue-400/45",
                  orbClass: "bg-blue-500/8 group-hover:bg-blue-500/18",
                  textAndActionColor: "text-blue-400"
                };
              } else if (ritual.category === 'Relief') {
                itemTheme = {
                  wrapperClass: "bg-gradient-to-b from-rose-500/12 to-[#12141a]/90 hover:from-rose-500/20 hover:to-[#12141a]/95 border border-rose-500/25 hover:border-rose-500/45 shadow-[0_0_20px_rgba(244,63,94,0.04)] hover:shadow-[0_0_30px_rgba(244,63,94,0.10)]",
                  lightEdgeClass: "via-rose-400/45",
                  orbClass: "bg-rose-500/8 group-hover:bg-rose-500/18",
                  textAndActionColor: "text-rose-400"
                };
              } else if (ritual.category === 'Resonance') {
                itemTheme = {
                  wrapperClass: "bg-gradient-to-b from-violet-500/12 to-[#12141a]/90 hover:from-violet-500/20 hover:to-[#12141a]/95 border border-violet-500/25 hover:border-violet-500/45 shadow-[0_0_20px_rgba(139,92,246,0.04)] hover:shadow-[0_0_30px_rgba(139,92,246,0.10)]",
                  lightEdgeClass: "via-violet-400/45",
                  orbClass: "bg-violet-500/8 group-hover:bg-violet-500/18",
                  textAndActionColor: "text-violet-400"
                };
              } else if (ritual.category === 'Calibrate') {
                itemTheme = {
                  wrapperClass: "bg-gradient-to-b from-cyan-500/12 to-[#12141a]/90 hover:from-cyan-500/20 hover:to-[#12141a]/95 border border-cyan-500/25 hover:border-cyan-500/45 shadow-[0_0_20px_rgba(6,182,212,0.04)] hover:shadow-[0_0_30px_rgba(6,182,212,0.10)]",
                  lightEdgeClass: "via-cyan-400/45",
                  orbClass: "bg-cyan-500/8 group-hover:bg-cyan-500/18",
                  textAndActionColor: "text-cyan-400"
                };
              }

              return (
                <div
                  key={ritual.id}
                  onClick={() => startRitual(ritual)}
                  className={`${itemTheme.wrapperClass} rounded-[28px] p-5.5 transition-all duration-500 flex flex-col justify-between group cursor-pointer relative overflow-hidden`}
                >
                  {/* Subtle top light edge */}
                  <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent ${itemTheme.lightEdgeClass} to-transparent z-10`} />
                  
                  {/* Background animations / orbs */}
                  <div className={`absolute -bottom-12 left-1/2 -translate-x-1/2 w-56 h-20 ${itemTheme.orbClass} rounded-full blur-[35px] pointer-events-none transition-all duration-500 group-hover:scale-110 z-0`} />
                  
                  <div className="relative z-10">
                    {/* Header line: Category + duration info with a color-coded dot */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono tracking-wide text-zinc-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {ritual.category}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{ritual.duration}</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors mb-2 tracking-wide">
                      {ritual.name}
                    </h3>
                    
                    <p className="text-[11.5px] text-zinc-500 leading-relaxed mb-6">
                      {ritual.description}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-zinc-900/60 pt-4 flex items-center justify-between mt-auto relative z-10">
                    <div />
                    <span className={`transition-transform duration-300 group-hover:translate-x-1.5 ${itemTheme.textAndActionColor}`}>
                      <ArrowRight className="w-6 h-6 stroke-[2]" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= ACTIVE PRACTICE WORKSPACE PLAYER ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Back button and Left details panel (7 Columns) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <button
              onClick={() => setSelectedRitual(null)}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer self-start bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 px-3 py-1.5 rounded-xl mb-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </button>

            <div className="bg-[#12141a]/95 border border-zinc-800/80 rounded-[28px] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/25 to-transparent" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-[#17A9C9]/10 text-[#21e8ff] border border-[#17A9C9]/15">
                  {selectedRitual.category} Ritual
                </span>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                  Target: {selectedRitual.difficulty}
                </span>
              </div>

              <h1 className="text-xl font-medium text-zinc-100 mb-2 leading-tight">
                {selectedRitual.name}
              </h1>
              
              <p className="text-xs text-zinc-400 leading-relaxed mb-6 border-b border-zinc-900 pb-4">
                {selectedRitual.description}
              </p>

              {/* Step By Step Progress list */}
              <div className="mb-6">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-450 mb-3 block">
                  Instruction Workbook ({selectedRitual.instructionSteps.length} Steps)
                </h3>
                <div className="flex flex-col gap-2.5">
                  {selectedRitual.instructionSteps.map((stepText, idx) => {
                    const isStepActive = idx === activeStep;
                    const isStepPassed = idx < activeStep;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveStep(idx)}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex gap-3 ${
                          isStepActive 
                            ? 'bg-[#17A9C9]/8 border-[#17A9C9]/35 text-white' 
                            : isStepPassed 
                              ? 'bg-zinc-950/20 border-zinc-900/70 text-zinc-500' 
                              : 'bg-zinc-900/20 border-transparent hover:border-zinc-800/40 text-zinc-400'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10.5px] font-mono font-bold flex-shrink-0 ${
                          isStepActive 
                            ? 'bg-[#21e8ff] text-zinc-950 shadow-[0_0_8px_#21e8ff]' 
                            : isStepPassed 
                              ? 'bg-zinc-800 text-zinc-500' 
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {isStepPassed ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                        </div>
                        <div className="flex-1 text-[11.5px] leading-relaxed select-text">
                          {stepText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scientific Benefits Section */}
              <div className="bg-zinc-900/30 border border-zinc-850/50 p-4.5 rounded-2xl">
                <h4 className="text-[10.5px] font-mono text-zinc-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#21e8ff]" />
                  Acoustic & Musculoskeletal Benefits
                </h4>
                <ul className="flex flex-col gap-2 pl-1.5">
                  {selectedRitual.benefits.map((benefit, bIdx) => (
                    <li key={bIdx} className="text-[11px] text-zinc-400 flex items-start gap-2 leading-relaxed">
                      <span className="text-[#21e8ff] text-xs font-mono mt-0.5">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* Interactive Calibration guide and Pacer (5 Columns) */}
          <div className="lg:col-span-5 flex flex-col gap-4 relative">
            <div className="bg-gradient-to-b from-[#17A9C9]/12 to-[#12141a]/95 border border-[#17A9C9]/25 rounded-[28px] p-6 shadow-[0_0_20px_rgba(23,169,201,0.05)] w-full flex flex-col items-center justify-between text-center min-h-[480px]">
              
              {/* Top ambient glow line */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/35 to-transparent" />

              {/* Complete state Overlay */}
              {showCompletedOverlay && (
                <div className="absolute inset-0 bg-[#0d0f14]/98 z-30 flex flex-col items-center justify-center p-6 rounded-[28px] animate-fade-in select-none">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-bounce">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1.5">Daily Exercise Logged</h3>
                  <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-6">
                    Sensory parameters successfully calibrated! "{selectedRitual.name}" has been completed and cataloged under your active checklist.
                  </p>
                  <div className="flex flex-col w-full gap-2 px-6">
                    <button
                      onClick={() => {
                        setShowCompletedOverlay(false);
                        resetPractice();
                      }}
                      className="w-full py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
                    >
                      Practice Again
                    </button>
                    <button
                      onClick={() => setSelectedRitual(null)}
                      className="w-full py-2.5 bg-gradient-to-r from-[#17A9C9]/80 to-[#128ba5]/80 hover:from-[#17A9C9] hover:to-[#128ba5] text-zinc-950 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Return to Library
                    </button>
                  </div>
                </div>
              )}

              {/* Title indicator */}
              <div className="mb-2">
                <span className="text-[10px] font-mono text-[#21e8ff] uppercase tracking-widest bg-[#17A9C9]/10 px-2.5 py-0.5 rounded-full border border-[#17A9C9]/15">
                  Vocal Guided practice
                </span>
                <p className="text-[10.5px] text-zinc-550 mt-2">Activate the loop and follow the vocal expansion orb</p>
              </div>

              {/* Guided Breathing Expansion Circle Pacer */}
              <div className="my-6 relative flex items-center justify-center w-48 h-48">
                {/* Decorative outer rings */}
                <div className="absolute inset-0 rounded-full border border-zinc-800/30" />
                <div className="absolute inset-3 rounded-full border border-zinc-800/40" />
                <div className="absolute inset-8 rounded-full border border-zinc-850/60" />

                {/* Expanding Glowing Orb */}
                <div 
                  className="rounded-full bg-gradient-to-tr from-[#17A9C9]/20 to-[#21e8ff]/30 border border-[#17A9C9]/50 shadow-[0_0_35px_rgba(23,169,201,0.25)] flex flex-col items-center justify-center transition-all duration-300 relative"
                  style={{
                    width: `${breathProgress}%`,
                    height: `${breathProgress}%`,
                    minWidth: '40px',
                    minHeight: '40px'
                  }}
                >
                  {/* Subtle inner particle */}
                  <div className="w-1.5 h-1.5 rounded-full bg-[#21e8ff] absolute top-1/4 left-1/4 animate-pulse" />
                </div>

                {/* Exact center label, layered above the expanding orb */}
                <div className="absolute pointer-events-none flex flex-col items-center justify-center select-none z-10">
                  <span className="text-xl font-mono font-medium tracking-tight text-white mb-0.5">
                    {formattedTime(timeLeft)}
                  </span>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#21e8ff] bg-zinc-950/70 border border-zinc-900 px-2 py-0.5 rounded-full shadow-md">
                    {isPlaying ? breathingPhase : 'Guide Idle'}
                  </span>
                </div>
              </div>

              {/* Pitch Frequency Sweep (SOVT / humming companion calibration) */}
              <div className="w-full bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 mb-5 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-zinc-450 uppercase flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-[#21e8ff]" />
                    F0 Resonance Calibrator
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-300">{pitchValue} Hz</span>
                </div>
                
                {/* Custom waveform simulation line */}
                <div className="h-6 w-full flex items-center justify-center gap-0.5 mb-2.5 overflow-hidden px-2">
                  {[...Array(24)].map((_, barIdx) => {
                    // Random-ish high-precision sine wave based on play state and index
                    const sineVal = Math.sin((barIdx / 2) + (isPlaying ? Date.now() / 250 : 0));
                    const waveHeight = isPlaying 
                      ? Math.abs(sineVal) * 16 + 2 
                      : 2;
                    return (
                      <div 
                        key={barIdx}
                        className="w-1 rounded-full bg-[#17A9C9]/40 transition-all duration-150"
                        style={{ 
                          height: `${waveHeight}px`,
                          backgroundColor: isPlaying && barIdx % 3 === 0 ? '#21e8ff' : undefined
                        }}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-mono text-zinc-500">Low (80Hz)</span>
                  <input
                    type="range"
                    min="80"
                    max="440"
                    value={pitchValue}
                    onChange={(e) => setPitchValue(Number(e.target.value))}
                    className="flex-1 accent-[#17A9C9] h-[3px] bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-zinc-500">High (440Hz)</span>
                </div>
              </div>

              {/* Master Control Board */}
              <div className="w-full grid grid-cols-12 gap-3">
                {/* Secondary: Reset */}
                <button
                  onClick={resetPractice}
                  className="col-span-3 py-3 border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-800/30 text-zinc-400 hover:text-white rounded-2xl flex items-center justify-center cursor-pointer transition-colors"
                  title="Reset timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Primary: Start/Pause */}
                <button
                  onClick={togglePlayback}
                  className={`col-span-6 py-3 px-3 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                    isPlaying 
                      ? 'bg-zinc-900 border border-zinc-800 text-amber-500' 
                      : 'bg-[#21e8ff] hover:bg-[#21e8ff]/90 text-zinc-950 font-bold shadow-[0_0_15px_rgba(33,232,255,0.25)]'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Calibration</span>
                    </>
                  )}
                </button>

                {/* Complete now button */}
                <button
                  onClick={handleCompleteRitual}
                  className="col-span-3 py-3 bg-zinc-900 border border-zinc-850 hover:border-[#17A9C9]/35 hover:bg-[#17A9C9]/10 text-emerald-400 hover:text-emerald-300 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300"
                  title="Mark Completed"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Performance & Habit Consistency Analytics */}
      <div className="mt-12">
        <h2 className="text-base font-light tracking-tight text-white mb-4 font-display">
          Your Progress
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 7-Day Activity Visualizer Panel */}
          <div className="lg:col-span-7 bg-[#181b22]/90 backdrop-blur-[12px] border border-zinc-800/80 rounded-[28px] p-5.5 hover:bg-[#1d212a]/95 hover:border-zinc-700/60 transition-all duration-300 shadow-[0_12px_45px_rgba(0,0,0,0.45)] relative overflow-hidden flex flex-col justify-between group">
            {/* Top glass reflection light */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/35 to-transparent" />
            
            {/* Soft, premium decorative glow orb inside background */}
            <div className="absolute -bottom-16 -left-12 w-64 h-32 bg-[#17A9C9]/10 rounded-full blur-[45px] pointer-events-none transition-all duration-500 group-hover:bg-[#17A9C9]/15 group-hover:scale-110 z-0" />
            
            <div className="flex flex-col flex-grow justify-between relative z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 tracking-wide mb-1 flex items-center gap-2">
                    7-Day Practice Consistency
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Visualizing calibration ritual completions and target routine health over the last 7 cycles.
                  </p>
                </div>
              </div>

              {/* Chart Window */}
              <div className="h-48 w-full text-zinc-400 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Tue', completed: 1, date: 'Jun 09' },
                    { name: 'Wed', completed: 2, date: 'Jun 10' },
                    { name: 'Thu', completed: 1, date: 'Jun 11' },
                    { name: 'Fri', completed: 3, date: 'Jun 12' },
                    { name: 'Sat', completed: 0, date: 'Jun 13' },
                    { name: 'Sun', completed: 2, date: 'Jun 14' },
                    { name: 'Today', completed: completedCount, date: 'Jun 15' },
                  ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#17A9C9" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#17A9C9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1b1e2a" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ stroke: '#1c343d', strokeWidth: 1 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#21e8ff" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCompletions)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Minimal High-Fidelity Stats Bar */}
            <div className="mt-4 pt-3.5 border-t border-zinc-800/60 grid grid-cols-3 gap-3 text-center relative z-10">
              <div className="bg-gradient-to-br from-[#101217] to-[#0d0e13]/90 border border-zinc-800/60 rounded-2xl p-2.5 shadow-inner hover:border-zinc-700/60 transition-colors duration-300">
                <span className="block text-[8.5px] font-mono uppercase tracking-wider text-zinc-500">Average Pace</span>
                <span className="block text-xs font-semibold text-white mt-0.5 font-sans">
                  {((1 + 2 + 1 + 3 + 0 + 2 + completedCount) / 7).toFixed(1)} <span className="text-[9px] text-zinc-500 font-normal">/ day</span>
                </span>
              </div>
              <div className="bg-gradient-to-br from-[#101217] to-[#0d0e13]/90 border border-zinc-800/60 rounded-2xl p-2.5 shadow-inner hover:border-zinc-700/60 transition-colors duration-300">
                <span className="block text-[8.5px] font-mono uppercase tracking-wider text-zinc-500">Total Complete</span>
                <span className="block text-xs font-semibold text-white mt-0.5 font-sans">
                  {1 + 2 + 1 + 3 + 0 + 2 + completedCount} <span className="text-[9px] text-zinc-500 font-normal">tasks</span>
                </span>
              </div>
              <div className="bg-gradient-to-br from-[#101217] to-[#0d0e13]/90 border border-zinc-800/60 rounded-2xl p-2.5 shadow-inner hover:border-zinc-700/60 transition-colors duration-300">
                <span className="block text-[8.5px] font-mono uppercase tracking-wider text-zinc-500">Habit Health</span>
                <span className="block text-xs font-semibold text-[#21e8ff] mt-0.5 font-sans">
                  {Math.round(((1 + 2 + 1 + 3 + 0 + 2 + completedCount) / 14) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Month-View Mini-Calendar Panel */}
          <div className="lg:col-span-5 bg-[#181b22]/90 backdrop-blur-[12px] border border-zinc-800/80 rounded-[28px] p-5.5 hover:bg-[#1d212a]/95 hover:border-zinc-700/60 transition-all duration-300 shadow-[0_12px_45px_rgba(0,0,0,0.45)] relative overflow-hidden flex flex-col justify-between group">
            {/* Top glass reflection light */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#17A9C9]/35 to-transparent" />
            
            {/* Soft, premium decorative glow orb inside background */}
            <div className="absolute -bottom-16 -right-12 w-64 h-32 bg-[#21e8ff]/10 rounded-full blur-[45px] pointer-events-none transition-all duration-500 group-hover:bg-[#21e8ff]/15 group-hover:scale-110 z-0" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 tracking-wide mb-1 flex items-center gap-2">
                    Official Tracker
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Daily practice completions and active monthly calendar consistency.
                  </p>
                </div>
                <span className="text-xs font-mono font-medium text-[#21e8ff] bg-[#17A9C9]/10 px-2.5 py-1 rounded-xl border border-[#17A9C9]/20 shadow-inner">
                  {currentMonthName} {currentYearNum}
                </span>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center mt-3">
                {/* Day headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd, i) => (
                  <span key={i} className="text-[9px] font-mono text-zinc-650 font-bold uppercase tracking-wider py-0.5">
                    {wd}
                  </span>
                ))}

                {/* Day elements */}
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} />;
                  }

                  const isToday = day === currentDayNum;
                  const isCompleted = completedDaysList.includes(day) || (isToday && completedCount === todos.length && todos.length > 0);
                  
                  return (
                    <div 
                      key={`day-${day}`}
                      className={`relative py-1 flex items-center justify-center rounded-[10px] text-[10px] font-mono transition-all duration-300 select-none group focus:outline-none ${
                        isToday 
                          ? 'border border-[#21e8ff]/40 text-white font-bold bg-[#17A9C9]/10' 
                          : isCompleted
                          ? 'text-[#21e8ff] font-semibold bg-[#17A9C9]/15 border border-[#17A9C9]/35 shadow-[0_0_8px_rgba(23,169,201,0.08)]'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                      }`}
                      title={
                        isCompleted 
                          ? `${currentMonthName} ${day} — All rituals completed!` 
                          : isToday 
                          ? `${currentMonthName} ${day} — Today (${completedCount}/${todos.length} completed)`
                          : `${currentMonthName} ${day}`
                      }
                    >
                      <span className="py-0.5">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend / Metrics */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#17A9C9]/15 border border-[#17A9C9]/35 rounded-md" />
                <span>Perfect Day</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      completed: number;
      date: string;
    };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
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
