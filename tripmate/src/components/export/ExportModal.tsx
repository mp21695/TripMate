'use client';

import React, { useState, useRef } from 'react';
import { Trip } from '@/types';
import { Download, FileSpreadsheet, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import * as htmlToImage from 'html-to-image';
import download from 'downloadjs';

interface ExportModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ trip, isOpen, onClose }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<'EXCEL' | 'AESTHETIC'>('AESTHETIC');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | 'A4'>('9:16');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const aestheticCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // 1. Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const rows: Record<string, unknown>[] = [];

      trip.days.forEach((day) => {
        day.items.forEach((item) => {
          rows.push({
            Day: `Day ${day.dayNumber} (${day.date})`,
            Time: `${item.startTime} - ${item.endTime}`,
            Activity: item.title,
            Category: item.category,
            Location: item.locationName,
            'Cost (INR)': item.estimatedCost,
            'Google Maps Link': `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              item.locationName
            )}`,
            'Booking Ref': item.bookingRef || 'N/A',
            Notes: item.notes || '',
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Itinerary Schedule');

      const colWidths = [
        { wch: 18 },
        { wch: 18 },
        { wch: 30 },
        { wch: 14 },
        { wch: 30 },
        { wch: 12 },
        { wch: 45 },
        { wch: 14 },
        { wch: 32 },
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `${trip.title.replace(/\s+/g, '_')}_Logistics_Sheet.xlsx`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Excel export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export Aesthetic Postcard as High-Res PNG
  const handleExportAesthetic = async () => {
    if (!aestheticCardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await htmlToImage.toPng(aestheticCardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0c0e11',
      });
      download(dataUrl, `${trip.title.replace(/\s+/g, '_')}_Editorial_Postcard.png`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('PNG export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const tripUrl = `https://tripmate.app/trips/${trip.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#14161a] border border-white/20 rounded-xs max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#8a8c8e] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8c8e]">
          EXPORT SUITE • DUAL PERSONA
        </span>
        <h3 className="font-serif text-3xl font-normal text-white mt-1">
          Export Itinerary
        </h3>
        <p className="text-xs font-mono text-[#8a8c8e] mt-1">
          Spreadsheet for logistics or high-resolution editorial story card.
        </p>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-3 my-6">
          <button
            onClick={() => setActiveTab('AESTHETIC')}
            className={`p-4 rounded-xs border text-left transition-all ${
              activeTab === 'AESTHETIC'
                ? 'bg-[#181b20] border-white text-white'
                : 'bg-[#121417] border-white/5 text-[#8a8c8e] hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2 text-white font-mono text-xs font-medium uppercase">
              <ImageIcon className="w-4 h-4" />
              <span>01. EDITORIAL POSTCARD</span>
            </div>
            <div className="text-[10px] font-mono text-[#8a8c8e] mt-1">
              High-Res PNG • Minimal layout • Embedded QR
            </div>
          </button>

          <button
            onClick={() => setActiveTab('EXCEL')}
            className={`p-4 rounded-xs border text-left transition-all ${
              activeTab === 'EXCEL'
                ? 'bg-[#181b20] border-white text-white'
                : 'bg-[#121417] border-white/5 text-[#8a8c8e] hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2 text-white font-mono text-xs font-medium uppercase">
              <FileSpreadsheet className="w-4 h-4" />
              <span>02. LOGISTICS SPREADSHEET</span>
            </div>
            <div className="text-[10px] font-mono text-[#8a8c8e] mt-1">
              Excel (.xlsx) • Maps hyperlinks • Formulas
            </div>
          </button>
        </div>

        {/* Tab 1: Aesthetic Preview */}
        {activeTab === 'AESTHETIC' && (
          <div className="space-y-4">
            {/* Aspect Ratio Switcher */}
            <div className="flex items-center justify-between text-xs font-mono text-[#8a8c8e]">
              <span>FORMAT:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAspectRatio('9:16')}
                  className={`px-3 py-1 rounded-full border text-[10px] ${
                    aspectRatio === '9:16'
                      ? 'bg-white text-black font-medium border-white'
                      : 'border-white/10 text-[#8a8c8e]'
                  }`}
                >
                  9:16 STORY / WALLPAPER
                </button>
                <button
                  onClick={() => setAspectRatio('A4')}
                  className={`px-3 py-1 rounded-full border text-[10px] ${
                    aspectRatio === 'A4'
                      ? 'bg-white text-black font-medium border-white'
                      : 'border-white/10 text-[#8a8c8e]'
                  }`}
                >
                  A4 PRINTABLE
                </button>
              </div>
            </div>

            {/* Captured Node */}
            <div className="max-h-[360px] overflow-y-auto rounded-xs border border-white/10 p-2 bg-[#0c0e11]">
              <div
                ref={aestheticCardRef}
                className={`bg-[#14161a] p-6 text-white rounded-xs relative overflow-hidden border border-white/10 ${
                  aspectRatio === '9:16' ? 'max-w-sm mx-auto' : 'w-full'
                }`}
              >
                {/* Photo Banner */}
                <div className="relative w-full h-44 rounded-xs overflow-hidden mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trip.coverImage}
                    alt={trip.title}
                    className="w-full h-full object-cover filter brightness-[0.75]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14161a] via-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/80 bg-black/60 px-2 py-0.5 rounded-2xs">
                        {trip.stateOrRegion}
                      </span>
                      <h4 className="font-serif text-xl text-white font-normal mt-1 drop-shadow-md">
                        {trip.title}
                      </h4>
                    </div>
                    <span className="font-mono text-[9px] text-white/80 bg-black/60 px-2 py-0.5 rounded-2xs">
                      {trip.weatherSummary.icon} {trip.weatherSummary.temp}°C
                    </span>
                  </div>
                </div>

                {/* Day Highlights */}
                <div className="space-y-3 mb-6">
                  {trip.days.slice(0, 3).map((day) => (
                    <div key={day.id} className="border-l-2 border-white/40 pl-3">
                      <div className="font-mono text-[10px] text-white/70 uppercase tracking-wider">
                        Day {day.dayNumber} • {day.title.split(':')[0]}
                      </div>
                      <div className="text-xs text-[#a3a6aa] font-sans mt-0.5 line-clamp-1">
                        {day.items.map((i) => i.title).join(' → ') || 'Scheduled exploration'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer with Dynamic QR Code */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-serif text-xs font-normal text-white">
                      Curated on TripMate
                    </div>
                    <p className="font-mono text-[9px] text-[#8a8c8e] mt-0.5">
                      LAT: {trip.coordinates.lat}° N, {trip.coordinates.lng}° E
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 bg-white p-1 rounded-2xs">
                    <QRCodeSVG value={tripUrl} size={44} level="M" />
                    <div className="text-left font-mono text-[8px] text-black leading-tight">
                      <div>SCAN FOR</div>
                      <div className="font-bold">LIVE MAP</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleExportAesthetic}
              disabled={isExporting}
              className="w-full flex items-center justify-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs font-medium uppercase tracking-wider py-3.5 rounded-full transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'GENERATING POSTCARD...' : 'DOWNLOAD EDITORIAL POSTCARD (PNG)'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Excel Preview */}
        {activeTab === 'EXCEL' && (
          <div className="space-y-4">
            <div className="bg-[#181b20] border border-white/5 rounded-xs p-5 text-xs font-mono space-y-2">
              <div className="text-white font-medium uppercase tracking-wider">
                Spreadsheet Columns:
              </div>
              <ul className="space-y-1.5 text-[#8a8c8e] text-[11px] list-disc list-inside">
                <li>Automated day-by-day rows with exact dates</li>
                <li>Chronological start and end time columns</li>
                <li>Active Google Maps search hyperlinks for every waypoint</li>
                <li>₹ Currency-formatted column ready for Excel `=SUM()` formulas</li>
                <li>Booking confirmation reference IDs</li>
              </ul>
            </div>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="w-full flex items-center justify-center space-x-2 bg-white text-black hover:bg-neutral-200 font-sans text-xs font-medium uppercase tracking-wider py-3.5 rounded-full transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'COMPILING SPREADSHEET...' : 'DOWNLOAD LOGISTICS SPREADSHEET (.XLSX)'}</span>
            </button>
          </div>
        )}

        {/* Download Toast */}
        {downloadSuccess && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 py-2 rounded-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>EXPORT DOWNLOADED SUCCESSFULLY</span>
          </div>
        )}
      </div>
    </div>
  );
}
