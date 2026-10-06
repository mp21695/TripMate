'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useTrip } from '@/context/TripContext';
import {
  Compass,
  Calendar,
  MapPin,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  CloudSun,
  ShieldCheck,
  CheckCircle2,
  X,
  Trash2,
} from 'lucide-react';

export default function DashboardPage() {
  const { trips, activeTrip, setActiveTripId, createTrip, deleteTrip } = useTrip();
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  // Form States
  const [destQuery, setDestQuery] = useState('Varkala Cliff');
  const [regionQuery, setRegionQuery] = useState('Kerala, India');
  const [dateRange, setDateRange] = useState('18 NOV — 22 NOV');
  const [selectedVibe, setSelectedVibe] = useState<'RELAXED' | 'ADVENTURE' | 'FOODIE'>('RELAXED');
  const [budgetVal, setBudgetVal] = useState('35000');
  const [coverUrl, setCoverUrl] = useState('https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=80');

  const currentTrip = activeTrip || trips[0];

  const handleFinishCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = createTrip({
      title: `${destQuery}: ${selectedVibe === 'RELAXED' ? 'Coastal Retreat' : selectedVibe === 'ADVENTURE' ? 'Expedition' : 'Culinary Trail'}`,
      destination: destQuery,
      stateOrRegion: regionQuery,
      startDate: '2026-11-18',
      endDate: '2026-11-22',
      totalBudget: parseFloat(budgetVal) || 35000,
      currency: 'INR',
      coverImage: coverUrl,
      coordinates: { lat: 8.7379, lng: 76.7163 },
    });
    setShowCreateFlow(false);
  };

  const totalTrackedSpend = trips.reduce(
    (acc, t) => acc + t.expenses.reduce((s, e) => s + e.amount, 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#0c0e11] text-[#f5f4ef] selection:bg-[#3d444d] selection:text-white">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-12 pt-28 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <span className="font-mono text-[10px] tracking-[0.25em] text-[#8a8c8e] uppercase">
              STUDIO ARCHIVE • EXPERIENCES
            </span>
            <h1 className="font-serif text-4xl sm:text-6xl text-white font-normal tracking-tight mt-1">
              Your Expeditions
            </h1>
          </div>

          <button
            onClick={() => setShowCreateFlow(true)}
            className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs tracking-[0.18em] uppercase px-6 py-3 rounded-full transition-all self-start sm:self-auto font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE EXPEDITION</span>
          </button>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-10">
          {/* Main Hero Card (8 Cols) */}
          {currentTrip && (
            <div className="md:col-span-8 bg-[#14161a] border border-white/10 rounded-xs overflow-hidden relative group transition-all duration-300 flex flex-col justify-between">
              {/* Image Banner */}
              <div className="relative w-full h-72 sm:h-96 overflow-hidden bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentTrip.coverImage}
                  alt={currentTrip.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 filter brightness-[0.75]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14161a] via-transparent to-transparent" />

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider text-white border border-white/10">
                  {currentTrip.stateOrRegion}
                </div>

                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full font-mono text-[10px] text-white border border-white/10">
                  {currentTrip.weatherSummary.icon} {currentTrip.weatherSummary.temp}°C
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                  <span className="font-mono text-[10px] text-white/60 tracking-widest block uppercase">
                    COORDINATES: {currentTrip.coordinates.lat}° N, {currentTrip.coordinates.lng}° E
                  </span>
                  <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal mt-1">
                    {currentTrip.title}
                  </h2>
                </div>
              </div>

              {/* Bottom Details Bar */}
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 bg-[#16181d]">
                <div className="flex items-center space-x-8 text-xs font-mono text-[#8a8c8e]">
                  <div>
                    <span className="text-white font-medium block">{currentTrip.days.length} DAYS</span>
                    <span className="text-[10px]">DURATION</span>
                  </div>
                  <div>
                    <span className="text-white font-medium block">
                      {currentTrip.days.reduce((s, d) => s + d.items.length, 0)} STOPS
                    </span>
                    <span className="text-[10px]">SCHEDULED</span>
                  </div>
                  <div>
                    <span className="text-white font-medium block">
                      ₹{currentTrip.totalBudget.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px]">TOTAL BUDGET</span>
                  </div>
                </div>

                <Link
                  href={`/trips/${currentTrip.id}`}
                  className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs tracking-[0.16em] uppercase px-5 py-2.5 rounded-full transition-all self-start sm:self-auto font-medium"
                >
                  <span>OPEN PLANNER</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Right Column: Ledger (4 Cols) */}
          <div className="md:col-span-4 bg-[#14161a] border border-white/10 p-6 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 font-mono text-[10px] text-[#8a8c8e] uppercase tracking-wider">
                <span>FINANCIAL LEDGER</span>
                <span className="text-white font-medium">SPLITMATE</span>
              </div>

              <div className="mt-6">
                <span className="text-[10px] font-mono text-[#8a8c8e] uppercase tracking-wider">TOTAL LOGGED SPEND</span>
                <div className="text-3xl font-serif text-white mt-1">
                  ₹{totalTrackedSpend.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-[11px] font-mono text-[#8a8c8e] mb-1.5">
                  <span>BUDGET UTILIZATION</span>
                  <span className="text-white">58%</span>
                </div>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div className="bg-white h-full" style={{ width: '58%' }} />
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-2 gap-2 mt-6 font-mono text-[10px]">
                <div className="bg-[#181b20] p-3 rounded-xs border border-white/5">
                  <span className="text-[#8a8c8e]">STAY / VILLAS</span>
                  <div className="text-white font-medium mt-0.5">₹16,500</div>
                </div>
                <div className="bg-[#181b20] p-3 rounded-xs border border-white/5">
                  <span className="text-[#8a8c8e]">FOOD & DRINK</span>
                  <div className="text-white font-medium mt-0.5">₹6,450</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-[#8a8c8e]">
              <span>CURRENCY: INR (₹)</span>
              <span className="text-emerald-400">● UPI READY</span>
            </div>
          </div>

          {/* Bottom Grid: All Registered Trips */}
          <div className="md:col-span-12 mt-4">
            <h3 className="font-serif text-2xl text-white font-normal mb-4">
              All Archived Trips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trips.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTripId(t.id)}
                  className={`p-5 rounded-xs border cursor-pointer transition-all flex flex-col justify-between ${
                    t.id === currentTrip?.id
                      ? 'bg-[#181b20] border-white/40 text-white'
                      : 'bg-[#14161a] border-white/10 text-[#8a8c8e] hover:text-white hover:border-white/20'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-white/50 block">
                      {t.stateOrRegion}
                    </span>
                    <h4 className="font-serif text-xl font-normal text-white mt-1">
                      {t.title}
                    </h4>
                    <p className="text-xs font-mono text-[#8a8c8e] mt-2">
                      {t.days.length} Days • ₹{t.totalBudget.toLocaleString('en-IN')} Budget
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-white">SELECT EXPEDITION</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Wizard */}
      {showCreateFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#14161a] border border-white/20 rounded-xs max-w-lg w-full p-8 shadow-2xl relative">
            <button
              onClick={() => setShowCreateFlow(false)}
              className="absolute top-6 right-6 text-[#8a8c8e] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8c8e]">
              EXPEDITION WIZARD
            </span>
            <h3 className="font-serif text-3xl text-white font-normal mt-1">
              Where are we headed?
            </h3>

            <form onSubmit={handleFinishCreate} className="space-y-6 mt-6">
              <div>
                <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                  DESTINATION & REGION
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder="e.g. Varkala Cliff"
                    className="bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
                    required
                  />
                  <input
                    type="text"
                    value={regionQuery}
                    onChange={(e) => setRegionQuery(e.target.value)}
                    placeholder="e.g. Kerala, India"
                    className="bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-[#8a8c8e] block mb-1">
                  TARGET BUDGET (₹ INR)
                </label>
                <input
                  type="number"
                  value={budgetVal}
                  onChange={(e) => setBudgetVal(e.target.value)}
                  placeholder="35000"
                  className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateFlow(false)}
                  className="px-4 py-2 text-xs font-mono text-[#8a8c8e] hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-white text-black font-sans text-xs tracking-wider uppercase px-6 py-2.5 rounded-full font-medium"
                >
                  INITIALIZE EXPEDITION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
