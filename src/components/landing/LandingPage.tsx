import { useRef, useState } from 'react';
import BackgroundEffects from './BackgroundEffects';
import FeatureNodes from './FeatureNodes';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

// Marketing page shown to anyone who lands on the site with no session — ported from an AI Studio
// prototype (framed-canvas hero with a cursor-tracking border glow), recolored to Vocalii's
// palette and rewritten with real content in the child components.
export default function LandingPage({ onGetStarted, onSignIn }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <main
      id="landing-page-root"
      className="min-h-screen w-full bg-[#090b0e] text-zinc-100 flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 lg:p-10 font-sans antialiased relative overflow-hidden"
    >
      <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#17A9C9]/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />

      <div
        ref={frameRef}
        id="hero-frame-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        className={`relative w-full max-w-[1440px] min-h-[78vh] sm:min-h-[680px] sm:rounded-[32px] overflow-hidden flex flex-col justify-between transition-all duration-500 border ${
          isHovered
            ? 'border-[#21e8ff]/20 shadow-[0_25px_90px_rgba(0,0,0,0.98),0_0_30px_rgba(33,232,255,0.07)]'
            : 'border-white/[0.08] shadow-[0_25px_90px_rgba(0,0,0,0.98)]'
        }`}
      >
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 sm:rounded-[32px] z-10"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, rgba(33,232,255,0.05), rgba(23,169,201,0.02) 35%, transparent 70%)`,
            maskImage: 'linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff)',
            WebkitMaskImage: 'linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-0"
          style={{
            opacity: isHovered ? 0.2 : 0,
            background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, rgba(33,232,255,0.04), transparent 60%)`,
          }}
        />

        <BackgroundEffects />
        <FeatureNodes />
        <LandingNavbar onGetStarted={onGetStarted} onSignIn={onSignIn} />

        <div className="flex-1 flex flex-col justify-center my-auto py-6 sm:py-8 -mt-8 sm:-mt-16">
          <LandingHero onGetStarted={onGetStarted} onSignIn={onSignIn} />
        </div>
      </div>
    </main>
  );
}
