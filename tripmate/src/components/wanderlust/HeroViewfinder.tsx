'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export function HeroViewfinder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1440, height: 850 });
  const [isReady, setIsReady] = useState(false);

  // Optical Window dimensions (matches Screenshot 1)
  const windowWidth = 410;
  const windowHeight = 260;

  // Motion values for smooth buttery tracking
  const mouseX = useMotionValue(240);
  const mouseY = useMotionValue(260);

  // Smooth physics spring for the viewfinder window
  const springConfig = { damping: 28, stiffness: 220, mass: 0.6 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Inverse transforms so the internal bright image stays 100% pixel-aligned with background
  const invX = useTransform(springX, (val) => -val);
  const invY = useTransform(springY, (val) => -val);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setDimensions({ width: w, height: h });

        // Set initial resting position around "Beyond Places" on the left
        mouseX.set(Math.min(w * 0.18, w - windowWidth - 40));
        mouseY.set(h * 0.32);
        setIsReady(true);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [mouseX, mouseY, windowWidth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left - windowWidth / 2;
    const curY = e.clientY - rect.top - windowHeight / 2;

    // Clamp coordinates inside hero boundaries
    const clampedX = Math.max(16, Math.min(dimensions.width - windowWidth - 16, curX));
    const clampedY = Math.max(70, Math.min(dimensions.height - windowHeight - 70, curY));

    mouseX.set(clampedX);
    mouseY.set(clampedY);
  };

  // Moody Nordic / Iceland volcanic valley landscape matching Screenshot 1
  const heroImage =
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2600&q=85';

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-screen min-h-[760px] overflow-hidden select-none bg-[#090b0d] cursor-crosshair"
    >
      {/* ========================================================================= */}
      {/* 1. BASE DARK / MOODY BACKGROUND LAYER */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt="Misty mountain valley with river"
          className="w-full h-full object-cover object-center filter brightness-[0.34] contrast-[1.12]"
        />
        {/* Deep cinematic vignette & grain */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-[#070809]/95 pointer-events-none" />
        <div className="absolute inset-0 cinematic-vignette pointer-events-none" />
        <div className="film-grain" />
      </div>

      {/* Top Peek Tab (From Screenshot 1) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-9 border-b border-x border-white/20 rounded-b-xs overflow-hidden opacity-50 z-10 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80"
          alt="peek top"
          className="w-full h-full object-cover filter brightness-70"
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP NAVIGATION (SCREENSHOT 1: WanderLust, Stacked Nav, Rounded Pill) */}
      {/* ========================================================================= */}
      <header className="absolute top-0 left-0 right-0 z-40 px-8 sm:px-14 py-7 flex items-start justify-between pointer-events-none">
        {/* Brand */}
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="font-serif italic text-3xl sm:text-4xl text-[#eae6dc] font-normal tracking-tight hover:opacity-90 transition-opacity"
          >
            TripMate
          </Link>
        </div>

        {/* Right Menu & CTA */}
        <div className="pointer-events-auto flex items-start space-x-10 sm:space-x-14">
          {/* Vertical stacked links */}
          <nav className="hidden md:flex flex-col space-y-1 font-mono text-[10px] tracking-[0.24em] uppercase text-[#ded9cc] text-left">
            <Link href="#destinations" className="hover:text-white transition-colors">
              JOURNAL.
            </Link>
            <Link href="#how-we-travel" className="hover:text-white transition-colors">
              EXPERIENCES.
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              ABOUT.
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              CONTACT.
            </Link>
          </nav>

          {/* Explore Destinations with rounded pill outline */}
          <Link
            href="#destinations"
            className="inline-flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-[#eae6dc] hover:text-white px-4 py-1.5 border border-[#eae6dc]/60 hover:border-white rounded-full transition-all"
          >
            <span className="text-xs">↳</span>
            <span>EXPLORE DESTINATIONS</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. OPTICAL REVEAL VIEWFINDER WINDOW (SCREENSHOT 1) */}
      {/* Moves smoothly on hover and illuminates the sunny, vivid background below */}
      {/* ========================================================================= */}
      {isReady && (
        <motion.div
          style={{
            x: springX,
            y: springY,
            width: windowWidth,
            height: windowHeight,
          }}
          className="absolute top-0 left-0 z-20 pointer-events-none rounded-2xs border border-white/60 shadow-[0_25px_70px_rgba(0,0,0,0.92)] overflow-hidden"
        >
          {/* Vivid High-Saturated Sunny Version of the Background Offset to Exact Coordinates */}
          <motion.div
            style={{
              x: invX,
              y: invY,
              width: dimensions.width,
              height: dimensions.height,
            }}
            className="absolute top-0 left-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt="Revealed vivid landscape"
              className="w-full h-full object-cover object-center filter brightness-[1.22] contrast-[1.14] saturate-[1.32]"
            />
          </motion.div>

          {/* Viewfinder HUD Overlays (Matching Screenshot 1 exactly) */}
          {/* Top Bar of Lens */}
          <div className="absolute top-2.5 left-3.5 right-3.5 flex items-center justify-between text-[9px] font-mono tracking-[0.22em] uppercase text-white drop-shadow-md z-30">
            <div className="flex items-center space-x-2">
              <span>TRAVEL STORIES</span>
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse inline-block shadow-[0_0_8px_rgba(220,38,38,0.9)]" />
            </div>
            <span>JOURNAL</span>
          </div>

          {/* Bottom Bar of Lens */}
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-[9px] font-mono tracking-[0.22em] uppercase text-white drop-shadow-md z-30">
            <span>01.</span>
            <span>REAL JOURNEYS</span>
            <span>42.</span>
          </div>

          {/* Center Crosshair / Plus Accent */}
          <div className="absolute top-1/2 right-4 -translate-y-1/2 text-white/90 font-serif text-lg pointer-events-none drop-shadow z-30">
            +
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 4. LARGE EDITORIAL TYPOGRAPHY: "Beyond Places" (LEFT) & "Into Moments" (RIGHT) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-between px-8 sm:px-16 md:px-24">
        {/* Left: Beyond Places */}
        <div className="max-w-md text-left">
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-normal text-[#eae6dc] leading-[0.9] tracking-tight drop-shadow-2xl">
            <span className="italic block font-light">Beyond</span>
            <span>Places</span>
          </h1>
        </div>

        {/* Right: Into Moments */}
        <div className="max-w-md text-right">
          <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-normal text-[#eae6dc] leading-[0.9] tracking-tight drop-shadow-2xl">
            <span className="italic block font-light">Into</span>
            <span>Moments</span>
          </h1>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM DETAILS: QUICK TICKER & BOTTOM PEEK TAB */}
      {/* ========================================================================= */}
      {/* Bottom Right: Quick Destination Ticker (From Screenshot 1) */}
      <div className="absolute bottom-8 right-10 z-30 text-right pointer-events-auto font-mono text-[10px] tracking-[0.22em] uppercase text-[#ded9cc]/90 space-y-1">
        <Link href="#destinations" className="hover:text-white transition-colors block">
          • ALL DESTINATIONS
        </Link>
        <div className="text-white/60">LADAKH</div>
        <div className="text-white/60">SPITI VALLEY</div>
      </div>

      {/* Bottom Center Peek Tab (From Screenshot 1) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-9 border-t border-x border-white/20 rounded-t-xs overflow-hidden opacity-50 z-10 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80"
          alt="peek bottom"
          className="w-full h-full object-cover filter brightness-70"
        />
      </div>
    </div>
  );
}
