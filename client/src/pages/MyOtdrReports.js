import React, { useEffect, useState, useMemo } from 'react';
import { getMyOtdrReports, getOtdrReports } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import OtdrAnalyticsCards from '../components/OtdrAnalyticsCards';

export default function MyOtdrReports({ setActivePage, showToast }) {
  const { dbUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, Filter & Sort States
  const [search, setSearch] = useState('');
  const [wavelengthFilter, setWavelengthFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'

  // Modal Detail View State
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      try {
        data = await getMyOtdrReports();
      } catch (err) {
        // Fallback to getOtdrReports() if endpoint /api/otdr-reports/my returned 404
        if (err.response?.status === 404 || err.response?.status === 500) {
          console.warn('[MyOtdrReports] Endpoint /api/otdr-reports/my unavailable, using resilient fallback.');
          const allReports = await getOtdrReports();
          data = (allReports || []).filter(r => {
            if (!dbUser) return true;
            const matchesId = r.userId && (r.userId._id === dbUser._id || String(r.userId) === String(dbUser._id));
            const matchesName = dbUser.name && (r.userName === dbUser.name || r.technicianName === dbUser.name);
            const matchesEmail = dbUser.email && r.userName === dbUser.email;
            const matchesUsername = dbUser.username && r.userName === dbUser.username;
            return matchesId || matchesName || matchesEmail || matchesUsername;
          });
        } else {
          throw err;
        }
      }
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading my OTDR reports:', err);
      setError('Failed to load your OTDR reports. Please try again.');
      if (showToast) {
        showToast('Error loading your OTDR reports.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter and Sort Logic
  const filteredAndSortedReports = useMemo(() => {
    return reports
      .filter(r => {
        // Search term filter
        if (search.trim()) {
          const term = search.toLowerCase().trim();
          const agencyMatch = r.agencyName && r.agencyName.toLowerCase().includes(term);
          const fromMatch = r.fromStation && r.fromStation.toLowerCase().includes(term);
          const toMatch = r.toStation && r.toStation.toLowerCase().includes(term);
          const dateMatch = r.testDate && r.testDate.includes(term);
          if (!agencyMatch && !fromMatch && !toMatch && !dateMatch) {
            return false;
          }
        }
        // Wavelength filter
        if (wavelengthFilter !== 'ALL') {
          if (r.wavelength !== wavelengthFilter) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.testDate).getTime();
        const timeB = new Date(b.createdAt || b.testDate).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [reports, search, wavelengthFilter, sortBy]);

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-[10px] md:text-[11px] font-medium text-navy-600 bg-navy-600/10 border border-navy-600/20 rounded px-2.5 py-0.5 uppercase tracking-wider mb-2">
            SECR / Signal &amp; Telecom
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-900 tracking-tight">My OTDR Reports</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Your personal register of submitted Optical Time-Domain Reflectometer reports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActivePage('otdr')}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-xs md:text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create New OTDR Report
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 flex-1 max-w-[1500px] mx-auto w-full space-y-6">
        
        {/* KPI & Analytics Cards Bar */}
        <OtdrAnalyticsCards reports={reports} />

        {/* Search, Filter & Sort Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search by agency, station code, or date..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-navy-500 focus:bg-white transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Wavelength Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Wavelength:</span>
              <select
                value={wavelengthFilter}
                onChange={e => setWavelengthFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-navy-500 font-medium"
              >
                <option value="ALL">All Wavelengths</option>
                <option value="1310 nm">1310 nm</option>
                <option value="1550 nm">1550 nm</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-navy-500 font-medium"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {(search || wavelengthFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setWavelengthFilter('ALL'); }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 font-medium text-sm flex flex-col items-center justify-center gap-3">
            <svg className="w-8 h-8 text-navy-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading your submitted OTDR reports...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-800 text-sm">
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchMyReports}
              className="mt-3 bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredAndSortedReports.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">No OTDR Reports Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {reports.length === 0
                  ? "You haven't submitted any OTDR reports yet. Click 'Create New OTDR Report' to submit your first observation record."
                  : "No reports match your current search and filter criteria."}
              </p>
            </div>
            {reports.length === 0 && (
              <button
                onClick={() => setActivePage('otdr')}
                className="mt-2 bg-navy-900 text-gold-400 text-xs font-bold px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
              >
                Create OTDR Report Now
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Test Date</th>
                    <th className="px-4 py-3.5">Route (From &rarr; To)</th>
                    <th className="px-4 py-3.5">Division</th>
                    <th className="px-4 py-3.5">Fibre Length</th>
                    <th className="px-4 py-3.5">Wavelength</th>
                    <th className="px-4 py-3.5">Submitted On</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedReports.map((report) => {
                    return (
                      <tr key={report.id || report._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-semibold text-navy-900 whitespace-nowrap">
                          {report.testDate}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-navy-800 whitespace-nowrap">
                          <span className="bg-navy-50 text-navy-900 border border-navy-100 px-2 py-0.5 rounded text-xs">
                            {report.fromStation} &rarr; {report.toStation}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">
                          {report.division || report.agencyName || dbUser?.division || 'Bilaspur'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 font-medium whitespace-nowrap">
                          {report.fibreLength} Km
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-block bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded">
                            {report.wavelength}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap font-mono">
                          {report.createdAtIST || (report.createdAt ? new Date(report.createdAt).toLocaleString('en-IN') : 'N/A')}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 hover:text-white bg-gold-400/20 hover:bg-navy-900 border border-gold-400/50 hover:border-navy-900 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Report Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Read-Only OTDR Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-navy-900 text-white px-6 py-4 flex items-center justify-between border-b border-navy-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400 font-bold">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">OFC OTDR Report Details</h3>
                  <p className="text-xs text-slate-400">
                    Record ID: <span className="font-mono text-gold-400">{selectedReport.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-navy-800 border border-navy-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              
              {/* Section 01: General Information */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-navy-900 text-white flex items-center gap-2 border-b border-navy-800">
                  <span className="font-mono text-xs text-gold-400 bg-gold-400/10 border border-gold-400/30 rounded px-2 py-0.5">
                    01
                  </span>
                  <h4 className="font-semibold text-sm">General Information</h4>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">From Station</label>
                    <p className="text-sm font-bold text-navy-800 mt-0.5">{selectedReport.fromStation}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">To Station</label>
                    <p className="text-sm font-bold text-navy-800 mt-0.5">{selectedReport.toStation}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Division</label>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedReport.division || selectedReport.agencyName || dbUser?.division || 'Bilaspur'}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Date of Testing</label>
                    <p className="text-sm font-semibold text-navy-900 font-mono mt-0.5">{selectedReport.testDate}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Fibre Length</label>
                    <p className="text-sm font-semibold text-slate-800 font-mono mt-0.5">{selectedReport.fibreLength} Km</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Wavelength</label>
                    <p className="text-sm font-semibold text-blue-700 mt-0.5">{selectedReport.wavelength}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Submitted By</label>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {selectedReport.userName || selectedReport.technicianName || dbUser?.name || 'User'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-400">Submission Timestamp</label>
                    <p className="text-sm font-semibold text-slate-600 font-mono mt-0.5">
                      {selectedReport.createdAtIST || (selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString('en-IN') : 'N/A')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 02: OTDR Observation Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-navy-900 text-white flex items-center gap-2 border-b border-navy-800">
                  <span className="font-mono text-xs text-gold-400 bg-gold-400/10 border border-gold-400/30 rounded px-2 py-0.5">
                    02
                  </span>
                  <h4 className="font-semibold text-sm">OTDR Observation Table</h4>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                        <th className="px-3.5 py-2.5">Fibre No.</th>
                        <th className="px-3.5 py-2.5">Circuit</th>
                        <th className="px-3.5 py-2.5 text-center">Total Loss (dB)</th>
                        <th className="px-3.5 py-2.5 text-center">Loss (dB/km)</th>
                        {(selectedReport.eventHeaders && selectedReport.eventHeaders.length > 0
                          ? selectedReport.eventHeaders
                          : ['Event 1', 'Event 2', 'Event 3', 'Event 4']
                        ).map((h) => (
                          <th key={h} className="px-3.5 py-2.5 text-center bg-amber-50/90 text-amber-900 font-mono">
                            {h}
                          </th>
                        ))}
                        <th className="px-3.5 py-2.5">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(selectedReport.fibreReadings || []).map((fr) => {
                        const eventHeadersList = selectedReport.eventHeaders && selectedReport.eventHeaders.length > 0
                          ? selectedReport.eventHeaders
                          : ['Event 1', 'Event 2', 'Event 3', 'Event 4'];

                        return (
                          <tr key={fr.fibreNo} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3.5 py-2.5 font-bold text-navy-900">{fr.fibreNo}</td>
                            <td className="px-3.5 py-2.5 font-sans font-semibold text-slate-800">{fr.circuit || '—'}</td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-navy-800">{fr.lossDb || '—'}</td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-navy-800">{fr.dbKm || '—'}</td>
                            {eventHeadersList.map((h) => {
                              const val = fr.otdrEvents?.[h] || (typeof fr.otdrEvents?.get === 'function' ? fr.otdrEvents.get(h) : '—');
                              return (
                                <td key={h} className="px-3.5 py-2.5 text-center bg-amber-50/30 text-amber-950 font-medium">
                                  {val || '—'}
                                </td>
                              );
                            })}
                            <td className="px-3.5 py-2.5 font-sans text-slate-600">{fr.remark || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                SECR OTDR Observation Register Log
              </span>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition-colors"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
