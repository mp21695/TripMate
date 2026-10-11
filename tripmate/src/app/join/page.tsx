'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Compass, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, LogIn } from 'lucide-react';
import confetti from 'canvas-confetti';

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'LOADING' | 'UNAUTHENTICATED' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [tripId, setTripId] = useState<string>('');
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('ERROR');
      setErrorMessage('No invite token was found in this link.');
      return;
    }

    async function processJoin() {
      try {
        const res = await fetch('/api/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.status === 401) {
          setStatus('UNAUTHENTICATED');
          return;
        }

        const data = await res.json();

        if (res.ok) {
          setStatus('SUCCESS');
          setTripId(data.tripId);
          setRole(data.role || 'EDITOR');
          confetti({
            particleCount: 50,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ffffff', '#ffb000', '#10b981'],
          });
          // Automatically redirect to the trip after 2.5 seconds
          setTimeout(() => {
            router.push(`/trips/${data.tripId}`);
          }, 2500);
        } else {
          setStatus('ERROR');
          setErrorMessage(data.error || 'Invalid or expired invite token.');
        }
      } catch {
        setStatus('ERROR');
        setErrorMessage('Failed to connect to the invite verification server.');
      }
    }

    processJoin();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[#08090a] text-[#f5f4ef] flex flex-col justify-between selection:bg-[#3d444d] selection:text-white">
      {/* Top Bar */}
      <header className="p-8 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="font-serif italic text-2xl text-white">
          TripMate
        </Link>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8a8c8e]">
          COLLABORATIVE EXPEDITIONS
        </span>
      </header>

      {/* Main Verification Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#121417] border border-white/10 rounded-xs p-8 shadow-2xl relative text-center">
          {/* Status: Loading */}
          {status === 'LOADING' && (
            <div className="py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-white animate-spin mx-auto opacity-80" />
              <h2 className="font-serif text-2xl text-white">Verifying Invitation</h2>
              <p className="text-xs font-mono text-[#8a8c8e]">
                Validating cryptographic token and syncing your expedition role...
              </p>
            </div>
          )}

          {/* Status: Success */}
          {status === 'SUCCESS' && (
            <div className="py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-emerald-950/50 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  ACCESS AUTHORIZED • ROLE: {role}
                </span>
                <h2 className="font-serif text-3xl text-white mt-1">
                  Welcome to the Expedition
                </h2>
                <p className="text-xs font-mono text-[#8a8c8e] mt-2">
                  You have joined the workspace with {role.toLowerCase()} permissions.
                  Redirecting to the itinerary canvas...
                </p>
              </div>

              {tripId && (
                <div className="pt-4">
                  <Link
                    href={`/trips/${tripId}`}
                    className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs tracking-[0.16em] uppercase px-6 py-3 rounded-full font-medium transition-all"
                  >
                    <span>ENTER WORKSPACE NOW</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Status: Unauthenticated */}
          {status === 'UNAUTHENTICATED' && (
            <div className="py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-[#181b20] border border-white/10 rounded-full flex items-center justify-center mx-auto text-white">
                <ShieldCheck className="w-7 h-7 text-[#ffb000]" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#ffb000]">
                  EXPEDITION INVITE
                </span>
                <h2 className="font-serif text-3xl text-white mt-1">
                  Sign In Required
                </h2>
                <p className="text-xs font-mono text-[#8a8c8e] mt-2 leading-relaxed">
                  You have been invited to collaborate on this expedition. Please sign in or create an explorer account to accept your invitation.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/join?token=${token}`)}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs tracking-[0.16em] uppercase px-6 py-3 rounded-full font-medium transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>SIGN IN TO ACCEPT</span>
                </Link>

                <Link
                  href={`/register?redirect=${encodeURIComponent(`/join?token=${token}`)}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-transparent text-[#8a8c8e] hover:text-white border border-white/10 font-sans text-xs tracking-[0.16em] uppercase px-5 py-3 rounded-full transition-all"
                >
                  <span>REGISTER</span>
                </Link>
              </div>
            </div>
          )}

          {/* Status: Error */}
          {status === 'ERROR' && (
            <div className="py-4 space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 bg-rose-950/40 border border-rose-800/40 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400">
                  INVITATION INVALID
                </span>
                <h2 className="font-serif text-3xl text-white mt-1">
                  Unable to Join
                </h2>
                <p className="text-xs font-mono text-[#8a8c8e] mt-2">
                  {errorMessage || 'This invitation token has expired or is invalid.'}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white font-sans text-xs tracking-[0.16em] uppercase px-6 py-3 rounded-full transition-all border border-white/10"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>GO TO EXPERIENCES</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center border-t border-white/5 text-[10px] font-mono text-[#8a8c8e]">
        TRIPMATE EXPEDITION PLATFORM • POWERED BY SUPABASE POSTGRESQL & NEXT.JS
      </footer>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08090a] flex items-center justify-center font-mono text-xs text-[#8a8c8e]">
          <Loader2 className="w-6 h-6 animate-spin text-white mr-2" />
          <span>Loading invitation portal...</span>
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
