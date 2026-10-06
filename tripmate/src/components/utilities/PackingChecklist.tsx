'use client';

import React, { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import { ChecklistItem } from '@/types';
import { CheckSquare, Square, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export function PackingChecklist({ tripId }: { tripId: string }) {
  const { activeTrip, toggleChecklist, addChecklist, deleteChecklist } = useTrip();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistItem['category']>('DOCUMENTS');
  const [assignedTo, setAssignedTo] = useState('Kabir (You)');
  const [priority, setPriority] = useState<ChecklistItem['priority']>('HIGH');

  if (!activeTrip) return null;

  const items = activeTrip.checklist;
  const filteredItems =
    selectedCategory === 'ALL'
      ? items
      : items.filter((item) => item.category === selectedCategory);

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    toggleChecklist(tripId, id);
    if (!currentlyCompleted) {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ffffff', '#a3a6aa', '#10b981'],
      });
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    addChecklist(tripId, {
      text: newItemText.trim(),
      category: newItemCategory,
      assignedToName: assignedTo,
      priority,
    });
    setNewItemText('');
  };

  const categories = ['ALL', 'DOCUMENTS', 'BEACH/GEAR', 'MEDICINES', 'ELECTRONICS', 'CLOTHING'];

  return (
    <div className="bg-[#14161a] border border-white/10 rounded-xs p-6 md:p-8 shadow-2xl">
      {/* Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8c8e]">
            EXPEDITION ESSENTIALS • COLLABORATIVE CHECKLIST
          </span>
          <h3 className="font-serif text-3xl font-normal text-white mt-1">
            Shared Gear & Packing List
          </h3>
          <p className="text-xs text-[#8a8c8e] mt-1 font-mono">
            Coordinate gear, licenses, and permits across your group.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#181b20] border border-white/5 px-4 py-3 rounded-xs flex items-center space-x-4 min-w-[200px]">
          <div className="flex-1">
            <div className="flex justify-between text-xs font-mono text-[#8a8c8e] mb-1">
              <span>PACKED</span>
              <span className="font-medium text-white">{progressPercent}%</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-xs text-[#8a8c8e] shrink-0">
            {completedCount}/{items.length}
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-5 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1 text-xs font-mono rounded-full uppercase tracking-wider transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-white text-black font-medium'
                : 'bg-[#181b20] text-[#8a8c8e] hover:text-white border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAdd} className="bg-[#181b20] border border-white/5 rounded-xs p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <input
            type="text"
            placeholder="Add gear item (e.g. Odomos spray, Postpaid SIM, Poncho)..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            className="sm:col-span-5 bg-[#14161a] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
          />

          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value as ChecklistItem['category'])}
            className="sm:col-span-3 bg-[#14161a] border border-white/10 rounded-xs px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-white"
          >
            <option value="DOCUMENTS">Documents & IDs</option>
            <option value="BEACH/GEAR">Outdoor & Beach Gear</option>
            <option value="MEDICINES">Medicines & First Aid</option>
            <option value="ELECTRONICS">Electronics & Power</option>
            <option value="CLOTHING">Clothing & Footwear</option>
          </select>

          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="sm:col-span-2 bg-[#14161a] border border-white/10 rounded-xs px-2 py-2 text-xs text-white focus:outline-hidden focus:border-white"
          >
            {activeTrip.members.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="sm:col-span-2 flex items-center justify-center space-x-1 bg-white text-black hover:bg-neutral-200 font-medium px-3 py-2 rounded-xs text-xs font-sans uppercase tracking-wider transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </form>

      {/* Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xs">
            <CheckCircle2 className="w-8 h-8 text-[#8a8c8e] mx-auto mb-2 opacity-50" />
            <p className="text-[#8a8c8e] text-xs font-mono">No items in this category.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3.5 rounded-xs border transition-all ${
                item.isCompleted
                  ? 'bg-[#121417]/50 border-white/5 opacity-50'
                  : 'bg-[#181b20] border-white/5 hover:border-white/15'
              }`}
            >
              <div
                className="flex items-center space-x-3 cursor-pointer flex-1"
                onClick={() => handleToggle(item.id, item.isCompleted)}
              >
                {item.isCompleted ? (
                  <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-[#8a8c8e] hover:text-white shrink-0 transition-colors" />
                )}
                <div>
                  <span
                    className={`text-sm block ${
                      item.isCompleted
                        ? 'line-through text-[#8a8c8e]'
                        : 'text-white'
                    }`}
                  >
                    {item.text}
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-mono text-[9px] text-[#8a8c8e] uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-[#8a8c8e]">•</span>
                    <span className="font-mono text-[9px] text-white/80 bg-white/5 px-1.5 py-0.2 rounded-2xs border border-white/10">
                      Assigned to: {item.assignedToName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteChecklist(tripId, item.id)}
                className="p-1.5 text-[#8a8c8e] hover:text-rose-400 transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
