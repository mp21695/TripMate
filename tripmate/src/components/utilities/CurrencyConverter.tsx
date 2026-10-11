'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';

const FALLBACK_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  THB: 0.42,
  JPY: 1.85,
  SGD: 0.016,
};

export function CurrencyConverter() {
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [amount, setAmount] = useState<string>('1000');
  const [fromCurrency, setFromCurrency] = useState<string>('INR');
  const [toCurrency, setToCurrency] = useState<string>('USD');
  const [lastUpdated, setLastUpdated] = useState<string>('Live');
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetchRates = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/INR');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          setRates(data.rates);
          setLastUpdated('Updated just now');
        }
      }
    } catch {
      setLastUpdated('Estimated rates');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const numAmount = parseFloat(amount) || 0;
  // Convert from `fromCurrency` to INR, then to `toCurrency`
  const fromRateInr = rates[fromCurrency] || 1;
  const toRateInr = rates[toCurrency] || 1;
  // Since rates are based on 1 INR:
  // 1 INR = rates[CURR]
  // valueInINR = numAmount / rates[fromCurrency]
  // converted = valueInINR * rates[toCurrency]
  const converted = (numAmount / fromRateInr) * toRateInr;

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const currencyList = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'THB', 'JPY', 'SGD'];

  return (
    <div className="bg-[#181b20] border border-white/5 rounded-xs p-5">
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono uppercase text-[#8a8c8e] tracking-wider">
            FOREX & CURRENCY CONVERTER
          </span>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-full">
            ● {lastUpdated}
          </span>
        </div>
        <button
          onClick={fetchRates}
          disabled={isFetching}
          className="text-[#8a8c8e] hover:text-white transition-colors"
          title="Refresh rates"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Input Amount */}
        <div className="sm:col-span-4 relative">
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#14161a] border border-white/10 rounded-xs px-3 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
            placeholder="Amount"
          />
        </div>

        {/* From Currency */}
        <div className="sm:col-span-3">
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value)}
            className="w-full bg-[#14161a] border border-white/10 rounded-xs px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
          >
            {currencyList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="sm:col-span-1 flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className="p-1.5 bg-[#14161a] hover:bg-neutral-800 text-[#8a8c8e] hover:text-white rounded-xs border border-white/10 transition-colors cursor-pointer"
            title="Swap currencies"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* To Currency */}
        <div className="sm:col-span-4">
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value)}
            className="w-full bg-[#14161a] border border-white/10 rounded-xs px-2.5 py-2 text-xs text-white focus:outline-hidden focus:border-white font-mono"
          >
            {currencyList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result Display */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
        <span className="text-[#8a8c8e]">
          {numAmount.toLocaleString('en-IN')} {fromCurrency} =
        </span>
        <span className="text-white font-serif text-lg font-normal">
          {converted.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {toCurrency}
        </span>
      </div>
    </div>
  );
}
