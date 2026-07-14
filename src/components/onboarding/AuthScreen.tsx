import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Check,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

const CAROUSEL_ITEMS = [
  {
    id: 'vocal1',
    src: 'src/assets/images/discovering_their_unique_voice.png',
    title: 'Build Your Voice Identity',
    description: 'Track your vocal health, build lasting habits, and perform at your best — every day.',
  },
  {
    id: 'vocal2',
    src: '/src/assets/images/charismatic_vocal_coach.png',
    title: 'AI-Powered Coaching',
    description: 'Personalised coaching tips based on your daily check-ins and goals.',
  },
];

interface Props {
  onSignUp: (firstName: string, lastName: string) => void;
  onBypass: () => void;
}

export default function AuthScreen({ onSignUp, onBypass }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);

  const isFormValid = email.includes('@') && password.length >= 6 && (!isSignUp || (firstName.trim().length > 0 && lastName.trim().length > 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg('');

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }
      if (data.user) {
        // Insert draft profile so firstName/lastName survive a page refresh mid-onboarding
        await supabase.from('profiles').insert({
          id: data.user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          onboarding_complete: false,
        });
      }
      setIsLoading(false);
      setSuccessMsg('Account created! Setting up your profile...');
      setTimeout(() => onSignUp(firstName.trim(), lastName.trim()), 800);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setSuccessMsg('Welcome back! Loading your dashboard...');
      // App.tsx onAuthStateChange handles navigation automatically
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setErrorMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg('Reset link sent to your email.');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const currentArt = CAROUSEL_ITEMS[carouselIndex];

  return (
    <div className="min-h-screen bg-[#090b0e] text-zinc-100 flex items-center justify-center p-4 lg:p-12 font-sans relative overflow-hidden selection:bg-[#17A9C9]/30 selection:text-white">

      <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full bg-[#17A9C9]/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-6xl bg-[#111317] border border-zinc-900 rounded-[32px] shadow-[0_32px_96px_rgba(0,0,0,0.7)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative min-h-[660px]">

        {/* LEFT PANEL */}
        <div className="lg:col-span-5 p-8 sm:p-12 lg:py-14 flex flex-col justify-between relative z-10">

          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col gap-1 w-8 h-8 opacity-90 group cursor-pointer">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#17A9C9] group-hover:scale-110 transition-transform" />
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#21e8ff]/40" />
              </div>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#21e8ff]" />
                <span className="w-2.5 h-2.5 rounded-[3px] bg-[#17A9C9]/60 group-hover:bg-[#17A9C9] transition-colors" />
              </div>
            </div>

            <button
              onClick={onBypass}
              className="text-[10px] font-mono text-zinc-500 hover:text-[#21e8ff] transition-all flex items-center gap-1.5 bg-zinc-900/45 px-3 py-1.5 rounded-full border border-zinc-800/80 cursor-pointer hover:border-zinc-700"
            >
              <Info className="w-3.5 h-3.5 text-[#21e8ff]" />
              <span>Quick Preview</span>
            </button>
          </div>

          <div className="my-auto max-w-[340px] w-full mx-auto">
            <h2 className="text-xl font-medium tracking-tight text-zinc-100 mb-1">
              {isSignUp ? 'Create your account' : 'Sign into your account'}
            </h2>
            <p className="text-xs text-zinc-500 leading-normal mb-8 font-normal">
              Your Voice Intelligence Coach — build healthy vocal habits every day.
            </p>

            <AnimatePresence mode="popLayout">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] text-rose-400 flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-zinc-400 tracking-wider mb-1.5 ml-0.5">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First"
                      required={isSignUp}
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 bg-[#171a22] border border-zinc-700/80 focus:border-[#17A9C9] focus:ring-4 focus:ring-[#17A9C9]/15 rounded-xl text-xs text-white placeholder-zinc-500 transition-all outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-zinc-400 tracking-wider mb-1.5 ml-0.5">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last"
                      required={isSignUp}
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 bg-[#171a22] border border-zinc-700/80 focus:border-[#17A9C9] focus:ring-4 focus:ring-[#17A9C9]/15 rounded-xl text-xs text-white placeholder-zinc-500 transition-all outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 tracking-wider mb-1.5 ml-0.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 bg-[#171a22] border border-zinc-700/80 focus:border-[#17A9C9] focus:ring-4 focus:ring-[#17A9C9]/15 rounded-xl text-xs text-white placeholder-zinc-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 tracking-wider mb-1.5 ml-0.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-4 pr-10 py-2.5 bg-[#171a22] border border-zinc-700/80 focus:border-[#17A9C9] focus:ring-4 focus:ring-[#17A9C9]/15 rounded-xl text-xs text-white placeholder-zinc-500 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[11px] text-zinc-400 hover:text-[#21e8ff] transition-all mt-2 text-left block"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="w-full pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all duration-300 ${!isFormValid || isLoading
                    ? 'bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed opacity-80'
                    : 'bg-gradient-to-r from-[#17A9C9]/25 to-[#17A9C9]/10 hover:from-[#17A9C9]/35 hover:to-[#17A9C9]/15 border border-[#17A9C9]/60 hover:border-[#17A9C9]/80 shadow-[0_0_20px_rgba(23,169,201,0.12)] group cursor-pointer'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[12px] font-medium tracking-wide text-cyan-300 uppercase">
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </span>
                    </div>
                  ) : (
                    <span className={`text-[12px] tracking-widest uppercase transition-colors duration-300 ${!isFormValid || isLoading ? 'text-zinc-400 font-light' : 'text-cyan-300 group-hover:text-[#21e8ff] font-medium'}`}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </span>
                  )}
                </button>
              </div>
            </form>

            {!isSignUp && (
              <div className="mt-5 text-center text-xs">
                <span className="text-zinc-500 font-light">Can't sign in? </span>
                <button onClick={handleResetPassword} className="text-zinc-300 hover:text-white font-semibold underline">
                  Reset password
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-xs mt-8">
            <span className="text-zinc-500 font-light">
              {isSignUp ? 'Already have an account? ' : "Don't have an account yet? "}
            </span>
            <button
              onClick={() => { setIsSignUp(v => !v); setErrorMsg(''); setSuccessMsg(''); }}
              className="text-zinc-300 hover:underline font-semibold ml-1"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-7 p-6 hidden lg:flex flex-col h-full justify-center relative bg-gradient-to-br from-[#101216] to-[#0a0c0e]">
          <div className="w-full h-[580px] relative rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-800/60">

            <AnimatePresence mode="wait">
              <motion.img
                key={currentArt.id}
                src={currentArt.src}
                alt={currentArt.title}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35 pointer-events-none" />

            <div className="absolute bottom-6 left-6 max-w-[calc(100%-154px)] z-10 p-5 backdrop-blur-[14px] bg-black/45 border border-white/10 rounded-[24px] shadow-2xl">
              <h4 className="text-[13px] font-semibold text-white tracking-wide">{currentArt.title}</h4>
              <p className="text-[10.5px] text-zinc-300/80 mt-1.5 leading-normal">{currentArt.description}</p>
            </div>

            <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
              <button
                onClick={() => setCarouselIndex(i => (i - 1 + CAROUSEL_ITEMS.length) % CAROUSEL_ITEMS.length)}
                className="w-10 h-10 bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-400 hover:text-[#21e8ff] rounded-full border border-zinc-800/85 hover:border-[#17A9C9]/40 flex items-center justify-center backdrop-blur-md transition-all duration-300 active:scale-90"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCarouselIndex(i => (i + 1) % CAROUSEL_ITEMS.length)}
                className="w-11 h-11 bg-[#17A9C9]/15 hover:bg-[#17A9C9]/25 text-[#21e8ff] rounded-full border border-[#17A9C9]/30 hover:border-[#21e8ff]/60 flex items-center justify-center backdrop-blur-md shadow-[0_8px_24px_rgba(23,169,201,0.2)] hover:shadow-[0_8px_28px_rgba(23,169,201,0.45)] transition-all duration-300 hover:scale-105 active:scale-90"
              >
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
