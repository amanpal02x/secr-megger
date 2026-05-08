import React from 'react';

export function FormLabel({ children, required }) {
  return (
    <label className="block text-sm font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const base = "w-full px-3 py-2.5 text-base text-navy-900 bg-white border rounded-lg outline-none transition-all duration-150 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
const valid = "border-slate-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/10";
const invalid = "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10";

export function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`${base} ${error ? invalid : valid} ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${base} ${error ? invalid : valid} form-select-arrow ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', ...props }) {
  return (
    <textarea
      className={`${base} ${error ? invalid : valid} resize-y min-h-[88px] ${className}`}
      {...props}
    />
  );
}

export function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {message}
    </p>
  );
}
