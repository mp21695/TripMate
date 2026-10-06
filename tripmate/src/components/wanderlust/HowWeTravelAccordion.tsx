'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TravelStyle {
  id: string;
  number: string;
  title: string;
  description: string;
  image: string;
}

const TRAVEL_STYLES: TravelStyle[] = [
  {
    id: 'group',
    number: '01',
    title: 'Small Group Trips',
    description:
      'INTIMATE EXPEDITIONS FOR LIKE-MINDED WANDERERS WHO CRAVE SHARED CAMPFIRES, UNRUSHED TRAIL CONVERSATIONS, AND AUTHENTIC BONDS.',
    image:
      'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'hikes',
    number: '02',
    title: 'Quiet Hikes',
    description:
      'SOLITARY MOUNTAIN TRAILS, UNMARKED CRESTS, AND WIND-SWEPT RIDGES FAR BEYOND TOURIST FOOTPATHS AND CELL SERVICE.',
    image:
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'stays',
    number: '03',
    title: 'Hidden Stays',
    description:
      'SECLUDED CABINS, TRADITIONAL RUSTIC RIADS, AND ARCHITECTURAL RETREATS ROOTED DEEPLY IN THEIR SURROUNDING LANDSCAPES.',
    image:
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'experiences',
    number: '04',
    title: 'Local Experiences',
    description:
      'WE MEET LOCAL PEOPLE, TRY REAL FOOD, LEARN THE STORIES AND SEE THE PLACES THAT DON’T MAKE IT TO THE GUIDEBOOKS.',
    image:
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'wild',
    number: '05',
    title: 'Wild Landscapes',
    description:
      'GLACIAL LAKES, TIMELESS DESERTS, VOLCANIC CANYONS, AND COASTAL CLIFFS THAT HUMBLE YOU WITH THEIR ANCIENT GRANDEUR.',
    image:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  },
];

export function HowWeTravelAccordion() {
  // Local Experiences (id: 'experiences') expanded by default matching Screenshot 3
  const [activeId, setActiveId] = useState<string>('experiences');

  return (
    <section id="how-we-travel" className="py-28 px-4 sm:px-8 bg-[#070809] relative overflow-hidden select-none">
      <div className="max-w-[1440px] mx-auto">
        {/* ========================================================================= */}
        {/* SECTION HEADER (MATCHING SCREENSHOT 3 EXACTLY) */}
        {/* ========================================================================= */}
        <div className="text-center mb-16">
          <h2 className="font-serif italic text-4xl sm:text-6xl text-[#eae6dc] font-normal tracking-tight">
            How We Travel
          </h2>
          <p className="font-serif italic text-base sm:text-lg text-[#9da0a6] mt-2">
            Different trips, same intention.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* EXPANDING VERTICAL ACCORDION SLICES (SCREENSHOT 3) */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row h-[560px] sm:h-[620px] w-full gap-2 sm:gap-3 overflow-hidden rounded-xs">
          {TRAVEL_STYLES.map((style) => {
            const isExpanded = activeId === style.id;

            return (
              <motion.div
                key={style.id}
                onMouseEnter={() => setActiveId(style.id)}
                onClick={() => setActiveId(style.id)}
                animate={{
                  flex: isExpanded ? 3.6 : 1,
                }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full overflow-hidden cursor-pointer rounded-2xs group shrink-0"
              >
                {/* Background Photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={style.image}
                  alt={style.title}
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    isExpanded
                      ? 'filter brightness-[0.88] contrast-[1.05] scale-102'
                      : 'filter brightness-[0.38] contrast-[0.95] group-hover:brightness-[0.5]'
                  }`}
                />

                {/* Subtle dark gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent transition-opacity duration-500 ${
                    isExpanded ? 'opacity-90' : 'opacity-70'
                  }`}
                />

                {/* Number Badge at Top */}
                <div className="absolute top-6 left-6 z-10 font-mono text-xs text-white/60 tracking-widest uppercase">
                  {style.number}
                </div>

                {/* EXPANDED CONTENT (AT BOTTOM, SCREENSHOT 3 LOOK) */}
                {isExpanded ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="absolute bottom-8 left-8 right-8 z-20"
                  >
                    <h3 className="font-serif italic text-2xl sm:text-3xl text-white font-normal mb-3">
                      {style.title}
                    </h3>
                    <p className="font-sans text-[11px] sm:text-xs text-[#d1cec7] tracking-[0.16em] uppercase leading-relaxed max-w-lg">
                      {style.description}
                    </p>
                  </motion.div>
                ) : (
                  /* COLLAPSED VERTICAL TEXT */
                  <div className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 -rotate-90 origin-center whitespace-nowrap z-20 pointer-events-none">
                    <span className="font-serif italic text-lg text-white/70 tracking-wide">
                      {style.title}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footnote */}
        <div className="mt-14 text-center">
          <p className="font-mono text-[10px] tracking-[0.24em] text-[#7d8085] uppercase max-w-xl mx-auto leading-relaxed">
            METICULOUS PLACES WITH REAL LOCAL CHARACTER. BEAUTIFUL, COMFORTABLE AND NEVER OVER-OPTIMIZED.
          </p>
        </div>
      </div>
    </section>
  );
}
