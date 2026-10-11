'use client';

import React, { useState, useEffect } from 'react';
import { useTrip } from '@/context/TripContext';
import { Sparkles, CheckCircle2, ArrowRight, Loader2, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AiCopilotPanelProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AiCopilotPanel({ tripId, isOpen, onClose }: AiCopilotPanelProps) {
  const { activeTrip, addItem } = useTrip();
  const [selectedPrompt, setSelectedPrompt] = useState('Add a scenic sunset viewpoint before dinner');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer while processing (AI takes 10-25s)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isProcessing) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing]);

  if (!isOpen || !activeTrip) return null;

  const presetPrompts = [
    'Add a scenic sunset viewpoint before dinner',
    'Find a quiet seaside coffee spot for morning',
    'Insert a traditional local cultural dinner experience',
    'Add an afternoon heritage walking exploration stop',
  ];

  const handleExecute = async () => {
    const finalPrompt = customPrompt.trim() || selectedPrompt;
    if (!finalPrompt) return;

    setIsProcessing(true);
    setAppliedMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          prompt: finalPrompt,
        }),
      });

      if (res.status === 429) {
        setErrorMessage('Rate limit reached (10 requests/min). Please wait a moment.');
        setIsProcessing(false);
        return;
      }

      if (res.status === 503) {
        setErrorMessage('Gemini AI is not configured or unavailable right now.');
        setIsProcessing(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.error || 'AI Copilot encountered an error generating the waypoint.');
        setIsProcessing(false);
        return;
      }

      const data = await res.json();
      if (data && data.dayId && data.item) {
        const { dayId, item } = data;
        const targetDay = activeTrip.days.find((d) => d.id === dayId) || activeTrip.days[0];

        // Insert into the day specified by the AI API
        await addItem(tripId, dayId, {
          title: item.title,
          category: item.category,
          startTime: item.startTime,
          endTime: item.endTime,
          locationName: item.locationName,
          estimatedCost: item.estimatedCost || 0,
          lat: item.lat,
          lng: item.lng,
          notes: item.notes,
          coordsVerified: item.coordsVerified,
          transitToNext: item.transitToNext,
        });

        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffffff', '#a3a6aa', '#10b981'],
        });

        const dayName = targetDay ? `Day ${targetDay.dayNumber}` : 'Day schedule';
        const locationAccuracy =
          item.coordsVerified === false
            ? '(Approximate location — review pin)'
            : 'with verified coordinates';

        setAppliedMessage(
          `✓ Successfully added "${item.title}" into ${dayName} ${locationAccuracy}.`
        );
      } else {
        setErrorMessage('Unexpected response format from AI Copilot.');
      }
    } catch {
      setErrorMessage('Network connection lost while contacting AI Copilot.');
    } finally {
      setIsProcessing(false);
    }
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
              className={`w-full text-left p-3 rounded-xs font-mono text-xs border transition-all cursor-pointer ${
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
            placeholder="e.g. Add a scenic viewpoint before dinner..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="w-full bg-[#0c0e11] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
          />
        </div>

        {/* Pipeline Execution with Real Progress indicator */}
        {isProcessing && (
          <div className="mt-6 p-4 bg-[#181b20] border border-white/10 rounded-xs space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>REASONING WITH GEMINI...</span>
              </div>
              <span className="text-[11px] text-[#8a8c8e]">{elapsedSeconds}s</span>
            </div>
            <div className="text-[10px] text-[#8a8c8e] space-y-1 pt-1">
              <div className={elapsedSeconds >= 1 ? 'text-white' : ''}>
                {elapsedSeconds >= 1 ? '✓' : '○'} STAGE 1: Analyzing pacing & destination topology
              </div>
              <div className={elapsedSeconds >= 6 ? 'text-white' : ''}>
                {elapsedSeconds >= 6 ? '✓' : '○'} STAGE 2: Querying geocodes & verifying coordinates
              </div>
              <div className={elapsedSeconds >= 14 ? 'text-white' : ''}>
                {elapsedSeconds >= 14 ? '✓' : '○'} STAGE 3: Computing transit buffer & inserting stop
              </div>
            </div>
          </div>
        )}

        {/* Applied Message */}
        {appliedMessage && (
          <div className="mt-5 p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xs font-mono text-xs text-emerald-400 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{appliedMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-5 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xs font-mono text-xs text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-[#8a8c8e] hover:text-white cursor-pointer"
          >
            DISMISS
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing}
            className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans font-medium text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>OPTIMIZE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
