import React from 'react';
import { MountainAuthSection } from '@/components/auth/MountainAuthSection';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Join TripMate — Explorer Registration',
  description: 'Create your TripMate account to build collaborative Indian itineraries.',
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#050607] text-[#eae6dc] relative flex flex-col justify-between">
      <header className="absolute top-0 left-0 right-0 z-30 p-8 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 font-mono text-xs tracking-[0.2em] uppercase text-[#ded9cc] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO EXPEDITIONS</span>
        </Link>

        <Link href="/" className="font-serif italic text-2xl text-[#eae6dc]">
          TripMate
        </Link>
      </header>

      <div className="pt-16 pb-8 flex-1 flex items-center justify-center">
        <MountainAuthSection id="register-portal" isFullScreen={true} />
      </div>
    </main>
  );
}
