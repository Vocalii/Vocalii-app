import OnboardingLogo from '../onboarding/OnboardingLogo';

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function LandingNavbar({ onGetStarted, onSignIn }: Props) {
  return (
    <header id="landing-header" className="w-full flex items-center justify-between px-4 sm:px-10 py-4 sm:py-6 z-30 relative">
      <OnboardingLogo shine />

      <div id="nav-auth-actions" className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={onSignIn}
          className="text-[11px] sm:text-sm font-medium text-zinc-300 hover:text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-white/[0.06] transition-all cursor-pointer whitespace-nowrap"
        >
          Sign In
        </button>
        <button
          onClick={onGetStarted}
          className="rounded-xl px-3 sm:px-4.5 py-1.5 sm:py-2 transition-all duration-300 cursor-pointer group bg-gradient-to-r from-[#0E7C96]/35 to-[#0E7C96]/15 hover:from-[#0E7C96]/45 hover:to-[#0E7C96]/20 border border-[#0E7C96]/70 hover:border-[#0E7C96]/90 shadow-[0_0_20px_rgba(14,124,150,0.16)]"
        >
          <span className="text-[11px] sm:text-sm font-medium tracking-wide text-cyan-300 group-hover:text-[#21e8ff] transition-colors duration-300 whitespace-nowrap">
            Get Started
          </span>
        </button>
      </div>
    </header>
  );
}
