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

function StatCard({ value, label, sub, barClass, valueClass, isActive, onClick }) {
  const activeStyles = isActive 
    ? 'border-navy-500 ring-2 ring-navy-500/15 bg-navy-50/20 shadow-md scale-[1.02]'
    : 'hover:-translate-y-0.5 hover:shadow-md border-slate-200 bg-white hover:border-slate-300';

  return (
    <div 
      onClick={onClick}
      className={`rounded-lg border shadow-sm overflow-hidden transition-all duration-200 cursor-pointer ${activeStyles}`}
    >
      <div className={`h-1 w-full ${barClass}`} />
      <div className="p-3 md:p-5">
        <div className={`text-2xl md:text-4xl font-semibold leading-none mb-1.5 md:mb-2 ${valueClass}`}>{value}</div>
        <div className="text-xs md:text-sm font-medium text-navy-800 truncate" title={label}>{label}</div>
        <div className="text-[10px] md:text-xs text-slate-400 font-mono mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ setActivePage }) {
  const { dbUser } = useAuth();
  const [stats, setStats] = useState({ total: 0, good: 0, fair: 0, poor: 0, critical: 0 });
  const [allEntries, setAllEntries] = useState([]);
  const [activeFilter, setActiveFilter] = useState('total');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getEntries()])
      .then(([s, e]) => { 
        setStats(s); 
        setAllEntries(e); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 text-sm">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
      Loading dashboard…
    </div>
  );

  const isAdmin = ['admin', 'global_admin', 'sub_admin'].includes(dbUser?.role);

  // Filter entries based on selected stat card
  const filteredEntries = allEntries.filter(e => {
    if (activeFilter === 'total') return true;
    return e.condition?.toLowerCase() === activeFilter;
  });

  const recent = filteredEntries.slice(0, 8);

  return (
    <div className="flex-1 bg-slate-100 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">6-Quad Cable Megger Maintenance Overview</p>
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

      <div className="p-4 md:p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statConfig.map((c, index) => (
            <div key={c.key} className={c.key === 'total' ? 'col-span-2 sm:col-span-3 lg:col-span-1' : ''}>
              <StatCard 
                value={stats[c.key]} 
                label={c.label} 
                sub={c.sub} 
                barClass={c.bar} 
                valueClass={valueColors[c.key]} 
                isActive={activeFilter === c.key}
                onClick={() => setActiveFilter(c.key)}
              />
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="space-y-5 items-start">

          {/* Recent entries table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-navy-900">Recent Test Records</h2>
                {activeFilter !== 'total' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border flex items-center gap-1 ${
                    activeFilter === 'good' ? 'bg-green-50 text-green-700 border-green-200' :
                    activeFilter === 'fair' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    activeFilter === 'poor' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-red-950/5 text-red-800 border-red-800/20'
                  }`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {activeFilter}
                  </span>
                )}
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
                <p>
                  No {activeFilter !== 'total' ? `${activeFilter} ` : ''}records found in the database.
                </p>
                {!isAdmin && activeFilter === 'total' && (
                  <button onClick={() => setActivePage('entry')} className="text-sm font-medium bg-gold-500 hover:bg-gold-400 text-navy-900 px-4 py-2 rounded-lg transition-colors">
                    Add First Entry
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Date', 'Division', 'Section', 'Name & Designation', 'Condition', 'Action'].map(h => (
                        <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${h === 'Action' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((e, i) => (
                      <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${i === recent.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {new Date(e.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {e.divisionName?.replace(' Division', '')}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          <div className="truncate max-w-[150px] md:max-w-none" title={e.sectionName}>{e.sectionName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-navy-800">{e.technicianName}</div>
                          {e.supervisorName && (
                            <div className="text-[10px] text-slate-400 font-medium">{e.supervisorName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ConditionBadge condition={e.condition} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setActivePage('log')}
                            className="text-[10px] font-bold text-navy-700 bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg border border-navy-100 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
