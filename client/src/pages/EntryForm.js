import React, { useEffect, useState } from 'react';
import { getDivisions, getMajorSections, getSections, createEntry } from '../utils/api';
import { FormLabel, Input, Select, Textarea, FieldError } from '../components/FormField';

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
  technicianName: '', supervisorName: '',
  testDate: new Date().toISOString().split('T')[0],
};

function SectionPanel({ number, title, icon, children }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-navy-900 border-b border-navy-700">
        <span className="font-mono text-[11px] text-gold-400 bg-gold-400/10 border border-gold-400/25 rounded px-2 py-0.5 tracking-wide">{number}</span>
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function EntryForm({ setActivePage, showToast }) {
  const [form, setForm] = useState(EMPTY);
  const [divisions, setDivisions] = useState([]);
  const [majorSections, setMajorSections] = useState([]);
  const [sections, setSections] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => { getDivisions().then(setDivisions); }, []);

  const set = (name, val) => {
    setForm(f => ({ ...f, [name]: val }));
    if (errors[name]) setErrors(e => { const c = { ...e }; delete c[name]; return c; });
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
    if (!form.technicianName.trim()) e.technicianName = 'Name required';
    if (!form.testDate) e.testDate = 'Date required';
    return e;
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await createEntry(form);
      showToast('Test record saved successfully.', 'success');
      setSavedBanner(true); setTimeout(() => setSavedBanner(false), 4000);
      setForm(EMPTY); setErrors({}); setMajorSections([]); setSections([]);
    } catch { showToast('Failed to save. Please try again.', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-end justify-between">
        <div>
          <div className="inline-flex items-center text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
            SECR / Signal &amp; Telecom
          </div>
          <h1 className="text-2xl font-semibold text-navy-900 tracking-tight">6 Quad Cable Meggering Register</h1>
          <p className="text-sm text-slate-500 mt-0.5">Digitalized traditional register format for cable maintenance</p>
        </div>
        <button type="button" onClick={() => setActivePage('log')}
          className="flex items-center gap-2 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          View Data Log
        </button>
      </div>

      {/* Success banner */}
      {savedBanner && (
        <div className="flex items-center gap-2 px-8 py-3 bg-green-50 border-b border-green-200 text-green-800 text-sm font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Record saved! You can add another entry below.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 space-y-6 flex-1 max-w-[1500px] mx-auto w-full overflow-y-auto scrollbar-thin">

          {/* Section 01 — Location & Header */}
          <SectionPanel number="01" title="Location & Date Information"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
          >
            <div className="grid grid-cols-4 gap-4">
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
                <FormLabel required>Test Date</FormLabel>
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
              <table className="w-full text-xs min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-2 py-2 text-left font-semibold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Quad No.</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase whitespace-nowrap">Loop Res. (Ω)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-navy-50/50 whitespace-nowrap">L1/E (MΩ)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-navy-50/50 whitespace-nowrap">L2/E (MΩ)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-navy-50/50 whitespace-nowrap">L1/L2 (MΩ)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase whitespace-nowrap">DB Loss (db)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-amber-50/40 whitespace-nowrap">Core (mm)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-amber-50/40 whitespace-nowrap">NEXT (db)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-amber-50/40 whitespace-nowrap">FEXT (db)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-amber-50/40 whitespace-nowrap">Noise (V)</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-amber-50/40 whitespace-nowrap">Armor</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase bg-amber-50/40 whitespace-nowrap">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.quadReadings.map((q, idx) => (
                    <tr key={q.quadNo} className="hover:bg-slate-50 transition-colors">
                      <td className="px-2 py-1 font-mono font-semibold text-navy-700 bg-slate-50/50 sticky left-0 z-10 border-r border-slate-200">{q.quadNo}</td>
                      <td className="px-1 py-1">
                        <input type="text" className="w-[80px] mx-auto block bg-transparent border border-transparent hover:border-slate-300 focus:border-navy-500 rounded focus:ring-0 text-center font-mono text-xs px-1 py-1" placeholder="—" value={q.loopResistance} onChange={e => updateQuad(idx, 'loopResistance', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-navy-50/30">
                        <input type="text" className="w-[80px] mx-auto block bg-transparent border border-transparent hover:border-navy-300 focus:border-navy-500 rounded focus:ring-0 text-center font-mono text-xs font-medium text-navy-800 px-1 py-1" placeholder=">20M" value={q.insulationL1E} onChange={e => updateQuad(idx, 'insulationL1E', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-navy-50/30">
                        <input type="text" className="w-[80px] mx-auto block bg-transparent border border-transparent hover:border-navy-300 focus:border-navy-500 rounded focus:ring-0 text-center font-mono text-xs font-medium text-navy-800 px-1 py-1" placeholder=">20M" value={q.insulationL2E} onChange={e => updateQuad(idx, 'insulationL2E', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-navy-50/30">
                        <input type="text" className="w-[80px] mx-auto block bg-transparent border border-transparent hover:border-navy-300 focus:border-navy-500 rounded focus:ring-0 text-center font-mono text-xs font-medium text-navy-800 px-1 py-1" placeholder=">20M" value={q.insulationL1L2} onChange={e => updateQuad(idx, 'insulationL1L2', e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="text" className="w-[80px] mx-auto block bg-transparent border border-transparent hover:border-slate-300 focus:border-navy-500 rounded focus:ring-0 text-center font-mono text-xs px-1 py-1" placeholder="-4.5" value={q.dbLoss} onChange={e => updateQuad(idx, 'dbLoss', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[70px] mx-auto block bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:ring-0 text-center text-xs px-1 py-1" placeholder="0.9" value={q.coreSize} onChange={e => updateQuad(idx, 'coreSize', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[70px] mx-auto block bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:ring-0 text-center text-xs px-1 py-1" placeholder="e.g. 61" value={q.next} onChange={e => updateQuad(idx, 'next', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[70px] mx-auto block bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:ring-0 text-center text-xs px-1 py-1" placeholder="e.g. 61" value={q.fext} onChange={e => updateQuad(idx, 'fext', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[80px] mx-auto block bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:ring-0 text-center text-xs px-1 py-1" placeholder="e.g. 12mv" value={q.noiseLevel} onChange={e => updateQuad(idx, 'noiseLevel', e.target.value)} />
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <select className="w-[90px] mx-auto block bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:ring-0 text-xs px-1 py-1" value={q.armerContinuity} onChange={e => updateQuad(idx, 'armerContinuity', e.target.value)}>
                          <option>OK</option>
                          <option>Defective</option>
                          <option>Disconn.</option>
                        </select>
                      </td>
                      <td className="px-1 py-1 bg-amber-50/30">
                        <input type="text" className="w-[120px] mx-auto block bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:ring-0 text-center text-xs px-1 py-1" placeholder="Remarks..." value={q.remark} onChange={e => updateQuad(idx, 'remark', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>

          {/* Section 03 — Personnel */}
          <SectionPanel number="03" title="Personnel"
            icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel required>Technician</FormLabel>
                  <Input placeholder="Sign & Name" value={form.technicianName} onChange={e => set('technicianName', e.target.value)} error={errors.technicianName} />
                </div>
                <div>
                  <FormLabel>Supervisor / SSE</FormLabel>
                  <Input placeholder="Full name" value={form.supervisorName} onChange={e => set('supervisorName', e.target.value)} />
                </div>
              </div>
            </div>
          </SectionPanel>

        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 flex justify-end gap-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-20">
          <button type="button"
            onClick={() => { setForm(EMPTY); setErrors({}); setMajorSections([]); setSections([]); }}
            className="px-5 py-2.5 text-sm font-medium text-navy-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Reset Form
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-semibold text-sm rounded-lg transition-all hover:shadow-md hover:-translate-y-px disabled:cursor-not-allowed"
          >
            {submitting
              ? <><div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />Saving…</>
              : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Save Register Record</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
