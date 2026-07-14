import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Check, ArrowRight } from 'lucide-react';

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

const STEPS = [
  {
    label: 'Sustained Vowel',
    instruction: 'Say /ah/ and hold it steadily',
    hint: '~5 seconds',
  },
  {
    label: 'Read Aloud',
    instruction: '"The early morning fog settled gently over the rolling hills, and the birds began to sing."',
    hint: '~20–30 seconds',
  },
  {
    label: 'Free Speech',
    instruction: 'Tell us how you use your voice in your daily life.',
    hint: '~20–30 seconds',
  },
];

const BAR_COUNT = 28;

function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  if (Math.sqrt(rms / SIZE) < 0.01) return -1;
  const c = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE - i; j++) c[i] += buffer[j] * buffer[j + i];
  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++;
  let maxVal = -1, maxPos = -1;
  for (let i = d; i < SIZE; i++)
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  return maxPos > 0 ? sampleRate / maxPos : -1;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

interface SegmentMetrics {
  pitchHz: number;
  pitchRangeHz: number;
  resonanceScore: number;
  clarityPct: number;
  loudnessDb: number;
  stabilityPct: number;
}

function computeSegmentMetrics(
  pitchReadings: number[],
  fftSnapshot: Float32Array | null,
  timeDomainSnapshot: Float32Array | null,
  sampleRate: number,
): SegmentMetrics {
  const pitchHz = pitchReadings.length > 0 ? Math.round(median(pitchReadings)) : 180;
  const pitchRangeHz = pitchReadings.length > 1
    ? Math.round(Math.max(...pitchReadings) - Math.min(...pitchReadings))
    : 20;

  let resonanceScore = 55;
  if (fftSnapshot) {
    const bins = fftSnapshot.length;
    const hzPerBin = (sampleRate / 2) / bins;
    let midEnergy = 0, totalEnergy = 0;
    for (let i = 0; i < bins; i++) {
      const linear = Math.pow(10, fftSnapshot[i] / 20);
      const hz = i * hzPerBin;
      totalEnergy += linear;
      if (hz >= 1000 && hz <= 4000) midEnergy += linear;
    }
    if (totalEnergy > 0) resonanceScore = Math.round(Math.min(100, (midEnergy / totalEnergy) * 500));
  }

  let clarityPct = 60;
  if (fftSnapshot) {
    const bins = fftSnapshot.length;
    let maxLinear = 0, totalLinear = 0;
    for (let i = 0; i < bins; i++) {
      const l = Math.pow(10, fftSnapshot[i] / 20);
      totalLinear += l;
      if (l > maxLinear) maxLinear = l;
    }
    if (totalLinear > 0) clarityPct = Math.round(Math.min(100, (maxLinear / totalLinear) * 1000));
  }

  let loudnessDb = -60;
  if (timeDomainSnapshot) {
    let rmsSum = 0;
    for (let i = 0; i < timeDomainSnapshot.length; i++) {
      rmsSum += timeDomainSnapshot[i] ** 2;
    }
    const rms = Math.sqrt(rmsSum / timeDomainSnapshot.length);
    loudnessDb = rms > 0.0001 ? Math.max(-60, Math.round(20 * Math.log10(rms))) : -60;
  }

  const jitter = pitchReadings.length > 2 ? stddev(pitchReadings) / (median(pitchReadings) || 1) : 0;
  const stabilityPct = Math.round(Math.max(0, Math.min(100, (1 - jitter / 0.12) * 100)));

  return { pitchHz, pitchRangeHz, resonanceScore, clarityPct, loudnessDb, stabilityPct };
}

