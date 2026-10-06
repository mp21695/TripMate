'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PolaroidProps {
  imageSrc: string;
  caption: string;
  location: string;
  coordinates?: string;
  rotation?: number;
  className?: string;
  hasTape?: boolean;
}

export function DraggablePolaroid({
  imageSrc,
  caption,
  location,
  coordinates,
  rotation = -3,
  className = '',
  hasTape = true,
}: PolaroidProps) {
  return (
    <motion.div
      drag
      dragConstraints={{ left: -60, right: 60, top: -40, bottom: 40 }}
      dragElastic={0.2}
      whileHover={{ scale: 1.05, rotate: 0, zIndex: 40 }}
      whileTap={{ scale: 0.98, cursor: 'grabbing' }}
      initial={{ rotate: rotation }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`cursor-grab bg-[#fbfaf7] text-neutral-900 p-3 pb-5 shadow-2xl rounded-xs border border-[#e5dfd5] relative select-none w-64 md:w-72 shrink-0 ${className}`}
    >
      {/* Scotch Tape Graphic at Top */}
      {hasTape && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 scotch-tape rotate-1 z-10 pointer-events-none" />
      )}

      {/* Photo Frame */}
      <div className="relative w-full h-56 md:h-64 bg-neutral-950 overflow-hidden rounded-2xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={caption}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 pointer-events-none"
        />
        {/* Subtle photo vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Caption & Metadata */}
      <div className="mt-3.5 px-1">
        <div className="flex items-baseline justify-between">
          <h4 className="font-serif text-neutral-900 text-base font-semibold tracking-wide">
            {caption}
          </h4>
          <span className="text-[11px] font-sans font-medium text-neutral-500 uppercase tracking-wider">
            {location}
          </span>
        </div>
        {coordinates && (
          <p className="font-mono text-[9px] text-neutral-400 tracking-widest mt-1">
            {coordinates}
          </p>
        )}
      </div>
    </motion.div>
  );
}
