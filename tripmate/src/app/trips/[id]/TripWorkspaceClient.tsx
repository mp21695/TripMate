'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useTrip } from '@/context/TripContext';
import { ItineraryCanvas } from '@/components/itinerary/ItineraryCanvas';
import { PackingChecklist } from '@/components/utilities/PackingChecklist';
import { BudgetHub } from '@/components/utilities/BudgetHub';
import { TripNotes } from '@/components/utilities/TripNotes';
import { ExportModal } from '@/components/export/ExportModal';
import { AiCopilotPanel } from '@/components/ai/AiCopilotPanel';
import {
  Share2,
  Download,
  CheckSquare,
  IndianRupee,
  StickyNote,
  Compass,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';

export function TripWorkspaceClient({ tripId }: { tripId: string }) {
  const router = useRouter();
  const { trips, setActiveTripId } = useTrip();

  const [activeTab, setActiveTab] = useState<'ITINERARY' | 'CHECKLIST' | 'BUDGET' | 'NOTES'>('ITINERARY');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAiCopilot, setShowAiCopilot] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const trip = trips.find((t) => t.id === tripId) || trips[0];

  useEffect(() => {
    if (tripId) {
      setActiveTripId(tripId);
    }
  }, [tripId, setActiveTripId]);

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0c0e11] text-[#f5f4ef] flex items-center justify-center font-mono">
        <div className="text-center">
          <p className="text-[#8a8c8e]">Expedition registry not found.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-5 py-2.5 bg-white text-black font-sans text-xs tracking-wider uppercase rounded-full"
          >
            RETURN TO EXPERIENCES
          </button>
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e11] text-[#f5f4ef] selection:bg-[#3d444d] selection:text-white">
      <Navbar />

      {/* Hero Header */}
      <div className="relative w-full h-80 sm:h-[420px] overflow-hidden border-b border-white/10 bg-neutral-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-full object-cover filter brightness-[0.7]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e11] via-black/40 to-black/30" />

        <div className="absolute inset-0 max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col justify-end pb-10">
          {/* Top Breadcrumb & Weather Tag */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center space-x-1.5 text-[10px] font-sans tracking-[0.2em] uppercase text-white/80 hover:text-white bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO EXPERIENCES</span>
            </button>

            {/* Climate Tag */}
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-full text-[10px] font-mono text-white flex items-center space-x-2">
              <span>{trip.weatherSummary.icon}</span>
              <span>{trip.weatherSummary.temp}°C</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">{trip.weatherSummary.condition}</span>
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/70 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {trip.stateOrRegion}
                </span>
                <span className="text-[10px] font-mono text-[#8a8c8e]">
                  {trip.coordinates.lat}° N, {trip.coordinates.lng}° E
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-6xl text-white font-normal mt-2">
                {trip.title}
              </h1>
            </div>

            {/* Actions: AI Copilot, Share, Export */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAiCopilot(true)}
                className="inline-flex items-center space-x-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white px-4 py-2.5 rounded-full text-xs font-sans tracking-[0.16em] uppercase border border-white/20 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-white/70" />
                <span>AI COPILOT</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center space-x-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-[#8a8c8e] hover:text-white px-4 py-2.5 rounded-full text-xs font-sans tracking-[0.16em] uppercase border border-white/10 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">COPIED</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>INVITE LINK</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans font-medium px-5 py-2.5 rounded-full text-xs tracking-[0.16em] uppercase transition-all shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>EXPORT ITINERARY</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-10">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-white/10 pb-4 mb-10 overflow-x-auto scrollbar-none font-sans text-xs tracking-[0.16em] uppercase">
          <button
            onClick={() => setActiveTab('ITINERARY')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer ${
              activeTab === 'ITINERARY'
                ? 'bg-white text-black font-medium'
                : 'text-[#8a8c8e] hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>01. ITINERARY & ROUTE MAP</span>
          </button>

          <button
            onClick={() => setActiveTab('CHECKLIST')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer ${
              activeTab === 'CHECKLIST'
                ? 'bg-white text-black font-medium'
                : 'text-[#8a8c8e] hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>02. GEAR CHECKLIST ({trip.checklist.filter((c) => !c.isCompleted).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BUDGET')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer ${
              activeTab === 'BUDGET'
                ? 'bg-white text-black font-medium'
                : 'text-[#8a8c8e] hover:text-white hover:bg-white/5'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>03. FINANCIAL LEDGER & UPI</span>
          </button>

          <button
            onClick={() => setActiveTab('NOTES')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer ${
              activeTab === 'NOTES'
                ? 'bg-white text-black font-medium'
                : 'text-[#8a8c8e] hover:text-white hover:bg-white/5'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>04. CORKBOARD & NOTES ({trip.notes.length})</span>
          </button>
        </div>

        {/* Tab Modules */}
        {activeTab === 'ITINERARY' && <ItineraryCanvas tripId={trip.id} />}
        {activeTab === 'CHECKLIST' && <PackingChecklist tripId={trip.id} />}
        {activeTab === 'BUDGET' && <BudgetHub tripId={trip.id} />}
        {activeTab === 'NOTES' && <TripNotes tripId={trip.id} />}
      </main>

      {/* AI Copilot Panel */}
      <AiCopilotPanel
        tripId={trip.id}
        isOpen={showAiCopilot}
        onClose={() => setShowAiCopilot(false)}
      />

      {/* Dual Export Modal (Excel & Aesthetic Card) */}
      <ExportModal
        trip={trip}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}
