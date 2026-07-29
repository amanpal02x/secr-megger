import React, { useEffect, useState, useMemo } from 'react';
import { getOtdrReportStats } from '../utils/api';

export default function OtdrAnalyticsCards({ reports = null }) {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getOtdrReportStats();
      setStatsData(data);
    } catch (err) {
      console.warn('[OtdrAnalyticsCards] Backend stats failed, using fallback calculation:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (statsData) {
      return statsData;
    }

    // Dynamic fallback calculation if reports list provided or stats endpoint pending
    let excellent = 0;
    let good = 0;
    let critical = 0;
    let superCritical = 0;
    const uniqueRoutes = new Set();
    const reportsList = Array.isArray(reports) ? reports : [];

    reportsList.forEach(r => {
      if (r.fromStation && r.toStation) {
        uniqueRoutes.add(`${r.fromStation} -> ${r.toStation}`);
      }
      (r.fibreReadings || []).forEach(fr => {
        const val = parseFloat(fr.dbKm);
        if (!isNaN(val)) {
          if (val < 0.40) excellent++;
          else if (val <= 0.80) good++;
          else if (val <= 1.00) critical++;
          else superCritical++;
        }
      });
    });

    return {
      fibreHealth: { excellent, good, critical, superCritical },
      totalTestRecords: reportsList.length,
      sectionsCovered: {
        covered: uniqueRoutes.size,
        total: Math.max(uniqueRoutes.size, 10)
      }
    };
  }, [statsData, reports]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      
      {/* Card 1: Total Test Records */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Test Records</span>
          <div className="w-8 h-8 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-navy-900 font-mono">
            {loading ? '…' : stats.totalTestRecords}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Submitted Reports</p>
        </div>
      </div>

      {/* Card 2: Number of Sections Covered */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections Covered</span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-navy-900 font-mono">
            {loading ? '…' : `${stats.sectionsCovered?.covered || 0} / ${stats.sectionsCovered?.total || 0}`}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Covered / Scope Sections</p>
        </div>
      </div>

      {/* Card 3: Excellent Fibres */}
      <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Excellent Fibres</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-emerald-900 font-mono">
              {loading ? '…' : stats.fibreHealth?.excellent || 0}
            </p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded border border-emerald-200">&lt; 0.40</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">Loss &lt; 0.40 dB/km</p>
        </div>
      </div>

      {/* Card 4: Good Fibres */}
      <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-gradient-to-b from-white to-blue-50/20 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Good Fibres</span>
          <div className="w-8 h-8 rounded-lg bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-blue-900 font-mono">
              {loading ? '…' : stats.fibreHealth?.good || 0}
            </p>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded border border-blue-200">0.40–0.80</span>
          </div>
          <p className="text-[11px] text-blue-700/80 font-medium mt-0.5">0.40 ≤ Loss ≤ 0.80 dB/km</p>
        </div>
      </div>

      {/* Card 5: Critical Fibres */}
      <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-gradient-to-b from-white to-amber-50/20 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Critical Fibres</span>
          <div className="w-8 h-8 rounded-lg bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-amber-950 font-mono">
              {loading ? '…' : stats.fibreHealth?.critical || 0}
            </p>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200">0.81–1.00</span>
          </div>
          <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">0.80 &lt; Loss ≤ 1.00 dB/km</p>
        </div>
      </div>

      {/* Card 6: Super Critical Fibres */}
      <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-gradient-to-b from-white to-rose-50/30 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Super Critical</span>
          <div className="w-8 h-8 rounded-lg bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-rose-950 font-mono">
              {loading ? '…' : stats.fibreHealth?.superCritical || 0}
            </p>
            <span className="text-[10px] font-bold text-rose-800 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200">&gt; 1.00</span>
          </div>
          <p className="text-[11px] text-rose-800/80 font-medium mt-0.5">Loss &gt; 1.00 dB/km</p>
        </div>
      </div>

    </div>
  );
}
