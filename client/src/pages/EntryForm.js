import React, { useEffect, useState } from 'react';
import { getDivisions, getMajorSections, getSections, createEntry, createEntriesBulk, clearAllEntries, createLocationsBulk } from '../utils/api';
import { FormLabel, Input, Select, Textarea, FieldError } from '../components/FormField';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

const QUAD_NAMES = [
  'Q-1/1', 'Q-1/2', 'Q-2/1', 'Q-2/2', 'Q-3/1', 'Q-3/2',
  'Q-4/1', 'Q-4/2', 'Q-5/1', 'Q-5/2', 'Q-6/1', 'Q-6/2'
];

const EMPTY_QUAD = {
  loopResistance: '',
  insulationL1E: '',
  insulationL2E: '',
  insulationL1L2: '',
  dbLoss: '',
  coreSize: '0.9 mm',
  next: '',
  fext: '',
  noiseLevel: '',
  armerContinuity: 'OK',
  remark: ''
};

const EMPTY = {
  divisionId: '', divisionName: '', majorSectionId: '', majorSectionName: '',
  sectionId: '', sectionName: '',
  quadReadings: QUAD_NAMES.map(name => ({ ...EMPTY_QUAD, quadNo: name })),
  technicianName: '', userName: '', supervisorName: '',
  testDate: new Date().toISOString().split('T')[0],
  attachment: '',
};

