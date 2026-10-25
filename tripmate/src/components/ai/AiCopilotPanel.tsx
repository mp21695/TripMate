'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTrip } from '@/context/TripContext';
import { Proposal, Change } from '@/lib/proposal';
import { ProposalPreview } from './ProposalPreview';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  X,
  AlertCircle,
  Eye,
  Route,
} from 'lucide-react';

interface AiCopilotPanelProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposal?: Proposal | null;
  isApplied?: boolean;
  isDiscarded?: boolean;
}

let nextMessageId = 1;
function generateMessageId(prefix: string): string {
  nextMessageId += 1;
  return `${prefix}-${nextMessageId}`;
}

export function AiCopilotPanel({ tripId, isOpen, onClose }: AiCopilotPanelProps) {
  const { trips, activeTrip, currentUser, refreshTrip } = useTrip();

  // Find target trip
  const trip =
    activeTrip && activeTrip.id === tripId
      ? activeTrip
      : trips.find((t) => t.id === tripId) || activeTrip;

  // Determine if current user has VIEWER role
  const userMember = trip?.members?.find(
    (m) =>
      (currentUser?.id && m.id === currentUser.id) ||
      (currentUser?.name && m.name.toLowerCase() === currentUser.name.toLowerCase())
  );
  const isViewer = userMember?.role === 'VIEWER';

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-init',
      role: 'assistant',
      content:
        "Hello! I'm your Gemini Trip Copilot. Ask me to add stops, reorder activities, shift timings, or optimize your daily transit routes.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Focus input on open & listen for Escape key
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Elapsed seconds timer during Gemini reasoning (takes 10-30s)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isProcessing) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen || !trip) return null;

  const exampleChips = [
    'Add a sunset viewpoint before dinner on Day 1',
    'Plan a morning heritage walk in Old Goa',
    'Move Day 2 lunch to 1:30 PM',
  ];

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setElapsedSeconds(0);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || isProcessing || isSaving || isViewer) return;

    setInput('');
    setBannerError(null);
    setBannerSuccess(null);

    const userMessage: ChatMessage = {
      id: generateMessageId('user'),
      role: 'user',
      content,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    // Payload: last 10 messages from nextMessages, sliced at 1000 characters
    const payloadMessages = nextMessages
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 1000),
      }))
      .filter((m) => m.content.length > 0)
      .slice(-10);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setElapsedSeconds(0);

    try {
      const res = await fetch(`/api/trips/${tripId}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
        signal: controller.signal,
      });

      if (res.status === 401) {
        setBannerError('Please sign in again to use AI Copilot.');
        return;
      }
      if (res.status === 403) {
        setBannerError(
          'You have view-only access to this trip. Only trip owners and editors can make AI changes.'
        );
        return;
      }
      if (res.status === 429) {
        setBannerError(
          'Slow down — rate limit exceeded. Please wait a minute before sending another message.'
        );
        return;
      }
      if (res.status === 502) {
        setBannerError('AI could not produce a valid result, please try again.');
        return;
      }
      if (res.status === 503) {
        setBannerError('Gemini AI is not configured or unavailable right now.');
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setBannerError(errData.error || 'AI Copilot encountered an error.');
        return;
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: generateMessageId('asst'),
        role: 'assistant',
        content: data.reply || 'Here are the recommended itinerary updates:',
        proposal: data.proposal || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const msg = err instanceof Error ? err.message : 'Network connection lost while contacting AI Copilot.';
      setBannerError(msg);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleOptimizeDay = async (dayId: string, dayNumber: number) => {
    if (isProcessing || isSaving || isViewer) return;

    setBannerError(null);
    setBannerSuccess(null);

    const userMessage: ChatMessage = {
      id: generateMessageId('user'),
      role: 'user',
      content: `Optimize Day ${dayNumber} route`,
    };
    setMessages((prev) => [...prev, userMessage]);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setElapsedSeconds(0);

    try {
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (res.status === 401) {
        setBannerError('Please sign in again to optimize routes.');
        return;
      }
      if (res.status === 403) {
        setBannerError(
          'You have view-only access. Only trip owners and editors can optimize routes.'
        );
        return;
      }
      if (res.status === 429) {
        setBannerError(
          'Slow down — rate limit exceeded. Please wait a minute before making another request.'
        );
        return;
      }
      if (res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        const reason =
          errData.error ||
          'Needs at least 3 items with real coordinates to optimize this day.';
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId('asst'),
            role: 'assistant',
            content: `Day ${dayNumber} route could not be optimized: ${reason}`,
            proposal: null,
          },
        ]);
        return;
      }
      if (res.status === 502) {
        setBannerError('AI could not produce an optimization explanation, please try again.');
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setBannerError(errData.error || 'Failed to optimize day route.');
        return;
      }

      const data = await res.json();
      if (data.proposal && data.proposal.changes && data.proposal.changes.length > 0) {
        const content = `Route optimized for Day ${dayNumber}: Travel time reduced from ${data.beforeMinutes} min to ${data.afterMinutes} min.\n\n${data.explanation}`;
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId('asst'),
            role: 'assistant',
            content,
            proposal: data.proposal,
          },
        ]);
      } else {
        const content = `Day ${dayNumber} route is already optimal (${data.beforeMinutes ?? 0} min transit).\n\n${data.explanation || 'No stop reordering required.'}`;
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId('asst'),
            role: 'assistant',
            content,
            proposal: null,
          },
        ]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Network connection lost during route optimization.';
      setBannerError(msg);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleApproveProposal = async (
    messageId: string,
    changes: Change[],
    selectedIndices: Set<number>
  ) => {
    const selectedChanges = changes.filter((_, idx) => selectedIndices.has(idx));
    if (selectedChanges.length === 0) return;

    setIsSaving(true);
    setBannerError(null);
    setBannerSuccess(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/ai/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: selectedChanges }),
      });

      if (res.status === 401) {
        setBannerError('Please sign in again to apply changes.');
        return;
      }
      if (res.status === 403) {
        setBannerError('You have view-only access. Only trip owners and editors can apply changes.');
        return;
      }
      if (res.status === 429) {
        setBannerError('Slow down — rate limit exceeded. Please wait a minute.');
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setBannerError(errData.error || 'Failed to apply proposed changes.');
        return;
      }

      // 1. Refresh trip in TripContext
      await refreshTrip(tripId);

      // 2. Mark message proposal as applied
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isApplied: true } : m))
      );

      // 3. Show confetti
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#a3a6aa', '#ffb000', '#10b981'],
      });

      // 4. Set success banner
      setBannerSuccess(
        `Successfully applied ${selectedChanges.length} itinerary change${
          selectedChanges.length === 1 ? '' : 's'
        }!`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error while applying changes.';
      setBannerError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardProposal = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isDiscarded: true } : m))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-copilot-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4"
    >
      <div className="bg-[#14161a] border border-white/20 rounded-xs max-w-2xl w-full h-[88vh] max-h-[740px] shadow-2xl relative flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 shrink-0 relative bg-[#121417]">
          <button
            onClick={onClose}
            aria-label="Close AI Copilot"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-[#8a8c8e] hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ffb000]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8c8e]">
              ROUTE INTELLIGENCE • GEMINI COPILOT
            </span>
          </div>
          <h3 id="ai-copilot-title" className="font-serif text-2xl sm:text-3xl font-normal text-white mt-0.5">
            Spatial Directives
          </h3>
          <p className="text-xs font-mono text-[#8a8c8e] mt-0.5">
            Interactive itinerary assistant powered by Gemini.
          </p>
        </div>

        {/* Viewer Notice */}
        {isViewer && (
          <div className="px-5 py-2.5 bg-amber-950/40 border-b border-amber-800/40 text-amber-300 font-mono text-xs flex items-center space-x-2 shrink-0">
            <Eye className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              View-Only Mode: You have read-only access. Only trip owners and editors can modify the schedule.
            </span>
          </div>
        )}

        {/* Quick Actions (Optimize Route per Day) */}
        {trip.days && trip.days.length > 0 && (
          <div className="px-5 py-2 sm:px-6 border-b border-white/5 bg-[#101215] flex items-center space-x-2 overflow-x-auto shrink-0">
            <div className="flex items-center space-x-1 shrink-0 text-[#8a8c8e]">
              <Route className="w-3 h-3 text-[#ffb000]" />
              <span className="font-mono text-[10px] uppercase tracking-wider">
                OPTIMIZE:
              </span>
            </div>
            {trip.days.map((day) => (
              <button
                key={day.id}
                type="button"
                disabled={isProcessing || isViewer || isSaving}
                onClick={() => handleOptimizeDay(day.id, day.dayNumber)}
                aria-label={`Optimize Day ${day.dayNumber} route`}
                className="px-2.5 py-1 rounded-full border border-white/10 bg-[#16191e] hover:border-[#ffb000]/60 hover:text-[#ffb000] text-[10px] font-mono uppercase tracking-wider text-neutral-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                DAY {day.dayNumber} ROUTE
              </button>
            ))}
          </div>
        )}

        {/* Banners */}
        {bannerSuccess && (
          <div className="mx-5 mt-3 p-3 bg-emerald-950/50 border border-emerald-600/40 rounded-xs font-mono text-xs text-emerald-300 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{bannerSuccess}</span>
            </div>
            <button
              onClick={() => setBannerSuccess(null)}
              aria-label="Dismiss success message"
              className="text-emerald-400 hover:text-white cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {bannerError && (
          <div className="mx-5 mt-3 p-3 bg-rose-950/50 border border-rose-600/40 rounded-xs font-mono text-xs text-rose-300 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{bannerError}</span>
            </div>
            <button
              onClick={() => setBannerError(null)}
              aria-label="Dismiss error message"
              className="text-rose-400 hover:text-white cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4">
          {messages.map((m) => {
            if (m.role === 'user') {
              return (
                <div key={m.id} className="flex flex-col items-end">
                  <div className="bg-[#1f2329] border border-white/15 text-white text-xs font-mono rounded-xs px-3.5 py-2.5 max-w-[85%] whitespace-pre-wrap leading-relaxed">
                    {m.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id} className="flex flex-col items-start max-w-[95%]">
                <div className="bg-[#101215] border border-white/10 text-neutral-200 text-xs font-sans rounded-xs p-3.5 space-y-3 w-full leading-relaxed">
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Proposal Preview if available */}
                  {m.proposal && m.proposal.changes && m.proposal.changes.length > 0 && (
                    <ProposalPreview
                      proposal={m.proposal}
                      messageId={m.id}
                      isApplied={m.isApplied}
                      isDiscarded={m.isDiscarded}
                      isSaving={isSaving}
                      onApprove={handleApproveProposal}
                      onDiscard={handleDiscardProposal}
                      activeTrip={trip}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Reasoning / Progress Indicator */}
          {isProcessing && (
            <div className="p-3.5 bg-[#181b20] border border-white/10 rounded-xs space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ffb000]" />
                  <span>REASONING WITH GEMINI...</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] text-[#8a8c8e]">{elapsedSeconds}s</span>
                  <button
                    type="button"
                    onClick={handleCancel}
                    aria-label="Cancel AI request"
                    className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-xs border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-[#8a8c8e] space-y-1 pt-1">
                <div className={elapsedSeconds >= 1 ? 'text-white' : ''}>
                  {elapsedSeconds >= 1 ? '✓' : '○'} STAGE 1: Analyzing pacing & destination topology
                </div>
                <div className={elapsedSeconds >= 6 ? 'text-white' : ''}>
                  {elapsedSeconds >= 6 ? '✓' : '○'} STAGE 2: Querying geocodes & verifying coordinates
                </div>
                <div className={elapsedSeconds >= 14 ? 'text-white' : ''}>
                  {elapsedSeconds >= 14 ? '✓' : '○'} STAGE 3: Computing transit buffer & formatting proposal
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input & Examples Section */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0e1013] shrink-0 space-y-2.5">
          {/* Example Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 text-xs">
            <span className="font-mono text-[10px] uppercase text-[#8a8c8e] shrink-0">
              TRY:
            </span>
            {exampleChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isProcessing || isViewer || isSaving}
                onClick={() => handleSendMessage(chip)}
                aria-label={`Prompt: ${chip}`}
                className="px-2.5 py-1 rounded-full border border-white/10 bg-[#14161a] hover:border-white/30 text-[11px] text-[#8a8c8e] hover:text-white font-mono truncate max-w-[220px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                &ldquo;{chip}&rdquo;
              </button>
            ))}
          </div>

          {/* Text input & Send button */}
          <div className="flex items-end space-x-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              disabled={isViewer || isProcessing || isSaving}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isViewer
                  ? 'Viewing mode only — you do not have edit permissions'
                  : 'Ask Copilot to add, move, reorder, or update itinerary stops...'
              }
              aria-label="Message to AI Copilot"
              className="flex-1 bg-[#14161a] border border-white/15 rounded-xs px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white font-mono resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isViewer || isProcessing || isSaving || !input.trim()}
              aria-label="Send message"
              className="inline-flex items-center space-x-1.5 bg-white text-black hover:bg-neutral-200 font-sans font-medium text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 h-[34px]"
            >
              <span>SEND</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8a8c8e] px-0.5">
            <span>Enter to send • Shift+Enter for new line</span>
            <span>AI never saves directly — approve changes first</span>
          </div>
        </div>
      </div>
    </div>
  );
}
