import { useEffect, useRef, useState } from 'react';
import { X, Play, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TUTORIAL_STEPS } from '../lib/tutorialSteps';

interface Props {
  startIndex: number;
  // true = auto-advances through the remaining videos on each video's end (the first-time
  // walkthrough); false = shows just startIndex, closed only via the X — used for the per-row
  // replay from GettingStartedCard.
  sequence: boolean;
  onClose: () => void;
}

// No card/panel — content floats directly over the dark backdrop. Reuses ScreenIntroVideo.tsx's
// play-button-overlay pattern (click to play, no autoplay) for each of the 3 TUTORIAL_STEPS videos
// in turn; sequence mode auto-advances when a video ends.
export default function TutorialVideoOverlay({ startIndex, sequence, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const step = TUTORIAL_STEPS[index];
  const isLast = index === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    setIsPlaying(false);
  }, [index]);

  const handlePlay = () => {
    videoRef.current?.play();
    setIsPlaying(true);
  };

  const handleVideoEnded = () => {
    if (sequence && !isLast) {
      setIndex(i => i + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleAdvance = () => {
    if (!isLast) {
      setIndex(i => i + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(14px)' }}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 sm:top-7 sm:right-7 w-10 h-10 rounded-full flex items-center justify-center bg-[#17A9C9]/10 border border-[#17A9C9]/40 text-[#21e8ff] hover:bg-[#17A9C9]/20 hover:border-[#17A9C9]/60 transition-all duration-150 cursor-pointer z-10"
        aria-label="Close tutorial"
      >
        <X className="w-4 h-4" />
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative w-full max-w-3xl flex flex-col items-center"
      >
        {sequence && (
          <div className="w-full flex flex-col items-center mb-6">
            <div className="w-full grid grid-cols-3 items-center">
              <div />

              <h2 className="text-2xl font-light font-display text-white tracking-tight text-center justify-self-center">
                Welcome to Vocalii
              </h2>

              <div className="flex items-center gap-2.5 justify-self-end">
                <button
                  onClick={handleBack}
                  disabled={index === 0}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700 hover:text-white transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous video"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleAdvance}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-[#17A9C9]/10 border border-[#17A9C9]/40 text-[#21e8ff] hover:bg-[#17A9C9]/20 hover:border-[#17A9C9]/60 transition-all duration-150 cursor-pointer"
                  aria-label={isLast ? 'Finish tutorial' : 'Next video'}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              {TUTORIAL_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-[5px] rounded-full transition-all duration-300"
                  style={{
                    width: i === index ? 20 : 6,
                    background: i <= index ? '#21e8ff' : 'rgba(63,63,70,0.8)',
                    boxShadow: i === index ? '0 0 8px rgba(33,232,255,0.75)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center"
          >
            <div
              className="relative w-full h-[62vh] rounded-2xl overflow-hidden mb-6"
              style={{ background: '#000', border: '1px solid rgba(23,169,201,0.2)' }}
            >
              <video
                ref={videoRef}
                src={step.videoSrc}
                className="w-full h-full object-contain"
                controls={isPlaying}
                playsInline
                onEnded={handleVideoEnded}
              />
              {!isPlaying && (
                <button
                  onClick={handlePlay}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                  style={{ background: 'rgba(9,11,14,0.35)' }}
                  aria-label={`Play video: ${step.label}`}
                >
                  <span
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, rgba(33,232,255,0.25) 0%, rgba(23,169,201,0.15) 100%)', border: '1.5px solid rgba(33,232,255,0.5)', boxShadow: '0 0 28px rgba(33,232,255,0.2)' }}
                  >
                    <Play className="w-6 h-6 text-[#21e8ff] ml-0.5" fill="currentColor" />
                  </span>
                </button>
              )}
            </div>

            <h3 className="text-md font-medium text-white text-center mb-2">{step.label}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed text-center max-w-xl">{step.description}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
