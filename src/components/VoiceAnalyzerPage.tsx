import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Mic, Check, Shuffle, Sparkles, Pause, Play, Pencil, X } from 'lucide-react';
import { VocalReport, VoiceAnalyzerSections, WordMatchDetail } from '../types/onboarding';
import { READ_ALOUD_PHRASES, FREE_SPEECH_PROMPTS, TWISTER_PHRASES, pickRandomPhrase } from '../lib/recordingPrompts';
import { ANALYSIS_BUFFER_SIZE, SILENCE_RMS_THRESHOLD, calibrateInputGain, applyGain, measureFrameRms } from '../lib/voiceAnalysis';
import { tokenizeWords, calculateWpm, alignWords, evaluateSustainedVowel, analyzeAcoustics, average, summarizeVoiceFunction, summarizeSpeechPerformance } from '../lib/sectionAnalysis';
import SectionCard from './SectionCard';
import ExpressiveDeliverySection from './ExpressiveDeliverySection';
import VoiceFunctionSection from './VoiceFunctionSection';
import SpeechPerformanceStats from './SpeechPerformanceStats';
import { fetchExpressiveDelivery, mergeExpressiveDelivery } from '../lib/expressiveDelivery';

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

// Shown behind the info icon on the prompt card — what this step actually measures, in plain
// terms, since the new per-section scoring (WPM/accuracy/match/word count) isn't self-explanatory
// from the prompt text alone.
const STEP_INFO = [
  "Checks that a usable, steady recording came through — just pass/fail on volume and length, no scoring.",
  "Your words are transcribed and compared to this phrase to measure accuracy, plus your speaking rate in words per minute.",
  "Your words are transcribed and compared to this passage to measure how closely it matches, plus your speaking rate in words per minute.",
  "Your words are transcribed to measure speaking rate and word count — there's no target text here, so no accuracy score.",
];

// Used only if the /api/voice-report-insight fetch fails entirely — deterministic, references only
// what was actually measured/reported, same fallback-on-failure spirit as the server's own
// fallbackVoiceReportInsight.
function fallbackLocalInsight(result: SectionResult): string {
  const rateLine = `In your read-aloud section you spoke at ${result.readAloud.wpm} words per minute with a ${result.readAloud.matchPct}% match to the passage, and your free speech ran ${result.freeSpeech.wpm} WPM across ${result.freeSpeech.wordCount} words.`;
  const vowelLine = result.sustainedVowel.pass
    ? 'Your sustained vowel recording came through clearly.'
    : `Your sustained vowel recording didn't come through clearly — ${result.sustainedVowel.reasonIfFailed}`;
  return `${rateLine} ${vowelLine} A steady, comfortable pace across all sections is a good sign of consistent vocal control.`;
}

// Shimmer sweep shared by the two skeleton shapes below — a soft diagonal band looping across the
// card, same visual language as the hover sweeps elsewhere in the app, just looping on its own.
function SkeletonShimmer({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute inset-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
      animate={{ x: ['-120%', '220%'] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay }}
    />
  );
}

// Placeholder for one of the four SectionCard grid cells on the results screen, shown while that
// data is still being computed — same size/shape/accent as the real card, just empty bars instead
// of text, so the layout that's about to land is already visible.
function SkeletonCard({ accent, delay = 0 }: { accent: string; delay?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-4 py-4 flex flex-col gap-2.5"
      style={{
        background: `radial-gradient(circle at 25% 20%, ${accent}1c 0%, ${accent}08 100%)`,
        border: `1px solid ${accent}40`,
      }}
    >
      <SkeletonShimmer delay={delay} />
      <div className="relative h-[9px] w-16 rounded-full" style={{ background: `${accent}30` }} />
      <div className="relative h-[19px] w-20 rounded-full" style={{ background: `${accent}28` }} />
      <div className="relative h-[10px] w-24 rounded-full" style={{ background: `${accent}18` }} />
    </div>
  );
}

