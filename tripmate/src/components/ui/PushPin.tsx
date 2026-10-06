import React from 'react';

export function PushPin({ className = '' }: { className?: string }) {
  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        width="28"
        height="32"
        viewBox="0 0 28 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pushpin-shadow"
      >
        {/* Needle */}
        <path d="M14 16L14 30" stroke="#71717A" strokeWidth="2" strokeLinecap="round" />
        {/* Pin Head (3D glossy red plastic) */}
        <circle cx="14" cy="10" r="8" fill="#DC2626" />
        <ellipse cx="12" cy="7.5" rx="3.5" ry="2" fill="#F87171" opacity="0.8" />
        {/* Pin Rim */}
        <rect x="9" y="14" width="10" height="3" rx="1.5" fill="#991B1B" />
      </svg>
    </div>
  );
}
