import React, { useMemo } from 'react';

export default function OtdrAnalyticsCards({ reports = null, activeFilter = 'total', onCardClick = null }) {
  const loading = reports === null;

  const stats = useMemo(() => {
    const reportsList = Array.isArray(reports) ? reports : [];

    // Filter reports to keep only the latest report per unique section based strictly on testDate
    const latestBySection = {};
    reportsList.forEach(r => {
      const key = r.sectionId || r.sectionName || `${r.fromStation || ''}-${r.toStation || ''}` || 'unknown';
      const dateStr = r.testDate;
      let time = 0;
      if (dateStr) {
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
          time = parsed;
        }
      }
      if (!latestBySection[key] || time > latestBySection[key].time) {
        latestBySection[key] = { report: r, time };
      }
    });
    const uniqueLatestReports = Object.values(latestBySection).map(item => item.report);

    let excellent = 0;
    let good = 0;
    let critical = 0;
    let superCritical = 0;
    const uniqueRoutes = new Set();

    uniqueLatestReports.forEach(r => {
      const key = r.sectionId || r.sectionName || `${r.fromStation || ''}-${r.toStation || ''}`;
      if (key) {
        uniqueRoutes.add(key);
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
  }, [reports]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      
      {/* Card 1: Total Test Records */}
      <div 
        onClick={() => onCardClick && onCardClick('total')}
        className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all cursor-pointer select-none ${
          activeFilter === 'total'
            ? 'border-navy-400 bg-navy-50/20 ring-2 ring-navy-800 scale-[1.01]'
            : 'bg-white border-slate-200 hover:border-slate-350'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Test Records</span>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-navy-900 font-mono">
            {loading ? '…' : stats.totalTestRecords}
          </p>
        </div>
      </div>

      {/* Card 2: Number of Sections Covered */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all select-none">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sections Covered</span>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-navy-900 font-mono">
            {loading ? '…' : `${stats.sectionsCovered?.covered || 0} / ${stats.sectionsCovered?.total || 0}`}
          </p>
        </div>
      </div>

      {/* Card 3: Excellent Fibres */}
      <div 
        onClick={() => onCardClick && onCardClick('excellent')}
        className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all cursor-pointer select-none bg-gradient-to-b ${
          activeFilter === 'excellent'
            ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-600 scale-[1.01]'
            : 'bg-white border-emerald-200/80 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Excellent Fibres</span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-emerald-900 font-mono">
              {loading ? '…' : stats.fibreHealth?.excellent || 0}
            </p>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded border border-emerald-200">&lt; 0.40</span>
          </div>
        </div>
      </div>

      {/* Card 4: Good Fibres */}
      <div 
        onClick={() => onCardClick && onCardClick('good')}
        className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all cursor-pointer select-none bg-gradient-to-b ${
          activeFilter === 'good'
            ? 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-600 scale-[1.01]'
            : 'bg-white border-blue-200/80 hover:border-blue-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Good Fibres</span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-blue-900 font-mono">
              {loading ? '…' : stats.fibreHealth?.good || 0}
            </p>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded border border-blue-200">0.40–0.80</span>
          </div>
        </div>
      </div>

      {/* Card 5: Critical Fibres */}
      <div 
        onClick={() => onCardClick && onCardClick('critical')}
        className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all cursor-pointer select-none bg-gradient-to-b ${
          activeFilter === 'critical'
            ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-600 scale-[1.01]'
            : 'bg-white border-amber-200/80 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Critical Fibres</span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-amber-950 font-mono">
              {loading ? '…' : stats.fibreHealth?.critical || 0}
            </p>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200">0.81–1.00</span>
          </div>
        </div>
      </div>

      {/* Card 6: Super Critical Fibres */}
      <div 
        onClick={() => onCardClick && onCardClick('superCritical')}
        className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all cursor-pointer select-none bg-gradient-to-b ${
          activeFilter === 'superCritical'
            ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-600 scale-[1.01]'
            : 'bg-white border-rose-200/80 hover:border-rose-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Super Critical</span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-rose-950 font-mono">
              {loading ? '…' : stats.fibreHealth?.superCritical || 0}
            </p>
            <span className="text-[10px] font-bold text-rose-800 bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200">&gt; 1.00</span>
          </div>
        </div>
      </div>

    </div>
  );
}
