import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../utils/conditionUtils';
import { getStats } from '../utils/api';

const CARDS = [
  {
    key: 'sectionsCovered',
    label: 'Sections Covered',
    sub: 'Unique sections tested',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      </svg>
    ),
    barClass: 'bg-navy-600',
    valueClass: 'text-navy-700',
    bgClass: 'bg-navy-50',
    borderClass: 'border-navy-200',
    iconBg: 'bg-navy-100 text-navy-600',
  },
  {
    key: 'excellent',
    label: 'Excellent',
    sub: 'All values = 100 MΩ',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    barClass: 'bg-emerald-500',
    valueClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    key: 'good',
    label: 'Good',
    sub: 'All values > 20 MΩ',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    barClass: 'bg-blue-500',
    valueClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    key: 'critical',
    label: 'Critical',
    sub: '10 MΩ < value < 20 MΩ',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    barClass: 'bg-red-500',
    valueClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    iconBg: 'bg-red-100 text-red-600',
  },
  {
    key: 'extremelyCritical',
    label: 'Extremely Critical',
    sub: 'Any value ≤ 10 MΩ',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    barClass: 'bg-rose-950',
    valueClass: 'text-rose-950 font-extrabold',
    bgClass: 'bg-rose-950/10',
    borderClass: 'border-rose-900/40',
    iconBg: 'bg-rose-950 text-rose-100 shadow-sm',
  },
];

export default function HealthSummaryCards({ entries = [], activeFilter, onCardClick }) {
  const stats = getDashboardStats(entries);
  const [totalSections, setTotalSections] = useState(10);
  const [remainingSections, setRemainingSections] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getStats()
      .then((res) => {
        if (res) {
          if (typeof res.totalSections === 'number') {
            setTotalSections(res.totalSections);
          }
          if (Array.isArray(res.remainingSections)) {
            setRemainingSections(res.remainingSections);
          }
        }
      })
      .catch((err) => console.error('Error fetching total sections:', err));
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {CARDS.map((card) => {
          let display = stats[card.key] ?? 0;
          if (card.key === 'sectionsCovered') {
            display = `${stats.uniqueTotal || 0} / ${Math.max(stats.uniqueTotal || 0, totalSections)}`;
          } else if (card.isPercent) {
            display = `${display}%`;
          }

          const isClickable = true;
          const cardKeyNorm = card.key.toLowerCase().replace(/[\s_]+/g, '');
          const activeFilterNorm = activeFilter?.toLowerCase().replace(/[\s_]+/g, '');
          const isActive = isClickable && (
            (card.key === 'sectionsCovered' && activeFilterNorm === 'total') ||
            (cardKeyNorm === activeFilterNorm)
          );

          const activeStyles = isActive
            ? 'border-navy-500 ring-2 ring-navy-500/15 bg-navy-50/20 shadow-md scale-[1.02]'
            : isClickable
              ? 'hover:-translate-y-0.5 hover:shadow-md border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
              : 'border-slate-200 bg-white';

          return (
            <div
              key={card.key}
              onClick={card.key === 'sectionsCovered'
                ? () => setShowModal(true)
                : (isClickable && onCardClick ? () => onCardClick(card.key) : undefined)
              }
              className={`relative rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${activeStyles}`}
            >
              {/* Top colour bar */}
              <div className={`h-1 w-full ${card.barClass}`} />

              <div className="p-3 md:p-4">
                {/* Icon + value row */}
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}>
                    {card.icon}
                  </div>
                </div>

                {/* Value */}
                <div className={`text-xl md:text-2xl font-bold leading-none mb-1 ${card.valueClass}`}>
                  {display}
                </div>

                {/* Label */}
                <div className="text-xs font-semibold text-navy-800 truncate" title={card.label}>
                  {card.label}
                </div>

                {/* Sub-label */}
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (() => {
        const maxRemaining = Math.max(0, totalSections - (stats.uniqueTotal || 0));
        const displayRemainingSections = remainingSections.slice(0, maxRemaining);
        
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-navy-900 text-base">Uncovered Sections</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{displayRemainingSections.length} sections pending test</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* List */}
              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin space-y-2">
                {displayRemainingSections.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    🎉 All sections have been successfully covered!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {displayRemainingSections.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs font-semibold text-navy-800">
                        <span className="w-5 h-5 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center text-[10px] text-navy-700 font-bold">{idx + 1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50/30">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
