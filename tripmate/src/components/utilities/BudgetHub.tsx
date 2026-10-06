'use client';

import React, { useState } from 'react';
import { useTrip } from '@/context/TripContext';
import { Expense } from '@/types';
import { IndianRupee, QrCode, Plus, Trash2, ArrowUpRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function BudgetHub({ tripId }: { tripId: string }) {
  const { activeTrip, addExpense, deleteExpense } = useTrip();
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [selectedPayee, setSelectedPayee] = useState<{ name: string; upiId: string; amount: number } | null>(null);

  // Form states
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<Expense['category']>('FOOD');
  const [paidBy, setPaidBy] = useState('Kabir (You)');

  if (!activeTrip) return null;

  const expenses = activeTrip.expenses;
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalBudget = activeTrip.totalBudget;
  const budgetPercent = Math.min(Math.round((totalSpent / totalBudget) * 100), 100);
  const memberCount = Math.max(activeTrip.members.length, 1);
  const splitPerPerson = Math.round(totalSpent / memberCount);

  // Group by category
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const memberObj = activeTrip.members.find((m) => m.name === paidBy);

    addExpense(tripId, {
      title: expenseTitle.trim(),
      amount: parsedAmount,
      category: expenseCategory,
      paidByName: paidBy,
      paidByUpi: memberObj?.upiId || 'tripmate@upi',
      date: new Date().toISOString().split('T')[0],
    });

    setExpenseTitle('');
    setExpenseAmount('');
  };

  const openUpiForMember = (member: { name: string; upiId?: string }) => {
    setSelectedPayee({
      name: member.name,
      upiId: member.upiId || 'traveler@okaxis',
      amount: splitPerPerson,
    });
    setShowUpiModal(true);
  };

  return (
    <div className="bg-[#14161a] border border-white/10 rounded-xs p-6 md:p-8 shadow-2xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8c8e]">
            EXPEDITION LEDGER • SPLITMATE
          </span>
          <h3 className="font-serif text-3xl font-normal text-white mt-1">
            Budget & Shared Expenses
          </h3>
          <p className="text-xs text-[#8a8c8e] mt-1 font-mono">
            Track group costs, category distribution, and settle balances via UPI.
          </p>
        </div>

        {/* Quick Settle CTA */}
        <button
          onClick={() => openUpiForMember(activeTrip.members[0])}
          className="inline-flex items-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs tracking-wider uppercase px-5 py-2.5 rounded-full font-medium transition-all self-start sm:self-auto shadow-md"
        >
          <QrCode className="w-4 h-4" />
          <span>SETTLE VIA UPI QR</span>
        </button>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Budget */}
        <div className="bg-[#181b20] border border-white/5 p-5 rounded-xs">
          <span className="text-[10px] font-mono uppercase text-[#8a8c8e]">TOTAL BUDGET</span>
          <div className="text-3xl font-serif text-white mt-1">
            ₹{totalBudget.toLocaleString('en-IN')}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-mono text-[#8a8c8e] mb-1">
              <span>UTILIZATION</span>
              <span className="text-white font-medium">{budgetPercent}%</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-[#181b20] border border-white/5 p-5 rounded-xs">
          <span className="text-[10px] font-mono uppercase text-[#8a8c8e]">LOGGED EXPENSES</span>
          <div className="text-3xl font-serif text-white mt-1">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] font-mono text-[#8a8c8e] mt-3">
            Remaining: <span className="text-white font-medium">₹{(totalBudget - totalSpent).toLocaleString('en-IN')}</span>
          </p>
        </div>

        {/* Equal Split */}
        <div className="bg-[#181b20] border border-white/5 p-5 rounded-xs">
          <span className="text-[10px] font-mono uppercase text-[#8a8c8e]">EQUAL SHARE PER PERSON</span>
          <div className="text-3xl font-serif text-white mt-1">
            ₹{splitPerPerson.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] font-mono text-[#8a8c8e] mt-3">
            Across {memberCount} traveling teammates
          </p>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-[#181b20] border border-white/5 p-5 rounded-xs">
        <h4 className="text-[10px] font-mono uppercase text-[#8a8c8e] mb-3 tracking-wider">
          CATEGORY BREAKDOWN
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['FOOD', 'STAY', 'TRANSIT', 'ACTIVITIES', 'MISC'] as const).map((cat) => {
            const amount = categoryTotals[cat] || 0;
            return (
              <div key={cat} className="bg-[#14161a] border border-white/5 p-3 rounded-xs">
                <span className="text-[9px] font-mono text-[#8a8c8e] uppercase">{cat}</span>
                <p className="text-base font-serif text-white mt-0.5">
                  ₹{amount.toLocaleString('en-IN')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Expense Form */}
      <form onSubmit={handleAddExpense} className="bg-[#181b20] border border-white/5 rounded-xs p-5">
        <h4 className="text-xs font-mono uppercase text-white font-medium mb-3 tracking-wider">
          + Record Group Bill
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <input
            type="text"
            placeholder="Expense title (e.g. Dinner at Thalassa, Scooters)..."
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            className="sm:col-span-5 bg-[#14161a] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white"
          />

          <div className="sm:col-span-2 relative">
            <span className="absolute left-2.5 top-2 text-[#8a8c8e] text-xs font-mono">₹</span>
            <input
              type="number"
              placeholder="Amount"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="w-full bg-[#14161a] border border-white/10 rounded-xs pl-6 pr-2 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
            />
          </div>

          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value as Expense['category'])}
            className="sm:col-span-2 bg-[#14161a] border border-white/10 rounded-xs px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-white"
          >
            <option value="FOOD">Food & Drinks</option>
            <option value="STAY">Hotel & Villa</option>
            <option value="TRANSIT">Cabs & Fuel</option>
            <option value="ACTIVITIES">Sightseeing</option>
            <option value="MISC">Miscellaneous</option>
          </select>

          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="sm:col-span-2 bg-[#14161a] border border-white/10 rounded-xs px-2 py-2 text-xs text-white focus:outline-hidden focus:border-white"
          >
            {activeTrip.members.map((m) => (
              <option key={m.id} value={m.name}>
                Paid by {m.name.split(' ')[0]}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="sm:col-span-1 bg-white text-black hover:bg-neutral-200 px-3 py-2 rounded-xs text-xs font-medium transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Expense History Table */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-mono uppercase text-[#8a8c8e] tracking-wider">
          RECENT BILLS ({expenses.length})
        </h4>
        <div className="divide-y divide-white/5 border border-white/5 rounded-xs overflow-hidden">
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-[#8a8c8e] text-xs font-mono">
              No expenses recorded yet.
            </div>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between p-3.5 bg-[#181b20] hover:bg-[#1b1f24] transition-colors"
              >
                <div>
                  <h5 className="text-xs font-medium text-white">{exp.title}</h5>
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[#8a8c8e] mt-0.5">
                    <span>{exp.category}</span>
                    <span>•</span>
                    <span>Paid by {exp.paidByName}</span>
                    <span>•</span>
                    <span>{exp.date}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="font-serif text-base font-normal text-white">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={() => deleteExpense(tripId, exp.id)}
                    className="p-1 text-[#8a8c8e] hover:text-rose-400 transition-colors"
                    title="Delete bill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* UPI QR Modal */}
      {showUpiModal && selectedPayee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#14161a] border border-white/20 rounded-xs max-w-sm w-full p-8 text-center shadow-2xl relative">
            <h3 className="font-serif text-2xl text-white font-normal">
              Settle via UPI
            </h3>
            <p className="text-xs text-[#8a8c8e] mt-1 font-mono">
              Scan with GPay, PhonePe, or Paytm to pay {selectedPayee.name}.
            </p>

            <div className="my-6 p-4 bg-white rounded-xs inline-block shadow-inner">
              <QRCodeSVG
                value={`upi://pay?pa=${selectedPayee.upiId}&pn=${encodeURIComponent(
                  selectedPayee.name
                )}&am=${selectedPayee.amount}&cu=INR&tn=TripMate%20Settlement`}
                size={180}
                level="M"
              />
            </div>

            <div className="bg-[#0c0e11] p-3 rounded-xs border border-white/5 mb-5 font-mono text-xs">
              <div className="text-[#8a8c8e] text-[10px]">SETTLEMENT AMOUNT</div>
              <div className="text-2xl font-serif text-white mt-0.5">
                ₹{selectedPayee.amount.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-[#8a8c8e] mt-1">
                VPA: {selectedPayee.upiId}
              </div>
            </div>

            <button
              onClick={() => setShowUpiModal(false)}
              className="text-xs font-mono text-[#8a8c8e] hover:text-white"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
