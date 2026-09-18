import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Mic, Square, Check, Activity, Shuffle } from 'lucide-react';
import { VocalReport } from '../types/onboarding';
import { READ_ALOUD_PHRASES, FREE_SPEECH_PROMPTS, TWISTER_PHRASES, pickRandomPhrase } from '../lib/recordingPrompts';
import { ANALYSIS_BUFFER_SIZE, SILENCE_RMS_THRESHOLD, detectPitchFrame, isConfidentPitch, measureFrameRms, measureFrameResonance, calibrateNoiseFloorDb, computeSegmentMetrics, loudnessLevel, loudnessLevelColor, type SegmentMetrics } from '../lib/voiceAnalysis';

interface VoiceAnalyzerPageProps {
  onBack: () => void;
  onSave: (report: Omit<VocalReport, 'id'>) => void;
}

interface VocalMetrics {
  pitchHz: number;
  pitchRangeHz: number;
  resonanceScore: number;
  clarityPct: number;
  loudnessDb: number;
  stabilityPct: number;
  fatigueEstimate: 'Low' | 'Moderate' | 'High';
  fatigueLevel: number;
}

// Same 3 steps, in the same order, as the onboarding baseline recorder (BaselineFlow.tsx). Read
// Aloud / Free Speech get a random phrase each time (see recordingPrompts.ts) — picked once per
// attempt via buildSteps(), not on every render.
function buildSteps() {
  return [
    {
      label: 'Sustained Vowel',
      instruction: 'Say /ah/ and hold it steadily',
      hint: '~5 seconds',
    },
    {
      label: 'Twisters',
      instruction: pickRandomPhrase(TWISTER_PHRASES),
      hint: '~20–30 seconds',
    },
    {
      label: 'Read Aloud',
      instruction: pickRandomPhrase(READ_ALOUD_PHRASES),
      hint: '~20–30 seconds',
    },
    {
      label: 'Free Speech',
      instruction: pickRandomPhrase(FREE_SPEECH_PROMPTS),
      hint: '~20–30 seconds',
    },
  ];
}

// Which phrase pool (if any) backs each step's instruction — null for Sustained Vowel, which has
// no variety to swap between.
const PHRASE_LISTS_BY_STEP: (string[] | null)[] = [null, TWISTER_PHRASES, READ_ALOUD_PHRASES, FREE_SPEECH_PROMPTS];

function noteFromHz(hz: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitones = Math.round(12 * Math.log2(hz / 440)) + 69;
  const note = noteNames[((semitones % 12) + 12) % 12];
  const octave = Math.floor(semitones / 12) - 1;
  return `${note}${octave}`;
}

function generateInsight(m: VocalMetrics): string {
  const resonanceLine = m.resonanceScore > 70
    ? `Your resonance is strong at ${m.resonanceScore}/100 — your voice is carrying well into the mid-frequency presence band.`
    : m.resonanceScore < 40
      ? `Resonance is low at ${m.resonanceScore}/100. Try placing your voice more forward in the mouth and engaging your chest more.`
      : `Resonance is moderate at ${m.resonanceScore}/100. There's room to develop more projection with targeted exercises.`;

  const clarityLine = m.clarityPct > 75
    ? `Tone clarity is excellent — your voice is clean and well-focused with minimal breathiness.`
    : `Some breathiness was detected. This may indicate mild vocal fatigue or airflow inefficiency — try a sustained hum warm-up before your next session.`;

  const fatigueLine = m.fatigueEstimate === 'Low'
    ? `Pitch jitter is low, suggesting your vocal folds are stable and well-rested.`
    : m.fatigueEstimate === 'Moderate'
      ? `Moderate pitch instability detected. Consider hydrating and spacing out speaking demands over the next few hours.`
      : `High jitter levels indicate significant vocal strain. Rest your voice and avoid prolonged speaking until recovered.`;

  return `${resonanceLine} ${clarityLine} ${fatigueLine}`;
}

const FEELINGS = [
  { label: 'Hoarseness', emoji: '🗣️' },
  { label: 'Dryness', emoji: '💧' },
  { label: 'Tension', emoji: '😬' },
  { label: 'Breathiness', emoji: '💨' },
  { label: 'Fatigue', emoji: '😴' },
  { label: 'Pain', emoji: '😣' },
];


