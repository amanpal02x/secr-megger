import React, { useEffect, useState } from 'react';
import { getStats, getEntries } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import ConditionBadge from '../components/ConditionBadge';

const statConfig = [
  { key: 'total',    label: 'Total Tests',     sub: 'All records',  bar: 'bg-navy-600' },
  { key: 'good',     label: 'Good',            sub: '> 10 MΩ',      bar: 'bg-green-500' },
  { key: 'fair',     label: 'Fair',            sub: '5 – 10 MΩ',    bar: 'bg-amber-500' },
  { key: 'poor',     label: 'Poor',            sub: '1 – 5 MΩ',     bar: 'bg-red-500' },
  { key: 'critical', label: 'Critical',        sub: '< 1 MΩ',       bar: 'bg-red-800' },
];

const valueColors = {
  total: 'text-navy-700', good: 'text-green-700', fair: 'text-amber-700',
  poor: 'text-red-600', critical: 'text-red-900',
};

function StatCard({ value, label, sub, barClass, valueClass }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:-translate-y-0.5 transition-transform duration-150">
      <div className={`h-1 w-full ${barClass}`} />
      <div className="p-5">
        <div className={`text-4xl font-semibold leading-none mb-2 ${valueClass}`}>{value}</div>
        <div className="text-sm font-medium text-navy-800">{label}</div>
        <div className="text-xs text-slate-400 font-mono mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ setActivePage }) {
  const { dbUser } = useAuth();
  const [stats, setStats] = useState({ total: 0, good: 0, fair: 0, poor: 0, critical: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getEntries()])
      .then(([s, e]) => { setStats(s); setRecent(e.slice(0, 8)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 text-sm">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
      Loading dashboard…
    </div>
  );

  const isAdmin = dbUser?.role === 'admin';

  return (
    <div className="flex-1 bg-slate-100 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-end justify-between">
        <div>
          <div className="inline-flex items-center text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
            SECR / Signal &amp; Telecom
          </div>
          <h1 className="text-2xl font-semibold text-navy-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">6-Quad Cable Megger Maintenance Overview</p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setActivePage('entry')}
            className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-all duration-150 hover:shadow-md hover:-translate-y-px"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Test Entry
          </button>
        )}
      </div>

      <div className="p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-4">
          {statConfig.map(c => (
            <StatCard key={c.key} value={stats[c.key]} label={c.label} sub={c.sub} barClass={c.bar} valueClass={valueColors[c.key]} />
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-[1fr_288px] gap-5 items-start">

          {/* Recent entries table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-[15px] font-semibold text-navy-900">Recent Test Records</h2>
                <p className="text-xs text-slate-400 mt-0.5">Latest megger test entries</p>
              </div>
              <button
                onClick={() => setActivePage('log')}
                className="text-xs font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-colors"
              >
                View All
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-slate-400 text-sm text-center px-6">
                <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <p>No records yet. Start by recording your first megger test.</p>
                <button onClick={() => setActivePage('entry')} className="text-sm font-medium bg-gold-500 hover:bg-gold-400 text-navy-900 px-4 py-2 rounded-lg transition-colors">
                  Add First Entry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Date', 'Cable ID', 'Section', 'Avg (MΩ)', 'Condition', 'Technician'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((e, i) => (
                      <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${i === recent.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {new Date(e.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-navy-700 bg-navy-600/8 px-2 py-0.5 rounded">{e.cableId}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{e.sectionName}</td>
                        <td className="px-4 py-3 font-mono text-sm font-medium text-navy-800">{e.avgMeggerReading}</td>
                        <td className="px-4 py-3"><ConditionBadge condition={e.condition} /></td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{e.technicianName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Condition reference */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-[15px] font-semibold text-navy-900">Condition Guide</h2>
              </div>
              <div className="px-5 py-3 space-y-2.5">
                {[
                  { c: 'Good',     r: '> 10 MΩ' },
                  { c: 'Fair',     r: '5 – 10 MΩ' },
                  { c: 'Poor',     r: '1 – 5 MΩ' },
                  { c: 'Critical', r: '< 1 MΩ' },
                ].map(({ c, r }) => (
                  <div key={c} className="flex items-center justify-between">
                    <ConditionBadge condition={c} />
                    <span className="font-mono text-xs text-slate-500">{r}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-5 py-3 space-y-2">
                {[
                  ['Cable Type', '6-Quad Jelly / PVC'],
                  ['Test Voltage', '500V / 1000V'],
                  ['Standard', 'IRS TC 30/2010'],
                  ['Department', 'Signal & Telecom'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-navy-800 font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-[15px] font-semibold text-navy-900">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: 'Record New Test', page: 'entry', icon: <svg className="w-4 h-4 text-navy-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>, hide: isAdmin },
                  { label: 'Browse Data Log', page: 'log', icon: <svg className="w-4 h-4 text-navy-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>, hide: false },
                ].filter(a => !a.hide).map(({ label, page, icon }) => (
                  <button key={page} onClick={() => setActivePage(page)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 hover:bg-navy-600/5 border border-slate-200 hover:border-navy-300 rounded-lg text-sm font-medium text-navy-800 transition-all"
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
