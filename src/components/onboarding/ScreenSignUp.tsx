import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface Props {
  onNext: () => void;
}

export default function ScreenSignUp({ onNext }: Props) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to supabase.auth.signUp / signInWithPassword
    onNext();
  };

  const handleGoogle = () => {
    // TODO: wire to supabase.auth.signInWithOAuth({ provider: 'google' })
    onNext();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-[#21e8ff]/10 border border-[#21e8ff]/20 flex items-center justify-center">
          <span className="text-[#21e8ff] text-xl font-bold font-display">V</span>
        </div>
        <h1 className="text-2xl font-bold font-display text-white tracking-tight">Vocalii</h1>
        <p className="text-zinc-400 text-sm text-center">Your Voice Intelligence Coach</p>
      </div>

      <div className="w-full bg-[#181b22] border border-zinc-800/80 rounded-[28px] p-6">
        <h2 className="text-lg font-semibold text-white mb-1 font-display">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-zinc-400 text-xs mb-6">
          {mode === 'signup' ? 'Start building better vocal habits.' : 'Sign in to continue your practice.'}
        </p>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/60 hover:border-zinc-600 rounded-2xl text-sm text-zinc-200 font-medium transition-all duration-200 mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#21e8ff]/50 focus:bg-zinc-900 transition-all duration-200"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-900/60 border border-zinc-700/60 rounded-xl pl-10 pr-10 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#21e8ff]/50 focus:bg-zinc-900 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            className="mt-1 w-full flex items-center justify-center gap-2 py-3 bg-[#21e8ff] hover:bg-[#17d4eb] text-zinc-950 font-semibold text-sm rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(33,232,255,0.2)]"
          >
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-4">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            className="text-[#21e8ff] hover:underline"
          >
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