export default function BaselineFlow({ onComplete, onSkip }: BaselineFlowProps) {
  const [step, setStep] = useState(0);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(BAR_COUNT).fill(0.06));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pitchReadingsRef = useRef<number[]>([]);
  const lastPitchTimeRef = useRef<number>(0);

  // Per-segment captured data
  const allPitchReadings = useRef<number[][]>([[], [], []]);
  const allFftSnapshots = useRef<(Float32Array | null)[]>([null, null, null]);
  const allTimeDomainSnapshots = useRef<(Float32Array | null)[]>([null, null, null]);
  const allSampleRates = useRef<number[]>([44100, 44100, 44100]);

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
      lastPitchTimeRef.current = 0;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
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
          const pitch = detectPitch(floatBuf, ctx.sampleRate);
          if (pitch > 80 && pitch < 1200) pitchReadingsRef.current.push(pitch);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    // Capture FFT + time-domain snapshots BEFORE closing audio context
    let fftSnapshot: Float32Array | null = null;
    let timeDomainSnapshot: Float32Array | null = null;
    let sampleRate = 44100;

    if (analyserRef.current && audioCtxRef.current) {
      sampleRate = audioCtxRef.current.sampleRate;
      fftSnapshot = new Float32Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getFloatFrequencyData(fftSnapshot);
      timeDomainSnapshot = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(timeDomainSnapshot);
    }

    stopAudio();

    // Store per-segment data
    allPitchReadings.current[step] = [...pitchReadingsRef.current];
    allFftSnapshots.current[step] = fftSnapshot;
    allTimeDomainSnapshots.current[step] = timeDomainSnapshot;
    allSampleRates.current[step] = sampleRate;

    setBarHeights(new Array(BAR_COUNT).fill(0.06));
    setRecordingState('done');
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(s => s + 1);
      setRecordingState('idle');
      setSeconds(0);
    } else {
      // Compute all metrics per segment, then combine
      const segMetrics = [0, 1, 2].map(i => computeSegmentMetrics(
        allPitchReadings.current[i],
        allFftSnapshots.current[i],
        allTimeDomainSnapshots.current[i],
        allSampleRates.current[i],
      ));

      const avg = (key: keyof SegmentMetrics) =>
        Math.round((segMetrics[0][key] + segMetrics[1][key] + segMetrics[2][key]) / 3);

      // Stability weighted: vowel most diagnostic
      const stability = Math.round(
        segMetrics[0].stabilityPct * 0.40 +
        segMetrics[1].stabilityPct * 0.35 +
        segMetrics[2].stabilityPct * 0.25,
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
    allFftSnapshots.current[step] = null;
    allTimeDomainSnapshots.current[step] = null;
    pitchReadingsRef.current = [];
    setRecordingState('idle');
    setSeconds(0);
    setBarHeights(new Array(BAR_COUNT).fill(0.06));
  };

  const handleStartOver = () => {
    setStep(0);
    setRecordingState('idle');
    setSeconds(0);
    pitchReadingsRef.current = [];
    allPitchReadings.current = [[], [], []];
    allFftSnapshots.current = [null, null, null];
    allTimeDomainSnapshots.current = [null, null, null];
    allSampleRates.current = [44100, 44100, 44100];
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Recording step ────────────────────────────────────────────────────────────
  const currentStep = STEPS[step];

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
        {STEPS.map((_, i) => (
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
        <span className="text-[9px] font-mono text-zinc-600 ml-1">{step + 1} of 3</span>
      </div>

      {/* Instruction card */}
      <div
        className="w-full rounded-2xl px-5 py-4 text-center"
        style={{
          background: 'rgba(167,139,250,0.05)',
          border: '1px solid rgba(167,139,250,0.15)',
        }}
      >
        <p className="text-[9px] font-mono tracking-widest uppercase text-violet-400/70 mb-2">{currentStep.label}</p>
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

      <p className="text-[11px] text-zinc-600 tracking-wide">
        {recordingState === 'idle' ? 'Tap to record' : recordingState === 'recording' ? 'Tap to stop' : 'Recording complete'}
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
          {step < 2 ? 'Next →' : 'Finish →'}
        </button>
      </div>
    </div>
  );
}