// Placeholder for the Expressive Delivery card (ExpressiveDeliverySection) — same full-width,
// pill-shaped-chips shape, shown even though that section may end up not rendering at all (Hume
// is optional); an empty skeleton here costs nothing once the real content either appears or not.
function SkeletonExpressiveCard({ delay = 0 }: { delay?: number }) {
  const accent = '#f472b6';
  return (
    <div
      className="relative overflow-hidden col-span-2 rounded-2xl px-4 py-4 flex flex-col gap-3"
      style={{
        background: `radial-gradient(circle at 25% 20%, ${accent}1c 0%, ${accent}08 100%)`,
        border: `1px solid ${accent}40`,
      }}
    >
      <SkeletonShimmer delay={delay} />
      <div className="relative h-[9px] w-32 rounded-full" style={{ background: `${accent}30` }} />
      <div className="relative flex gap-2">
        <div className="h-[22px] w-20 rounded-full" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }} />
        <div className="h-[22px] w-24 rounded-full" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }} />
      </div>
      <div className="relative h-[9px] w-full rounded-full" style={{ background: `${accent}12` }} />
    </div>
  );
}


export default function VoiceAnalyzerPage({ onBack, onSave, todayVocalEffort, todayVocalConfidence }: VoiceAnalyzerPageProps) {
  type AnalyzerPhase = 'record' | 'analyzing' | 'results' | 'too-quiet';
  type RecordingState = 'idle' | 'recording' | 'done';

  const [phase, setPhase] = useState<AnalyzerPhase>('record');
  const [step, setStep] = useState(0); // which of the 3 recording steps (0-2)
  // Tap-to-open info modal for the current step, same "?" button + modal pattern as the Voice
  // Check-In card's "How Your Score Works" on the homepage, instead of a hover tooltip.
  const [showStepInfo, setShowStepInfo] = useState(false);
  const [steps, setSteps] = useState(buildSteps);
  // Which attempt within the current step is active — only ever advances past 0 for Twisters/Read
  // Aloud, via "Try Another Prompt" (see handleTryAnother below). No fixed cap: someone can redo
  // as many times as they want, and whatever they recorded gets averaged in handleAnalyze().
  const [rep, setRep] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  // Mid-recording pause — a sibling of recordingState rather than a 4th RecordingState value,
  // since it only ever applies while recordingState === 'recording'.
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0); // summed across all 3 steps, for the saved report's duration
  const [sectionResult, setSectionResult] = useState<SectionResult | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(28).fill(0.08));

  const [insightLoading, setInsightLoading] = useState(false);
  // Replaces the old "Name your report" step — editable inline in the results header instead,
  // same pencil pattern as a saved report's title. autoName is the date/time default, computed
  // once results are reached; formName holds the override once someone edits it.
  const [autoName, setAutoName] = useState('');
  const [formName, setFormName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Held onto (rather than kept local to startRecording) so handleResume can restart the same
  // analysis loop after a pause without re-running getUserMedia/calibration.
  const analyserRef = useRef<AnalyserNode | null>(null);
  const floatBufferRef = useRef<Float32Array<ArrayBufferLike> | null>(null);
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
  // Whether the server has Hume configured — gates the "delivery is evaluated too" note on Free
  // Speech so it never promises an evaluation that won't happen. Defaults to hidden on any failure.
  const [humeEnabled, setHumeEnabled] = useState(false);
  useEffect(() => {
    fetch('/api/hume-status').then(r => r.json()).then(d => setHumeEnabled(d?.enabled === true)).catch(() => {});
  }, []);

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

  // Reads from analyserRef/floatBufferRef (rather than closing over local variables) so both
  // startRecording and handleResume can (re)start the exact same loop.
  const runAnalysisLoop = useCallback((now: number) => {
    const analyser = analyserRef.current;
    const floatBuffer = floatBufferRef.current;
    if (!analyser || !floatBuffer) return;
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

    rafRef.current = requestAnimationFrame(runAnalysisLoop);
  }, []);

  const startRecording = async () => {
    try {
      rmsReadings.current = [];
      recordedChunksRef.current = [];
      lastPitchTime.current = 0;
      setIsPaused(false);

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
      analyserRef.current = analyser;
      floatBufferRef.current = new Float32Array(analyser.fftSize);

      // Record the actual audio alongside the live analysis — needed for server-side transcription
      // (Read Aloud / Twisters / Free Speech) and as the input to the analyzeAcoustics stub.
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      recorder.start();
      // Defensive hard stop — never let a forgotten recording run indefinitely.
      setTimeout(() => { if (recorder.state === 'recording' || recorder.state === 'paused') recorder.stop(); }, 120000);

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
      rafRef.current = requestAnimationFrame(runAnalysisLoop);

    } catch {
      setRecordingState('idle');
    }
  };

  const handleMicClick = () => {
    if (recordingState === 'idle') {
      startRecording();
    }
  };

  // Freezes the waveform/timer in place without ending the recording — the MediaRecorder itself
  // supports this directly, so the audio already captured and what's captured after Resume both
  // end up in the same final blob.
  const handlePause = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPaused(true);
  };

  const handleResume = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    rafRef.current = requestAnimationFrame(runAnalysisLoop);
    setIsPaused(false);
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    const finishStep = (blob: Blob | null) => {
      allAudioBlobs.current[step][rep] = blob;
      allRmsReadings.current[step][rep] = [...rmsReadings.current];
      allDurations.current[step][rep] = seconds;
      allPrompts.current[step][rep] = steps[step].instruction;
      setTotalSeconds(t => t + seconds);
      setRecordingState('done');
      setIsPaused(false);
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
    setIsPaused(false);
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
    // Optional Hume expressive-delivery analysis — Read Aloud + Free Speech only, run alongside
    // transcription. fetchExpressiveDelivery never rejects, so it can't affect anything below.
    const expressivePromise = Promise.all([
      ...allAudioBlobs.current[2].map((blob, i) => fetchExpressiveDelivery(blob, allDurations.current[2][i] ?? 0)),
      fetchExpressiveDelivery(allAudioBlobs.current[3][0] ?? null, allDurations.current[3][0] ?? 0),
    ]).then(mergeExpressiveDelivery);

    const [[twisterTexts, readAloudTexts, freeSpeechTexts], expressiveDelivery] = await Promise.all([
      Promise.all([1, 2, 3].map(transcribeStep)),
      expressivePromise,
    ]);

    const buildAttempts = <K extends 'accuracyPct' | 'matchPct'>(texts: (string | null)[], stepIdx: number, scoreKey: K) =>
      texts.map((text, i) => {
        const prompt = allPrompts.current[stepIdx][i];
        // Word-by-word comparison with the prompt (what was heard, missed, swapped or added).
        const aligned = text ? alignWords(text, prompt) : null;
        const match: WordMatchDetail | undefined = aligned
          ? { ops: aligned.ops, correct: aligned.correct, substituted: aligned.substituted, omitted: aligned.omitted, added: aligned.added, referenceWordCount: aligned.referenceWordCount, wordsToRetry: aligned.wordsToRetry }
          : undefined;
        return {
          prompt,
          transcript: text,
          wpm: text ? calculateWpm(tokenizeWords(text).length, allDurations.current[stepIdx][i]) : 0,
          [scoreKey]: aligned?.matchPct ?? 0,
          ...(match && { match }),
        } as { prompt: string; transcript: string | null; wpm: number; match?: WordMatchDetail } & Record<K, number>;
      });

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
      allAudioBlobs.current.map((blobs, i) => ({ label: steps[i].label, blob: blobs[0] ?? new Blob(), expectedText: allPrompts.current[i][0] }))
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

    setSectionResult({ sustainedVowel, tongueTwisters, readAloud, freeSpeech, acoustics, ...(expressiveDelivery && { expressiveDelivery }) });
    const now = new Date();
    setAutoName(`Vocal Report — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
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
    setIsPaused(false);
    setSeconds(0);
    setTotalSeconds(0);
    setBarHeights(new Array(28).fill(0.08));
    setFormName('');
    setIsEditingName(false);
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

    const hasExpressiveDelivery = !!sectionResult.expressiveDelivery && sectionResult.expressiveDelivery.length > 0;

    const [{ insight }, expressiveResult] = await Promise.all([
      (async () => {
        try {
          const res = await fetch('/api/voice-report-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sustainedVowel: sectionResult.sustainedVowel,
              tongueTwisters: { wpm: sectionResult.tongueTwisters.wpm, accuracyPct: sectionResult.tongueTwisters.accuracyPct },
              readAloud: { wpm: sectionResult.readAloud.wpm, matchPct: sectionResult.readAloud.matchPct },
              freeSpeech: { wpm: sectionResult.freeSpeech.wpm, wordCount: sectionResult.freeSpeech.wordCount },
              feelings: [],
              notes: '',
              todayVocalEffort: todayVocalEffort ?? null,
              todayVocalConfidence: todayVocalConfidence ?? null,
            }),
          });
          const data = await res.json();
          return { insight: typeof data.insight === 'string' ? data.insight : fallbackLocalInsight(sectionResult) };
        } catch {
          return { insight: fallbackLocalInsight(sectionResult) };
        }
      })(),
      // Separate dedicated per-category descriptions for expressive delivery — combines the Hume
      // signals with the actual Read Aloud / Free Speech transcripts (see
      // /api/expressive-delivery-insight). Only fetched when there's something to describe.
      hasExpressiveDelivery
        ? (async (): Promise<{ key: string; description: string }[]> => {
            try {
              const res = await fetch('/api/expressive-delivery-insight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  categories: sectionResult.expressiveDelivery!.map(c => ({ key: c.key, label: c.label, words: c.words })),
                  readAloudTranscript: sectionResult.readAloud.transcript,
                  freeSpeechTranscript: sectionResult.freeSpeech.transcript,
                }),
              });
              const data = await res.json();
              return Array.isArray(data.categories) ? data.categories : [];
            } catch {
              return [];
            }
          })()
        : Promise.resolve([]),
    ]);
    // Merges each category's AI-written description (see /api/expressive-delivery-insight) back
    // onto its words — ExpressiveDeliverySection falls back to showing just the words when a
    // category has no description (API key missing, call failed, or nothing came back for it).
    const expressiveDeliveryWithDescriptions = sectionResult.expressiveDelivery?.map(c => {
      const match = expressiveResult.find(r => r.key === c.key);
      return match ? { ...c, description: match.description } : c;
    });

    const now = new Date();
    onSave({
      name: formName.trim() || autoName,
      ritualName: autoName,
      category: 'Calibrate',
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: formatTime(totalSeconds),
      // No more self-reported symptoms to derive a "load index" from — kept at 0 rather than
      // removed, since PDF export and old reports' display both still depend on this field.
      fatigueLevel: 0,
      feelings: [],
      notes: '',
      insight,
      sections: {
        ...sectionResult,
        ...(expressiveDeliveryWithDescriptions && { expressiveDelivery: expressiveDeliveryWithDescriptions }),
      },
    });
  };

  // Sustained Vowel is the only step with a check cheap enough to run the instant recording stops —
  // no transcription or server round-trip needed, just the RMS samples and duration already captured
  // live. Surfaced immediately here (rather than only at the end, in the final report's vowelLine)
  // so the user can redo it before moving on, instead of discovering it failed after the whole session.
  const sustainedVowelCheck = step === 0 && recordingState === 'done'
    ? evaluateSustainedVowel(allRmsReadings.current[0][rep] ?? [], allDurations.current[0][rep] ?? 0)
    : null;

  return (
    <div className="min-h-screen w-full relative">

      {/* Header — hidden on the Analyzing screen, which has no back/re-record action and no title
          of its own; "Analyzing your voice" takes its place as the page's top label instead. */}
      {phase !== 'analyzing' && (
      <div className="relative z-10 flex items-center gap-4 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(33,232,255,0.06)' }}>
        {phase !== 'results' && (
          <>
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
              style={{ background: 'rgba(23,169,201,0.06)', border: '1px solid rgba(33,232,255,0.15)' }}
            >
              <ChevronLeft className="w-4 h-4 " />
            </button>
            <div>
              <h1 className="text-[15px] font-light text-white tracking-wide">Voice Analyzer</h1>
              <p className="text-[10px] font-light tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.45)' }}>Real-time vocal analysis</p>
            </div>
          </>
        )}
        {phase === 'record' && (
          <div className="ml-auto flex items-center gap-2">
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
        )}
        {phase === 'results' && (
          isEditingName ? (
            <div className="mx-auto flex items-center gap-2 min-w-0">
              <input
                autoFocus
                value={editNameValue}
                onChange={e => setEditNameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setFormName(editNameValue.trim()); setIsEditingName(false); }
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="text-[15px] font-light text-white tracking-wide bg-transparent border-b border-[#21e8ff]/50 focus:border-[#21e8ff] outline-none min-w-0 text-center"
              />
              <button
                onClick={() => { setFormName(editNameValue.trim()); setIsEditingName(false); }}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                style={{ background: 'rgba(33,232,255,0.1)', border: '1px solid rgba(33,232,255,0.25)' }}
              >
                <Check className="w-3.5 h-3.5 text-[#21e8ff]" />
              </button>
            </div>
          ) : (
            <div className="mx-auto flex items-center gap-2 min-w-0">
              <h1 className="text-[15px] font-light text-white tracking-wide truncate">
                {formName.trim() || autoName}
              </h1>
              <button
                onClick={() => { setEditNameValue(formName.trim() || autoName); setIsEditingName(true); }}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer opacity-50 hover:opacity-100 transition-opacity duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)' }}
                aria-label="Rename this report"
                title="Rename this report"
              >
                <Pencil className="w-3 h-3 text-white" />
              </button>
            </div>
          )
        )}
      </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── PHASE: RECORD ── */}
        {phase === 'record' && (
          <motion.div
            key="record"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 flex flex-col items-center px-6 pt-20 pb-10 gap-8"
          >
            {step === 3 && humeEnabled && (
              <div
                className="absolute top-4 right-6 flex items-center gap-1 px-2.5 py-1 rounded-full cursor-help"
                style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.3)' }}
                title="Your delivery is evaluated too — speak naturally and let your expression come through."
              >
                <Sparkles className="w-3 h-3" style={{ color: 'rgba(244,114,182,0.3)' }} />
                <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'rgba(244,114,182,0.3)' }}>Hume</span>
              </div>
            )}

            {/* Re-record — sits above the complete icon now, fading in well after it (which has no
                delay) together with the Try Another Prompt/Continue pair below, so the complete
                state reveals itself icon-first and the actions arrive as one smooth, deliberate
                beat afterward. */}
            <AnimatePresence mode="popLayout">
              {recordingState === 'done' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
                  className="flex items-center gap-4"
                >
                  <button
                    onClick={handleReRecord}
                    className="text-[11px] text-[#17A9C9] hover:text-[#21e8ff] tracking-wide transition-colors duration-150 cursor-pointer"
                  >
                    Re-record
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mic button — same radial-gradient + ping-ring treatment as Reports' "Record Analysis" button.
                Animated in/out rather than a hard mount/unmount, so stopping a recording crossfades
                smoothly into this instead of the green check button just popping into place. */}
            <AnimatePresence mode="popLayout">
              {recordingState !== 'recording' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="relative flex flex-col items-center gap-5"
                >
                  {!isCalibrating && (
                    <button
                      onClick={handleMicClick}
                      className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${recordingState === 'done' ? '' : 'hover:scale-[1.08] active:scale-95'}`}
                      style={
                        recordingState === 'done'
                          ? { background: 'radial-gradient(circle at 38% 32%, rgba(34,197,94,0.22) 0%, rgba(22,163,74,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(34,197,94,0.45)', boxShadow: '0 0 28px rgba(34,197,94,0.18), inset 0 0 20px rgba(34,197,94,0.06)' }
                          : { background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.22) 0%, rgba(23,169,201,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(33,232,255,0.45)', boxShadow: '0 0 28px rgba(33,232,255,0.18), inset 0 0 20px rgba(33,232,255,0.06)' }
                      }
                    >
                      {recordingState === 'idle' && (
                        <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ border: '1px solid rgba(33,232,255,0.6)', animationDuration: '2.4s' }} />
                      )}
                      {recordingState === 'idle' && <Mic className="w-8 h-8 text-[#21e8ff]" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 8px rgba(33,232,255,0.6))' }} />}
                      {recordingState === 'done' && <Check className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />}
                    </button>
                  )}

                  <p className="text-[11px] font-normal tracking-widest text-center w-full" style={{
                    color: isCalibrating ? '#fbbf24' : recordingState === 'idle' ? 'rgba(33,232,255,0.5)' : '#ffffff'
                  }}>
                    {isCalibrating && 'CALIBRATING MIC — STAY QUIET...'}
                    {!isCalibrating && recordingState === 'idle' && 'TAP TO RECORD'}
                    {!isCalibrating && recordingState === 'done' && 'RECORDING COMPLETE'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording row — small stop button and timer flank the waveform, sitting above the
                prompt card (matching the design gallery) instead of below it. popLayout so this
                doesn't shove the Prompt/Re-record/Continue below it into a visible slide as it
                collapses on exit. */}
            <AnimatePresence mode="popLayout">
              {recordingState === 'recording' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 80, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
                  className="w-full max-w-lg flex items-center gap-2 overflow-y-hidden pr-2"
                >
                  <span className="text-[13px] font-light text-[#ffffff]/70 tabular-nums shrink-0">
                    {formatTime(seconds)}
                  </span>

                  <div className="flex-1 flex items-center justify-center gap-[3px] h-full">
                    {barHeights.map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: h }}
                        transition={{ duration: 0.06, ease: 'linear' }}
                        className="w-1 rounded-full origin-center"
                        style={{
                          height: 32,
                          background: `rgba(33,232,255,${0.35 + h * 0.5})`,
                          backdropFilter: 'blur(2px)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          boxShadow: `0 0 ${4 + h * 6}px rgba(33,232,255,${0.3 + h * 0.4}), inset 0 1px 0 rgba(255,255,255,0.15)`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Expands into Resume + Complete once paused, instead of the single Pause
                      button. The whole paused group is one AnimatePresence item (mode="popLayout")
                      so the outgoing Pause button clears the layout immediately instead of holding
                      space while it fades — that's what made the swap feel busted before. */}
                  <motion.div layout transition={{ layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }} className="flex items-center gap-3 shrink-0">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {!isPaused ? (
                        <motion.button
                          key="pause"
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={handlePause}
                          className="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer"
                          style={{ background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.3) 0%, rgba(23,169,201,0.12) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(33,232,255,0.6)', boxShadow: '0 0 16px rgba(33,232,255,0.25), inset 0 0 10px rgba(33,232,255,0.08)' }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-full"
                            animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ background: 'rgba(33,232,255,0.25)' }}
                          />
                          <Pause className="relative w-4 h-4 text-[#21e8ff]" strokeWidth={1.5} />
                        </motion.button>
                      ) : (
                        <motion.div
                          key="paused-group"
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                          className="flex items-center gap-3"
                        >
                          <button
                            onClick={handleResume}
                            className="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-[1.08] active:scale-95 cursor-pointer"
                            style={{ background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.22) 0%, rgba(23,169,201,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(33,232,255,0.45)', boxShadow: '0 0 14px rgba(33,232,255,0.18)' }}
                          >
                            <Play className="relative w-4 h-4 text-[#21e8ff]" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={handleStopRecording}
                            className="relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-[1.08] active:scale-95 cursor-pointer"
                            style={{ background: 'radial-gradient(circle at 38% 32%, rgba(34,197,94,0.22) 0%, rgba(22,163,74,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(34,197,94,0.45)', boxShadow: '0 0 14px rgba(34,197,94,0.2)' }}
                          >
                            <Check className="relative w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt — same soft radial-glow panel used for the goal-question card on the Weekly
                Check-In and the AI Insight card on this page's own results screen, instead of the
                old bordered gradient box. Hidden once the recording is done — the phrase already
                read doesn't need to stay on screen. popLayout so this collapsing doesn't shove the
                Re-record/Continue buttons below it into a visible slide as it shrinks. */}
            <AnimatePresence mode="popLayout">
              {recordingState !== 'done' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative w-full max-w-lg overflow-hidden"
                >
                  <div className="relative rounded-3xl px-9 py-8 text-center">
                    <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(23,169,201,0.1) 0%, rgba(33,232,255,0.04) 55%, transparent 100%)' }} />
                    {PHRASE_LISTS_BY_STEP[step] && recordingState === 'idle' && (
                      <button
                        onClick={handleSwapPhrase}
                        className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-150 cursor-pointer"
                        aria-label="Try a different phrase"
                        title="Try a different phrase"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="relative flex items-center justify-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.5)' }}>{steps[step].label}</p>
                        <button
                          onClick={() => setShowStepInfo(true)}
                          className="w-4 h-4 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer flex-shrink-0"
                          style={{ border: '1px solid rgba(33,232,255,0.5)', color: 'rgba(33,232,255,0.5)' }}
                          aria-label={`What does ${steps[step].label} measure?`}
                        >
                          <span className="text-[9px] font-bold leading-none">?</span>
                        </button>
                      </div>
                      {rep > 0 && (
                        <span className="text-[9px] font-mono text-zinc-500">Attempt {rep + 1}</span>
                      )}
                    </div>
                    <p className="relative text-[17px] font-light text-zinc-200 leading-relaxed italic">
                      {steps[step].instruction}
                    </p>
                    {step === 0 && (
                      <p className="relative text-[9px] font-mono text-zinc-600 mt-2">{steps[step].hint}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sustained Vowel only — evaluateSustainedVowel runs the instant recording stops (just
                RMS + duration, already captured live), so a bad take is flagged here before the user
                moves on, instead of only surfacing in the final report's vowelLine. */}
            <AnimatePresence mode="popLayout">
              {sustainedVowelCheck && !sustainedVowelCheck.pass && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.6 } }}
                  exit={{ opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
                  className="w-full max-w-sm px-4 py-3 rounded-2xl text-center"
                  style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}
                >
                  <p className="text-[12px] text-amber-400/90 leading-relaxed">{sustainedVowelCheck.reasonIfFailed}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Try another prompt / Next step — Try another prompt sits beside Continue now, as a
                quiet secondary button rather than a link, so the resulting score always means "the
                last thing you recorded," not something that can quietly change after the fact. */}
            <AnimatePresence mode="popLayout">
              {recordingState === 'done' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
                  className="flex items-center gap-3"
                >
                  {(step === 1 || step === 2) && (
                    <motion.button
                      onClick={handleTryAnother}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-6 py-4 rounded-2xl text-[13px] font-light tracking-wide text-zinc-400 hover:text-zinc-200 cursor-pointer transition-all duration-300"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Try Another Prompt
                    </motion.button>
                  )}
                  <motion.button
                    onClick={handleNextStep}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={sustainedVowelCheck && !sustainedVowelCheck.pass
                      ? 'px-6 py-4 rounded-2xl text-[13px] font-light tracking-wide text-zinc-500 hover:text-zinc-300 cursor-pointer transition-all duration-300'
                      : 'px-11 py-4 rounded-2xl text-[15px] font-light tracking-wide cursor-pointer transition-all duration-300'}
                    style={sustainedVowelCheck && !sustainedVowelCheck.pass
                      ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                      : { background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.14) 0%, rgba(23,169,201,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(33,232,255,0.45)', color: '#21e8ff', boxShadow: '0 0 24px rgba(33,232,255,0.15), inset 0 0 20px rgba(33,232,255,0.03)' }}
                  >
                    {sustainedVowelCheck && !sustainedVowelCheck.pass
                      ? 'Continue Anyway'
                      : step < steps.length - 1 ? 'Continue' : 'Analyze Voice'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── PHASE: ANALYZING — skeletons of the section cards about to land, instead of a
            generic spinner, so the shape of what's coming is already visible. ── */}
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center px-6 pt-20 pb-2 gap-8"
          >
            <p className="text-[11px] font-mono tracking-widest uppercase" style={{ color: 'rgba(33,232,255,0.5)' }}>
              Analyzing your voice
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              <SkeletonCard accent="#21e8ff" />
              <SkeletonCard accent="#a78bfa" delay={0.08} />
              <SkeletonCard accent="#fbbf24" delay={0.16} />
              <SkeletonCard accent="#34d399" delay={0.24} />
              <SkeletonExpressiveCard delay={0.32} />
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
            <motion.button
              onClick={() => { setPhase('record'); handleStartOver(); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-11 py-4 rounded-2xl text-[15px] font-light tracking-wide cursor-pointer transition-all duration-300"
              style={{ background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.14) 0%, rgba(23,169,201,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(33,232,255,0.45)', color: '#21e8ff', boxShadow: '0 0 24px rgba(33,232,255,0.15), inset 0 0 20px rgba(33,232,255,0.03)' }}
            >
              Try Again
            </motion.button>
          </motion.div>
        )}

        {/* ── PHASE: RESULTS ── */}
        {phase === 'results' && sectionResult && (
          <motion.div
            key="results-metrics"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            className="relative z-10 flex flex-col items-center px-6 pt-10 pb-2 gap-10"
          >
            {/* Three free-floating sections for the whole session, replacing the old per-step
                SectionCard grid plus separate Acoustic/Expressive cards. */}
            <div className="flex flex-col gap-8 w-full max-w-lg">
              <ExpressiveDeliverySection categories={sectionResult.expressiveDelivery} />
              <VoiceFunctionSection summary={summarizeVoiceFunction(sectionResult.acoustics)} />
              <div className="w-full flex flex-col gap-3.5">
                <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 text-center">Speech Performance</span>
                <SpeechPerformanceStats
                  summary={summarizeSpeechPerformance(sectionResult.tongueTwisters, sectionResult.readAloud, sectionResult.freeSpeech)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <SectionCard
                    label="Tongue Twisters" accent="#a78bfa"
                    primary={`${sectionResult.tongueTwisters.wpm} WPM`}
                    detail={`${sectionResult.tongueTwisters.accuracyPct}% accuracy`}
                    attempts={sectionResult.tongueTwisters.attempts?.map(a => ({ prompt: a.prompt, score: `${a.accuracyPct}% · ${a.wpm} WPM`, match: a.match }))}
                  />
                  <SectionCard
                    label="Read Aloud" accent="#fbbf24"
                    primary={`${sectionResult.readAloud.wpm} WPM`}
                    detail={`${sectionResult.readAloud.matchPct}% match`}
                    attempts={sectionResult.readAloud.attempts?.map(a => ({ prompt: a.prompt, score: `${a.matchPct}% · ${a.wpm} WPM`, match: a.match }))}
                  />
                </div>
              </div>
            </div>

            {/* Re-record / Save — Re-record now sits beside Save instead of as a header link,
                using the same secondary/primary button pair as Try Another Prompt / Continue on
                the record phase, rather than the old small-caps mono button. */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
              className="flex items-center gap-3"
            >
              {!insightLoading && (
                <motion.button
                  onClick={() => { setPhase('record'); setSectionResult(null); handleStartOver(); }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-4 rounded-2xl text-[13px] font-light tracking-wide text-zinc-400 hover:text-zinc-200 cursor-pointer transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Re-record
                </motion.button>
              )}
              <motion.button
                onClick={handleSave}
                disabled={insightLoading}
                whileHover={insightLoading ? undefined : { scale: 1.03 }}
                whileTap={insightLoading ? undefined : { scale: 0.97 }}
                className="px-11 py-4 rounded-2xl text-[15px] font-light tracking-wide cursor-pointer transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'radial-gradient(circle at 38% 32%, rgba(33,232,255,0.14) 0%, rgba(23,169,201,0.08) 55%, rgba(12,14,18,0.9) 100%)', border: '1.5px solid rgba(33,232,255,0.45)', color: '#21e8ff', boxShadow: '0 0 24px rgba(33,232,255,0.15), inset 0 0 20px rgba(33,232,255,0.03)' }}
              >
                {insightLoading ? 'Saving...' : 'Save'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step info modal — same "?" button + modal pattern as the homepage Voice Check-In card's
          "How Your Score Works", instead of a hover tooltip. */}
      {showStepInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowStepInfo(false)}>
          <div
            className="relative max-w-sm w-full rounded-[28px] p-6 flex flex-col gap-4"
            style={{
              background: 'linear-gradient(to bottom, rgba(20,24,32,1) 0%, rgba(13,14,17,1) 100%)',
              border: '1px solid rgba(33,232,255,0.15)',
              boxShadow: '0 0 40px rgba(23,169,201,0.08), 0 20px 60px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-[28px] bg-gradient-to-r from-transparent via-[#21e8ff]/20 to-transparent" />

            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-white tracking-tight">{steps[step].label}</h3>
              <button
                onClick={() => setShowStepInfo(false)}
                className="w-7 h-7 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-all cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[12px] text-zinc-400 leading-relaxed">{STEP_INFO[step]}</p>
          </div>
        </div>
      )}
    </div>
  );
}

