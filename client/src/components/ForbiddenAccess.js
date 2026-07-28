import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ForbiddenAccess({ setActivePage }) {
  const { dbUser } = useAuth();
  const roleName = dbUser?.role === 'global_admin' || dbUser?.role === 'admin' 
    ? 'Global Admin' 
    : dbUser?.role === 'sub_admin' 
      ? 'Sub Admin' 
      : 'Administrative Role';

  return (
    <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-6 min-h-screen text-center">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 max-w-lg w-full flex flex-col items-center gap-5">
        
        {/* Shield / Forbidden Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div>
          <span className="inline-block bg-red-100 text-red-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            HTTP 403 - Forbidden Access
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900 tracking-tight">
            Data Entry Restricted
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Logged in as <strong className="text-navy-900">{roleName}</strong> ({dbUser?.email || dbUser?.name}).
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
            <strong>Security &amp; Compliance Rule:</strong> Administrative roles are restricted from creating or submitting 6 Quad Meggering measurement entries. Measurement entry creation is strictly reserved for <strong>Field Engineers &amp; Inspectors</strong> (`role: user`).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="w-full sm:w-auto bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm text-xs md:text-sm"
          >
            Return to Overview Dashboard
          </button>
          
          <button
            type="button"
            onClick={() => setActivePage('log')}
            className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-colors border border-slate-300 text-xs md:text-sm"
          >
            View Master Data Log
          </button>
        </div>

      </div>
    </div>
  );
}
