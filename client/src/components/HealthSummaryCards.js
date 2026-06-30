import React from 'react';
import { getDashboardStats } from '../utils/conditionUtils';

const CARDS = [
  {
    key: 'total',
    label: 'Total Tests',
    sub: 'All submitted records',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
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
    sub: 'Any value < 20 MΩ',
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
];

export default function HealthSummaryCards({ entries = [], activeFilter, onCardClick }) {
  const stats = getDashboardStats(entries);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
      {CARDS.map((card) => {
        const value = stats[card.key] ?? 0;
        const display = card.isPercent ? `${value}%` : value;

        // Since the health score metric is hidden, all remaining summary cards are entry category filters.
        const isClickable = true;
        const isActive = isClickable && activeFilter?.toLowerCase() === card.key.toLowerCase();

        const activeStyles = isActive
          ? 'border-navy-500 ring-2 ring-navy-500/15 bg-navy-50/20 shadow-md scale-[1.02]'
          : isClickable
            ? 'hover:-translate-y-0.5 hover:shadow-md border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
            : 'border-slate-200 bg-white';

        return (
          <div
            key={card.key}
            onClick={isClickable && onCardClick ? () => onCardClick(card.key) : undefined}
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
              <div className={`text-2xl md:text-3xl font-bold leading-none mb-1 ${card.valueClass}`}>
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
  );
}
