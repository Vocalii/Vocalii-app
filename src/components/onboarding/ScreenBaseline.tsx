import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Mic, Square, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onNext: () => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

type RecordingState = 'idle' | 'recording' | 'done';

export default function ScreenBaseline({ onNext, onBack, step, totalSteps }: Props) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = () => {
    setRecordingState('recording');
    setSeconds(0);
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecordingState('done');
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const BAR_COUNT = 28;

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center font-sans relative overflow-hidden">

      {/* Static ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#17A9C9]/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[120px]" />
      </div>

      {/* Recording glow */}
      <AnimatePresence>
        {recordingState === 'recording' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[600px] h-[600px] rounded-full blur-[140px]"
              style={{ background: 'radial-gradient(circle, rgba(33,232,255,0.06) 0%, transparent 70%)' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip — top right */}
      <button
        onClick={onNext}
        className="absolute top-6 right-8 z-20 flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors duration-150 cursor-pointer group"
      >
        Skip for now
        <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity duration-150" />
      </button>

      <div className="flex flex-col w-full max-w-2xl px-10 sm:px-16 py-12 relative z-10">

        {/* Logo + progress — centered */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col gap-[3px] mb-6">
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]/40" />
            </div>
            <div className="flex gap-[3px]">
              <span className="w-2 h-2 rounded-[2px] bg-[#21e8ff]" />
              <span className="w-2 h-2 rounded-[2px] bg-[#17A9C9]/60" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-40 h-0.5 rounded-full overflow-hidden bg-zinc-800">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'linear-gradient(90deg, #17A9C9, #21e8ff, #17A9C9)' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">{step}/{totalSteps}</span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-12 text-center">
          <h1 className="text-2xl font-light font-display text-white leading-tight tracking-tight mb-1">
            Let's hear your voice
          </h1>
          <p className="text-xs text-zinc-500">
            Read the phrase below naturally. This sets your vocal baseline for future analysis.
          </p>
        </div>

        {/* Prompt phrase */}

        {/* Recorder */}
        <div className="flex flex-col items-center gap-6">

          {/* Mic button */}
          <motion.button
            onClick={recordingState === 'idle' ? startRecording : recordingState === 'recording' ? stopRecording : undefined}
            whileHover={recordingState !== 'done' ? { scale: 1.06 } : {}}
            whileTap={recordingState !== 'done' ? { scale: 0.94 } : {}}
            className="relative flex items-center justify-center w-28 h-28 rounded-full border transition-colors duration-300 cursor-pointer"
            style={recordingState === 'recording' ? {
              background: 'linear-gradient(135deg, rgba(33,232,255,0.2) 0%, rgba(33,232,255,0.08) 100%)',
              borderColor: 'rgba(33,232,255,0.5)',
              boxShadow: '0 0 40px rgba(33,232,255,0.2), inset 0 1px 0 rgba(33,232,255,0.2)',
            } : recordingState === 'done' ? {
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.08) 100%)',
              borderColor: 'rgba(16,185,129,0.4)',
              boxShadow: '0 0 40px rgba(16,185,129,0.15)',
            } : {
              background: '#13161c',
              borderColor: 'rgba(39,39,42,0.8)',
            }}
          >
            {/* Pulse ring when recording */}
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
                  <Check className="w-10 h-10 text-emerald-400" />
                </motion.div>
              ) : recordingState === 'recording' ? (
                <motion.div key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Square className="w-7 h-7 text-[#21e8ff] fill-[#21e8ff]" />
                </motion.div>
              ) : (
                <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Mic className="w-10 h-10 text-zinc-400" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-zinc-600 tracking-wide">
              {recordingState === 'idle' ? 'Tap to record' : recordingState === 'recording' ? 'Tap to stop' : 'Baseline captured'}
            </p>
          </div>
          <AnimatePresence>
            {recordingState === 'done' && (
              <motion.button
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                onClick={() => { setRecordingState('idle'); setSeconds(0); }}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 tracking-wide underline underline-offset-2 transition-colors duration-150 cursor-pointer"
              >
                Re-record
              </motion.button>
            )}
          </AnimatePresence>

          {/* Waveform bars */}
          <AnimatePresence>
            {recordingState !== 'done' && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-[3px] h-10"
              >
                {Array.from({ length: BAR_COUNT }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full"
                    style={{ background: recordingState === 'recording' ? '#21e8ff' : '#27272a' }}
                    animate={recordingState === 'recording' ? {
                      height: ['4px', `${12 + Math.sin(i * 0.8) * 18 + Math.random() * 14}px`, '4px'],
                      opacity: [0.4, 1, 0.4],
                    } : {
                      height: '4px',
                      opacity: 0.3,
                    }}
                    transition={recordingState === 'recording' ? {
                      duration: 0.5 + (i % 5) * 0.1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.03,
                    } : { duration: 0.4 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer */}
          <AnimatePresence mode="wait">
            {recordingState === 'recording' && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs font-mono text-zinc-500 tabular-nums"
              >
                {formatTime(seconds)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex flex-col items-center gap-4 mt-12">
          <button
            onClick={onNext}
            disabled={recordingState !== 'done'}
            className={`flex items-center justify-center gap-1.5 h-12 px-8 rounded-xl transition-all duration-300 group ${recordingState === 'done'
              ? 'bg-gradient-to-r from-[#17A9C9]/30 to-[#21e8ff]/15 hover:from-[#17A9C9]/45 hover:to-[#21e8ff]/25 border border-[#21e8ff]/70 hover:border-[#21e8ff] cursor-pointer'
              : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-50'
              }`}
            style={recordingState === 'done' ? {
              boxShadow: '0 0 24px rgba(33,232,255,0.25), 0 0 48px rgba(23,169,201,0.12), inset 0 1px 0 rgba(33,232,255,0.2)',
            } : {}}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${recordingState === 'done' ? 'text-[#21e8ff] group-hover:text-white' : 'text-zinc-600'}`}>
              Start my journey
            </span>
          </button>

          <button
            onClick={onBack}
            className="flex items-center justify-center h-9 px-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer"
          >
            Back
          </button>
        </div>

      </div>
    </div>
  );
}
