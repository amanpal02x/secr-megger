import React, { useEffect, useState, useMemo } from 'react';
import { getStations, createOtdrReport, getOtdrReports, getDivisions, getMajorSections, getSections } from '../utils/api';
import { FormLabel, Input, Select, FieldError } from '../components/FormField';
import { useAuth } from '../contexts/AuthContext';
import OtdrAnalyticsCards from '../components/OtdrAnalyticsCards';
import { getOtdrReportCondition } from '../utils/conditionUtils';

const FIBRES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

const CIRCUIT_POOL_LIMITS = {
  'RLY S/H': 2,
  'WIFI': 1,
  'Spare': 1,
  'RLY L/H': 2,
};

const UNIQUE_CIRCUITS = ['RLY S/H', 'WIFI', 'Spare', 'RLY L/H'];

const INITIAL_EVENT_HEADERS = ['', '', '', ''];

const createEmptyReadings = () => {
  return FIBRES.map(fibreNo => ({
    fibreNo,
    circuit: '',
    lossDb: '',
    dbKm: '',
    otdrEvents: {},
    remark: '',
  }));
};

function SectionPanel({ number, title, icon, children }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-navy-900 border-b border-navy-700">
        <span className="font-mono text-xs text-gold-400 bg-gold-400/10 border border-gold-400/25 rounded px-2 py-0.5 tracking-wide">
          {number}
        </span>
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function OtdrLogView({ setActivePage, showToast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('total');
  const [visibleCount, setVisibleCount] = useState(25);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [loadingReportId, setLoadingReportId] = useState(null);

  const toggleReport = async (id) => {
    if (expandedReportId === id) {
      setExpandedReportId(null);
      return;
    }

    const report = reports.find(x => x.id === id);
    if (report && !report.isDetailLoaded) {
      setLoadingReportId(id);
      try {
        const fullReport = await getOtdrReportById(id);
        setReports(prev => prev.map(x => x.id === id ? { ...fullReport, isDetailLoaded: true } : x));
      } catch (err) {
        console.error('Failed to load OTDR report details:', err);
        showToast('Failed to load report details.', 'error');
      } finally {
        setLoadingReportId(null);
      }
    }
    setExpandedReportId(id);
  };

  useEffect(() => {
    setVisibleCount(25);
  }, [search, activeFilter]);

  useEffect(() => {
    getOtdrReports()
      .then(data => setReports(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = reports.filter(r => {
    if (search.trim()) {
      const term = search.toLowerCase();
      const searchMatch = (
        (r.agencyName && r.agencyName.toLowerCase().includes(term)) ||
        (r.fromStation && r.fromStation.toLowerCase().includes(term)) ||
        (r.toStation && r.toStation.toLowerCase().includes(term)) ||
        (r.userName && r.userName.toLowerCase().includes(term)) ||
        (r.testDate && r.testDate.includes(term))
      );
      if (!searchMatch) return false;
    }

    if (activeFilter && activeFilter !== 'total') {
      if (getOtdrReportCondition(r) !== activeFilter) return false;
    }

    return true;
  });

  const displayedReports = useMemo(() => {
    return filteredReports.slice(0, visibleCount);
  }, [filteredReports, visibleCount]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        if (visibleCount < filteredReports.length) {
          setVisibleCount(prev => prev + 25);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredReports, visibleCount]);

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-[10px] md:text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
            SECR / Signal &amp; Telecom
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">OFC OTDR Reports Log</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Read-only records of submitted OTDR test observations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-600 bg-slate-200/60 px-3 py-1.5 rounded-lg border border-slate-300/50">
            Total Reports: <span className="text-navy-900 font-bold">{reports.length}</span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 flex-1 max-w-[1500px] mx-auto w-full space-y-4">
        {/* Analytics Cards */}
        <OtdrAnalyticsCards reports={reports} activeFilter={activeFilter} onCardClick={setActiveFilter} />

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by agency, station, user..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-navy-500 focus:bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-3">
            {(search || activeFilter !== 'total') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setActiveFilter('total'); }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold underline"
              >
                Clear Filters
              </button>
            )}
            <span>Showing {filteredReports.length} of {reports.length} records</span>
          </div>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 font-medium text-sm">
            Loading submitted OTDR reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 font-medium text-sm">
            No OTDR reports found.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <th className="px-4 py-3.5">Test Date</th>
                    <th className="px-4 py-3.5">Route / Section</th>
                    <th className="px-4 py-3.5">Division</th>
                    <th className="px-4 py-3.5">Length (Km)</th>
                    <th className="px-4 py-3.5">Wavelength</th>
                    <th className="px-4 py-3.5">Submitted By</th>
                    <th className="px-4 py-3.5 text-center">Observation Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedReports.map((r) => {
                    const isExpanded = expandedReportId === r.id;
                    const eventHeadersList = r.eventHeaders && r.eventHeaders.length ? r.eventHeaders : ['Event 1', 'Event 2', 'Event 3', 'Event 4'];

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-semibold text-navy-900 whitespace-nowrap">
                            {r.testDate}
                          </td>
                          <td className="px-4 py-3 font-bold text-navy-800 whitespace-nowrap">
                            <span className="bg-navy-50 text-navy-900 border border-navy-100 px-2 py-0.5 rounded text-xs font-semibold">
                              {r.sectionName || `${r.fromStation} → ${r.toStation}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {r.division || r.agencyName || 'Bilaspur'}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700 font-medium whitespace-nowrap">
                            {r.fibreLength} Km
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-block bg-navy-50 text-navy-800 border border-navy-200 text-xs font-semibold px-2 py-0.5 rounded">
                              {r.wavelength}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {r.userName || r.technicianName || 'User'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              disabled={loadingReportId !== null}
                              onClick={() => toggleReport(r.id)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-700 hover:text-navy-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-md transition-all disabled:opacity-60"
                            >
                              {loadingReportId === r.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                              )}
                              <span>
                                {loadingReportId === r.id ? 'Loading...' : isExpanded ? 'Hide Details' : 'View Observation Table'}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* Read-Only Observation Table Expandable Panel */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" className="p-4 bg-slate-50/90 border-t border-b border-slate-200">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-inner">
                                <div className="text-xs font-bold text-navy-900 uppercase tracking-wide mb-3 flex items-center justify-between">
                                  <span>Observation Details ({r.fromStation} to {r.toStation})</span>
                                  <span className="text-slate-400 font-normal">Submitted: {r.createdAtIST || 'N/A'}</span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                                        <th className="px-3 py-2">Fibre No.</th>
                                        <th className="px-3 py-2">Circuit</th>
                                        <th className="px-3 py-2 text-center">Total Loss (dB)</th>
                                        <th className="px-3 py-2 text-center">Loss (dB/km)</th>
                                        {eventHeadersList.map(h => (
                                          <th key={h} className="px-3 py-2 text-center bg-amber-50/80 text-amber-900 font-mono">{h}</th>
                                        ))}
                                        <th className="px-3 py-2">Remark</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                      {(r.fibreReadings || []).map(fr => (
                                        <tr key={fr.fibreNo} className="hover:bg-slate-50">
                                          <td className="px-3 py-2 font-bold text-navy-900">{fr.fibreNo}</td>
                                          <td className="px-3 py-2 font-sans font-semibold text-slate-800">{fr.circuit || '—'}</td>
                                          <td className="px-3 py-2 text-center font-bold text-navy-800">{fr.lossDb || '—'}</td>
                                          <td className="px-3 py-2 text-center font-bold text-navy-800">{fr.dbKm || '—'}</td>
                                          {eventHeadersList.map(h => (
                                            <td key={h} className="px-3 py-2 text-center bg-amber-50/30 text-amber-950">
                                              {fr.otdrEvents?.[h] || (typeof fr.otdrEvents?.get === 'function' ? fr.otdrEvents.get(h) : '—')}
                                            </td>
                                          ))}
                                          <td className="px-3 py-2 font-sans text-slate-600">{fr.remark || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OtdrReportForm({ setActivePage, showToast }) {
  const { dbUser } = useAuth();
  const isAdmin = ['admin', 'global_admin', 'sub_admin'].includes(dbUser?.role);

  if (isAdmin) {
    return <OtdrLogView setActivePage={setActivePage} showToast={showToast} />;
  }

  const todayDate = new Date().toISOString().split('T')[0];
  const userDivision = dbUser?.division || 'Bilaspur';

  const [divisions, setDivisions] = useState([]);
  const [majorSections, setMajorSections] = useState([]);
  const [sections, setSections] = useState([]);
  const [eventHeaders, setEventHeaders] = useState([...INITIAL_EVENT_HEADERS]);
  
  const [form, setForm] = useState({
    testDate: todayDate,
    division: userDivision,
    divisionId: '',
    divisionName: '',
    majorSectionId: '',
    majorSectionName: '',
    sectionId: '',
    sectionName: '',
    fromStation: '',
    toStation: '',
    fibreLength: '',
    wavelength: '1310 nm',
    fibreReadings: createEmptyReadings(),
    attachment: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    getDivisions().then(divsList => {
      setDivisions(divsList);
      
      const userDivName = dbUser?.division;
      if (userDivName) {
        const matchedDiv = divsList.find(
          d => d.name.toLowerCase() === userDivName.toLowerCase()
        );
        if (matchedDiv) {
          setForm(f => ({
            ...f,
            divisionId: matchedDiv.id,
            divisionName: matchedDiv.name,
          }));
          getMajorSections(matchedDiv.id).then(setMajorSections);
        }
      }
    });
  }, [dbUser]);

  const handleDivision = e => {
    const d = divisions.find(x => x.id === e.target.value);
    setForm(f => ({ ...f, divisionId: e.target.value, divisionName: d?.name || '', majorSectionId: '', majorSectionName: '', sectionId: '', sectionName: '' }));
    setMajorSections([]); setSections([]);
    if (errors.divisionId) {
      setErrors(err => { const c = { ...err }; delete c.divisionId; return c; });
    }
    if (e.target.value) getMajorSections(e.target.value).then(setMajorSections);
  };

  const handleMajorSection = e => {
    const m = majorSections.find(x => x.id === e.target.value);
    setForm(f => ({ ...f, majorSectionId: e.target.value, majorSectionName: m?.name || '', sectionId: '', sectionName: '' }));
    setSections([]);
    if (errors.majorSectionId) {
      setErrors(err => { const c = { ...err }; delete c.majorSectionId; return c; });
    }
    if (e.target.value) getSections(e.target.value).then(setSections);
  };

  const handleSection = e => {
    const s = sections.find(x => x.id === e.target.value);
    setForm(f => ({ ...f, sectionId: e.target.value, sectionName: s?.name || '' }));
    if (errors.sectionId) {
      setErrors(err => { const c = { ...err }; delete c.sectionId; return c; });
    }
  };

  const handleChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) {
      setErrors(e => {
        const c = { ...e };
        delete c[field];
        return c;
      });
    }
  };

  // Update specific fibre row field
  const updateFibreRow = (index, field, value) => {
    setForm(f => {
      const updated = [...f.fibreReadings];
      updated[index] = { ...updated[index], [field]: value };
      return { ...f, fibreReadings: updated };
    });
  };

  // Update dynamic OTDR Event value for a specific row and event header
  const updateOtdrEvent = (rowIndex, header, value) => {
    setForm(f => {
      const updated = [...f.fibreReadings];
      const currentEvents = { ...(updated[rowIndex].otdrEvents || {}) };
      currentEvents[header] = value;
      updated[rowIndex] = { ...updated[rowIndex], otdrEvents: currentEvents };
      return { ...f, fibreReadings: updated };
    });
  };

  // Update specific event header text
  const handleUpdateEventHeader = (colIdx, value) => {
    setEventHeaders(prev => {
      const updated = [...prev];
      updated[colIdx] = value;
      return updated;
    });
  };

  // Add a new OTDR Event Column
  const handleAddEventColumn = () => {
    setEventHeaders(prev => [...prev, '']);
  };

  // Remove an OTDR Event Column
  const handleRemoveEventColumn = (indexToRemove) => {
    if (eventHeaders.length <= 1) {
      showToast('At least one OTDR Event column is required.', 'error');
      return;
    }
    const headerToRemove = eventHeaders[indexToRemove];
    setEventHeaders(prev => prev.filter((_, idx) => idx !== indexToRemove));
    
    // Clean up event data for removed header
    setForm(f => {
      const updated = f.fibreReadings.map(row => {
        const currentEvents = { ...(row.otdrEvents || {}) };
        delete currentEvents[headerToRemove];
        return { ...row, otdrEvents: currentEvents };
      });
      return { ...f, fibreReadings: updated };
    });
  };

  // Filter circuit options based on pool limits
  const getAvailableCircuitOptions = (currentRowIndex) => {
    const selectedCounts = {};
    form.fibreReadings.forEach((row, idx) => {
      if (idx !== currentRowIndex && row.circuit) {
        selectedCounts[row.circuit] = (selectedCounts[row.circuit] || 0) + 1;
      }
    });

    return UNIQUE_CIRCUITS.filter(opt => {
      const currentCount = selectedCounts[opt] || 0;
      const maxAllowed = CIRCUIT_POOL_LIMITS[opt] || 1;
      return currentCount < maxAllowed;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, attachment: reader.result }));
        if (errors.attachment) {
          setErrors(err => {
            const c = { ...err };
            delete c.attachment;
            return c;
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate form
  const validate = () => {
    const e = {};
    if (!form.testDate) e.testDate = 'Date of Testing is required';
    if (!form.divisionId) e.divisionId = 'Division is required';
    if (!form.majorSectionId) e.majorSectionId = 'Major Section is required';
    if (!form.sectionId) e.sectionId = 'Section is required';
    if (!form.fibreLength || form.fibreLength.trim() === '') {
      e.fibreLength = 'Fibre Length is required';
    } else if (isNaN(Number(form.fibreLength))) {
      e.fibreLength = 'Must be a valid numeric value';
    }
    if (!form.wavelength) e.wavelength = 'Wavelength is required';
    if (!form.attachment) e.attachment = 'Image/File upload is required';

    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      showToast('Please fix validation errors before submitting.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        division: form.divisionName,
        eventHeaders,
      };
      await createOtdrReport(payload);
      showToast('OFC OTDR Report saved successfully.', 'success');
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 4000);
      
      // Reset form to defaults
      setForm({
        testDate: todayDate,
        division: userDivision,
        divisionId: '',
        divisionName: '',
        majorSectionId: '',
        majorSectionName: '',
        sectionId: '',
        sectionName: '',
        fromStation: '',
        toStation: '',
        fibreLength: '',
        wavelength: '1310 nm',
        fibreReadings: createEmptyReadings(),
        attachment: '',
      });
      setMajorSections([]);
      setSections([]);
      setEventHeaders([...INITIAL_EVENT_HEADERS]);
      setErrors({});
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save OTDR report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    const defaultForm = {
      testDate: todayDate,
      division: userDivision,
      divisionId: '',
      divisionName: '',
      majorSectionId: '',
      majorSectionName: '',
      sectionId: '',
      sectionName: '',
      fromStation: '',
      toStation: '',
      fibreLength: '',
      wavelength: '1310 nm',
      fibreReadings: createEmptyReadings(),
      attachment: '',
    };
    
    const userDivName = dbUser?.division;
    if (userDivName && divisions.length > 0) {
      const matchedDiv = divisions.find(
        d => d.name.toLowerCase() === userDivName.toLowerCase()
      );
      if (matchedDiv) {
        defaultForm.divisionId = matchedDiv.id;
        defaultForm.divisionName = matchedDiv.name;
        getMajorSections(matchedDiv.id).then(setMajorSections);
      }
    } else {
      setMajorSections([]);
    }

    setForm(defaultForm);
    setSections([]);
    setEventHeaders([...INITIAL_EVENT_HEADERS]);
    setErrors({});
  };

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-[10px] md:text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
            SECR / Signal &amp; Telecom
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">OFC OTDR Report</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Optical Time-Domain Reflectometer Testing Register</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActivePage('my-otdr')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            View My OTDR Reports
          </button>
        </div>
      </div>

      {/* Success banner */}
      {savedBanner && (
        <div className="flex items-center gap-2 px-8 py-3 bg-green-50 border-b border-green-200 text-green-800 text-sm font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          OFC OTDR Report record saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 md:p-8 space-y-6 flex-1 max-w-[1500px] mx-auto w-full overflow-y-auto scrollbar-thin">

          {/* Section 1 — General Information */}
          <SectionPanel
            number="01"
            title="General Information"
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            }
          >
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${dbUser?.division ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-5`}>
              
              {/* 1. Division */}
              {!dbUser?.division && (
                <div>
                  <FormLabel required>Division</FormLabel>
                  <Select value={form.divisionId} onChange={handleDivision} error={errors.divisionId}>
                    <option value="">Select Division</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                  <FieldError message={errors.divisionId} />
                </div>
              )}

              {/* 2. Major Section */}
              <div>
                <FormLabel required>Major Section</FormLabel>
                <Select value={form.majorSectionId} onChange={handleMajorSection} disabled={!form.divisionId} error={errors.majorSectionId}>
                  <option value="">Select Major Section</option>
                  {majorSections.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
                <FieldError message={errors.majorSectionId} />
              </div>

              {/* 3. Section */}
              <div>
                <FormLabel required>Section</FormLabel>
                <Select value={form.sectionId} onChange={handleSection} disabled={!form.majorSectionId} error={errors.sectionId}>
                  <option value="">Select Section</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <FieldError message={errors.sectionId} />
              </div>

              {/* 4. Date of Testing */}
              <div>
                <FormLabel required>Date of Testing</FormLabel>
                <Input
                  type="date"
                  value={form.testDate}
                  onChange={e => handleChange('testDate', e.target.value)}
                  error={errors.testDate}
                />
                <FieldError message={errors.testDate} />
              </div>

              {/* 5. Fibre Length */}
              <div>
                <FormLabel required>Fibre Length</FormLabel>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 12.45"
                    className={`w-full bg-white border rounded-lg px-3 py-2 pr-12 text-sm outline-none transition-all ${
                      errors.fibreLength ? 'border-red-400 focus:ring-2 focus:ring-red-400/20' : 'border-slate-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-500/10'
                    }`}
                    value={form.fibreLength}
                    onChange={e => handleChange('fibreLength', e.target.value)}
                  />
                  <span className="absolute right-3 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 pointer-events-none select-none">
                    Km
                  </span>
                </div>
                <FieldError message={errors.fibreLength} />
              </div>

              {/* 6. Wavelength */}
              <div>
                <FormLabel required>Wavelength</FormLabel>
                <Select
                  value={form.wavelength}
                  onChange={e => handleChange('wavelength', e.target.value)}
                  error={errors.wavelength}
                >
                  <option value="1310 nm">1310 nm</option>
                  <option value="1550 nm">1550 nm</option>
                </Select>
                <FieldError message={errors.wavelength} />
              </div>

            </div>
          </SectionPanel>

          {/* Section 2 — OTDR Observation Table */}
          <SectionPanel
            number="02"
            title="OTDR Observation Table"
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>
              </svg>
            }
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <p className="text-xs text-slate-500">
                Enter OTDR loss readings and observations for fibre rows.
              </p>
              
              <button
                type="button"
                onClick={handleAddEventColumn}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-3.5 py-2 rounded-lg transition-all shadow-sm active:scale-95 self-start md:self-auto"
              >
                <svg className="w-4 h-4 text-navy-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add OTDR Event Column
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg scrollbar-thin pb-2 bg-white">
              <table className="w-full text-sm min-w-[950px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 text-left font-bold text-slate-700 uppercase text-xs sticky left-0 bg-slate-50 z-10 border-r border-slate-200 w-28">
                      Fibre No.
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-slate-700 uppercase text-xs w-44 border-r border-slate-200">
                      Circuit
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-slate-700 uppercase text-xs w-28 border-r border-slate-200 bg-navy-50/50">
                      Total Loss (dB)
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-slate-700 uppercase text-xs w-28 border-r border-slate-200 bg-navy-50/50">
                      Loss (dB/km)
                    </th>

                    {/* Dynamic OTDR Event Header */}
                    <th
                      colSpan={eventHeaders.length}
                      className="px-3 py-2 text-center font-bold text-slate-800 uppercase text-xs border-r border-slate-200 bg-amber-50/60"
                    >
                      <div className="text-[11px] font-extrabold tracking-wider text-amber-900 uppercase mb-1">
                        OTDR EVENT
                      </div>
                      <div className="flex divide-x divide-amber-200 border-t border-amber-200/80 pt-1">
                        {eventHeaders.map((header, colIdx) => (
                          <div key={colIdx} className="flex-1 px-1 py-0.5 flex items-center justify-center gap-1 font-mono text-[11px] font-semibold text-amber-900 group min-w-[110px]">
                            <input
                              type="text"
                              value={header}
                              placeholder="Enter KM Number"
                              onChange={e => handleUpdateEventHeader(colIdx, e.target.value)}
                              className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded text-center text-xs font-mono font-semibold text-amber-950 px-1.5 py-0.5 outline-none transition-all shadow-sm placeholder:text-amber-700/50 placeholder:font-sans placeholder:font-normal placeholder:text-[10px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveEventColumn(colIdx)}
                              title="Remove Column"
                              className="inline-flex items-center justify-center w-4 h-4 text-[11px] font-extrabold text-amber-800/60 hover:text-red-600 hover:bg-red-100 rounded transition-all leading-none border border-transparent hover:border-red-200 cursor-pointer select-none shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </th>

                    <th className="px-3 py-3 text-center font-bold text-slate-700 uppercase text-xs w-48">
                      Remark
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {form.fibreReadings.map((row, idx) => {
                    const availableOptions = getAvailableCircuitOptions(idx);

                    return (
                      <tr key={row.fibreNo} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Fibre No (Free Text Input) */}
                        <td className="px-2 py-2 font-mono font-bold text-navy-900 bg-slate-50/50 sticky left-0 z-10 border-r border-slate-200 min-w-[90px]">
                          <input
                            type="text"
                            placeholder={`F${idx + 1}`}
                            className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-navy-500 rounded text-xs font-mono font-bold text-navy-900 px-2 py-1.5 outline-none transition-all"
                            value={row.fibreNo}
                            onChange={e => updateFibreRow(idx, 'fibreNo', e.target.value)}
                          />
                        </td>

                        {/* Circuit Dropdown */}
                        <td className="px-2 py-2 border-r border-slate-200">
                          <select
                            className="w-full bg-white border border-slate-300 hover:border-slate-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-sm px-2 py-1.5 outline-none transition-all font-medium text-slate-800"
                            value={row.circuit}
                            onChange={e => updateFibreRow(idx, 'circuit', e.target.value)}
                          >
                            <option value="">Select Circuit</option>
                            {UNIQUE_CIRCUITS.map(opt => {
                              const isAvailable = availableOptions.includes(opt);
                              if (!isAvailable && row.circuit !== opt) {
                                return null;
                              }
                              return (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              );
                            })}
                          </select>
                        </td>

                        {/* Total Loss (dB) */}
                        <td className="px-2 py-2 border-r border-slate-200 bg-navy-50/20">
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            className="w-full mx-auto block bg-white border border-slate-300 hover:border-navy-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm font-semibold text-navy-900 px-2 py-1.5 outline-none transition-all"
                            value={row.lossDb}
                            onChange={e => updateFibreRow(idx, 'lossDb', e.target.value)}
                          />
                        </td>

                        {/* dB/Km */}
                        <td className="px-2 py-2 border-r border-slate-200 bg-navy-50/20">
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            className="w-full mx-auto block bg-white border border-slate-300 hover:border-navy-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm font-semibold text-navy-900 px-2 py-1.5 outline-none transition-all"
                            value={row.dbKm}
                            onChange={e => updateFibreRow(idx, 'dbKm', e.target.value)}
                          />
                        </td>

                        {/* Dynamic OTDR Event Cells */}
                        {eventHeaders.map((header, colIdx) => {
                          const eventKey = header.trim() || `event_${colIdx}`;
                          return (
                            <td key={colIdx} className="px-1.5 py-2 border-r border-amber-200/50 bg-amber-50/20 min-w-[110px]">
                              <input
                                type="number"
                                step="any"
                                className="w-full mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-center font-mono text-sm text-amber-950 px-1 py-1.5 outline-none transition-all"
                                value={row.otdrEvents?.[eventKey] ?? row.otdrEvents?.[header] ?? row.otdrEvents?.[`event_${colIdx}`] ?? ''}
                                onChange={e => updateOtdrEvent(idx, eventKey, e.target.value)}
                              />
                            </td>
                          );
                        })}

                        {/* Remark */}
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            placeholder="Optional remark"
                            className="w-full mx-auto block bg-white border border-slate-300 hover:border-slate-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-sm px-2 py-1.5 outline-none transition-all"
                            value={row.remark}
                            onChange={e => updateFibreRow(idx, 'remark', e.target.value)}
                          />
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          {/* Small Upload Button */}
          <div className="flex flex-col items-center gap-1.5 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <label className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 border-dashed ${form.attachment ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-gold-400 hover:text-navy-900 shadow-sm'}`}>
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} />
                <svg className={`w-4 h-4 ${form.attachment ? 'text-green-500' : 'text-slate-400 group-hover:text-gold-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                <span className="text-[13px] font-bold">{form.attachment ? 'Evidence Attached' : 'Attach Photo/Report'}</span>
                {form.attachment && <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>}
              </label>
              
              {form.attachment && form.attachment.startsWith('data:image/') && (
                <div className="relative group cursor-pointer" onClick={() => window.open(form.attachment, '_blank')}>
                  <img src={form.attachment} alt="mini-preview" className="h-9 w-9 object-cover rounded-lg border-2 border-white shadow-sm ring-1 ring-slate-200" />
                  <div className="absolute inset-0 bg-navy-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </div>
                </div>
              )}
            </div>
            {!form.attachment && !errors.attachment && (
              <span className="text-[9px] font-bold text-gold-600 uppercase tracking-widest bg-gold-50 px-2 py-0.5 rounded-full">Mandatory for submission</span>
            )}
            <FieldError message={errors.attachment} />
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 md:px-8 py-4 flex flex-row justify-end gap-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-20">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 md:flex-none px-5 py-2.5 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Reset Form
          </button>
          
          <button
            type="submit"
            disabled={submitting || !form.attachment}
            className={`flex-[2] md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all font-semibold text-sm
              ${(!form.attachment || submitting) 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : 'bg-gold-500 hover:bg-gold-400 text-navy-900 shadow-sm hover:shadow-md hover:-translate-y-px active:scale-95'}`}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                Saving OTDR Report…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Save OTDR Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
