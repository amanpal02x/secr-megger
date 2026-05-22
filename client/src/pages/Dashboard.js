import React, { useEffect, useState } from 'react';
import { getEntries, getLocations, getEntry } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

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
  const [allEntries, setAllEntries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('total');
  const [filterUser, setFilterUser] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');

  useEffect(() => {
    Promise.all([getEntries(), getLocations()])
      .then(([entriesData, locationsData]) => { 
        setAllEntries(entriesData); 
        setLocations(locationsData); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const entry = allEntries.find(x => x.id === id);
    if (entry && !entry.isDetailLoaded) {
      try {
        const fullDetails = await getEntry(id);
        setAllEntries(prev => prev.map(x => x.id === id ? { ...fullDetails, isDetailLoaded: true } : x));
      } catch (err) {
        console.error('Failed to load entry details:', err);
      }
    }
    setExpandedId(id);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 text-sm">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
      Loading dashboard…
    </div>
  );

  const role = dbUser?.role || 'user';
  const isGlobalAdmin = ['admin', 'global_admin'].includes(role);
  const isSubAdmin = role === 'sub_admin';

  // Calculate client-side stats
  // 1. Global Admin divisions
  const totalCount = allEntries.length;
  const bspCount = allEntries.filter(e => e.divisionId === 'BSP' || e.divisionName === 'BSP').length;
  const ngpCount = allEntries.filter(e => e.divisionId === 'NGP' || e.divisionName === 'NGP').length;
  const rCount = allEntries.filter(e => e.divisionId === 'R' || e.divisionName === 'R').length;

  // 2. Sub Admin pending sections & user submissions
  const subAdminDiv = dbUser?.division || '';
  const divLocations = locations.filter(l => l.division === subAdminDiv);
  const totalSectionsList = Array.from(new Set(divLocations.map(l => l.section)));
  const submittedSections = new Set(allEntries.map(e => e.sectionName));
  const pendingSectionsList = totalSectionsList.filter(sec => !submittedSections.has(sec));

  const userSubmissionsMap = {};
  allEntries.forEach(e => {
    const userId = e.userId?._id || e.userId || e.userName || e.technicianName || 'unknown';
    const userName = e.userId?.name || e.userName || e.technicianName || 'Unknown User';
    if (!userSubmissionsMap[userId]) {
      userSubmissionsMap[userId] = { id: userId, name: userName, count: 0 };
    }
    userSubmissionsMap[userId].count += 1;
  });
  const userSubmissionsList = Object.values(userSubmissionsMap).sort((a, b) => b.count - a.count);

  // Filter entries to display in the recent list
  const filteredEntries = allEntries.filter(e => {
    if (isGlobalAdmin) {
      if (activeFilter === 'total') return true;
      return e.divisionId === activeFilter || e.divisionName === activeFilter;
    } else if (isSubAdmin) {
      if (filterUser) {
        const userId = e.userId?._id || e.userId || e.userName || e.technicianName || 'unknown';
        return userId === filterUser;
      }
      return true;
    }
    return true;
  });

  const recent = filteredEntries.slice(0, 8);

  return (
    <div className="flex-1 bg-slate-100 min-h-screen">
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">6-Quad Cable Megger Maintenance Overview</p>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* KPI Cards Grid */}
        {isGlobalAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              value={totalCount} 
              label="Total Tests" 
              sub="All divisions" 
              barClass="bg-navy-600" 
              valueClass="text-navy-700" 
              isActive={activeFilter === 'total'}
              onClick={() => setActiveFilter('total')}
            />
            <StatCard 
              value={bspCount} 
              label="Bilaspur (BSP)" 
              sub="BSP records" 
              barClass="bg-blue-600" 
              valueClass="text-blue-700" 
              isActive={activeFilter === 'BSP'}
              onClick={() => setActiveFilter('BSP')}
            />
            <StatCard 
              value={ngpCount} 
              label="Nagpur (NGP)" 
              sub="NGP records" 
              barClass="bg-teal-600" 
              valueClass="text-teal-700" 
              isActive={activeFilter === 'NGP'}
              onClick={() => setActiveFilter('NGP')}
            />
            <StatCard 
              value={rCount} 
              label="Raipur (R)" 
              sub="Raipur records" 
              barClass="bg-purple-600" 
              valueClass="text-purple-700" 
              isActive={activeFilter === 'R'}
              onClick={() => setActiveFilter('R')}
            />
          </div>
        )}

        {isSubAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <StatCard 
              value={totalCount} 
              label="Total Tests" 
              sub={`Division: ${subAdminDiv}`} 
              barClass="bg-navy-600" 
              valueClass="text-navy-700" 
              isActive={!filterUser}
              onClick={() => setFilterUser(null)}
            />
            <div 
              onClick={() => {
                setPendingSearch('');
                setShowPendingModal(true);
              }}
              className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[130px] md:h-[138px] cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 transition-all duration-200"
            >
              <div className="h-1 w-full bg-amber-500" />
              <div className="p-3 md:p-5 flex flex-col justify-center">
                <div className="text-2xl md:text-3xl font-semibold text-amber-700 leading-none mb-1.5 md:mb-2">
                  {pendingSectionsList.length} <span className="text-xs md:text-sm font-medium text-slate-400">/ {totalSectionsList.length}</span>
                </div>
                <div className="text-xs md:text-sm font-medium text-navy-800 truncate">Pending Sections</div>
                <div className="text-[10px] md:text-xs text-slate-400 font-mono mt-0.5">Without maintenance logs</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[130px] md:h-[138px]">
              <div className="h-1 w-full bg-emerald-500" />
              <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-navy-800 flex justify-between items-center shrink-0">
                <span>User Submissions</span>
              </div>
              <div className="overflow-y-auto flex-grow divide-y divide-slate-100 scrollbar-thin">
                {userSubmissionsList.map(u => (
                  <div 
                    key={u.id}
                    onClick={() => setFilterUser(u.id === filterUser ? null : u.id)}
                    className={`px-4 py-2 text-xs flex justify-between items-center cursor-pointer transition-colors hover:bg-slate-50
                      ${filterUser === u.id ? 'bg-navy-50 font-bold text-navy-800' : 'text-slate-600'}`}
                  >
                    <span className="truncate max-w-[130px]">{u.name}</span>
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{u.count} tests</span>
                  </div>
                ))}
                {userSubmissionsList.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">No submissions</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-5 items-start">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[15px] font-semibold text-navy-900">Recent Test Records</h2>
                {isGlobalAdmin && activeFilter !== 'total' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 bg-navy-50 text-navy-850 border-navy-200">
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {activeFilter} Division
                  </span>
                )}
                {isSubAdmin && filterUser && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="w-1 h-1 rounded-full bg-current" />
                    User: {userSubmissionsMap[filterUser]?.name || 'Filter Active'}
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
                  No records found in the database for the active filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Date', 'Division', 'Section', 'Name & Designation', 'Submitted By', 'Action'].map(h => (
                        <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${h === 'Action' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((e, i) => (
                      <React.Fragment key={e.id}>
                        <tr
                          onClick={() => toggle(e.id)}
                          className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50/60
                            ${expandedId === e.id ? 'bg-navy-900/[0.03]' : ''} ${i === recent.length - 1 && expandedId !== e.id ? 'border-b-0' : ''}`}
                        >
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
                            <div className="text-xs font-semibold text-navy-800">{e.userName || e.technicianName}</div>
                            {e.supervisorName && (
                              <div className="text-[10px] text-slate-400 font-medium">{e.supervisorName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                            {e.userId?.name || e.submittedBy || '—'}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={ev => ev.stopPropagation()}>
                            <button
                              onClick={() => toggle(e.id)}
                              className="text-[10px] font-bold text-navy-700 bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg border border-navy-100 transition-all flex items-center gap-1 shadow-sm active:scale-95 whitespace-nowrap ml-auto"
                            >
                              <span>{expandedId === e.id ? 'Hide' : 'View Details'}</span>
                              <svg className={`w-3.5 h-3.5 text-navy-500 transition-transform duration-200 ${expandedId === e.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </td>
                        </tr>

                        {expandedId === e.id && (
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <td colSpan={6} className="px-0 py-0">
                              {!e.isDetailLoaded ? (
                                <div className="px-6 py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                                  <div className="w-5 h-5 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
                                  <span className="text-xs font-semibold text-navy-800">Fetching megger recordings & attachment...</span>
                                </div>
                              ) : (
                                <div className="px-4 md:px-8 py-6 text-left">
                                  <div className="mb-6">
                                    <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">Quad Readings Summary</h4>
                                    
                                    <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-3 py-2 text-left font-semibold text-slate-500">Quad</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Loop Res.</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">L1/E</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">L2/E</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">L1/L2</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">DB Loss</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Core</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">NEXT</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">FEXT</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Noise</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Armor</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Condition</th>
                                            <th className="px-3 py-2 text-center font-semibold text-slate-500">Remark</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {e.quadReadings?.map(q => (
                                            <tr key={q.quadNo}>
                                              <td className="px-3 py-1.5 font-mono font-bold text-navy-700">{q.quadNo}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.loopResistance || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-navy-800 font-mono font-medium">{q.insulationL1E || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-navy-800 font-mono font-medium">{q.insulationL2E || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-navy-800 font-mono font-medium">{q.insulationL1L2 || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.dbLoss || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.coreSize || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.next || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.fext || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.noiseLevel || '—'}</td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.armerContinuity || '—'}</td>
                                              <td className="px-3 py-1.5 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${q.condition === 'Bad' ? 'bg-red-50 text-red-700 border border-red-150' : 'bg-green-50 text-green-700 border border-green-150'}`}>
                                                  {q.condition || 'Good'}
                                                </span>
                                              </td>
                                              <td className="px-3 py-1.5 text-center text-slate-600 font-mono truncate max-w-[150px]" title={q.remark || ''}>{q.remark || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="sm:hidden space-y-3">
                                      {e.quadReadings?.map(q => (
                                        <div key={q.quadNo} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
                                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                            <span className="font-bold text-navy-900 font-mono">Quad {q.quadNo}</span>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${q.condition === 'Bad' ? 'bg-red-50 text-red-700 border border-red-150' : 'bg-green-50 text-green-700 border border-green-150'}`}>
                                              {q.condition || 'Good'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                            <div className="flex justify-between"><span className="text-slate-400">Loop Res:</span> <span className="font-mono">{q.loopResistance || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">Core:</span> <span className="font-mono">{q.coreSize || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">L1/E:</span> <span className="font-mono font-bold text-navy-700">{q.insulationL1E || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">L2/E:</span> <span className="font-mono font-bold text-navy-700">{q.insulationL2E || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">L1/L2:</span> <span className="font-mono font-bold text-navy-700">{q.insulationL1L2 || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">DB Loss:</span> <span className="font-mono">{q.dbLoss || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">NEXT:</span> <span className="font-mono">{q.next || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">FEXT:</span> <span className="font-mono">{q.fext || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">Noise:</span> <span className="font-mono">{q.noiseLevel || '—'}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">Armor:</span> <span className="font-mono">{q.armerContinuity || '—'}</span></div>
                                            <div className="col-span-2 flex flex-col pt-1 mt-1 border-t border-slate-50">
                                              <span className="text-slate-400 mb-0.5">Remark:</span>
                                              <span className="text-slate-700 font-mono truncate" title={q.remark || ''}>{q.remark || '—'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                      {[
                                        ['Major Section', e.majorSectionName],
                                        ['Designation', e.supervisorName || '—'],
                                        ['Name', e.userName || e.technicianName],
                                        ['Recorded On', e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—'],
                                        ['Submitted By User', e.userId && typeof e.userId === 'object' ? `${e.userId.name || '—'} (${e.userId.phoneNumber || '—'})` : '—'],
                                      ].map(([k, v]) => (
                                        <div key={k}>
                                          <p className="text-[9px] md:text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">{k}</p>
                                          <p className="text-xs text-navy-800 font-semibold">{v}</p>
                                        </div>
                                      ))}
                                    </div>
                                    {e.attachment && (
                                      <div className="md:col-span-1 border-l border-slate-100 pl-6 flex flex-col justify-center">
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-2">Evidence Attachment</p>
                                        {e.attachment.startsWith('data:image/') ? (
                                          <div className="relative group cursor-pointer w-fit" onClick={() => window.open(e.attachment, '_blank')}>
                                            <img src={e.attachment} alt="Evidence" className="h-16 w-24 object-cover rounded border border-slate-200" />
                                            <div className="absolute inset-0 bg-navy-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                            </div>
                                          </div>
                                        ) : (
                                          <button 
                                            onClick={() => {
                                              const link = document.createElement('a');
                                              link.href = e.attachment;
                                              link.download = `Evidence_${e.id.substring(0,8)}`;
                                              link.click();
                                            }}
                                            className="flex items-center gap-2 px-2.5 py-1.5 bg-navy-50 text-navy-700 rounded text-[11px] font-bold hover:bg-navy-100 transition-colors w-fit"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                            View File
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Sections Modal */}
      {showPendingModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowPendingModal(false)}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-navy-900 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-white font-bold text-base">Pending Sections</h3>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">Division: {subAdminDiv}</p>
              </div>
              <button 
                onClick={() => setShowPendingModal(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Search Pending Sections */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search pending sections..."
                  value={pendingSearch}
                  onChange={e => setPendingSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 text-xs border border-slate-300 rounded-lg bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </div>

            {/* Modal Body / List */}
            <div className="p-6 overflow-y-auto flex-grow divide-y divide-slate-100 scrollbar-thin">
              {pendingSectionsList.filter(sec => sec.toLowerCase().includes(pendingSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  No pending sections match your search.
                </div>
              ) : (
                pendingSectionsList
                  .filter(sec => sec.toLowerCase().includes(pendingSearch.toLowerCase()))
                  .map((sec, idx) => (
                    <div key={sec} className="py-2.5 text-xs text-navy-900 font-semibold flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] flex items-center justify-center border border-amber-100 shrink-0">
                        {idx + 1}
                      </span>
                      <span>{sec}</span>
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button 
                onClick={() => setShowPendingModal(false)}
                className="px-4 py-2 text-xs font-bold text-navy-700 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
