'use client';

import React, { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import { ScrapbookNote } from '@/types';
import { PushPin } from '@/components/ui/PushPin';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

export function TripNotes({ tripId }: { tripId: string }) {
  const { activeTrip, addNote, deleteNote } = useTrip();
  const [newText, setNewText] = useState('');
  const [author, setAuthor] = useState('Kabir (You)');
  const [color, setColor] = useState<ScrapbookNote['color']>('yellow');

  if (!activeTrip) return null;

  const notes = activeTrip.notes;

  const colorStyles: Record<ScrapbookNote['color'], string> = {
    yellow: 'bg-[#fff9d2] text-[#4d4400] border-[#edd679]',
    pink: 'bg-[#ffe4e6] text-[#781826] border-[#fca5a5]',
    green: 'bg-[#e2fbe8] text-[#14532d] border-[#86efac]',
    blue: 'bg-[#e0f2fe] text-[#0c4a6e] border-[#7dd3fc]',
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addNote(tripId, author, newText.trim(), color);
    setNewText('');
  };

  return (
    <div className="bg-[#121417] border border-[#22262c] rounded-xl p-5 md:p-7 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#22262c]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs uppercase text-amber-500 tracking-wider">
              Member 3 • Analog Scrapbook
            </span>
            <span className="px-2 py-0.5 text-[10px] bg-neutral-800 text-neutral-300 rounded-full font-mono">
              Pinned Notes
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-neutral-100 mt-1">
            Trip Corkboard & Group Notes
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Pin contacts, emergency instructions, and quick reminders for all teammates.
          </p>
        </div>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAdd} className="bg-[#181b20] border border-[#272b33] rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Write a quick note (e.g. Caretaker phone: 98234-56789, Check helmet before riding)..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1 bg-[#121417] border border-[#2b303a] rounded-md px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 w-full"
          />

          <div className="flex items-center space-x-2 shrink-0">
            {/* Color Selector */}
            <div className="flex items-center space-x-1 bg-[#121417] p-1 rounded-md border border-[#2b303a]">
              {(['yellow', 'pink', 'green', 'blue'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white/60' : 'opacity-70 hover:opacity-100'
                  } ${
                    c === 'yellow'
                      ? 'bg-amber-300'
                      : c === 'pink'
                      ? 'bg-rose-300'
                      : c === 'green'
                      ? 'bg-emerald-300'
                      : 'bg-sky-300'
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-3 py-2 rounded-md text-xs font-mono transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pin Note</span>
            </button>
          </div>
        </div>
      </form>

      {/* Corkboard Grid of Pinned Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {notes.length === 0 ? (
          <div className="col-span-full text-center py-12 border border-dashed border-[#2b303a] rounded-lg">
            <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-neutral-400 text-xs font-mono">No pinned notes yet. Be the first to leave one!</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              style={{ transform: `rotate(${note.rotation}deg)` }}
              className={`p-5 rounded-xs shadow-xl border relative transition-transform hover:scale-102 hover:rotate-0 hover:z-20 ${colorStyles[note.color]}`}
            >
              {/* Pushpin at Top Center */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <PushPin />
              </div>

              {/* Note Content */}
              <div className="pt-2">
                <p className="font-serif text-sm leading-relaxed font-medium">
                  &ldquo;{note.text}&rdquo;
                </p>

                <div className="mt-4 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-mono opacity-75">
                  <span>— {note.authorName}</span>
                  <div className="flex items-center space-x-2">
                    <span>{note.createdAt}</span>
                    <button
                      onClick={() => deleteNote(tripId, note.id)}
                      className="text-black/50 hover:text-black transition-colors"
                      title="Unpin note"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