function SectionPanel({ number, title, icon, children }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-navy-900 border-b border-navy-700">
        <span className="font-mono text-xs text-gold-400 bg-gold-400/10 border border-gold-400/25 rounded px-2 py-0.5 tracking-wide">{number}</span>
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function EntryForm({ setActivePage, showToast }) {
  const { dbUser } = useAuth();
  const [form, setForm] = useState({ ...EMPTY, userName: dbUser?.name || '', technicianName: dbUser?.name || '' });
  const [divisions, setDivisions] = useState([]);
  const [majorSections, setMajorSections] = useState([]);
  const [sections, setSections] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadType, setUploadType] = useState('records'); // 'records' or 'master'
  const [bulkFile, setBulkFile] = useState(null);

  const refreshDropdowns = () => {
    getDivisions().then(setDivisions);
  };

  useEffect(() => { refreshDropdowns(); }, []);

  const set = (name, val) => {
    setForm(f => {
      const updated = { ...f, [name]: val };
      if (name === 'userName') {
        updated.technicianName = val;
      } else if (name === 'technicianName') {
        updated.userName = val;
      }
      return updated;
    });
    if (errors[name] || (name === 'userName' && errors['technicianName']) || (name === 'technicianName' && errors['userName'])) {
      setErrors(e => {
        const c = { ...e };
        delete c.userName;
        delete c.technicianName;
        return c;
      });
    }
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
        set('attachment', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDivision = e => {
    const d = divisions.find(x => x.id === e.target.value);
    setForm(f => ({ ...f, divisionId: e.target.value, divisionName: d?.name || '', majorSectionId: '', majorSectionName: '', sectionId: '', sectionName: '' }));
    setMajorSections([]); setSections([]);
    if (e.target.value) getMajorSections(e.target.value).then(setMajorSections);
  };

  const handleMajorSection = e => {
    const m = majorSections.find(x => x.id === e.target.value);
    setForm(f => ({ ...f, majorSectionId: e.target.value, majorSectionName: m?.name || '', sectionId: '', sectionName: '' }));
    setSections([]);
    if (e.target.value) getSections(e.target.value).then(setSections);
  };

  const handleSection = e => {
    const s = sections.find(x => x.id === e.target.value);
    setForm(f => ({ ...f, sectionId: e.target.value, sectionName: s?.name || '' }));
  };

  const updateQuad = (index, field, value) => {
    const newQuads = [...form.quadReadings];
    newQuads[index] = { ...newQuads[index], [field]: value };
    setForm(f => ({ ...f, quadReadings: newQuads }));
  };

  const validate = () => {
    const e = {};
    if (!form.divisionId) e.divisionId = 'Select a division';
    if (!form.majorSectionId) e.majorSectionId = 'Select major section';
    if (!form.sectionId) e.sectionId = 'Select a section';
    if (!form.userName.trim() && !form.technicianName.trim()) e.userName = 'Name required';
    if (!form.testDate) e.testDate = 'Testing Date required';
    if (!form.attachment) e.attachment = 'Image/File upload is required';
    return e;
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const isQuadFilled = (q) => {
      return (
        (q.loopResistance && q.loopResistance.trim() !== '') ||
        (q.insulationL1E && q.insulationL1E.trim() !== '') ||
        (q.insulationL2E && q.insulationL2E.trim() !== '') ||
        (q.insulationL1L2 && q.insulationL1L2.trim() !== '') ||
        (q.dbLoss && q.dbLoss.trim() !== '') ||
        (q.next && q.next.trim() !== '') ||
        (q.fext && q.fext.trim() !== '') ||
        (q.noiseLevel && q.noiseLevel.trim() !== '') ||
        (q.remark && q.remark.trim() !== '')
      );
    };

    setSubmitting(true);
    try {
      await createEntry(form);
      showToast('Test record saved successfully.', 'success');
      setSavedBanner(true); setTimeout(() => setSavedBanner(false), 4000);
      setForm({ ...EMPTY, userName: dbUser?.name || '', technicianName: dbUser?.name || '' }); setErrors({}); setMajorSections([]); setSections([]);
    } catch { showToast('Failed to save. Please try again.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) { showToast('Please select a file first.', 'error'); return; }
    setSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Format data to match schema
        const formattedData = jsonData.map(row => ({
          ...EMPTY,
          divisionName: row.DIVISION || '',
          divisionId: row.DIVISION || '',
          majorSectionName: row['MAJOR SECTION'] || '',
          majorSectionId: row['MAJOR SECTION'] || '',
          sectionName: row.SECTION || '',
          sectionId: row.SECTION || '',
          userName: row.USER || row.TECHNICIAN || 'Bulk Upload',
          technicianName: row.USER || row.TECHNICIAN || 'Bulk Upload',
          testDate: row.DATE || new Date().toISOString().split('T')[0],
          quadReadings: QUAD_NAMES.map(name => ({ ...EMPTY_QUAD, quadNo: name }))
        }));
        await createEntriesBulk(formattedData);
        showToast(`${formattedData.length} entries uploaded!`, 'success');
        setBulkFile(null);
        setUploadMode(false);
      };
      reader.readAsArrayBuffer(bulkFile);
    } catch (err) {
      showToast('Upload failed. Check file format.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: This will delete ALL entries in the database. Continue?')) return;
    try {
      await clearAllEntries();
      showToast('Database cleared successfully.', 'success');
    } catch {
      showToast('Failed to clear database.', 'error');
    }
  };

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center text-[10px] md:text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
            SECR / Signal &amp; Telecom
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">6 Quad Meggering Register</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Digitalized traditional register format</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button type="button" onClick={() => setActivePage('log')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            View Log
          </button>
        </div>
      </div>

      {/* Success banner */}

      {/* Success banner */}
      {savedBanner && (
        <div className="flex items-center gap-2 px-8 py-3 bg-green-50 border-b border-green-200 text-green-800 text-sm font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Record saved! You can add another entry below.
        </div>
      )}

      {uploadMode ? (
        <div className="p-4 md:p-8 max-w-xl mx-auto w-full">
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-6 md:p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gold-50 text-gold-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-navy-900">Bulk Upload Records</h3>
            <p className="text-sm text-slate-500 mt-2 mb-6">Upload an Excel file containing division, section, and personnel information.</p>
            
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={e => setBulkFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100 mb-6"
            />

            <button 
              onClick={handleBulkUpload}
              disabled={submitting || !bulkFile}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-bold py-3 rounded-xl transition-all"
            >
              {submitting ? 'Processing...' : 'Upload & Process Data'}
            </button>
            
            <div className="mt-6 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              Required Columns: divisionName, sectionName, userName, testDate
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 space-y-6 flex-1 max-w-[1500px] mx-auto w-full overflow-y-auto scrollbar-thin">

          {/* Section 01 — Location & Header */}
          <SectionPanel number="01" title="Location & Testing Date Information"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <FormLabel required>Division</FormLabel>
                <Select value={form.divisionId} onChange={handleDivision} error={errors.divisionId}>
                  <option value="">Select Division</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
                <FieldError message={errors.divisionId} />
              </div>
              <div>
                <FormLabel required>Major Section</FormLabel>
                <Select value={form.majorSectionId} onChange={handleMajorSection} disabled={!form.divisionId} error={errors.majorSectionId}>
                  <option value="">Select Major Section</option>
                  {majorSections.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
                <FieldError message={errors.majorSectionId} />
              </div>
              <div>
                <FormLabel required>Section / Description</FormLabel>
                <Select value={form.sectionId} onChange={handleSection} disabled={!form.majorSectionId} error={errors.sectionId}>
                  <option value="">Select Section</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <FieldError message={errors.sectionId} />
              </div>
              <div>
                <FormLabel required>Testing Date</FormLabel>
                <Input type="date" value={form.testDate} onChange={e => set('testDate', e.target.value)} error={errors.testDate} />
                <FieldError message={errors.testDate} />
              </div>
            </div>
          </SectionPanel>

          {/* Section 02 — Quad Readings & Transmission Params */}
          <SectionPanel number="02" title="Quad Readings & Transmission Parameters"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/></svg>}
          >
            <div className="overflow-x-auto border border-slate-200 rounded-lg scrollbar-thin pb-2">
              <table className="w-full text-sm min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-2 py-2.5 text-left font-bold text-slate-600 uppercase sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Quad No.</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase whitespace-nowrap">Loop Res. (Ω)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-navy-50/50 whitespace-nowrap">L1/E (MΩ)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-navy-50/50 whitespace-nowrap">L2/E (MΩ)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-navy-50/50 whitespace-nowrap">L1/L2 (MΩ)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase whitespace-nowrap">DB Loss (db)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-amber-50/40 whitespace-nowrap">Core (mm)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-amber-50/40 whitespace-nowrap">NEXT (db)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-amber-50/40 whitespace-nowrap">FEXT (db)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-amber-50/40 whitespace-nowrap">Noise (V)</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-amber-50/40 whitespace-nowrap">Armor</th>
                    <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase bg-amber-50/40 whitespace-nowrap">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.quadReadings.map((q, idx) => (
                    <tr key={q.quadNo} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-1.5 font-mono font-bold text-navy-800 bg-slate-50/50 sticky left-0 z-10 border-r border-slate-200">{q.quadNo}</td>
                      <td className="px-1 py-1">
                        <input type="text" className="w-[85px] mx-auto block bg-white border border-slate-300 hover:border-slate-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.loopResistance} onChange={e => updateQuad(idx, 'loopResistance', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-navy-50/30">
                        <input type="text" className="w-[85px] mx-auto block bg-white border border-navy-300 hover:border-navy-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm font-semibold text-navy-900 px-1 py-1.5 outline-none transition-all duration-150" value={q.insulationL1E} onChange={e => updateQuad(idx, 'insulationL1E', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-navy-50/30">
                        <input type="text" className="w-[85px] mx-auto block bg-white border border-navy-300 hover:border-navy-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm font-semibold text-navy-900 px-1 py-1.5 outline-none transition-all duration-150" value={q.insulationL2E} onChange={e => updateQuad(idx, 'insulationL2E', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-navy-50/30">
                        <input type="text" className="w-[85px] mx-auto block bg-white border border-navy-300 hover:border-navy-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm font-semibold text-navy-900 px-1 py-1.5 outline-none transition-all duration-150" value={q.insulationL1L2} onChange={e => updateQuad(idx, 'insulationL1L2', e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" className="w-[85px] mx-auto block bg-white border border-slate-300 hover:border-slate-400 focus:border-navy-500 rounded focus:ring-2 focus:ring-navy-500/10 text-center font-mono text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.dbLoss} onChange={e => updateQuad(idx, 'dbLoss', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[75px] mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-center text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.coreSize} onChange={e => updateQuad(idx, 'coreSize', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[75px] mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-center text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.next} onChange={e => updateQuad(idx, 'next', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[75px] mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-center text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.fext} onChange={e => updateQuad(idx, 'fext', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[85px] mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-center text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.noiseLevel} onChange={e => updateQuad(idx, 'noiseLevel', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <select className="w-[100px] mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.armerContinuity} onChange={e => updateQuad(idx, 'armerContinuity', e.target.value)}>
                          <option>OK</option>
                          <option>Defective</option>
                          <option>Disconn.</option>
                        </select>
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[140px] mx-auto block bg-white border border-amber-300 hover:border-amber-400 focus:border-amber-500 rounded focus:ring-2 focus:ring-amber-500/10 text-center text-sm px-1 py-1.5 outline-none transition-all duration-150" value={q.remark} onChange={e => updateQuad(idx, 'remark', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          {/* Small Upload Button */}
          <div className="flex flex-col items-center gap-1.5 pt-2 pb-1">
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

          {/* Section 03 — Personnel */}
          <SectionPanel number="03" title="Personnel"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel required>Name</FormLabel>
                  <Input placeholder="Sign & Name" value={form.userName || form.technicianName} onChange={e => set('userName', e.target.value)} error={errors.userName || errors.technicianName} />
                </div>
                <div>
                  <FormLabel>Designation</FormLabel>
                  <Input placeholder="Full name" value={form.supervisorName} onChange={e => set('supervisorName', e.target.value)} />
                </div>
              </div>
            </div>
          </SectionPanel>



        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 md:px-8 py-4 flex flex-row justify-end gap-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-20">
          <button type="button"
            onClick={() => { setForm({ ...EMPTY, userName: dbUser?.name || '', technicianName: dbUser?.name || '' }); setErrors({}); setMajorSections([]); setSections([]); }}
            className="flex-1 md:flex-none px-5 py-2.5 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Reset
          </button>
          <button type="submit" disabled={submitting || !form.attachment}
            className={`flex-[2] md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg transition-all font-semibold text-sm
              ${(!form.attachment || submitting) 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : 'bg-gold-500 hover:bg-gold-400 text-navy-900 shadow-sm hover:shadow-md hover:-translate-y-px active:scale-95'}`}
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />Saving…</>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{form.attachment ? 'Save Record' : 'Upload File to Save'}</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
