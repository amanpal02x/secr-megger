import React from 'react';

const styles = {
  Excellent: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
  Good:      'bg-blue-50 text-blue-800 border-blue-200',
  Critical:  'bg-red-100 text-red-900 border-red-400 font-semibold',
  // Legacy styles kept for backward compatibility
  Fair:      'bg-amber-50 text-amber-800 border-amber-200',
  Poor:      'bg-red-50 text-red-700 border-red-200',
};

export default function ConditionBadge({ condition }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${styles[condition] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {condition}
    </span>
  );
}
