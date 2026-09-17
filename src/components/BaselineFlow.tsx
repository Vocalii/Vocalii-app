import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Check, ArrowRight, Shuffle } from 'lucide-react';
import { READ_ALOUD_PHRASES, FREE_SPEECH_PROMPTS, TWISTER_PHRASES, pickRandomPhrase } from '../lib/recordingPrompts';
import { ANALYSIS_BUFFER_SIZE, SILENCE_RMS_THRESHOLD, detectPitchFrame, isConfidentPitch, measureFrameRms, measureFrameResonance, calibrateNoiseFloorDb, computeSegmentMetrics, type SegmentMetrics } from '../lib/voiceAnalysis';

export interface BaselineMetrics {
  score: number;
  pitchHz: number;
  pitchRangeHz: number;
  resonanceScore: number;
  clarityPct: number;
  loudnessDb: number;
  stabilityPct: number;
}

interface BaselineFlowProps {
  onComplete: (metrics: BaselineMetrics) => void;
  onSkip?: () => void;
}

// Read Aloud / Free Speech get a random phrase each time (see recordingPrompts.ts) — picked once
// per attempt via buildSteps(), not on every render.
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

const BAR_COUNT = 28;

export default function BaselineFlow({ onComplete, onSkip }: BaselineFlowProps) {
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState(buildSteps);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(BAR_COUNT).fill(0.06));
  // True when most of the 4 recorded segments picked up essentially no voice — every metric would
  // just be noise-floor numbers, so this blocks onComplete() from saving a meaningless baseline.
  const [lowSignalWarning, setLowSignalWarning] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pitchReadingsRef = useRef<number[]>([]);
  const clarityReadingsRef = useRef<number[]>([]);
  const loudnessReadingsRef = useRef<number[]>([]);
  const resonanceReadingsRef = useRef<number[]>([]);
  const lastPitchTimeRef = useRef<number>(0);
  // Calibrated once, on the first recording of the session, and reused for every subsequent step —
  // see calibrateNoiseFloorDb. `null` means calibration hasn't run yet.
  const noiseFloorDbRef = useRef<number | null>(null);

  // Per-segment captured data — one slot per buildSteps() entry
  const allPitchReadings = useRef<number[][]>([[], [], [], []]);
  const allClarityReadings = useRef<number[][]>([[], [], [], []]);
  const allLoudnessReadings = useRef<number[][]>([[], [], [], []]);
  const allResonanceReadings = useRef<number[][]>([[], [], [], []]);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const startRecording = async () => {
    try {
      pitchReadingsRef.current = [];
      clarityReadingsRef.current = [];
      loudnessReadingsRef.current = [];
      resonanceReadingsRef.current = [];
      lastPitchTimeRef.current = 0;
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
      streamRef.current = stream;
      audioCtxRef.current = ctx;

      // Calibrate loudness to this specific mic/room once per session (not once per step) — brief
      // enough that it happens before most people start speaking after tapping record, but the
      // "Calibrating..." label gives a clear beat to stay quiet regardless.
      if (noiseFloorDbRef.current === null) {
        setIsCalibrating(true);
        noiseFloorDbRef.current = await calibrateNoiseFloorDb(analyser);
        setIsCalibrating(false);
      }

      setRecordingState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      const timeBuf = new Uint8Array(analyser.fftSize);
      const floatBuf = new Float32Array(analyser.fftSize);
      const loop = (now: number) => {
        analyser.getByteTimeDomainData(timeBuf);
        const heights = new Array(BAR_COUNT).fill(0).map((_, i) => {
          const chunk = Math.floor((timeBuf.length / BAR_COUNT) * i);
          const sample = (timeBuf[chunk] - 128) / 128;
          return Math.max(0.06, Math.abs(sample) * 2.2 + 0.06);
        });
        setBarHeights(heights);

        if (now - lastPitchTimeRef.current > 80) {
          lastPitchTimeRef.current = now;
          analyser.getFloatTimeDomainData(floatBuf);
          const frame = detectPitchFrame(floatBuf, ctx.sampleRate);
          if (frame.hz > 0) {
            clarityReadingsRef.current.push(frame.clarity);
            if (isConfidentPitch(frame)) pitchReadingsRef.current.push(frame.hz);
          }
          const rms = measureFrameRms(floatBuf);
          if (rms > SILENCE_RMS_THRESHOLD) {
            loudnessReadingsRef.current.push(rms);
            resonanceReadingsRef.current.push(measureFrameResonance(floatBuf, ctx.sampleRate));
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    stopAudio();

    // Store per-segment data
    allPitchReadings.current[step] = [...pitchReadingsRef.current];
    allClarityReadings.current[step] = [...clarityReadingsRef.current];
    allLoudnessReadings.current[step] = [...loudnessReadingsRef.current];
    allResonanceReadings.current[step] = [...resonanceReadingsRef.current];

    setBarHeights(new Array(BAR_COUNT).fill(0.06));
    setRecordingState('done');
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
      setRecordingState('idle');
      setSeconds(0);
    } else {
      // Compute all metrics per segment, then combine
      const segMetrics = [0, 1, 2, 3].map(i => computeSegmentMetrics(
        allPitchReadings.current[i],
        allClarityReadings.current[i],
        allLoudnessReadings.current[i],
        allResonanceReadings.current[i],
        noiseFloorDbRef.current ?? undefined,
      ));

      // If most segments picked up essentially no voice, every metric below is meaningless
      // noise-floor numbers — refuse to save this as the baseline everything else compares against.
      if (segMetrics.filter(s => s.lowSignal).length >= 3) {
        setLowSignalWarning(true);
        return;
      }

      const avg = (key: keyof Omit<SegmentMetrics, 'lowSignal'>) =>
        Math.round((segMetrics[0][key] + segMetrics[1][key] + segMetrics[2][key] + segMetrics[3][key]) / 4);

      // Stability weighted: vowel most diagnostic
      const stability = Math.round(
        segMetrics[0].stabilityPct * 0.35 +
        segMetrics[1].stabilityPct * 0.15 +
        segMetrics[2].stabilityPct * 0.30 +
        segMetrics[3].stabilityPct * 0.20,
      );
      const resonance = avg('resonanceScore');
      const clarity = avg('clarityPct');
      const fatigueLevel = stability > 70 ? 20 : stability > 40 ? 55 : 80;
      const score = Math.round(resonance * 0.4 + clarity * 0.4 + (100 - fatigueLevel) * 0.2);

      onComplete({
        score,
        pitchHz: avg('pitchHz'),
        pitchRangeHz: avg('pitchRangeHz'),
        resonanceScore: resonance,
        clarityPct: clarity,
        loudnessDb: avg('loudnessDb'),
        stabilityPct: stability,
      });
    }
  };

  const handleReRecord = () => {
    stopAudio();
    allPitchReadings.current[step] = [];
    allClarityReadings.current[step] = [];
    allLoudnessReadings.current[step] = [];
    allResonanceReadings.current[step] = [];
    pitchReadingsRef.current = [];
    clarityReadingsRef.current = [];
    loudnessReadingsRef.current = [];
    resonanceReadingsRef.current = [];
    setRecordingState('idle');
    setSeconds(0);
    setBarHeights(new Array(BAR_COUNT).fill(0.06));
  };

  const handleStartOver = () => {
    setStep(0);
    setSteps(buildSteps());
    setRecordingState('idle');
    setSeconds(0);
    setLowSignalWarning(false);
    pitchReadingsRef.current = [];
    clarityReadingsRef.current = [];
    loudnessReadingsRef.current = [];
    resonanceReadingsRef.current = [];
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

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Recording step ────────────────────────────────────────────────────────────
  const currentStep = steps[step];

  return (
    <div className="flex flex-col items-center gap-5 px-8 py-6">

      {/* Skip */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="self-end flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white transition-colors duration-150 cursor-pointer group"
        >
          Skip for now <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 20 : 6,
              background: i <= step ? '#a78bfa' : 'rgba(63,63,70,0.8)',
              boxShadow: i === step ? '0 0 8px rgba(167,139,250,0.75)' : 'none',
            }}
            transition={{ duration: 0.25 }}
            className="h-[5px] rounded-full"
          />
        ))}
        <span className="text-[9px] font-mono text-zinc-600 ml-1">{step + 1} of {steps.length}</span>
      </div>

      {/* Instruction card */}
      <div
        className="w-full rounded-2xl px-5 py-4 text-center relative"
        style={{
          background: 'rgba(167,139,250,0.05)',
          border: '1px solid rgba(167,139,250,0.15)',
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-[9px] font-mono tracking-widest uppercase text-violet-400/70">{currentStep.label}</p>
          {PHRASE_LISTS_BY_STEP[step] && (
            <button
              onClick={handleSwapPhrase}
              className="flex items-center justify-center w-5 h-5 rounded-full text-violet-400/60 hover:text-violet-300 hover:bg-violet-400/10 transition-colors duration-150 cursor-pointer"
              aria-label="Try a different phrase"
              title="Try a different phrase"
            >
              <Shuffle className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-[14px] font-light text-zinc-200 leading-relaxed italic">{currentStep.instruction}</p>
        <p className="text-[9px] font-mono text-zinc-600 mt-2">{currentStep.hint}</p>
      </div>

      {/* Mic button */}
      <motion.button
        onClick={recordingState === 'idle' ? startRecording : recordingState === 'recording' ? stopRecording : undefined}
        whileHover={recordingState !== 'done' ? { scale: 1.05 } : {}}
        whileTap={recordingState !== 'done' ? { scale: 0.95 } : {}}
        className="relative flex items-center justify-center w-24 h-24 rounded-full border transition-colors duration-300 cursor-pointer"
        style={
          recordingState === 'recording' ? {
            background: 'linear-gradient(135deg, rgba(33,232,255,0.2) 0%, rgba(33,232,255,0.08) 100%)',
            borderColor: 'rgba(33,232,255,0.5)',
            boxShadow: '0 0 40px rgba(33,232,255,0.2)',
          } : recordingState === 'done' ? {
            background: 'linear-gradient(135deg, rgba(167,139,250,0.2) 0%, rgba(167,139,250,0.08) 100%)',
            borderColor: 'rgba(167,139,250,0.5)',
            boxShadow: '0 0 40px rgba(167,139,250,0.2)',
          } : {
            background: '#13161c',
            borderColor: 'rgba(39,39,42,0.8)',
          }
        }
      >
        {recordingState === 'recording' && (
          <motion.div
            className="absolute inset-0 rounded-full border border-[#21e8ff]/30"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <AnimatePresence mode="wait">
          {recordingState === 'done' ? (
            <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Check className="w-9 h-9 text-violet-400" style={{ filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.6))' }} />
            </motion.div>
          ) : recordingState === 'recording' ? (
            <motion.div key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Square className="w-6 h-6 text-[#21e8ff] fill-[#21e8ff]" />
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Mic className="w-9 h-9 text-zinc-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <p className={`text-[11px] tracking-wide ${isCalibrating ? '' : 'text-zinc-600'}`} style={isCalibrating ? { color: '#fbbf24' } : undefined}>
        {isCalibrating
          ? 'Calibrating mic — stay quiet...'
          : recordingState === 'idle' ? 'Tap to record' : recordingState === 'recording' ? 'Tap to stop' : 'Recording complete'}
      </p>

      {/* Waveform bars — driven by real audio data */}
      <AnimatePresence>
        {recordingState !== 'done' && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-[3px] h-8">
            {barHeights.map((h, i) => (
              <motion.div
                key={i}
                animate={{ scaleY: h }}
                transition={{ duration: 0.06, ease: 'linear' }}
                className="w-[3px] rounded-full origin-center"
                style={{
                  height: 28,
                  background: recordingState === 'recording'
                    ? `rgba(33,232,255,${0.3 + h * 0.7})`
                    : 'rgba(33,232,255,0.15)',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {recordingState === 'recording' && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs font-mono text-zinc-500 tabular-nums">
            {formatTime(seconds)}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-col items-center gap-2 w-full mt-1">
        <AnimatePresence>
          {lowSignalWarning && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-center"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}
            >
              <p className="text-[11px] text-amber-300 leading-relaxed">
                We couldn't hear enough across that recording to set a baseline. Try again a little
                closer to the mic, speaking during each step.
              </p>
              <button
                onClick={handleStartOver}
                className="text-[11px] text-amber-200 hover:text-white underline underline-offset-2 transition-colors duration-150 cursor-pointer"
              >
                Start Over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {recordingState === 'done' && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleReRecord}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 tracking-wide underline underline-offset-2 transition-colors duration-150 cursor-pointer"
            >
              Re-record
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={handleNext}
          disabled={recordingState !== 'done'}
          className={`w-full h-11 rounded-xl text-[11px] tracking-widest uppercase font-medium transition-all duration-300 ${
            recordingState === 'done'
              ? 'bg-gradient-to-r from-violet-600/30 to-violet-400/15 border border-violet-400/60 text-violet-300 hover:border-violet-400 cursor-pointer'
              : 'bg-zinc-900/40 border border-zinc-800/80 text-zinc-600 cursor-not-allowed opacity-50'
          }`}
          style={recordingState === 'done' ? { boxShadow: '0 0 20px rgba(167,139,250,0.15)' } : {}}
        >
          {step < steps.length - 1 ? 'Next →' : 'Finish →'}
        </button>
      </div>
    </div>
  );
}
