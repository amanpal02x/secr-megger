import React from 'react';

export default function LoadingScreen({ message = 'Loading Dashboard...', fullScreen = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading indicator"
      className={`w-full flex-1 flex flex-col items-center justify-center p-6 text-center select-none ${
        fullScreen ? 'min-h-screen bg-slate-100' : 'min-h-[70vh] bg-slate-100/50'
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer Pulsing Glow */}
        <div className="absolute w-20 h-20 rounded-full bg-navy-600/10 animate-ping" />
        
        {/* Outer Rotating Gradient Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-navy-900 border-r-gold-500 animate-spin shadow-md" />
        
        {/* Inner SECR Badge Logo */}
        <div className="absolute inset-0 m-auto w-9 h-9 bg-navy-900 rounded-full flex items-center justify-center border border-navy-700 shadow-inner">
          <svg width="20" height="20" viewBox="0 0 34 34" fill="none">
            <rect x="1" y="1" width="32" height="32" rx="5" fill="#0c2044" stroke="#e8b830" strokeWidth="1.5"/>
            <path d="M6 24 L10 14 L14 20 L18 11 L22 16 L28 24" stroke="#e8b830" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="28" cy="9" r="2.2" fill="#e8b830"/>
          </svg>
        </div>
      </div>

      {/* Loading Message & Typography Hierarchy */}
      <div className="mt-6 space-y-1.5 max-w-xs">
        <h3 className="text-base font-bold text-navy-900 tracking-tight">
          {message}
        </h3>
        <p className="text-xs text-slate-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
          <span>Please wait a moment</span>
          <span className="inline-flex gap-0.5">
            <span className="w-1 h-1 bg-gold-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 bg-gold-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 bg-gold-500 rounded-full animate-bounce" />
          </span>
        </p>
      </div>
    </div>
  );
}
