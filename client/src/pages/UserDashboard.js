import React, { useEffect, useState } from 'react';
import { getStats, getEntries, getEntry } from '../utils/api';
import HealthSummaryCards from '../components/HealthSummaryCards';

export default function UserDashboard({ setActivePage }) {
  const [recent, setRecent] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEntries()
      .then((e) => { 
        setAllEntries(e);
        setRecent(e.slice(0, 5)); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayedEntries = activeFilter === 'Total' ? allEntries : recent;

  const toggle = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const entry = displayedEntries.find(x => x.id === id);
    if (entry && !entry.isDetailLoaded) {
      try {
        const fullDetails = await getEntry(id);
        setRecent(prev => prev.map(x => x.id === id ? { ...fullDetails, isDetailLoaded: true } : x));
        setAllEntries(prev => prev.map(x => x.id === id ? { ...fullDetails, isDetailLoaded: true } : x));
      } catch (err) {
        console.error('Failed to load entry details:', err);
      }
    }
    setExpandedId(id);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 text-sm">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-gold-500 rounded-full animate-spin" />
      Loading user workspace…
    </div>
  );

  return (
    <div className="flex-1 bg-slate-100 min-h-screen">
      {}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 md:py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900 tracking-tight">User Workspace</h1>
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
        
        {}
        <div className="col-span-12 space-y-8">
          
          {}
          <div className="grid grid-cols-1 max-w-xs gap-3 md:gap-4">
            <div 
              onClick={() => setActiveFilter(activeFilter === 'Total' ? null : 'Total')}
              className={`relative overflow-hidden bg-white p-4 md:p-5 rounded-2xl border ${activeFilter === 'Total' ? 'border-navy-400 ring-2 ring-navy-400/20 shadow-md bg-navy-50/10' : 'border-slate-200'} shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-navy-500" />
              <div className="pl-1">
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Total Tests</p>
                <p className="text-2xl md:text-3xl font-black text-navy-600">{allEntries.length}</p>
              </div>
            </div>
          </div>

          {/* Health Summary Cards */}
          <HealthSummaryCards entries={allEntries} />

          {/* Recent Submissions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">
                {activeFilter === 'Total' ? 'All Submissions' : 'Your Recent Submissions'}
              </h3>
              <button onClick={() => setActivePage('log')} className="text-xs font-bold text-navy-600 hover:underline">View Full Log</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-bold">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Section</th>
                    <th className="px-6 py-3">Submitted By</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedEntries.length > 0 ? displayedEntries.map(r => (
                    <React.Fragment key={r.id}>
                      <tr 
                        onClick={() => toggle(r.id)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${expandedId === r.id ? 'bg-navy-900/[0.03]' : ''}`}
                      >
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {new Date(r.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-6 py-4 font-bold text-navy-800">{r.sectionName}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {r.userId?.name || r.submittedBy || '—'}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={ev => ev.stopPropagation()}>
                          <button
                            onClick={() => toggle(r.id)}
                            className="text-[10px] font-bold text-navy-700 bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg border border-navy-100 transition-all shadow-sm active:scale-95 whitespace-nowrap ml-auto"
                          >
                            {expandedId === r.id ? 'Hide' : 'View Details'}
                          </button>
                        </td>
                      </tr>

                      {expandedId === r.id && (
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <td colSpan={4} className="px-0 py-0">
                            {!r.isDetailLoaded ? (
                              <div className="px-6 py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <div className="w-5 h-5 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
                                <span className="text-xs font-semibold text-navy-800">Fetching megger recordings & attachment...</span>
                              </div>
                            ) : (
                              <div className="px-6 py-6 text-left">
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
                                          <th className="px-3 py-2 text-center font-semibold text-slate-500">Remark</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {r.quadReadings?.map(q => (
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
                                            <td className="px-3 py-1.5 text-center text-slate-600 font-mono truncate max-w-[150px]" title={q.remark || ''}>{q.remark || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="sm:hidden space-y-3">
                                    {r.quadReadings?.map(q => (
                                      <div key={q.quadNo} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                          <span className="font-bold text-navy-900 font-mono">Quad {q.quadNo}</span>
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
                                      ['Major Section', r.majorSectionName],
                                      ['Designation', r.supervisorName || '—'],
                                      ['Name', r.userName || r.technicianName],
                                      ['Recorded On', r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—'],
                                      ['Submitted By User', r.userId && typeof r.userId === 'object' ? `${r.userId.name || '—'} (${r.userId.phoneNumber || '—'})` : '—'],
                                    ].map(([k, v]) => (
                                      <div key={k}>
                                        <p className="text-[9px] md:text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">{k}</p>
                                        <p className="text-xs text-navy-800 font-semibold">{v}</p>
                                      </div>
                                    ))}
                                  </div>
                                  {r.attachment && (
                                    <div className="md:col-span-1 border-l border-slate-100 pl-6 flex flex-col justify-center">
                                      <p className="text-[9px] md:text-[10px] uppercase tracking-wide text-slate-400 font-bold mb-2">Evidence Attachment</p>
                                      {r.attachment.startsWith('data:image/') ? (
                                        <div className="relative group cursor-pointer w-fit" onClick={() => window.open(r.attachment, '_blank')}>
                                          <img src={r.attachment} alt="Evidence" className="h-16 w-24 object-cover rounded border border-slate-200" />
                                          <div className="absolute inset-0 bg-navy-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                          </div>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = r.attachment;
                                            link.download = `Evidence_${r.id.substring(0,8)}`;
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
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-400 text-sm">No records found for this condition.</td>
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
