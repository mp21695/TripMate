'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Mail, User, Compass, CheckCircle2, Shield } from 'lucide-react';
import { MountainWireframeCanvas } from '@/components/spatial/MountainWireframeCanvas';

interface MountainAuthSectionProps {
  id?: string;
  isFullScreen?: boolean;
}

export function MountainAuthSection({
  id = 'auth-section',
  isFullScreen = false,
}: MountainAuthSectionProps) {
  const router = useRouter();

  const [mode, setMode] = useState<'register' | 'signin'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [style, setStyle] = useState('Himalayan High Passes');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);

      try {
        localStorage.setItem(
          'tripmate_user',
          JSON.stringify({
            name: name || 'Explorer',
            email: email || 'explorer@tripmate.in',
            style: style,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          })
        );
      } catch {
        // ignore localStorage error
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 700);
    }, 900);
  };

  const handleGuestLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  return (
    <section
      id={id}
      className={`relative overflow-hidden select-none flex items-center justify-center ${
        isFullScreen
          ? 'min-h-screen w-full py-16 px-4'
          : 'min-h-[880px] py-28 px-4 sm:px-8 md:px-14 border-t border-white/5 bg-[#050607]'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. REAL-TIME INTERACTIVE 3D WEBGL WIREFRAME MOUNTAIN CANVAS */}
      {/* Pure WebGL Three.js - 0 Video tags, 0 MP4 files */}
      {/* ========================================================================= */}
      <MountainWireframeCanvas
        className={isFullScreen ? 'fixed inset-0 -z-10' : 'absolute inset-0 z-0'}
      />

      {/* ========================================================================= */}
      {/* 2. CENTERED SLEEK GLASSMORPHIC REGISTRATION / SIGN-UP CARD */}
      {/* ========================================================================= */}
      <div className="relative z-20 max-w-lg w-full mx-auto my-auto">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="backdrop-blur-xl bg-black/45 border border-white/12 rounded-2xl p-8 sm:p-11 shadow-[0_30px_90px_rgba(0,0,0,0.92)] relative overflow-hidden"
        >
          {/* Subtle Ambient Radial Glow on Card Ridge */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          {/* Top Header: Brand & Mode Toggle */}
          <div className="flex items-center justify-between border-b border-white/8 pb-5 mb-7">
            <div>
              <span className="font-serif italic text-2xl text-[#eae6dc] tracking-tight block">
                TripMate
              </span>
              <span className="font-mono text-[9px] tracking-[0.24em] text-[#8e9299] uppercase">
                EXPEDITION COLLECTIVE
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-black/60 border border-white/10 rounded-full p-1">
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`px-3.5 py-1 text-[10px] font-mono tracking-[0.16em] uppercase rounded-full transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#eae6dc] text-neutral-950 font-bold shadow-sm'
                    : 'text-[#8e9299] hover:text-white'
                }`}
              >
                JOIN
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`px-3.5 py-1 text-[10px] font-mono tracking-[0.16em] uppercase rounded-full transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#eae6dc] text-neutral-950 font-bold shadow-sm'
                    : 'text-[#8e9299] hover:text-white'
                }`}
              >
                SIGN IN
              </button>
            </div>
          </div>

          {/* Headline & Description matching site's typography */}
          <div className="mb-7">
            <h3 className="font-serif italic text-3xl sm:text-4xl text-[#eae6dc] font-normal tracking-tight">
              {mode === 'register' ? 'Begin Your Journey' : 'Welcome Back, Explorer'}
            </h3>
            <p className="font-sans text-xs text-[#9ea1a8] mt-2 leading-relaxed tracking-wide">
              {mode === 'register'
                ? 'Create an expedition profile to build collaborative Indian itineraries, split expenses, and share memory scrapbooks.'
                : 'Access your saved trips, active squad boards, and live UPI split calculations.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block font-mono text-[10px] tracking-[0.2em] text-[#8e9299] uppercase mb-1.5">
                  FULL NAME
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-[#6c7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rohan Sharma"
                    className="w-full bg-[#111418]/85 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#eae6dc] placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] tracking-[0.2em] text-[#8e9299] uppercase mb-1.5">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#6c7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="explorer@tripmate.in"
                  className="w-full bg-[#111418]/85 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#eae6dc] placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-[#8e9299] uppercase">
                  PASSWORD
                </label>
                {mode === 'signin' && (
                  <span className="font-mono text-[9px] text-[#6c7078] hover:text-[#eae6dc] cursor-pointer transition-colors">
                    RECOVER KEY
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#6c7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#111418]/85 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#eae6dc] placeholder:text-neutral-600 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block font-mono text-[10px] tracking-[0.2em] text-[#8e9299] uppercase mb-1.5">
                  EXPEDITION STYLE
                </label>
                <div className="relative">
                  <Compass className="w-3.5 h-3.5 text-[#6c7078] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-[#111418]/85 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#eae6dc] focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Himalayan High Passes">Himalayan High Passes & Treks (Ladakh, Spiti)</option>
                    <option value="Coastal & Island Wanderer">Coastal & Island Trails (Goa, Andaman)</option>
                    <option value="Royal Heritage & Ruins">Royal Forts & Ruins (Rajasthan, Hampi)</option>
                    <option value="Western Ghats Coffee Ridges">Misty Western Ghats (Coorg, Chikmagalur)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Glowing CTA Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#eae6dc] hover:bg-white text-neutral-950 font-mono text-xs tracking-[0.2em] uppercase py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 font-bold cursor-pointer shadow-[0_0_20px_rgba(234,230,220,0.25)] hover:shadow-[0_0_30px_rgba(234,230,220,0.45)] hover:scale-[1.01]"
              >
                {isLoading ? (
                  <span>AUTHENTICATING...</span>
                ) : isSuccess ? (
                  <span className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ENTERING TRIPMATE...</span>
                  </span>
                ) : (
                  <>
                    <span>{mode === 'register' ? 'CREATE ACCOUNT' : 'JOIN TRIPMATE'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick 1-Click Guest Exploration */}
          <div className="mt-5 pt-5 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="inline-flex items-center space-x-2 text-[10px] font-mono tracking-[0.16em] uppercase text-[#ded9cc] hover:text-white transition-colors cursor-pointer group"
            >
              <span>⚡</span>
              <span className="underline underline-offset-4 decoration-white/30 group-hover:decoration-white">
                EXPLORE DEMO ITINERARY (NO LOGIN REQUIRED)
              </span>
            </button>

            <div className="flex items-center space-x-1.5 text-[9px] font-mono tracking-wider text-[#636770]">
              <Shield className="w-3 h-3 text-[#636770]" />
              <span>END-TO-END SYNC</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
