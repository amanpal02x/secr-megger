import React, { useEffect, useState, useCallback } from 'react';
import { getEntries, deleteEntry, getDivisions } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import ConditionBadge from '../components/ConditionBadge';
import * as XLSX from 'xlsx';

export default function DataLog({ showToast }) {
  const { dbUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [filterDays, setFilterDays] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleExport = () => {
    if (entries.length === 0) {
      showToast('No data to export.', 'error');
      return;
    }

    const flatData = [];
    entries.forEach((e) => {
      e.quadReadings.forEach((q) => {
        flatData.push({
          'Date': new Date(e.testDate).toLocaleDateString('en-IN'),
          'Division': e.divisionName,
          'Major Section': e.majorSectionName,
          'Section': e.sectionName,
          'Technician': e.technicianName,
          'Supervisor': e.supervisorName || '',
          'Condition': e.condition,
          'Quad No': q.quadNo,
          'Loop Resistance (Ω)': q.loopResistance || '',
          'L1-Earth (MΩ)': q.insulationL1E || '',
          'L2-Earth (MΩ)': q.insulationL2E || '',
          'L1-L2 (MΩ)': q.insulationL1L2 || '',
          'DB Loss': q.dbLoss || '',
          'NEXT': q.next || '',
          'FEXT': q.fext || '',
          'Core Size': q.coreSize || '',
          'Noise Level': q.noiseLevel || '',
          'Armor Continuity': q.armerContinuity || '',
          'Remark': q.remark || ''
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Megger Data');

    // Column widths for better look
    const wscols = [
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 25 }
    ];
    ws['!cols'] = wscols;

    const fileName = `SECR_Megger_Log_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('Excel report generated.', 'success');
  };

  const load = useCallback(() => {
    setLoading(true);
    getEntries({ search, division: filterDiv })
      .then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, [search, filterDiv]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getDivisions().then(setDivisions); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEntry(deleteId);
      showToast('Entry deleted.', 'success');
      setDeleteId(null);
      load();
    } catch { showToast('Delete failed.', 'error'); }
    finally { setDeleting(false); }
  };

  const toggle = id => setExpandedId(prev => prev === id ? null : id);

  const cols = ['#', 'Date', 'Division', 'Section / Description', 'Overall Condition', 'Technician', ''];

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="inline-flex items-center text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
          SECR / Signal &amp; Telecom
        </div>
        <h1 className="text-2xl font-semibold text-navy-900 tracking-tight">Maintenance Data Log</h1>
        <p className="text-sm text-slate-500 mt-0.5">{entries.length} register record{entries.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search section, technician…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/10"
          />
        </div>
        <select
          value={filterDiv}
          onChange={e => setFilterDiv(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow"
          style={{ paddingRight: '32px', appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
          }}
        >
          <option value="">All Divisions</option>
          {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={filterDays}
          onChange={e => setFilterDays(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow"
          style={{ paddingRight: '32px', appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
          }}
        >
          <option value="">All Time</option>
          <option value="1">Last 24 Hours</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 3 Months</option>
          <option value="180">Last 6 Months</option>
          <option value="365">Last Year</option>
        </select>
        <button onClick={load} className="flex items-center gap-2 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
        <button onClick={handleExport} className="flex items-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 ml-auto">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download Report
        </button>
      </div>

      {/* Table area */}
      <div className="flex-1 p-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
              Loading records…
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400 text-sm text-center">
              <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No records found{search || filterDiv ? ' for the selected filters.' : '.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {cols.map(h => (
                      <th key={h} className="px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <React.Fragment key={e.id}>
                      <tr
                        onClick={() => toggle(e.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors
                          ${expandedId === e.id ? 'bg-navy-900/[0.03]' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="px-3.5 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {new Date(e.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {e.divisionName?.replace(' Division', '')}
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 text-xs whitespace-nowrap font-medium">{e.sectionName}</td>
                        <td className="px-3.5 py-3"><ConditionBadge condition={e.condition} /></td>
                        <td className="px-3.5 py-3 text-slate-500 text-xs whitespace-nowrap">{e.technicianName}</td>
                        <td className="px-3.5 py-3" onClick={ev => ev.stopPropagation()}>
                          {dbUser?.role === 'admin' && (
                            <button
                              onClick={() => setDeleteId(e.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === e.id && (
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <td colSpan={cols.length} className="px-0 py-0">
                            <div className="px-8 py-6">
                              {/* Quad Table in detail */}
                              <div className="mb-6">
                                <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">Quad Readings Summary</h4>
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Quad</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Loop Res.</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">L1/E</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">L2/E</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">L1/L2</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">DB Loss</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">NEXT</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">FEXT</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Core</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Noise</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Armor</th>
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
                                          <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.next || '—'}</td>
                                          <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.fext || '—'}</td>
                                          <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.coreSize || '—'}</td>
                                          <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.noiseLevel || '—'}</td>
                                          <td className="px-3 py-1.5 text-center text-slate-600 font-mono">{q.armerContinuity || '—'}</td>
                                          <td className="px-3 py-1.5 text-center text-slate-600 font-mono truncate max-w-[150px]" title={q.remark || ''}>{q.remark || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-6">
                                <div className="col-span-3 grid grid-cols-4 gap-4">
                                  {[
                                    ['Major Section', e.majorSectionName],
                                    ['Supervisor', e.supervisorName || '—'],
                                  ].map(([k, v]) => (
                                    <div key={k}>
                                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium mb-0.5">{k}</p>
                                      <p className="text-xs text-navy-800 font-semibold">{v}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
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

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl p-7 w-full max-w-sm mx-4 flex flex-col items-center text-center gap-4"
            onClick={ev => ev.stopPropagation()}
          >
            <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy-900">Delete Record?</h3>
              <p className="text-sm text-slate-500 mt-1.5">This action is permanent and cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full mt-1">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
