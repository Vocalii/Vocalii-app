import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Mic, Square, Check, Activity, Shuffle } from 'lucide-react';
import { VocalReport, VoiceAnalyzerSections } from '../types/onboarding';
import { READ_ALOUD_PHRASES, FREE_SPEECH_PROMPTS, TWISTER_PHRASES, pickRandomPhrase } from '../lib/recordingPrompts';
import { ANALYSIS_BUFFER_SIZE, SILENCE_RMS_THRESHOLD, calibrateInputGain, applyGain, measureFrameRms } from '../lib/voiceAnalysis';
import { tokenizeWords, calculateWpm, wordLevelSimilarity, evaluateSustainedVowel, analyzeAcoustics, average } from '../lib/sectionAnalysis';
import SectionCard from './SectionCard';

interface VoiceAnalyzerPageProps {
  onBack: () => void;
  onSave: (report: Omit<VocalReport, 'id'>) => void;
  todayVocalEffort?: number | null;
  todayVocalConfidence?: number | null;
}

type SectionResult = VoiceAnalyzerSections;

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

// Used only if the /api/voice-report-insight fetch fails entirely — deterministic, references only
// what was actually measured/reported, same fallback-on-failure spirit as the server's own
// fallbackVoiceReportInsight.
function fallbackLocalInsight(result: SectionResult, feelings: string[]): string {
  const rateLine = `In your read-aloud section you spoke at ${result.readAloud.wpm} words per minute with a ${result.readAloud.matchPct}% match to the passage, and your free speech ran ${result.freeSpeech.wpm} WPM across ${result.freeSpeech.wordCount} words.`;
  const vowelLine = result.sustainedVowel.pass
    ? 'Your sustained vowel recording came through clearly.'
    : `Your sustained vowel recording didn't come through clearly — ${result.sustainedVowel.reasonIfFailed}`;
  const feelingsLine = feelings.length > 0
    ? ` You noted feeling ${feelings.join(', ').toLowerCase()} afterward — worth keeping an eye on if that continues across sessions.`
    : '';
  return `${rateLine} ${vowelLine}${feelingsLine} A steady, comfortable pace across all sections is a good sign of consistent vocal control.`;
}

const FEELINGS = [
  { label: 'Hoarseness', emoji: '🗣️' },
  { label: 'Dryness', emoji: '💧' },
  { label: 'Tension', emoji: '😬' },
  { label: 'Breathiness', emoji: '💨' },
  { label: 'Fatigue', emoji: '😴' },
  { label: 'Pain', emoji: '😣' },
];


