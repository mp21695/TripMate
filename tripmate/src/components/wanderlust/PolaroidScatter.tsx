'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface DestinationItem {
  id: string;
  code: string;
  name: string;
  caption: string;
  region: string;
  image: string;
  badge?: 'INDIA_STAMP' | 'HIMALAYAN_FLOWER' | 'PRAYER_FLAG' | 'ROYAL_SEAL';
  x: number; // percentage horizontal position (14% to 84%)
  y: number; // percentage vertical position (10% to 80%)
  rotation: number; // tilt angle in degrees
}

export const INDIAN_DESTINATIONS: DestinationItem[] = [
  {
    id: 'ind-01',
    code: '01',
    name: 'LADAKH',
    caption: 'Ladakh',
    region: 'Jammu & Kashmir',
    image: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80',
    badge: 'INDIA_STAMP',
    x: 50,
    y: 28,
    rotation: -6,
  },
  {
    id: 'ind-02',
    code: '02',
    name: 'SPITI VALLEY',
    caption: 'Spiti Valley',
    region: 'Himachal Pradesh',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80',
    badge: 'PRAYER_FLAG',
    x: 22,
    y: 16,
    rotation: 5,
  },
  {
    id: 'ind-03',
    code: '03',
    name: 'KERALA',
    caption: 'Kerala',
    region: 'God’s Own Country',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80',
    badge: 'HIMALAYAN_FLOWER',
    x: 28,
    y: 38,
    rotation: -4,
  },
  {
    id: 'ind-04',
    code: '04',
    name: 'JAIPUR',
    caption: 'Jaipur',
    region: 'Rajasthan',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80',
    badge: 'ROYAL_SEAL',
    x: 23,
    y: 66,
    rotation: 7,
  },
  {
    id: 'ind-05',
    code: '05',
    name: 'VARANASI',
    caption: 'Varanasi',
    region: 'Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=600&q=80',
    x: 14,
    y: 11,
    rotation: -11,
  },
  {
    id: 'ind-06',
    code: '06',
    name: 'MEGHALAYA',
    caption: 'Meghalaya',
    region: 'Abode of Clouds',
    image: 'https://images.unsplash.com/photo-1626014303757-6467329b0f94?auto=format&fit=crop&w=1000&q=80',
    x: 18,
    y: 48,
    rotation: -2,
  },
  {
    id: 'ind-07',
    code: '07',
    name: 'RISHIKESH',
    caption: 'Rishikesh',
    region: 'Uttarakhand',
    image: 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=600&q=80',
    x: 43,
    y: 53,
    rotation: 6,
  },
  {
    id: 'ind-08',
    code: '08',
    name: 'UDAIPUR',
    caption: 'Udaipur',
    region: 'City of Lakes',
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80',
    x: 69,
    y: 71,
    rotation: -8,
  },
  {
    id: 'ind-09',
    code: '09',
    name: 'KASHMIR',
    caption: 'Kashmir',
    region: 'Paradise on Earth',
    image: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=600&q=80',
    x: 54,
    y: 51,
    rotation: 1,
  },
  {
    id: 'ind-10',
    code: '10',
    name: 'HAMPI',
    caption: 'Hampi',
    region: 'Karnataka',
    image: 'https://images.unsplash.com/photo-1600100397608-f010f444f4d2?auto=format&fit=crop&w=1000&q=80',
    x: 75,
    y: 14,
    rotation: -7,
  },
  {
    id: 'ind-11',
    code: '11',
    name: 'GOA',
    caption: 'Goa',
    region: 'Konkan Coast',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
    badge: 'ROYAL_SEAL',
    x: 69,
    y: 23,
    rotation: 8,
  },
  {
    id: 'ind-12',
    code: '12',
    name: 'ANDAMAN',
    caption: 'Andaman Islands',
    region: 'Bay of Bengal',
    image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80',
    x: 50,
    y: 73,
    rotation: -3,
  },
  {
    id: 'ind-13',
    code: '13',
    name: 'COORG',
    caption: 'Coorg',
    region: 'Western Ghats',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
    x: 82,
    y: 21,
    rotation: 11,
  },
  {
    id: 'ind-14',
    code: '14',
    name: 'SIKKIM',
    caption: 'Sikkim',
    region: 'Eastern Himalayas',
    image: 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?auto=format&fit=crop&w=600&q=80',
    badge: 'INDIA_STAMP',
    x: 63,
    y: 57,
    rotation: 0,
  },
  {
    id: 'ind-15',
    code: '15',
    name: 'JODHPUR',
    caption: 'Jodhpur',
    region: 'Blue City',
    image: 'https://images.unsplash.com/photo-1593693397690-362ae9666ec2?auto=format&fit=crop&w=1000&q=80',
    x: 36,
    y: 57,
    rotation: -9,
  },
  {
    id: 'ind-16',
    code: '16',
    name: 'ZIRO VALLEY',
    caption: 'Ziro Valley',
    region: 'Arunachal Pradesh',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    x: 40,
    y: 37,
    rotation: 3,
  },
  {
    id: 'ind-17',
    code: '17',
    name: 'MANALI',
    caption: 'Manali',
    region: 'Kullu Valley',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    x: 32,
    y: 22,
    rotation: -5,
  },
  {
    id: 'ind-18',
    code: '18',
    name: 'CHIKMAGALUR',
    caption: 'Chikmagalur',
    region: 'Karnataka',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
    badge: 'HIMALAYAN_FLOWER',
    x: 58,
    y: 36,
    rotation: 9,
  },
  {
    id: 'ind-19',
    code: '19',
    name: 'JAISALMER',
    caption: 'Jaisalmer',
    region: 'Thar Desert',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    x: 75,
    y: 45,
    rotation: -4,
  },
  {
    id: 'ind-20',
    code: '20',
    name: 'PONDICHERRY',
    caption: 'Pondicherry',
    region: 'French Colony Coast',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80',
    x: 45,
    y: 70,
    rotation: -2,
  },
];

