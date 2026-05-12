import React, { useEffect, useState } from 'react';
import { getStats, getEntries } from '../utils/api';
import ConditionBadge from '../components/ConditionBadge';

export default function TechnicianDashboard({ setActivePage }) {
  const [stats, setStats] = useState({ total: 0, good: 0, fair: 0, poor: 0, critical: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getEntries()])
      .then(([s, e]) => { 
        setStats(s); 
        setRecent(e.slice(0, 5)); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        
        {/* Left Column - Quick Overview */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'navy' },
              { label: 'Good', value: stats.good, color: 'green' },
              { label: 'Poor', value: stats.poor, color: 'amber' },
              { label: 'Critical', value: stats.critical, color: 'red' },
            ].map(s => (
              <div key={s.label} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{s.label}</p>
                <p className={`text-2xl md:text-3xl font-black text-${s.color}-600`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">Your Recent Submissions</h3>
              <button onClick={() => setActivePage('log')} className="text-xs font-bold text-navy-600 hover:underline">View Full Log</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-bold">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Section</th>
                    <th className="px-6 py-3">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {new Date(r.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-navy-800">{r.sectionName}</td>
                      <td className="px-6 py-4"><ConditionBadge condition={r.condition} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Reference */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-navy-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-gold-400 font-bold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Reference Guide
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Voltage', value: '500V / 1000V' },
                { label: 'Standard', value: 'IRS TC 30/2010' },
                { label: 'Cable', value: '6-Quad Jelly/PVC' }
              ].map(i => (
                <div key={i.label} className="flex justify-between border-b border-navy-800 pb-2">
                  <span className="text-slate-400 text-xs">{i.label}</span>
                  <span className="text-xs font-bold">{i.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-navy-900 font-bold mb-3 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setActivePage('entry')} className="w-full py-3 bg-slate-50 hover:bg-gold-50 text-navy-800 text-xs font-bold rounded-xl border border-slate-100 hover:border-gold-200 transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Record Megger Test
              </button>
              <button onClick={() => setActivePage('log')} className="w-full py-3 bg-slate-50 hover:bg-navy-50 text-navy-800 text-xs font-bold rounded-xl border border-slate-100 hover:border-navy-200 transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                Check My Logs
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
