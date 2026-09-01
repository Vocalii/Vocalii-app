import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { useRef, useState } from 'react';
import OnboardingLogo from './OnboardingLogo';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

// Drop the real file at public/assets/videos/intro.mp4 — this screen just plays whatever's there.
const INTRO_VIDEO_SRC = '/assets/videos/intro.mp4';

export default function ScreenIntroVideo({ onNext, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    videoRef.current?.play();
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">

      <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#17A9C9]/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-2xl bg-[#111317] border border-zinc-900 rounded-[32px] shadow-[0_32px_96px_rgba(0,0,0,0.7)] p-6 sm:p-8 relative z-10">

        <div className="mb-4 flex justify-center">
          <OnboardingLogo iconOnly />
        </div>

        <h1 className="text-2xl font-light font-display tracking-tight text-white mb-1 text-center">
          Welcome to Vocalii
        </h1>
        <p className="text-xs text-zinc-500 leading-normal mb-5 text-center">
          A quick look at how Vocalii helps you build a healthier, more confident voice.
        </p>

        <div
          className="relative w-full h-[46vh] rounded-2xl overflow-hidden mb-6"
          style={{ background: '#000', border: '1px solid rgba(23,169,201,0.2)' }}
        >
          <video
            ref={videoRef}
            src={INTRO_VIDEO_SRC}
            className="w-full h-full object-cover"
            controls={isPlaying}
            playsInline
            onEnded={() => setIsPlaying(false)}
          />
          {!isPlaying && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center cursor-pointer group"
              style={{ background: 'rgba(9,11,14,0.35)' }}
              aria-label="Play intro video"
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

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 flex-shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onClick={onNext}
            className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl transition-all duration-300 group bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer"
          >
            <span className="text-[12px] tracking-widest uppercase font-medium text-cyan-300 group-hover:text-[#21e8ff] transition-colors duration-300">
              Start
            </span>
            <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:text-[#21e8ff] transition-colors duration-300" />
          </button>
        </div>

      </div>
    </div>
  );
}
