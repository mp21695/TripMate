'use client';

import React from 'react';
import Link from 'next/link';
import { HeroViewfinder } from '@/components/wanderlust/HeroViewfinder';
import { PolaroidScatter } from '@/components/wanderlust/PolaroidScatter';
import { HowWeTravelAccordion } from '@/components/wanderlust/HowWeTravelAccordion';
import { MountainAuthSection } from '@/components/auth/MountainAuthSection';
import { PushPin } from '@/components/ui/PushPin';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060708] text-[#eae6dc] selection:bg-[#3d444d] selection:text-white relative">
      {/* ========================================================================= */}
      {/* 1. HERO VIEW (Screenshot 1): Beyond Places / Into Moments + Optical Viewfinder Window */}
      {/* ========================================================================= */}
      <HeroViewfinder />

      {/* ========================================================================= */}
      {/* 2. DESTINATIONS VIEW (Screenshot 2): 20 Indian Destinations + Click-to-Illuminate Polaroids */}
      {/* ========================================================================= */}
      <PolaroidScatter />

      {/* ========================================================================= */}
      {/* 3. HOW WE TRAVEL (Screenshot 3): Different trips, same intention + Expanding Vertical Slices */}
      {/* ========================================================================= */}
      <HowWeTravelAccordion />

      {/* ========================================================================= */}
      {/* 4. EXPEDITION AUTHENTICATION: 3D Mountain Wireframe Video (Zooms & Moves on Hover) */}
      {/* Placed right before start planning section as requested */}
      {/* ========================================================================= */}
      <MountainAuthSection />

      {/* ========================================================================= */}
      {/* 5. PLAN A JOURNEY: Pinned Paper Sticky Note CTA with 3D Red Pushpin */}
      {/* ========================================================================= */}
      <section className="relative py-36 px-6 overflow-hidden bg-[#090b0d]">
        {/* Misty Alpine Forest Landscape Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=2400&q=80"
            alt="Misty Pines"
            className="w-full h-full object-cover filter brightness-[0.42] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="film-grain" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto text-center">
          <h2 className="font-serif italic text-4xl sm:text-5xl text-[#eae6dc] font-normal tracking-tight mb-10">
            Plan a journey
          </h2>

          {/* Pinned Paper Sticky Note with Red Pushpin */}
          <div className="bg-[#faf8f3] text-neutral-900 p-8 sm:p-12 rounded-xs shadow-2xl relative rotate-[0.5deg]">
            {/* Real 3D Red Pushpin at Top */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <PushPin />
            </div>

            <p className="font-serif italic text-base sm:text-lg text-neutral-800 leading-relaxed tracking-wide">
              TELL US WHAT YOUR DREAM TRIP LOOKS LIKE. WE&rsquo;LL SHAPE THE REST.
            </p>

            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs tracking-[0.2em] uppercase px-8 py-3.5 rounded-full transition-all shadow-md hover:scale-102"
              >
                <span>START PLANNING</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MINIMALIST EDITORIAL FOOTER */}
      {/* ========================================================================= */}
      <footer className="py-16 px-6 md:px-14 bg-[#060708] border-t border-white/5">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 font-mono text-xs text-[#8a8c8e]">
          <div className="font-serif italic text-2xl text-[#eae6dc]">
            TripMate
          </div>

          <div className="flex items-center space-x-8 tracking-[0.2em] uppercase text-[10px]">
            <Link href="#destinations" className="hover:text-white transition-colors">
              DESTINATIONS
            </Link>
            <Link href="#how-we-travel" className="hover:text-white transition-colors">
              EXPERIENCES
            </Link>
            <Link href="#auth-section" className="hover:text-white transition-colors">
              SIGN IN / REGISTER
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              START PLANNING
            </Link>
          </div>

          <div className="font-mono text-[9px] tracking-widest text-[#5c5f66] uppercase">
            STORIES, GUIDES AND INSPIRATION FOR WHERE YOU&rsquo;RE HEADED NEXT.
          </div>
        </div>
      </footer>
    </div>
  );
}
