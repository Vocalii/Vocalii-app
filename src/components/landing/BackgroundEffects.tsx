// Ambient glow layer for the landing hero — recolored from the AI Studio prototype's
// emerald/mint/frosty palette to Vocalii's actual cyan/violet ambient-glow convention (the same
// two-blob pattern used on every onboarding screen).
export default function BackgroundEffects() {
  return (
    <div id="background-effects" className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      <div className="absolute inset-0 bg-[#090b0e]" />

      <div
        className="absolute -top-[20%] -right-[15%] w-[850px] sm:w-[1100px] lg:w-[1300px] h-[750px] sm:h-[950px] lg:h-[1100px] rounded-full blur-[80px] sm:blur-[110px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 72% 28%, rgba(23,169,201,0.22) 0%, rgba(14,124,150,0.16) 30%, rgba(14,124,150,0.08) 55%, transparent 80%)',
        }}
      />

      <div
        className="absolute top-[2%] right-[2%] w-[650px] sm:w-[850px] h-[550px] sm:h-[700px] rounded-full blur-[90px] sm:blur-[120px]"
        style={{
          background: 'radial-gradient(ellipse at 80% 30%, rgba(23,169,201,0.16) 0%, rgba(14,124,150,0.1) 40%, transparent 75%)',
        }}
      />

      <div
        className="absolute bottom-[0%] -left-[10%] w-[650px] sm:w-[800px] h-[450px] sm:h-[600px] rounded-full blur-[90px] sm:blur-[115px]"
        style={{
          background: 'radial-gradient(circle at 25% 75%, rgba(139,92,246,0.18) 0%, rgba(124,58,237,0.1) 40%, transparent 75%)',
        }}
      />

      <div
        className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[550px] h-[320px] rounded-full blur-[85px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(33,232,255,0.06) 55%, transparent 80%)',
        }}
      />

      {/* Star particles */}
      <div className="absolute top-[18%] left-[22%] w-[2.5px] h-[2.5px] bg-white rounded-full animate-pulse shadow-[0_0_8px_#fff]" />
      <div className="absolute top-[32%] left-[36%] w-[1.5px] h-[1.5px] bg-white/70 rounded-full" />
      <div className="absolute top-[22%] right-[30%] w-[2.5px] h-[2.5px] bg-white rounded-full animate-pulse shadow-[0_0_10px_#fff]" />
      <div className="absolute top-[44%] right-[22%] w-[1.5px] h-[1.5px] bg-white/60 rounded-full" />
      <div className="absolute top-[62%] left-[16%] w-[2px] h-[2px] bg-white rounded-full shadow-[0_0_6px_#fff]" />
      <div className="absolute top-[70%] right-[30%] w-[2px] h-[2px] bg-white rounded-full animate-pulse shadow-[0_0_8px_#fff]" />
      <div className="absolute top-[48%] left-[45%] w-[1px] h-[1px] bg-white/50 rounded-full" />
      <div className="absolute top-[14%] right-[16%] w-[2.5px] h-[2.5px] bg-[#21e8ff]/80 rounded-full shadow-[0_0_10px_rgba(33,232,255,0.6)]" />
    </div>
  );
}