export default function VoiceAnalyzerPage({ onBack, onSave, todayVocalEffort, todayVocalConfidence }: VoiceAnalyzerPageProps) {
  type AnalyzerPhase = 'record' | 'analyzing' | 'results' | 'too-quiet';
  type RecordingState = 'idle' | 'recording' | 'done';

  const [phase, setPhase] = useState<AnalyzerPhase>('record');
  const [resultsStep, setResultsStep] = useState<'metrics' | 'log'>('metrics');
  const [step, setStep] = useState(0); // which of the 3 recording steps (0-2)
  const [steps, setSteps] = useState(buildSteps);
  // Which attempt within the current step is active — only ever advances past 0 for Twisters/Read
  // Aloud, via "Try Another Prompt" (see handleTryAnother below). No fixed cap: someone can redo
  // as many times as they want, and whatever they recorded gets averaged in handleAnalyze().
  const [rep, setRep] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0); // summed across all 3 steps, for the saved report's duration
  const [sectionResult, setSectionResult] = useState<SectionResult | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(28).fill(0.08));

  const [formFeelings, setFormFeelings] = useState<string[]>([]);
  const [formName, setFormName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rmsReadings = useRef<number[]>([]);
  const lastPitchTime = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  // Calibrated once, on the first recording of the session, and reused for every subsequent step —
  // see calibrateInputGain. `null` means calibration hasn't run yet.
  const inputGainRef = useRef<number | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Per-step, per-attempt captured data — one array per STEPS entry, growing by one slot each time
  // an attempt finishes (no fixed size: Sustained Vowel/Free Speech only ever get one, Twisters/
  // Read Aloud can get more via "Try Another Prompt"). Combined/averaged in handleAnalyze() below.
  const allRmsReadings = useRef<number[][][]>([[], [], [], []]);
  const allAudioBlobs = useRef<(Blob | null)[][]>([[], [], [], []]);
  const allDurations = useRef<number[][]>([[], [], [], []]);
  // The exact prompt text shown at the moment each recording finished — frozen here rather than
  // read live from `steps` at analysis time, since the Shuffle button (or the auto-reshuffle
  // between attempts) can swap a step's prompt after it's already been recorded (but before
  // "Analyze Voice" is tapped). Without this, a transcript would get scored against whichever
  // prompt happens to be displayed later, not the one the person actually read.
  const allPrompts = useRef<string[][]>([[], [], [], []]);

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

  const pickMimeType = () => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ''; // browser default
  };

  const startRecording = async () => {
    try {
      rmsReadings.current = [];
      recordedChunksRef.current = [];
      lastPitchTime.current = 0;

      // Explicitly disable the browser's mic processing — auto gain control in particular will
      // actively boost quiet/silent input toward a target loudness, which both defeats the
      // loudness-based signal gate and can amplify ambient noise enough to trip the Sustained Vowel
      // quality check.
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

      // Record the actual audio alongside the live analysis — needed for server-side transcription
      // (Read Aloud / Twisters / Free Speech) and as the input to the analyzeAcoustics stub.
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      recorder.start();
      // Defensive hard stop — never let a forgotten recording run indefinitely.
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 120000);

      // Calibrate input gain to this specific mic/room once per session (not once per step) —
      // brief enough that it happens before most people start speaking after tapping record, but
      // the "Calibrating..." label below gives a clear beat to stay quiet regardless.
      if (inputGainRef.current === null) {
        setIsCalibrating(true);
        inputGainRef.current = await calibrateInputGain(analyser);
        setIsCalibrating(false);
      }

      setRecordingState('recording');
      setSeconds(0);

      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

      const floatBuffer = new Float32Array(analyser.fftSize);

      const loop = (now: number) => {
        const gain = inputGainRef.current ?? 1;

        // Waveform display reads every frame (for a smooth 60fps bar animation) — gain-compensated
        // the same as everything else, or a quiet phone mic barely moves the bars at all.
        analyser.getFloatTimeDomainData(floatBuffer);
        applyGain(floatBuffer, gain);
        const heights = new Array(28).fill(0).map((_, i) => {
          const chunk = Math.floor((floatBuffer.length / 28) * i);
          return Math.max(0.06, Math.abs(floatBuffer[chunk]) * 2.2 + 0.06);
        });
        setBarHeights(heights);

        if (now - lastPitchTime.current > 80) {
          lastPitchTime.current = now;
          rmsReadings.current.push(measureFrameRms(floatBuffer));
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
      const recorder = mediaRecorderRef.current;
      const finishStep = (blob: Blob | null) => {
        allAudioBlobs.current[step][rep] = blob;
        allRmsReadings.current[step][rep] = [...rmsReadings.current];
        allDurations.current[step][rep] = seconds;
        allPrompts.current[step][rep] = steps[step].instruction;
        setTotalSeconds(t => t + seconds);
        setRecordingState('done');
        setBarHeights(new Array(28).fill(0.08));
      };

      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          const blob = recordedChunksRef.current.length > 0
            ? new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
            : null;
          stopRecording();
          finishStep(blob);
        };
        recorder.stop();
      } else {
        // Recorder already stopped (e.g. the defensive 2-minute auto-stop in startRecording fired
        // before the user tapped stop) — any chunks it already captured via ondataavailable are
        // still sitting in recordedChunksRef, so don't discard them.
        const blob = recorder && recordedChunksRef.current.length > 0
          ? new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          : null;
        stopRecording();
        finishStep(blob);
      }
    }
  };

  const handleReRecord = () => {
    stopRecording();
    allAudioBlobs.current[step][rep] = null;
    allRmsReadings.current[step][rep] = [];
    allDurations.current[step][rep] = 0;
    allPrompts.current[step][rep] = '';
    rmsReadings.current = [];
    recordedChunksRef.current = [];
    setRecordingState('idle');
    setSeconds(0);
    setBarHeights(new Array(28).fill(0.08));
  };

  const transcribeAudio = async (blob: Blob | null): Promise<string | null> => {
    if (!blob) return null;
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        body: blob,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.transcript === 'string' && data.transcript.length > 0 ? data.transcript : null;
    } catch {
      return null;
    }
  };

  // Runs the new per-section analysis: a volume-only quality check for Sustained Vowel, and
  // server-side transcription (Whisper, via /api/transcribe) + speaking-rate/similarity math for
  // the other 3 steps. Replaces the old 4-segment acoustic combine.
  const handleAnalyze = async () => {
    setPhase('analyzing');

    const sustainedVowel = evaluateSustainedVowel(allRmsReadings.current[0][0] ?? [], allDurations.current[0][0] ?? 0);

    const transcribeStep = (stepIdx: number) => Promise.all(allAudioBlobs.current[stepIdx].map(transcribeAudio));
    const [twisterTexts, readAloudTexts, freeSpeechTexts] = await Promise.all([1, 2, 3].map(transcribeStep));

    const buildAttempts = <K extends 'accuracyPct' | 'matchPct'>(texts: (string | null)[], stepIdx: number, scoreKey: K) =>
      texts.map((text, i) => ({
        prompt: allPrompts.current[stepIdx][i],
        transcript: text,
        wpm: text ? calculateWpm(tokenizeWords(text).length, allDurations.current[stepIdx][i]) : 0,
        [scoreKey]: text ? wordLevelSimilarity(text, allPrompts.current[stepIdx][i]) : 0,
      } as { prompt: string; transcript: string | null; wpm: number } & Record<K, number>));

    const twisterAttempts = buildAttempts(twisterTexts, 1, 'accuracyPct');
    const readAloudAttempts = buildAttempts(readAloudTexts, 2, 'matchPct');

    const tongueTwisters = {
      wpm: average(twisterAttempts.map(a => a.wpm)),
      accuracyPct: average(twisterAttempts.map(a => a.accuracyPct)),
      transcript: twisterAttempts.map(a => a.transcript).filter(Boolean).join(' / ') || null,
      attempts: twisterAttempts,
    };
    const readAloud = {
      wpm: average(readAloudAttempts.map(a => a.wpm)),
      matchPct: average(readAloudAttempts.map(a => a.matchPct)),
      transcript: readAloudAttempts.map(a => a.transcript).filter(Boolean).join(' / ') || null,
      attempts: readAloudAttempts,
    };
    const freeSpeechText = freeSpeechTexts[0] ?? null;
    const freeSpeech = {
      wpm: freeSpeechText ? calculateWpm(tokenizeWords(freeSpeechText).length, allDurations.current[3][0]) : 0,
      wordCount: freeSpeechText ? tokenizeWords(freeSpeechText).length : 0,
      transcript: freeSpeechText,
    };
    const acoustics = await analyzeAcoustics(
      allAudioBlobs.current.map((blobs, i) => ({ label: steps[i].label, blob: blobs[0] ?? new Blob() }))
    );

    // A single flaky transcription shouldn't block an otherwise-fine session — only treat the whole
    // recording as unusable if Sustained Vowel failed AND every transcription came back empty.
    const allQuiet = !sustainedVowel.pass
      && twisterTexts.every(t => !t)
      && readAloudTexts.every(t => !t)
      && !freeSpeechText;
    if (allQuiet) {
      setPhase('too-quiet');
      return;
    }

    setSectionResult({ sustainedVowel, tongueTwisters, readAloud, freeSpeech, acoustics });
    setPhase('results');
  };

  // Advances to the next of the 3 recording steps, or triggers the final analysis after step 3.
  const handleNextStep = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setRep(0);
      setRecordingState('idle');
      setSeconds(0);
    } else {
      handleAnalyze();
    }
  };

  // Lets someone optionally redo Twisters/Read Aloud with a freshly shuffled prompt instead of
  // moving on — no fixed count, they can tap this as many times as they want before "Continue".
  // handleAnalyze() averages across however many attempts actually got recorded.
  const handleTryAnother = () => {
    setRep(r => r + 1);
    const list = PHRASE_LISTS_BY_STEP[step];
    if (list) {
      setSteps(prev => {
        const next = [...prev];
        next[step] = { ...next[step], instruction: pickRandomPhrase(list, next[step].instruction) };
        return next;
      });
    }
    setRecordingState('idle');
    setSeconds(0);
  };

  // Resets all 3 recorded steps — used when restarting the whole flow from the results screen.
  const handleStartOver = () => {
    stopRecording();
    setStep(0);
    setRep(0);
    setSteps(buildSteps());
    setRecordingState('idle');
    setSeconds(0);
    setTotalSeconds(0);
    setBarHeights(new Array(28).fill(0.08));
    rmsReadings.current = [];
    recordedChunksRef.current = [];
    allRmsReadings.current = [[], [], [], []];
    allAudioBlobs.current = [[], [], [], []];
    allDurations.current = [[], [], [], []];
    allPrompts.current = [[], [], [], []];
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

  // The AI insight is generated at Save time, not shown during the session — it needs the final
  // feelings/notes the person picks on this screen, and showing it earlier meant it was talking
  // about symptoms before they'd had a chance to select any. It only ever appears afterward, on
  // the saved report in ReportsPage (which already just renders `report.insight`).
  const handleSave = async () => {
    if (!sectionResult || insightLoading) return;
    setInsightLoading(true);

    let insight: string;
    let recommendedRituals: { ritualId: string; reason: string }[];
    try {
      const res = await fetch('/api/voice-report-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sustainedVowel: sectionResult.sustainedVowel,
          tongueTwisters: { wpm: sectionResult.tongueTwisters.wpm, accuracyPct: sectionResult.tongueTwisters.accuracyPct },
          readAloud: { wpm: sectionResult.readAloud.wpm, matchPct: sectionResult.readAloud.matchPct },
          freeSpeech: { wpm: sectionResult.freeSpeech.wpm, wordCount: sectionResult.freeSpeech.wordCount },
          feelings: formFeelings,
          notes: formNotes,
          todayVocalEffort: todayVocalEffort ?? null,
          todayVocalConfidence: todayVocalConfidence ?? null,
        }),
      });
      const data = await res.json();
      insight = typeof data.insight === 'string' ? data.insight : fallbackLocalInsight(sectionResult, formFeelings);
      recommendedRituals = Array.isArray(data.recommendedRituals) ? data.recommendedRituals : [];
    } catch {
      insight = fallbackLocalInsight(sectionResult, formFeelings);
      recommendedRituals = [];
    }

    const now = new Date();
    const autoName = `Vocal Report — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    // A transparent, self-reported "load index" — how many "How did it feel?" symptoms were
    // picked — not an acoustic measurement. Kept on the same 0-100 scale the field has always used
    // (PDF export and old reports' display both depend on it).
    const fatigueLevel = Math.round((formFeelings.length / FEELINGS.length) * 100);
    onSave({
      name: formName.trim() || autoName,
      ritualName: autoName,
      category: 'Calibrate',
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: formatTime(totalSeconds),
      fatigueLevel,
      feelings: formFeelings,
      notes: formNotes,
      insight,
      sections: sectionResult,
      recommendedRituals,
    });
    onBack();
  };

  const toggleFeeling = (label: string) => {
    setFormFeelings(prev => prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]);
  };

  return (
    <div className="min-h-screen w-full relative">

      {/* Header */}
      <div className="relative z-10 flex items-center gap-4 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(33,232,255,0.06)' }}>
        <button
          onClick={
            resultsStep === 'log'
              ? () => setResultsStep('metrics')
              : phase === 'results'
                ? () => { setPhase('record'); setSectionResult(null); setResultsStep('metrics'); handleStartOver(); }
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
              : () => { setPhase('record'); setSectionResult(null); setResultsStep('metrics'); handleStartOver(); }
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
            <p className="text-[10px] font-light tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.45)' }}>Real-time vocal analysis</p>
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
                {rep > 0 && (
                  <span className="text-[9px] font-mono text-zinc-500">Attempt {rep + 1}</span>
                )}
                {PHRASE_LISTS_BY_STEP[step] && recordingState === 'idle' && (
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
              {step === 0 && (
                <p className="text-[9px] font-mono text-zinc-600 mt-2">{steps[step].hint}</p>
              )}
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

              <p className="text-[11px] font-normal tracking-widest text-center w-full" style={{
                color: isCalibrating ? '#fbbf24' : recordingState === 'idle' ? 'rgba(33,232,255,0.5)' : recordingState === 'recording' ? 'rgba(33,232,255,0.7)' : '#ffffff'
              }}>
                {isCalibrating && 'CALIBRATING MIC — STAY QUIET...'}
                {!isCalibrating && recordingState === 'idle' && 'TAP TO RECORD'}
                {!isCalibrating && recordingState === 'recording' && 'TAP TO STOP'}
                {!isCalibrating && recordingState === 'done' && 'RECORDING COMPLETE'}
              </p>
            </div>

            {/* Waveform — only while actively recording */}
            <AnimatePresence>
              {recordingState === 'recording' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 64 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full max-w-lg flex items-center justify-center gap-[3px] overflow-hidden"
                >
                  {barHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: h }}
                      transition={{ duration: 0.06, ease: 'linear' }}
                      className="w-1.5 rounded-full origin-center"
                      style={{ height: 48, background: `rgba(33,232,255,${0.3 + h * 0.7})` }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Re-record / Try another prompt */}
            <AnimatePresence>
              {recordingState === 'done' && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center gap-4"
                >
                  <button
                    onClick={handleReRecord}
                    className="text-[11px] text-white hover:text-zinc-300 tracking-wide underline underline-offset-2 transition-colors duration-150 cursor-pointer"
                  >
                    Re-record
                  </button>
                  {(step === 1 || step === 2) && (
                    <button
                      onClick={handleTryAnother}
                      className="text-[11px] text-[#21e8ff]/70 hover:text-[#21e8ff] tracking-wide underline underline-offset-2 transition-colors duration-150 cursor-pointer"
                    >
                      Try another prompt
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer */}
            {recordingState === 'recording' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[28px] font-light text-[#ffffff]/70 tabular-nums"
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

        {/* ── PHASE: RESULTS — step 1: per-section results ── */}
        {phase === 'results' && sectionResult && resultsStep === 'metrics' && (
          <motion.div
            key="results-metrics"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            className="relative z-10 flex flex-col items-center px-6 pt-10 pb-2 gap-10"
          >
            {/* Section cards — one per recorded step, replacing the old combined acoustic score */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              <SectionCard
                label="Sustained Vowel" accent="#21e8ff"
                primary={sectionResult.sustainedVowel.pass ? 'Pass' : 'Needs retry'}
                detail={sectionResult.sustainedVowel.reasonIfFailed ?? 'Clear, usable recording'}
              />
              <SectionCard
                label="Tongue Twisters" accent="#a78bfa"
                primary={`${sectionResult.tongueTwisters.wpm} WPM`}
                detail={`${sectionResult.tongueTwisters.accuracyPct}% accuracy`}
                attempts={sectionResult.tongueTwisters.attempts?.map(a => ({ prompt: a.prompt, score: `${a.accuracyPct}% · ${a.wpm} WPM` }))}
              />
              <SectionCard
                label="Read Aloud" accent="#fbbf24"
                primary={`${sectionResult.readAloud.wpm} WPM`}
                detail={`${sectionResult.readAloud.matchPct}% match`}
                attempts={sectionResult.readAloud.attempts?.map(a => ({ prompt: a.prompt, score: `${a.matchPct}% · ${a.wpm} WPM` }))}
              />
              <SectionCard
                label="Free Speech" accent="#34d399"
                primary={`${sectionResult.freeSpeech.wpm} WPM`}
                detail={`${sectionResult.freeSpeech.wordCount} words`}
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
        {phase === 'results' && sectionResult && resultsStep === 'log' && (
          <div className="relative">
            {/* Section dots */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-20 pointer-events-none" style={{ height: 'calc(100vh - 85px)' }}>
              <div className="flex flex-col gap-2.5 m-auto">
                {[0, 1].map(i => (
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

                {/* Section 1 — How did it feel */}
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

                {/* Section 2 — Notes + Save */}
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
                    disabled={insightLoading}
                    whileHover={insightLoading ? undefined : { scale: 1.02, boxShadow: '0 0 40px rgba(33,232,255,0.35)' }}
                    whileTap={insightLoading ? undefined : { scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="w-full py-4 rounded-2xl text-[11px] font-mono tracking-widest uppercase cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, rgba(23,169,201,0.3) 0%, rgba(33,232,255,0.12) 100%)', border: '1px solid rgba(33,232,255,0.55)', color: '#21e8ff', boxShadow: '0 0 24px rgba(33,232,255,0.18)' }}
                  >
                    {insightLoading ? 'Generating insight...' : 'Save Report'}
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

