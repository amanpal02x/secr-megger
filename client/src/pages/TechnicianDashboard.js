import React, { useEffect, useState } from 'react';
import { getStats, getEntries } from '../utils/api';
import ConditionBadge from '../components/ConditionBadge';

export default function TechnicianDashboard({ setActivePage }) {
  const [stats, setStats] = useState({ total: 0, good: 0, fair: 0, poor: 0, critical: 0 });
  const [recent, setRecent] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getEntries()])
      .then(([s, e]) => { 
        setStats(s); 
        setAllEntries(e);
        setRecent(e.slice(0, 5)); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayedEntries = activeFilter 
    ? (activeFilter === 'Total' ? allEntries : allEntries.filter(e => e.condition === activeFilter))
    : recent;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 text-sm">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-gold-500 rounded-full animate-spin" />
      Loading technician workspace…
    </div>
  );

  return (
    <div className="flex-1 bg-slate-100 min-h-screen">
      {/* Welcome Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 md:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900 tracking-tight">Technician Workspace</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Record and manage your cable meggering tests</p>
        </div>
        <button
          onClick={() => setActivePage('entry')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold px-6 py-3 rounded-xl shadow-lg shadow-gold-500/20 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span className="sm:inline">New Test Entry</span>
        </button>
      </div>

      <div className="p-4 md:p-8 grid grid-cols-12 gap-6 md:gap-8">
        
        {/* Main Content - Quick Overview */}
        <div className="col-span-12 space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'navy' },
              { label: 'Good', value: stats.good, color: 'green' },
              { label: 'Poor', value: stats.poor, color: 'amber' },
              { label: 'Critical', value: stats.critical, color: 'red' },
            ].map(s => (
              <div 
                key={s.label} 
                onClick={() => setActiveFilter(activeFilter === s.label ? null : s.label)}
                className={`relative overflow-hidden bg-white p-4 md:p-5 rounded-2xl border ${activeFilter === s.label ? `border-${s.color}-400 ring-2 ring-${s.color}-400/20` : 'border-slate-200'} shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${s.color}-500`} />
                <div className="pl-1">
                  <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{s.label}</p>
                  <p className={`text-2xl md:text-3xl font-black text-${s.color}-600`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">
                {activeFilter ? (activeFilter === 'Total' ? 'All Submissions' : `${activeFilter} Condition Records`) : 'Your Recent Submissions'}
              </h3>
              <button onClick={() => setActivePage('log')} className="text-xs font-bold text-navy-600 hover:underline">View Full Log</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-bold">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Section</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedEntries.length > 0 ? displayedEntries.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {new Date(r.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-navy-800">{r.sectionName}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setActivePage('log')}
                          className="text-[10px] font-bold text-navy-700 bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg border border-navy-100 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-slate-400 text-sm">No records found for this condition.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>



      </div>
    </div>
  );
}