export function PolaroidScatter() {
  // SIKKIM (id: 'ind-14') active by default matching the exact 14 position from Screenshot 2
  const [activeId, setActiveId] = useState<string>('ind-14');

  // Exactly 20 Indian destinations: 10 on left, 10 on right
  const leftList = INDIAN_DESTINATIONS.slice(0, 10);
  const rightList = INDIAN_DESTINATIONS.slice(10, 20);

  return (
    <section
      id="destinations"
      className="py-28 px-4 sm:px-8 md:px-12 bg-[#060708] relative overflow-hidden select-none min-h-[920px]"
    >
      <div className="max-w-[1440px] mx-auto relative">
        {/* ========================================================================= */}
        {/* SECTION HEADER (MATCHING SCREENSHOT 2 EXACTLY) */}
        {/* ========================================================================= */}
        <div className="text-center mb-12 sm:mb-16 relative z-20">
          <h2 className="font-serif text-4xl sm:text-6xl text-[#eae6dc] font-normal tracking-tight leading-tight">
            <span className="italic block font-light">Destinations</span>
            <span>Worth Wandering</span>
          </h2>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#7d8085] uppercase mt-2">
            20 UNCHARTED EXPEDITIONS ACROSS INDIA
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 3-COLUMN SPREAD: LEFT COLUMN (01-10) | CENTER COLLAGE (20 POLAROIDS) | RIGHT (11-20) */}
        {/* ========================================================================= */}
        <div className="relative w-full min-h-[720px] flex items-center justify-between">
          {/* LEFT LIST: 01. LADAKH to 10. HAMPI */}
          <div className="hidden lg:flex flex-col space-y-3 z-30 font-mono text-xs tracking-[0.2em] w-52 shrink-0">
            {leftList.map((item) => {
              const isSelected = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className={`text-left transition-all duration-300 flex items-baseline space-x-2.5 cursor-pointer py-0.5 group ${
                    isSelected
                      ? 'text-[#eae6dc] font-bold text-sm tracking-[0.22em]'
                      : 'text-[#3f4247] hover:text-[#8e9196]'
                  }`}
                >
                  <span className={isSelected ? 'text-[#eae6dc]' : 'text-[#2a2c30]'}>
                    {item.code}.
                  </span>
                  <span>{item.name}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#eae6dc] inline-block ml-1 shadow-[0_0_8px_rgba(234,230,220,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* CENTER COLLAGE: 20 OVERLAPPING POLAROIDS (ONLY CLICKED LIGHTS UP!) */}
          {/* ========================================================================= */}
          <div className="relative w-full h-[660px] max-w-4xl mx-auto flex items-center justify-center">
            {INDIAN_DESTINATIONS.map((dest) => {
              const isLit = activeId === dest.id;

              return (
                <motion.div
                  key={dest.id}
                  onClick={() => setActiveId(dest.id)}
                  style={{
                    left: `${dest.x}%`,
                    top: `${dest.y}%`,
                    zIndex: isLit ? 60 : Math.floor(dest.y),
                  }}
                  animate={{
                    scale: isLit ? 1.18 : 1,
                    rotate: isLit ? 0 : dest.rotation,
                    filter: isLit
                      ? 'brightness(1.1) contrast(1.06) saturate(1.15)'
                      : 'brightness(0.32) contrast(0.9) grayscale(0.2)',
                    opacity: isLit ? 1 : 0.42,
                  }}
                  whileHover={{
                    scale: isLit ? 1.2 : 1.05,
                    opacity: isLit ? 1 : 0.72,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer p-2 sm:p-2.5 pb-4 sm:pb-6 rounded-xs transition-all duration-300 ${
                    isLit
                      ? 'bg-[#ffffff] shadow-[0_30px_70px_rgba(0,0,0,0.95)] ring-2 ring-white/90 scale-105'
                      : 'bg-[#1a1d22] shadow-lg border border-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Decorative Badges (Screenshot 2 style) */}
                  {dest.badge === 'INDIA_STAMP' && (
                    <div className="absolute -top-3.5 -right-2.5 z-10 bg-amber-800 text-amber-100 text-[8px] font-mono px-1.5 py-0.5 border border-dashed border-amber-300/80 shadow-md rotate-[12deg]">
                      INDIA POST
                    </div>
                  )}
                  {dest.badge === 'PRAYER_FLAG' && (
                    <div className="absolute -top-3 -left-2 z-10 w-6 h-6 bg-red-600 rounded-xs flex items-center justify-center shadow-lg rotate-[-8deg] border border-white">
                      <span className="text-white font-bold text-xs leading-none">ॐ</span>
                    </div>
                  )}
                  {dest.badge === 'HIMALAYAN_FLOWER' && (
                    <div className="absolute -top-2.5 -left-1.5 z-10 text-xs rotate-[-15deg] filter drop-shadow">
                      🌸
                    </div>
                  )}
                  {dest.badge === 'ROYAL_SEAL' && (
                    <div className="absolute -top-3 -right-2 z-10 bg-yellow-900/90 text-amber-200 text-[8px] font-mono px-1 py-0.5 border border-amber-400/60 shadow-md rotate-[-6deg]">
                      ROYAL RAJASTHAN
                    </div>
                  )}

                  {/* Polaroid Photo Frame */}
                  <div className="relative w-28 sm:w-36 md:w-44 h-24 sm:h-28 md:h-34 overflow-hidden rounded-2xs bg-neutral-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dest.image}
                      alt={dest.caption}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>

                  {/* Handwritten Editorial Label under the Photo */}
                  <div className="mt-2 text-center">
                    <span
                      className={`font-serif italic text-[11px] sm:text-xs block truncate transition-colors duration-300 ${
                        isLit
                          ? 'text-neutral-900 font-semibold'
                          : 'text-neutral-500 opacity-60'
                      }`}
                    >
                      {dest.caption}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* RIGHT LIST: GOA 11. to PONDICHERRY 20. (RIGHT ALIGNED AS IN SCREENSHOT 2) */}
          <div className="hidden lg:flex flex-col space-y-3 z-30 font-mono text-xs tracking-[0.2em] w-52 shrink-0 text-right">
            {rightList.map((item) => {
              const isSelected = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className={`text-right transition-all duration-300 flex items-baseline justify-end space-x-2.5 cursor-pointer py-0.5 group ${
                    isSelected
                      ? 'text-[#eae6dc] font-bold text-sm tracking-[0.22em]'
                      : 'text-[#3f4247] hover:text-[#8e9196]'
                  }`}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#eae6dc] inline-block mr-1 shadow-[0_0_8px_rgba(234,230,220,0.8)]" />
                  )}
                  <span>{item.name}</span>
                  <span className={isSelected ? 'text-[#eae6dc]' : 'text-[#2a2c30]'}>
                    {item.code}.
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Thumbnails Selector */}
        <div className="mt-6 lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-none py-3 px-2">
          {INDIAN_DESTINATIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveId(d.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase whitespace-nowrap transition-all ${
                activeId === d.id
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-neutral-900 text-neutral-400 border border-white/10'
              }`}
            >
              {d.code}. {d.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
