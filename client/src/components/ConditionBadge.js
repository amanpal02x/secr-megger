import React from 'react';

const styles = {
  Good:     'bg-green-50 text-green-800 border-green-200',
  Fair:     'bg-amber-50 text-amber-800 border-amber-200',
  Poor:     'bg-red-50 text-red-700 border-red-200',
  Critical: 'bg-red-100 text-red-900 border-red-400 font-semibold',
};

export default function ConditionBadge({ condition }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${styles[condition] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {condition}
    </span>
  );
}
