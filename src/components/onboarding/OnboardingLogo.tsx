// Matches Header.tsx's badge + wordmark exactly, so the brand mark is identical between
// onboarding and the main app.
interface Props {
  iconOnly?: boolean;
  // Landing page only: full-brightness wordmark instead of the flat 80%-opacity white used
  // everywhere else.
  shine?: boolean;
}

export default function OnboardingLogo({ iconOnly = false, shine = false }: Props) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img src="/assets/images/logo-mark.webp" alt="Vocalii" className="w-9 h-9 rounded-full flex-shrink-0" />
      {!iconOnly && (
        <span
          className={
            shine
              ? 'text-xs font-normal tracking-[0.25em] text-white uppercase font-sans whitespace-nowrap'
              : 'text-xs font-normal tracking-[0.25em] text-white uppercase font-sans whitespace-nowrap opacity-80'
          }
        >
          Vocalii
        </span>
      )}
    </div>
  );
}
