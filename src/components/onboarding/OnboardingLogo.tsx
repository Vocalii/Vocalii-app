// Matches Header.tsx's badge + wordmark exactly, so the brand mark is identical between
// onboarding and the main app.
export default function OnboardingLogo() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img src="/assets/images/logo-mark.webp" alt="Vocalii" className="w-9 h-9 rounded-full flex-shrink-0" />
      <span className="text-xs font-normal tracking-[0.25em] text-white uppercase font-sans whitespace-nowrap opacity-80">
        Vocalii
      </span>
    </div>
  );
}
