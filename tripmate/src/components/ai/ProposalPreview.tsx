'use client';

import React, { useState } from 'react';
import { Proposal, Change } from '@/lib/proposal';
import { Trip, ItineraryItem, DayPlan } from '@/types';
import {
  CheckCircle2,
  PlusCircle,
  ArrowRightLeft,
  Edit3,
  Trash2,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface ProposalPreviewProps {
  proposal: Proposal;
  messageId: string;
  isApplied?: boolean;
  isDiscarded?: boolean;
  isSaving: boolean;
  onApprove: (
    messageId: string,
    changes: Change[],
    selectedIndices: Set<number>
  ) => Promise<void>;
  onDiscard: (messageId: string) => void;
  activeTrip: Trip | null;
}

function getItemTitle(itemId: string, trip: Trip | null): string {
  if (!trip) return 'Item';
  for (const day of trip.days) {
    const it = day.items.find((i: ItineraryItem) => i.id === itemId);
    if (it) return it.title;
  }
  return 'Item';
}

function getItemDayNumber(itemId: string, trip: Trip | null): number | undefined {
  if (!trip) return undefined;
  for (const day of trip.days) {
    const it = day.items.find((i: ItineraryItem) => i.id === itemId);
    if (it) return day.dayNumber;
  }
  return undefined;
}

function getDayNumber(dayId: string, trip: Trip | null): number | undefined {
  if (!trip) return undefined;
  const d = trip.days.find((day: DayPlan) => day.id === dayId);
  return d?.dayNumber;
}

export function ProposalPreview({
  proposal,
  messageId,
  isApplied = false,
  isDiscarded = false,
  isSaving,
  onApprove,
  onDiscard,
  activeTrip,
}: ProposalPreviewProps) {
  // Checkboxes default to ON for all changes
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(proposal.changes.map((_, i) => i))
  );

  const toggleChange = (index: number) => {
    if (isApplied || isDiscarded || isSaving) return;
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectedCount = selectedIndices.size;
  const totalCount = proposal.changes.length;

  return (
    <div className="mt-3 bg-[#14161a] border border-white/20 rounded-xs p-3.5 space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-[#ffb000]" />
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#ffb000]">
            PROPOSED CHANGES, NOTHING SAVED YET
          </span>
        </div>
        {isApplied ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
            <CheckCircle2 className="w-3 h-3" />
            <span>Applied</span>
          </span>
        ) : isDiscarded ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-neutral-900 text-neutral-400 border border-white/10">
            <XCircle className="w-3 h-3" />
            <span>Discarded</span>
          </span>
        ) : (
          <span className="font-mono text-[10px] text-[#8a8c8e]">
            {selectedCount} of {totalCount} selected
          </span>
        )}
      </div>

      {/* Summary */}
      {proposal.summary && (
        <p className="text-xs text-neutral-300 font-sans italic">
          &ldquo;{proposal.summary}&rdquo;
        </p>
      )}

      {/* Changes list */}
      <div className="space-y-2">
        {proposal.changes.map((change, idx) => {
          const isSelected = selectedIndices.has(idx);

          let icon = <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
          let description = '';
          let isApproximateLocation = false;

          if (change.type === 'add') {
            const dayNum = getDayNumber(change.dayId, activeTrip);
            const dayLabel = dayNum ? `Day ${dayNum}` : 'Day';
            const costStr =
              change.item.estimatedCost && change.item.estimatedCost > 0
                ? ` (₹${change.item.estimatedCost})`
                : '';
            description = `Add "${change.item.title}" to ${dayLabel} at ${change.item.startTime}${costStr}`;
            // Tag approximate location unless coordsVerified is exactly true
            isApproximateLocation = change.item.coordsVerified !== true;
            icon = <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
          } else if (change.type === 'move') {
            const title = getItemTitle(change.itemId, activeTrip);
            const fromDayNum = getItemDayNumber(change.itemId, activeTrip);
            const toDayNum = getDayNumber(change.toDayId, activeTrip);
            const fromLabel = fromDayNum ? `Day ${fromDayNum}` : 'current day';
            const toLabel = toDayNum ? `Day ${toDayNum}` : 'target day';
            description = `Move "${title}" from ${fromLabel} to ${toLabel}`;
            icon = <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
          } else if (change.type === 'update') {
            const title = getItemTitle(change.itemId, activeTrip);
            const updatedKeys = Object.keys(change.fields).filter(
              (k) => (change.fields as Record<string, unknown>)[k] !== undefined
            );
            description = `Update "${title}" (${updatedKeys.join(', ') || 'fields'})`;
            icon = <Edit3 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
          } else if (change.type === 'delete') {
            const title = getItemTitle(change.itemId, activeTrip);
            const dayNum = getItemDayNumber(change.itemId, activeTrip);
            description = `Delete "${title}"${dayNum ? ` from Day ${dayNum}` : ''}`;
            icon = <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
          }

          return (
            <label
              key={idx}
              className={`flex items-start space-x-2.5 p-2 rounded-xs border transition-colors ${
                isSelected
                  ? 'bg-[#181b20] border-white/15'
                  : 'bg-[#101215] border-white/5 opacity-60'
              } ${isApplied || isDiscarded ? 'cursor-default' : 'cursor-pointer hover:border-white/30'}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isApplied || isDiscarded || isSaving}
                onChange={() => toggleChange(idx)}
                aria-label={`Select change: ${description}`}
                className="mt-0.5 rounded-xs border-white/30 bg-[#0c0e11] text-[#ffb000] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />

              <div className="flex-1 text-xs text-white leading-relaxed">
                <div className="flex items-center flex-wrap gap-1.5">
                  {icon}
                  <span>{description}</span>
                  {isApproximateLocation && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs text-[10px] font-mono uppercase bg-amber-950/60 text-amber-300 border border-amber-600/40">
                      approximate location
                    </span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Buttons: APPROVE SELECTED and DISCARD */}
      {!isApplied && !isDiscarded && (
        <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-white/10">
          <button
            type="button"
            onClick={() => onDiscard(messageId)}
            disabled={isSaving}
            aria-label="Discard proposed changes"
            className="px-3 py-1.5 rounded-full border border-white/20 text-[#8a8c8e] hover:text-white text-[11px] font-mono uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
          >
            DISCARD
          </button>
          <button
            type="button"
            onClick={() => onApprove(messageId, proposal.changes, selectedIndices)}
            disabled={isSaving || selectedCount === 0}
            aria-label={`Approve ${selectedCount} selected change${selectedCount === 1 ? '' : 's'}`}
            className="inline-flex items-center space-x-1.5 bg-[#ffb000] text-black hover:bg-[#e09b00] font-sans font-medium text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-full transition-all disabled:opacity-40 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  APPROVE SELECTED {selectedCount > 0 ? `(${selectedCount})` : ''}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
