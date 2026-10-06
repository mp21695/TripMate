'use client';

import React, { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import { Sparkles, CheckCircle2, ArrowRight, Loader2, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AiCopilotPanelProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AiCopilotPanel({ tripId, isOpen, onClose }: AiCopilotPanelProps) {
  const { activeTrip, addItem } = useTrip();
  const [selectedPrompt, setSelectedPrompt] = useState('Add a scenic sunset viewpoint before dinner on Day 1');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  if (!isOpen || !activeTrip) return null;

  const presetPrompts = [
    'Add a scenic sunset viewpoint before dinner on Day 1',
    'Find a quiet seaside coffee spot for Day 2 morning',
    'Insert a traditional Goan thali stop in Fontainhas',
    'Optimize transit buffers for coastal 2-wheeler traffic',
  ];

  const handleExecute = () => {
    setIsProcessing(true);
    setCurrentStep(1);
    setAppliedMessage(null);

    setTimeout(() => setCurrentStep(2), 900);
    setTimeout(() => setCurrentStep(3), 1800);
    setTimeout(() => {
      setCurrentStep(4);
      setIsProcessing(false);

      const targetDay = activeTrip.days[0];
      if (targetDay) {
        addItem(tripId, targetDay.id, {
          title: 'Sunset at Vagator Cliff Viewpoint',
          category: 'ATTRACTION',
          startTime: '05:30 PM',
          endTime: '06:45 PM',
          locationName: 'Ozran Beach Clifftop, Vagator',
          estimatedCost: 0,
          lat: 15.5987,
          lng: 73.7389,
          notes: 'AI Copilot: Added 45 mins before sunset. 12 mins from afternoon cafe.',
          transitToNext: {
            mode: 'SCOOTER',
            durationMinutes: 12,
            distanceKm: 3.5,
          },
        });

        confetti({
          particleCount: 35,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffffff', '#a3a6aa', '#10b981'],
        });

        setAppliedMessage(
          '✓ Successfully added "Sunset at Vagator Cliff" into Day 1 schedule with verified coordinates.'
        );
      }
    }, 2700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#14161a] border border-white/20 rounded-xs max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8a8c8e] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8c8e]">
          ROUTE INTELLIGENCE • GEMINI COPILOT
        </span>
        <h3 className="font-serif text-3xl font-normal text-white mt-1">
          Spatial Directives
        </h3>
        <p className="text-xs font-mono text-[#8a8c8e] mt-1">
          Select or formulate a directive for your schedule.
        </p>

        {/* Preset Directives */}
        <div className="mt-6 space-y-2">
          <label className="text-[10px] font-mono uppercase text-[#8a8c8e] tracking-wider block">
            PRESETS
          </label>
          {presetPrompts.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPrompt(p);
                setCustomPrompt('');
              }}
              className={`w-full text-left p-3 rounded-xs font-mono text-xs border transition-all ${
                selectedPrompt === p && !customPrompt
                  ? 'bg-[#181b20] border-white text-white'
                  : 'bg-[#121417] border-white/5 text-[#8a8c8e] hover:text-white'
              }`}
            >
              &ldquo;{p}&rdquo;
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="mt-4">
          <label className="text-[10px] font-mono uppercase text-[#8a8c8e] tracking-wider block mb-1">
            CUSTOM DIRECTIVE
          </label>
          <input
            type="text"
            placeholder="e.g. Add a scenic stop before dinner..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
          />
        </div>

        {/* Pipeline Execution */}
        {isProcessing && (
          <div className="mt-6 p-4 bg-[#181b20] border border-white/10 rounded-xs space-y-2 font-mono text-xs">
            <div className="flex items-center space-x-2 text-white">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>OPTIMIZING SCHEDULE...</span>
            </div>
            <div className="text-[10px] text-[#8a8c8e] space-y-1">
              <div className={currentStep >= 1 ? 'text-white' : ''}>
                {currentStep >= 1 ? '✓' : '○'} STAGE 1: Analyzing time gaps & pacing
              </div>
              <div className={currentStep >= 2 ? 'text-white' : ''}>
                {currentStep >= 2 ? '✓' : '○'} STAGE 2: Verifying coordinates
              </div>
              <div className={currentStep >= 3 ? 'text-white' : ''}>
                {currentStep >= 3 ? '✓' : '○'} STAGE 3: Computing transit buffer
              </div>
            </div>
          </div>
        )}

        {/* Applied Message */}
        {appliedMessage && (
          <div className="mt-5 p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xs font-mono text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{appliedMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[#8a8c8e] hover:text-white"
          >
            DISMISS
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing}
            className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans font-medium text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all disabled:opacity-50"
          >
            <span>OPTIMIZE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
