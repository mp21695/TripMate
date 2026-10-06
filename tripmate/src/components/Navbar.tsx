'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTrip } from '@/context/TripContext';
import { Compass, ArrowUpRight } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { activeTrip } = useTrip();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full px-6 md:px-12 py-5 flex items-center justify-between pointer-events-none">
      {/* Brand Logo */}
      <div className="pointer-events-auto">
        <Link href="/" className="group flex items-center space-x-2">
          <span className="font-serif text-2xl tracking-tight text-white font-medium group-hover:opacity-80 transition-opacity">
            TripMate
          </span>
        </Link>
      </div>

      {/* Nav Links (Right Side / Center) */}
      <nav className="pointer-events-auto hidden md:flex items-center space-x-8 text-[11px] font-sans tracking-[0.2em] uppercase text-[#a3a6aa]">
        <Link
          href="/"
          className={`hover:text-white transition-colors ${
            pathname === '/' ? 'text-white' : ''
          }`}
        >
          JOURNAL
        </Link>
        <Link
          href="/dashboard"
          className={`hover:text-white transition-colors ${
            pathname === '/dashboard' ? 'text-white' : ''
          }`}
        >
          EXPERIENCES
        </Link>
        {activeTrip && (
          <Link
            href={`/trips/${activeTrip.id}`}
            className={`hover:text-white transition-colors ${
              pathname.startsWith('/trips') ? 'text-white' : ''
            }`}
          >
            PLANNER
          </Link>
        )}
        <Link
          href="/dashboard"
          className="hover:text-white transition-colors"
        >
          ABOUT
        </Link>
      </nav>

      {/* Right Action: Explore Destinations Button */}
      <div className="pointer-events-auto flex items-center space-x-4">
        <Link
          href={activeTrip ? `/trips/${activeTrip.id}` : '/dashboard'}
          className="inline-flex items-center space-x-2.5 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white font-sans text-[11px] tracking-[0.18em] uppercase px-5 py-2.5 rounded-full border border-white/20 hover:border-white/40 transition-all shadow-lg"
        >
          <Compass className="w-3.5 h-3.5 text-white/80" />
          <span>EXPLORE DESTINATIONS</span>
        </Link>
      </div>
    </header>
  );
}
