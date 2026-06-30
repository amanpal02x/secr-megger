import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getEntries, getEntry, deleteEntry, getDivisions } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import HealthSummaryCards from '../components/HealthSummaryCards';
import { getQuadCondition } from '../utils/conditionUtils';
import * as XLSX from 'xlsx';

export default function DataLog({ showToast }) {
  const { dbUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [filterMajorSec, setFilterMajorSec] = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isGlobalAdmin = ['admin', 'global_admin'].includes(dbUser?.role);
  const isSubAdmin = dbUser?.role === 'sub_admin';

  // Cascading lists derived from loaded entries
  const uniqueMajorSections = useMemo(() => {
    const set = new Set(entries.map((e) => e.majorSectionName).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  const uniqueSections = useMemo(() => {
    const filteredForSec = filterMajorSec
      ? entries.filter((e) => e.majorSectionName === filterMajorSec)
      : entries;
    const set = new Set(filteredForSec.map((e) => e.sectionName).filter(Boolean));
    return Array.from(set).sort();
  }, [entries, filterMajorSec]);

  // Client-side filtering of entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterMajorSec && e.majorSectionName !== filterMajorSec) {
        return false;
      }
      if (filterSec && e.sectionName !== filterSec) {
        return false;
      }
      return true;
    });
  }, [entries, filterMajorSec, filterSec]);

  const handleDivChange = (val) => {
    setFilterDiv(val);
    setFilterMajorSec('');
    setFilterSec('');
  };

  const handleMajorSecChange = (val) => {
    setFilterMajorSec(val);
    setFilterSec('');
  };

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      showToast('No data to export.', 'error');
      return;
    }

    const flatData = [];
    filteredEntries.forEach((e) => {
      e.quadReadings.forEach((q) => {
        flatData.push({
          'Date': new Date(e.testDate).toLocaleDateString('en-IN'),
          'Division': e.divisionName,
          'Major Section': e.majorSectionName,
          'Section': e.sectionName,
          'Name': e.userName || e.technicianName,
          'Designation': e.supervisorName || '',
          'Submitted By User': e.userId && typeof e.userId === 'object' ? `${e.userId.name || '—'} (${e.userId.phoneNumber || '—'})` : '—',
          'Submission Exact Time': e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—',
          'Quad No': q.quadNo,
          'Loop Resistance (Ω)': q.loopResistance || '',
          'L1-Earth (MΩ)': q.insulationL1E || '',
          'L2-Earth (MΩ)': q.insulationL2E || '',
          'L1-L2 (MΩ)': q.insulationL1L2 || '',
          'DB Loss': q.dbLoss || '',
          'Core Size': q.coreSize || '',
          'NEXT': q.next || '',
          'FEXT': q.fext || '',
          'Noise Level': q.noiseLevel || '',
          'Armor Continuity': q.armerContinuity || '',
          'Condition': getQuadCondition(q),
          'Remark': q.remark || ''
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Megger Data');


    const wscols = [
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
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

  const toggle = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const entry = entries.find(x => x.id === id);
    if (entry && !entry.isDetailLoaded) {
      try {

        const fullDetails = await getEntry(id);
        setEntries(prev => prev.map(x => x.id === id ? { ...fullDetails, isDetailLoaded: true } : x));
      } catch (err) {
        console.error('Failed to load entry details:', err);
      }
    }
    setExpandedId(id);
  };

  const headers = [
    { label: '#', className: 'hidden md:table-cell' },
    { label: 'Date', className: '' },
    { label: 'Division', className: 'hidden sm:table-cell' },
    { label: 'Major Section', className: 'hidden sm:table-cell' },
    { label: 'Section / Description', className: '' },
    { label: 'Name & Designation', className: 'hidden lg:table-cell' },
    { label: 'Submitted By', className: 'hidden lg:table-cell' },
    { label: 'Action', className: 'text-right' },
  ];

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6">
        <div className="inline-flex items-center text-[10px] md:text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
          SECR / Signal &amp; Telecom
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">Maintenance Data Log</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">{filteredEntries.length} register record{filteredEntries.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Toolbar / Search Filters */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search section, name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/10"
            />
          </div>

          {isGlobalAdmin && (
            <>
              <select
                value={filterDiv}
                onChange={e => handleDivChange(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow min-w-[130px] sm:flex-1 md:flex-none"
                style={{ paddingRight: '28px', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
                }}
              >
                <option value="">All Divisions</option>
                {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <select
                value={filterMajorSec}
                onChange={e => handleMajorSecChange(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow min-w-[150px] sm:flex-1 md:flex-none"
                style={{ paddingRight: '28px', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
                }}
              >
                <option value="">All Major Sections</option>
                {uniqueMajorSections.map(ms => <option key={ms} value={ms}>{ms}</option>)}
              </select>

              <select
                value={filterSec}
                onChange={e => setFilterSec(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow min-w-[150px] sm:flex-1 md:flex-none"
                style={{ paddingRight: '28px', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
                }}
              >
                <option value="">All Sections</option>
                {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}

          {isSubAdmin && (
            <select
              value={filterMajorSec}
              onChange={e => handleMajorSecChange(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow min-w-[180px] sm:flex-1 md:flex-none"
              style={{ paddingRight: '28px', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
              }}
            >
              <option value="">All Major Sections</option>
              {uniqueMajorSections.map(ms => <option key={ms} value={ms}>{ms}</option>)}
            </select>
          )}

          {!isGlobalAdmin && !isSubAdmin && (
            <select
              value={filterDiv}
              onChange={e => handleDivChange(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-navy-900 focus:outline-none focus:border-navy-500 form-select-arrow min-w-[130px] sm:flex-1 md:flex-none"
              style={{ paddingRight: '28px', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a6480' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center'
              }}
            >
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isGlobalAdmin && !isSubAdmin && (
            <button onClick={load} className="flex-grow sm:flex-none flex items-center justify-center gap-2 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          )}
          <button onClick={handleExport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>
      </div>

      {/* Table Section */}
        <div className="flex-1 p-4 md:p-8">
          {/* Health Summary Cards */}
          <HealthSummaryCards entries={entries} />

          <div className="mt-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400 text-sm">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
              Loading records…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400 text-sm text-center">
              <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>No records found{search || filterDiv || filterMajorSec || filterSec ? ' for the selected filters.' : '.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {headers.map((h, index) => (
                      <th 
                        key={index} 
                        className={`px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${h.className}`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e, i) => (
                    <React.Fragment key={e.id}>
                      <tr
                        onClick={() => toggle(e.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors
                          ${expandedId === e.id ? 'bg-navy-900/[0.03]' : 'hover:bg-slate-50/80'}`}
                      >
                        <td className="px-3.5 py-3 text-slate-400 font-mono text-xs hidden md:table-cell">{i + 1}</td>
                        <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap">
                          {new Date(e.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap hidden sm:table-cell">
                          {e.divisionName?.replace(' Division', '')}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap hidden sm:table-cell" title={e.majorSectionName}>
                          <div className="truncate max-w-[120px] md:max-w-none">{e.majorSectionName}</div>
                        </td>
                         <td className="px-3.5 py-3 text-slate-500 text-xs font-medium">
                          <div className="truncate max-w-[120px] md:max-w-none" title={e.sectionName}>{e.sectionName}</div>
                        </td>
                        <td className="px-3.5 py-3 hidden lg:table-cell">
                          <div className="text-xs font-semibold text-navy-800">{e.userName || e.technicianName}</div>
                          {e.supervisorName && (
                            <div className="text-[10px] text-slate-400 font-medium">{e.supervisorName}</div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap hidden lg:table-cell">
                          {e.userId?.name || e.submittedBy || '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {['admin', 'global_admin', 'sub_admin'].includes(dbUser?.role) && (
                              <button
                                onClick={() => setDeleteId(e.id)}
                                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            )}
                            <button
                              onClick={() => toggle(e.id)}
                              className="text-[10px] font-bold text-navy-700 bg-navy-50 hover:bg-navy-100 px-2.5 py-1.5 rounded-lg border border-navy-100 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <span>{expandedId === e.id ? 'Hide' : 'View Details'}</span>
                              <svg className={`w-3 h-3 text-navy-500 transition-transform duration-200 ${expandedId === e.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {}
                      {expandedId === e.id && (
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                          <td colSpan={headers.length} className="px-0 py-0">
                            {!e.isDetailLoaded ? (
                              <div className="px-6 py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                                <div className="w-5 h-5 border-2 border-slate-200 border-t-navy-600 rounded-full animate-spin" />
                                <span className="text-xs font-semibold text-navy-800">Fetching megger recordings & attachment...</span>
                              </div>
                            ) : (
                              <div className="px-4 md:px-8 py-6">
                                {}
                                <div className="mb-6">
                                  <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">Quad Readings Summary</h4>
                                  
                                  {}
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
                                            <td className="px-3 py-1.5 text-center text-slate-600 font-mono truncate max-w-[150px]" title={q.remark || ''}>{q.remark || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {}
                                  <div className="sm:hidden space-y-3">
                                    {e.quadReadings?.map(q => (
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

      {}
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
