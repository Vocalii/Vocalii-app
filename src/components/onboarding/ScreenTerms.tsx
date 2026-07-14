import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function ScreenTerms({ onNext, onBack }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">

      <div className="absolute top-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full bg-[#17A9C9]/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#111317] border border-zinc-900 rounded-[32px] shadow-[0_32px_96px_rgba(0,0,0,0.7)] p-8 sm:p-10 relative z-10">

        <div className="flex flex-col gap-[3px] mb-8">
          <div className="flex gap-[3px]">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#17A9C9]" />
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#21e8ff]/40" />
          </div>
          <div className="flex gap-[3px]">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#21e8ff]" />
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#17A9C9]/60" />
          </div>
        </div>

        <h1 className="text-xl font-medium tracking-tight text-zinc-100 mb-1">
          Terms & Conditions
        </h1>
        <p className="text-xs text-zinc-500 leading-normal mb-6">
          Please review and accept our terms before creating your account.
        </p>

        <div
          className="max-h-56 overflow-y-auto rounded-2xl px-4 py-4 text-[11.5px] leading-relaxed text-zinc-400 mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="mb-3">
            By using Vocalii, you agree to our Terms of Service and Privacy Policy. Vocalii provides
            vocal coaching guidance, tracking, and wellness tools for informational purposes only —
            it is not a substitute for professional medical or clinical advice.
          </p>
          <p className="mb-3">
            Your voice recordings and check-in data are stored securely and used solely to power your
            personal coaching experience. We do not sell your data to third parties.
          </p>
          <p>
            You can request deletion of your account and associated data at any time from within the
            app settings.
          </p>
        </div>

        <button
          onClick={() => setAccepted(v => !v)}
          className="flex items-center gap-3 mb-8 text-left cursor-pointer select-none"
        >
          <span
            className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-200"
            style={accepted
              ? { background: 'linear-gradient(135deg, #21e8ff 0%, #17A9C9 100%)', borderColor: 'transparent' }
              : { borderColor: 'rgba(63,63,70,0.8)' }}
          >
            {accepted && <Check className="w-3 h-3 text-[#090b0e]" strokeWidth={3} />}
          </span>
          <span className="text-xs text-zinc-300">
            I agree to the Terms of Service and Privacy Policy
          </span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200 flex-shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onClick={onNext}
            disabled={!accepted}
            className={`flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl transition-all duration-300 group ${accepted
                ? 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] cursor-pointer'
                : 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
              }`}
          >
            <span className={`text-[12px] tracking-widest uppercase font-medium transition-colors duration-300 ${accepted ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-600 font-light'
              }`}>
              Continue
            </span>
            <ArrowRight className={`w-4 h-4 transition-colors duration-300 ${accepted ? 'text-cyan-300 group-hover:text-[#21e8ff]' : 'text-zinc-700'}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