export default function VoiceAnalyzerPage({ onBack, onSave }: VoiceAnalyzerPageProps) {
  type AnalyzerPhase = 'record' | 'analyzing' | 'results' | 'too-quiet';
  type RecordingState = 'idle' | 'recording' | 'done';

  const [phase, setPhase] = useState<AnalyzerPhase>('record');
  const [resultsStep, setResultsStep] = useState<'metrics' | 'log'>('metrics');
  const [step, setStep] = useState(0); // which of the 3 recording steps (0-2)
  const [steps, setSteps] = useState(buildSteps);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0); // summed across all 3 steps, for the saved report's duration
  const [metrics, setMetrics] = useState<VocalMetrics | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(28).fill(0.08));

  const [formFeelings, setFormFeelings] = useState<string[]>([]);
  const [formName, setFormName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [savingInsight, setSavingInsight] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pitchReadings = useRef<number[]>([]);
  const clarityReadings = useRef<number[]>([]);
  const loudnessReadings = useRef<number[]>([]);
  const resonanceReadings = useRef<number[]>([]);
  const lastPitchTime = useRef<number>(0);
  // Calibrated once, on the first recording of the session, and reused for every subsequent step —
  // see calibrateNoiseFloorDb. `null` means calibration hasn't run yet.
  const noiseFloorDbRef = useRef<number | null>(null);
  const voiceThresholdRmsRef = useRef<number>(SILENCE_RMS_THRESHOLD);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Per-step captured data — one slot per STEPS entry, combined in computeMetrics() below.
  const allPitchReadings = useRef<number[][]>([[], [], [], []]);
  const allClarityReadings = useRef<number[][]>([[], [], [], []]);
  const allLoudnessReadings = useRef<number[][]>([[], [], [], []]);
  const allResonanceReadings = useRef<number[][]>([[], [], [], []]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    return () => stopRecording();
  }, [stopRecording]);

  const startRecording = async () => {
    try {
      pitchReadings.current = [];
      clarityReadings.current = [];
      loudnessReadings.current = [];
      resonanceReadings.current = [];
      lastPitchTime.current = 0;

      // Explicitly disable the browser's mic processing — auto gain control in particular will
      // actively boost quiet/silent input toward a target loudness, which both defeats the
      // loudness metric and can amplify ambient noise enough to trip pitch detection.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = ANALYSIS_BUFFER_SIZE;
      ctx.createMediaStreamSource(stream).connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = ctx;

      // Calibrate loudness to this specific mic/room once per session (not once per step) —
      // brief enough that it happens before most people start speaking after tapping record, but
      // the "Calibrating..." label below gives a clear beat to stay quiet regardless.
      if (noiseFloorDbRef.current === null) {
        setIsCalibrating(true);
        const calibration = await calibrateNoiseFloorDb(analyser);
        noiseFloorDbRef.current = calibration.noiseFloorDb;
        voiceThresholdRmsRef.current = calibration.voiceThresholdRms;
        setIsCalibrating(false);
      }

      setRecordingState('recording');
      setSeconds(0);

      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

      const timeBuffer = new Uint8Array(analyser.fftSize);
      const floatBuffer = new Float32Array(analyser.fftSize);

      const loop = (now: number) => {
        analyser.getByteTimeDomainData(timeBuffer);
        const heights = new Array(28).fill(0).map((_, i) => {
          const chunk = Math.floor((timeBuffer.length / 28) * i);
          const sample = (timeBuffer[chunk] - 128) / 128;
          return Math.max(0.06, Math.abs(sample) * 2.2 + 0.06);
        });
        setBarHeights(heights);

        if (now - lastPitchTime.current > 80) {
          lastPitchTime.current = now;
          analyser.getFloatTimeDomainData(floatBuffer);
          const frame = detectPitchFrame(floatBuffer, ctx.sampleRate);
          if (frame.hz > 0) {
            clarityReadings.current.push(frame.clarity);
            if (isConfidentPitch(frame)) pitchReadings.current.push(frame.hz);
          }
          // Loudness/resonance are sampled on every signal-present frame across the whole
          // recording (not just an instant grabbed when recording stops), gated on raw volume
          // rather than pitch/periodicity so loud unvoiced sounds still count.
          const rms = measureFrameRms(floatBuffer);
          if (rms > voiceThresholdRmsRef.current) {
            loudnessReadings.current.push(rms);
            resonanceReadings.current.push(measureFrameResonance(floatBuffer, ctx.sampleRate));
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

    } catch {
      setRecordingState('idle');
    }
  };

  const handleMicClick = () => {
    if (recordingState === 'idle') {
      startRecording();
    } else if (recordingState === 'recording') {
      stopRecording();

      allPitchReadings.current[step] = [...pitchReadings.current];
      allClarityReadings.current[step] = [...clarityReadings.current];
      allLoudnessReadings.current[step] = [...loudnessReadings.current];
      allResonanceReadings.current[step] = [...resonanceReadings.current];
      setTotalSeconds(t => t + seconds);

      setRecordingState('done');
      setBarHeights(new Array(28).fill(0.08));
    }
  };

  const handleReRecord = () => {
    stopRecording();
    allPitchReadings.current[step] = [];
    allClarityReadings.current[step] = [];
    allLoudnessReadings.current[step] = [];
    allResonanceReadings.current[step] = [];
    pitchReadings.current = [];
    clarityReadings.current = [];
    loudnessReadings.current = [];
    resonanceReadings.current = [];
    setRecordingState('idle');
    setSeconds(0);
    setBarHeights(new Array(28).fill(0.08));
  };

  // Combines the 3 recorded steps into one report — identical per-segment math and combine
  // weights as BaselineFlow.tsx's onboarding baseline, so a voice-analyzer report scores an
  // equivalent recording the same way the baseline does.
  const computeMetrics = useCallback((): { metrics: VocalMetrics; lowSignal: boolean } => {
    const segMetrics = [0, 1, 2, 3].map(i => computeSegmentMetrics(
      allPitchReadings.current[i],
      allClarityReadings.current[i],
      allLoudnessReadings.current[i],
      allResonanceReadings.current[i],
      noiseFloorDbRef.current ?? undefined,
    ));

    const avg = (key: keyof Omit<SegmentMetrics, 'lowSignal'>) =>
      Math.round((segMetrics[0][key] + segMetrics[1][key] + segMetrics[2][key] + segMetrics[3][key]) / 4);

    // Stability weighted: vowel most diagnostic (matches BaselineFlow.tsx exactly).
    const stabilityPct = Math.round(
      segMetrics[0].stabilityPct * 0.35 +
      segMetrics[1].stabilityPct * 0.15 +
      segMetrics[2].stabilityPct * 0.30 +
      segMetrics[3].stabilityPct * 0.20,
    );
    const resonanceScore = avg('resonanceScore');
    const clarityPct = avg('clarityPct');
    const fatigueLevel = stabilityPct > 70 ? 20 : stabilityPct > 40 ? 55 : 80;
    const fatigueEstimate: 'Low' | 'Moderate' | 'High' = stabilityPct > 70 ? 'Low' : stabilityPct > 40 ? 'Moderate' : 'High';

    // If most of the 4 recorded segments picked up essentially no voice, every metric above is
    // just noise-floor numbers — show a "too quiet" state instead of a misleadingly precise score.
    const lowSignal = segMetrics.filter(s => s.lowSignal).length >= 3;

    return {
      metrics: {
        pitchHz: avg('pitchHz'),
        pitchRangeHz: avg('pitchRangeHz'),
        resonanceScore,
        clarityPct,
        loudnessDb: avg('loudnessDb'),
        stabilityPct,
        fatigueEstimate,
        fatigueLevel,
      },
      lowSignal,
    };
  }, []);

  const handleAnalyze = () => {
    setPhase('analyzing');
    setTimeout(() => {
      const { metrics: m, lowSignal } = computeMetrics();
      if (lowSignal) {
        setPhase('too-quiet');
        return;
      }
      setMetrics(m);
      setPhase('results');
    }, 2200);
  };

  // Advances to the next of the 3 recording steps, or triggers the final analysis after step 3.
  const handleNextStep = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setRecordingState('idle');
      setSeconds(0);
    } else {
      handleAnalyze();
    }
  };

  // Resets all 3 recorded steps — used when restarting the whole flow from the results screen.
  const handleStartOver = () => {
    stopRecording();
    setStep(0);
    setSteps(buildSteps());
    setRecordingState('idle');
    setSeconds(0);
    setTotalSeconds(0);
    setBarHeights(new Array(28).fill(0.08));
    pitchReadings.current = [];
    clarityReadings.current = [];
    loudnessReadings.current = [];
    resonanceReadings.current = [];
    allPitchReadings.current = [[], [], [], []];
    allClarityReadings.current = [[], [], [], []];
    allLoudnessReadings.current = [[], [], [], []];
    allResonanceReadings.current = [[], [], [], []];
  };

  // Swaps just the current step's phrase for a different random one from the same pool — lets
  // someone reroll "Read Aloud"/"Free Speech" before recording without restarting the whole flow.
  const handleSwapPhrase = () => {
    const list = PHRASE_LISTS_BY_STEP[step];
    if (!list) return;
    setSteps(prev => {
      const next = [...prev];
      next[step] = { ...next[step], instruction: pickRandomPhrase(list, next[step].instruction) };
      return next;
    });
  };

  const handleSave = async () => {
    if (!metrics || savingInsight) return;
    setSavingInsight(true);
    let insight: string;
    try {
      const res = await fetch('/api/voice-report-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitchHz: metrics.pitchHz,
          pitchRangeHz: metrics.pitchRangeHz,
          resonanceScore: metrics.resonanceScore,
          clarityPct: metrics.clarityPct,
          loudnessDb: metrics.loudnessDb,
          stabilityPct: metrics.stabilityPct,
          fatigueEstimate: metrics.fatigueEstimate,
          feelings: formFeelings,
          notes: formNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.insight !== 'string') throw new Error('bad response');
      insight = data.insight;
    } catch {
      insight = generateInsight(metrics);
    }
    setSavingInsight(false);

    const now = new Date();
    const autoName = `Vocal Report — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    onSave({
      name: formName.trim() || autoName,
      ritualName: autoName,
      category: 'Calibrate',
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: formatTime(totalSeconds),
      fatigueLevel: metrics.fatigueLevel,
      feelings: formFeelings,
      notes: formNotes,
      insight,
      pitchHz: metrics.pitchHz,
      pitchRangeHz: metrics.pitchRangeHz,
      resonanceScore: metrics.resonanceScore,
      clarityPct: metrics.clarityPct,
      loudnessDb: metrics.loudnessDb,
      stabilityPct: metrics.stabilityPct,
    });
    onBack();
  };

  const toggleFeeling = (label: string) => {
    setFormFeelings(prev => prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]);
  };

  const pitchRangeLabel = (hz: number) => hz < 40 ? 'Narrow' : hz < 120 ? 'Moderate' : 'Wide';
  const fatigueColor = (f: 'Low' | 'Moderate' | 'High') =>
    f === 'Low' ? '#22d3ee' : f === 'Moderate' ? '#fbbf24' : '#fb7185';

  return (
    <div className="min-h-screen w-full relative">

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(33,232,255,0.06)' }}>
        <button
          onClick={
            resultsStep === 'log'
              ? () => setResultsStep('metrics')
              : phase === 'results'
                ? () => { setPhase('record'); setMetrics(null); setResultsStep('metrics'); handleStartOver(); }
                : onBack
          }
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
        >
          <ChevronLeft className="w-4 h-4 " />
        </button>
        {phase === 'results' ? (
          <button
            onClick={resultsStep === 'log'
              ? () => setResultsStep('metrics')
              : () => { setPhase('record'); setMetrics(null); setResultsStep('metrics'); handleStartOver(); }
            }
            className="cursor-pointer"
          >
            <h1 className="text-[15px] font-light text-white tracking-wide hover:text-zinc-300 transition-colors duration-150 opacity-60">
              {resultsStep === 'log' ? 'Metrics' : 'Re-record'}
            </h1>
          </button>
        ) : (
          <div>
            <h1 className="text-[15px] font-light text-white tracking-wide">Voice Analyzer</h1>
            <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.45)' }}>Real-time vocal analysis</p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(23,169,201,0.1)', border: '1px solid rgba(33,232,255,0.25)', boxShadow: '0 0 12px rgba(33,232,255,0.06)' }}>
          <Activity className="w-3 h-3 text-[#21e8ff]" />
          <span className="text-[9px] font-mono text-[#21e8ff] tracking-widest uppercase">Web Audio API</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── PHASE: RECORD ── */}
        {phase === 'record' && (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex flex-col items-center px-6 pt-6 pb-10 gap-8"
          >
            {/* Step progress — same 3 steps as the onboarding baseline recorder */}
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    width: i === step ? 20 : 6,
                    background: i <= step ? '#21e8ff' : 'rgba(63,63,70,0.8)',
                    boxShadow: i === step ? '0 0 8px rgba(33,232,255,0.75)' : 'none',
                  }}
                  transition={{ duration: 0.25 }}
                  className="h-[5px] rounded-full"
                />
              ))}
              <span className="text-[9px] font-mono text-zinc-600 ml-1">{step + 1} of {steps.length}</span>
            </div>

            {/* Prompt */}
            <div className="w-full max-w-lg rounded-[20px] px-7 py-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.06) 0%, rgba(33,232,255,0.02) 100%)', border: '1px solid rgba(33,232,255,0.18)', boxShadow: '0 0 24px rgba(33,232,255,0.04), inset 0 1px 0 rgba(33,232,255,0.08)' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.5)' }}>{steps[step].label}</p>
                {PHRASE_LISTS_BY_STEP[step] && (
                  <button
                    onClick={handleSwapPhrase}
                    className="flex items-center justify-center w-5 h-5 rounded-full text-[#21e8ff]/60 hover:text-[#21e8ff] hover:bg-[#21e8ff]/10 transition-colors duration-150 cursor-pointer"
                    aria-label="Try a different phrase"
                    title="Try a different phrase"
                  >
                    <Shuffle className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[17px] font-light text-zinc-200 leading-relaxed italic">
                {steps[step].instruction}
              </p>
              <p className="text-[9px] font-mono text-zinc-600 mt-2">{steps[step].hint}</p>
            </div>

            {/* Waveform */}
            <div className="w-full max-w-lg h-16 flex items-center justify-center gap-[3px]">
              {barHeights.map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: h }}
                  transition={{ duration: 0.06, ease: 'linear' }}
                  className="w-1.5 rounded-full origin-center"
                  style={{
                    height: 48,
                    background: recordingState === 'recording'
                      ? `rgba(33,232,255,${0.3 + h * 0.7})`
                      : 'rgba(33,232,255,0.2)',
                  }}
                />
              ))}
            </div>

            {/* Mic button */}
            <div className="relative flex flex-col items-center gap-5">
              {recordingState === 'recording' && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: 'rgba(33,232,255,0.25)' }}
                />
              )}
              <button
                onClick={handleMicClick}
                className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
                style={
                  recordingState === 'recording'
                    ? { background: 'linear-gradient(135deg, rgba(33,232,255,0.2) 0%, rgba(23,169,201,0.1) 100%)', border: '1.5px solid rgba(33,232,255,0.6)', boxShadow: '0 0 32px rgba(33,232,255,0.3)' }
                    : recordingState === 'done'
                      ? { background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.08) 100%)', border: '1.5px solid rgba(34,197,94,0.5)' }
                      : { background: 'linear-gradient(135deg, rgba(23,169,201,0.12) 0%, rgba(33,232,255,0.05) 100%)', border: '1.5px solid rgba(33,232,255,0.3)', boxShadow: '0 0 24px rgba(33,232,255,0.1), inset 0 1px 0 rgba(33,232,255,0.12)' }
                }
              >
                {recordingState === 'idle' && <Mic className="w-7 h-7 text-[#21e8ff]" />}
                {recordingState === 'recording' && <Square className="w-6 h-6 text-[#21e8ff]" />}
                {recordingState === 'done' && <Check className="w-7 h-7 text-emerald-400" />}
              </button>

              <p className="text-[11px] font-mono tracking-widest" style={{
                color: isCalibrating ? '#fbbf24' : recordingState === 'idle' ? 'rgba(33,232,255,0.5)' : recordingState === 'recording' ? 'rgba(33,232,255,0.7)' : '#71717a'
              }}>
                {isCalibrating && 'CALIBRATING MIC — STAY QUIET...'}
                {!isCalibrating && recordingState === 'idle' && 'TAP TO RECORD'}
                {!isCalibrating && recordingState === 'recording' && 'TAP TO STOP'}
                {!isCalibrating && recordingState === 'done' && 'RECORDING COMPLETE'}
              </p>
            </div>

            {/* Re-record */}
            <AnimatePresence>
              {recordingState === 'done' && (
                <motion.button
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  onClick={handleReRecord}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 tracking-wide underline underline-offset-2 transition-colors duration-150 cursor-pointer"
                >
                  Re-record
                </motion.button>
              )}
            </AnimatePresence>

            {/* Timer */}
            {recordingState === 'recording' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[28px] font-mono font-light text-[#21e8ff] tabular-nums"
              >
                {formatTime(seconds)}
              </motion.p>
            )}

            {/* Next step / Analyze button */}
            <AnimatePresence>
              {recordingState === 'done' && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={handleNextStep}
                  className="px-10 py-3.5 rounded-2xl text-[11px] font-mono tracking-widest uppercase cursor-pointer transition-all duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.25) 0%, rgba(33,232,255,0.1) 100%)', border: '1px solid rgba(33,232,255,0.5)', color: '#21e8ff', boxShadow: '0 0 28px rgba(33,232,255,0.2)' }}
                >
                  {step < steps.length - 1 ? 'Continue' : 'Analyze Voice'}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── PHASE: ANALYZING ── */}
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center justify-center gap-8 px-6 py-24"
          >
            <div className="relative w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ background: 'rgba(33,232,255,0.2)' }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
                style={{ background: 'rgba(33,232,255,0.3)' }}
              />
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.18) 0%, rgba(23,169,201,0.08) 100%)', border: '1.5px solid rgba(33,232,255,0.4)' }}>
                <Activity className="w-9 h-9 text-[#21e8ff]" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[15px] font-light text-white">Analyzing your voice</p>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                    className="w-1.5 h-1.5 rounded-full bg-[#21e8ff]"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PHASE: TOO QUIET — recording had essentially no usable voice signal ── */}
        {phase === 'too-quiet' && (
          <motion.div
            key="too-quiet"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 py-24 text-center"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1.5px solid rgba(251,191,36,0.35)' }}>
              <Mic className="w-8 h-8 text-amber-400" />
            </div>
            <div className="flex flex-col items-center gap-2 max-w-sm">
              <p className="text-[15px] font-light text-white">We couldn't hear enough to analyze</p>
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                Most of that recording was too quiet to measure. Try again a little closer to the
                mic, and make sure to speak during each step.
              </p>
            </div>
            <button
              onClick={() => { setPhase('record'); handleStartOver(); }}
              className="px-8 py-3.5 rounded-2xl text-[11px] font-mono tracking-widest uppercase cursor-pointer transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.25) 0%, rgba(33,232,255,0.1) 100%)', border: '1px solid rgba(33,232,255,0.5)', color: '#21e8ff', boxShadow: '0 0 28px rgba(33,232,255,0.2)' }}
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* ── PHASE: RESULTS — step 1: metrics ── */}
        {phase === 'results' && metrics && resultsStep === 'metrics' && (
          <motion.div
            key="results-metrics"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            className="relative z-10 flex flex-col items-center px-6 pt-10 pb-2 gap-10"
          >
            {/* Vocal Health Index — stacked bar */}
            {(() => {
              // Segments mirror totalScore's own weights (resonance 40%, clarity 40%, inverted
              // fatigue 20%) exactly, so the bar always visually sums to the number above it.
              const seg1 = Math.round(metrics.resonanceScore * 0.4);
              const seg2 = Math.round(metrics.clarityPct * 0.4);
              const seg3 = Math.round((100 - metrics.fatigueLevel) * 0.2);
              const reserve = 100 - seg1 - seg2 - seg3;
              const totalScore = Math.round(metrics.resonanceScore * 0.4 + metrics.clarityPct * 0.4 + (100 - metrics.fatigueLevel) * 0.2);
              const fatigueTint = fatigueColor(metrics.fatigueEstimate);
              const scoreLabel = totalScore >= 80 ? 'Excellent session' : totalScore >= 60 ? 'Strong performance' : totalScore >= 40 ? 'Moderate — room to grow' : 'Recovery recommended';
              return (
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                  className="w-full max-w-lg flex flex-col items-center gap-4 pt-4"
                >
                  {/* Score row */}
                  <div className="flex items-center justify-between w-full px-0.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.45)' }}>Vocal Profile</span>
                      <span className="text-[11px] font-light text-zinc-400">{scoreLabel}</span>
                    </div>
                    <div className="flex items-end gap-1.5 leading-none">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
                        className="text-[34px] font-light text-white tabular-nums"
                        style={{ lineHeight: 1 }}
                      >
                        {totalScore}
                      </motion.span>
                      <span className="text-[11px] font-mono text-zinc-600 mb-1">/ 100</span>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="w-full relative">
                    <div
                      className="absolute inset-x-0 -bottom-1.5 h-4 rounded-full blur-lg opacity-25 pointer-events-none"
                      style={{ background: `linear-gradient(90deg, #fbbf24 0%, #34d399 50%, ${fatigueTint} 100%)` }}
                    />
                    <div className="relative w-full h-5 rounded-xl flex overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${seg1}%` }}
                        transition={{ duration: 1.0, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ background: 'linear-gradient(90deg, #d97706, #fbbf24)', flexShrink: 0 }}
                        className="h-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${seg2}%` }}
                        transition={{ duration: 1.0, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ background: 'linear-gradient(90deg, #059669, #34d399)', borderLeft: '1px solid rgba(0,0,0,0.18)', flexShrink: 0 }}
                        className="h-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${seg3}%` }}
                        transition={{ duration: 1.0, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ background: `linear-gradient(90deg, ${fatigueTint}88, ${fatigueTint})`, borderLeft: '1px solid rgba(0,0,0,0.18)', flexShrink: 0 }}
                        className="h-full"
                      />
                      <div style={{ flexGrow: 1, borderLeft: reserve > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }} className="h-full" />
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#fbbf24' }} />
                      <span className="text-[9px] font-mono tracking-wide text-zinc-500">Resonance</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#34d399' }} />
                      <span className="text-[9px] font-mono tracking-wide text-zinc-500">Clarity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: fatigueTint }} />
                      <span className="text-[9px] font-mono tracking-wide text-zinc-500">Fatigue</span>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Circles row */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-5 py-2 w-full">
              <CircleMetric
                value={`${metrics.pitchHz}`} unit="Hz" sub={noteFromHz(metrics.pitchHz)}
                label="Pitch" accent="#21e8ff"
                tooltip="The fundamental note your voice naturally sits at, detected via pitch tracking."
              />
              <CircleMetric
                value={`${metrics.pitchRangeHz}`} unit="Hz" sub={pitchRangeLabel(metrics.pitchRangeHz)}
                label="Range" accent="#a78bfa"
                tooltip="How much your pitch varied. A wider range means more expressive, dynamic delivery."
              />
              <CircleMetric
                value={`${metrics.resonanceScore}`} unit="" sub="/ 100"
                label="Resonance" accent="#fbbf24"
                tooltip="Energy in the 1–4 kHz presence band. Higher = fuller, more projected sound."
              />
              <CircleMetric
                value={`${metrics.clarityPct}`} unit="%" sub="clarity"
                label="Clarity" accent="#34d399"
                tooltip="Dominant frequency vs. total spectral noise. Higher = cleaner, more focused tone."
              />
              <CircleMetric
                value={metrics.fatigueEstimate} unit="" sub="fatigue"
                label="Energy" accent={fatigueColor(metrics.fatigueEstimate)}
                pulse
                tooltip="Estimated from pitch jitter. Low jitter means your pitch held steady — less vocal strain."
              />
              <CircleMetric
                value={loudnessLevel(metrics.loudnessDb)} unit="" sub="loudness"
                label="Loudness" accent={loudnessLevelColor(loudnessLevel(metrics.loudnessDb))}
                tooltip="How loud you were, calibrated to this session's mic and room."
              />
              <CircleMetric
                value={`${metrics.stabilityPct}`} unit="%" sub="stability"
                label="Stability" accent="#818cf8"
                tooltip="Inverse of pitch jitter. 100% means your pitch was rock-solid throughout the recording."
              />
            </div>

            {/* Continue */}
            <motion.button
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              onClick={() => setResultsStep('log')}
              className="w-full max-w-xs py-3.5 rounded-2xl text-[11px] font-mono tracking-widest uppercase cursor-pointer transition-all duration-300"
              style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.25) 0%, rgba(33,232,255,0.1) 100%)', border: '1px solid rgba(33,232,255,0.5)', color: '#21e8ff', boxShadow: '0 0 24px rgba(33,232,255,0.15)' }}
            >
              Continue
            </motion.button>
          </motion.div>
        )}

        {/* ── PHASE: RESULTS — step 2: log ── */}
        {phase === 'results' && metrics && resultsStep === 'log' && (
          <div className="relative">
            {/* Section dots */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-20 pointer-events-none" style={{ height: 'calc(100vh - 85px)' }}>
              <div className="flex flex-col gap-2.5 m-auto">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{
                      width: activeSection === i ? 7 : 4,
                      height: activeSection === i ? 7 : 4,
                      opacity: activeSection === i ? 1 : 0.25,
                      backgroundColor: activeSection === i ? '#21e8ff' : '#71717a',
                      boxShadow: activeSection === i ? '0 0 8px rgba(33,232,255,0.7)' : 'none',
                    }}
                    transition={{ duration: 0.2 }}
                    className="rounded-full"
                  />
                ))}
              </div>
            </div>

            <motion.div
              key="results-log"
              ref={logScrollRef}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -16 }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
              className="relative z-10 overflow-y-scroll snap-y snap-mandatory"
              style={{ height: 'calc(100vh - 85px)', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              onScroll={e => setActiveSection(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}
            >
              <div className="w-full flex flex-col">

                {/* Section 1 — AI Insight */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                  className="snap-center flex flex-col items-center justify-start pt-16 px-6 w-full max-w-lg mx-auto"
                  style={{ minHeight: 'calc(100vh - 85px)' }}
                >
                  <div className="flex flex-col items-center gap-2 mb-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 blur-2xl pointer-events-none" style={{ background: 'rgba(33,232,255,0.07)' }} />
                    <h2 className="text-[28px] font-light tracking-tight text-white">Your Insights</h2>
                    <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.4)' }}>optional</span>
                  </div>
                  <div className="relative flex flex-col items-center gap-3 py-7 px-6">
                    <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(23,169,201,0.1) 0%, rgba(33,232,255,0.04) 55%, transparent 100%)' }} />
                    <p className="text-[9px] font-mono tracking-widest uppercase text-center" style={{ color: 'rgba(33,232,255,0.6)' }}>AI Insight</p>
                    <p className="text-[14px] font-light text-zinc-200 leading-relaxed text-center">{generateInsight(metrics)}</p>
                  </div>
                </motion.div>

                {/* Section 2 — How did it feel */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                  className="snap-center flex flex-col items-center justify-start pt-16 px-6 w-full max-w-lg mx-auto"
                  style={{ minHeight: 'calc(100vh - 85px)' }}
                >
                  <h2
                    className="text-[17px] font-light tracking-[0.1em] text-center mb-1"
                    style={{ color: 'rgba(195, 232, 248, 0.88)', textShadow: '0 0 22px rgba(33,190,255,0.35), 0 0 50px rgba(33,150,220,0.15)', animation: 'float-title 3.5s ease-in-out infinite' }}
                  >How did it feel?</h2>
                  <p className="text-[10px] font-light text-zinc-600 text-center mb-6">Select all that apply</p>
                  <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                    {FEELINGS.map(({ label, emoji }) => {
                      const active = formFeelings.includes(label);
                      return (
                        <motion.button
                          key={label}
                          onClick={() => toggleFeeling(label)}
                          whileTap={{ scale: 0.92 }}
                          animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                          className="flex flex-col items-center gap-2 cursor-pointer"
                        >
                          <div
                            className="w-[92px] h-[92px] sm:w-[118px] sm:h-[118px] rounded-full flex items-center justify-center transition-all duration-200"
                            style={active ? {
                              background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.38) 0%, rgba(23,169,201,0.16) 100%)',
                              border: '1.5px solid rgba(33,232,255,0.65)',
                              boxShadow: '0 0 24px rgba(33,232,255,0.3), inset 0 0 18px rgba(33,232,255,0.12)',
                            } : {
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.07)',
                            }}
                          >
                            <span className="text-2xl sm:text-3xl leading-none">{emoji}</span>
                          </div>
                          <span className="text-[8px] sm:text-[9px] font-mono transition-colors duration-150" style={{ color: active ? '#21e8ff' : '#71717a' }}>{label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Section 3 — Notes + Save */}
                <motion.div
                  variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                  className="snap-center flex flex-col items-center justify-start pt-16 px-6 w-full max-w-lg mx-auto gap-8"
                  style={{ minHeight: 'calc(100vh - 85px)' }}
                >
                  <div className="w-full">
                    <h2
                      className="text-[17px] font-light tracking-[0.1em] text-center mb-4"
                      style={{ color: 'rgba(195, 232, 248, 0.88)', textShadow: '0 0 22px rgba(33,190,255,0.35), 0 0 50px rgba(33,150,220,0.15)', animation: 'float-title 3.5s ease-in-out infinite' }}
                    >Name your report</h2>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      placeholder="Optional — defaults to date and time"
                      className="w-full rounded-xl px-4 py-3 text-[12px] font-light text-zinc-300 outline-none placeholder:text-zinc-600 transition-all duration-200 text-center"
                      style={{
                        background: nameFocused ? 'rgba(23,169,201,0.07)' : 'rgba(23,169,201,0.04)',
                        border: `1px solid ${nameFocused ? 'rgba(33,232,255,0.35)' : 'rgba(33,232,255,0.12)'}`,
                        boxShadow: nameFocused ? '0 0 20px rgba(33,232,255,0.1)' : '0 0 12px rgba(33,232,255,0.04)',
                      }}
                    />
                  </div>
                  <div className="w-full">
                    <h2
                      className="text-[17px] font-light tracking-[0.1em] text-center mb-4"
                      style={{ color: 'rgba(195, 232, 248, 0.88)', textShadow: '0 0 22px rgba(33,190,255,0.35), 0 0 50px rgba(33,150,220,0.15)', animation: 'float-title 3.5s ease-in-out 0.6s infinite' }}
                    >Notes</h2>
                    <textarea
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      onFocus={() => setNotesFocused(true)}
                      onBlur={() => setNotesFocused(false)}
                      rows={5}
                      placeholder="Optional notes about your session..."
                      className="w-full rounded-xl px-4 py-3 text-[12px] font-light text-zinc-300 outline-none resize-none placeholder:text-zinc-600 transition-all duration-200 text-center"
                      style={{
                        background: notesFocused ? 'rgba(23,169,201,0.07)' : 'rgba(23,169,201,0.04)',
                        border: `1px solid ${notesFocused ? 'rgba(33,232,255,0.35)' : 'rgba(33,232,255,0.12)'}`,
                        boxShadow: notesFocused ? '0 0 20px rgba(33,232,255,0.1)' : '0 0 12px rgba(33,232,255,0.04)',
                      }}
                    />
                  </div>
                  <motion.button
                    onClick={handleSave}
                    disabled={savingInsight}
                    whileHover={savingInsight ? undefined : { scale: 1.02, boxShadow: '0 0 40px rgba(33,232,255,0.35)' }}
                    whileTap={savingInsight ? undefined : { scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="w-full py-4 rounded-2xl text-[11px] font-mono tracking-widest uppercase cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.3) 0%, rgba(33,232,255,0.12) 100%)', border: '1px solid rgba(33,232,255,0.55)', color: '#21e8ff', boxShadow: '0 0 24px rgba(33,232,255,0.18)' }}
                  >
                    {savingInsight ? 'Analyzing...' : 'Save Report'}
                  </motion.button>
                </motion.div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CircleMetricProps {
  value: string;
  unit: string;
  sub: string;
  label: string;
  accent: string;
  pulse?: boolean;
  tooltip?: string;
}

function CircleMetric({ value, unit, sub, label, accent, pulse, tooltip }: CircleMetricProps) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 22 } } }}
      className="flex flex-col items-center gap-2.5"
    >
      <motion.div
        whileHover={{ scale: 1.07 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="w-[92px] h-[92px] sm:w-[118px] sm:h-[118px] rounded-full flex flex-col items-center justify-center gap-0.5 cursor-default relative group"
        style={{
          background: `radial-gradient(circle at 38% 32%, ${accent}22 0%, ${accent}08 100%)`,
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 28px ${accent}12, inset 0 0 20px ${accent}08`,
        }}
      >
        {pulse && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ opacity: [0, 0.15, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
          />
        )}
        {/* Value — fades out on hover */}
        <div className="flex flex-col items-center gap-0.5 transition-opacity duration-150 group-hover:opacity-0">
          <div className="flex items-baseline gap-0.5 leading-none">
            <span className="text-[17px] sm:text-[22px] font-light tabular-nums" style={{ color: accent }}>{value}</span>
            {unit && <span className="text-[9px] sm:text-[11px] font-light" style={{ color: `${accent}90` }}>{unit}</span>}
          </div>
          {sub && <span className="text-[8px] sm:text-[10px] font-mono mt-1" style={{ color: `${accent}60` }}>{sub}</span>}
        </div>
        {/* Tooltip — fades in on hover */}
        {tooltip && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-4 pointer-events-none">
            <p className="text-[8px] font-mono text-center leading-relaxed" style={{ color: `${accent}bb` }}>{tooltip}</p>
          </div>
        )}
      </motion.div>
      <span className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">{label}</span>
    </motion.div>
  );
}
