import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../utils/api';

export default function Locations({ showToast }) {
  const { dbUser } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  
  // Form fields
  const [division, setDivision] = useState('');
  const [majorSection, setMajorSection] = useState('');
  const [section, setSection] = useState('');

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await getLocations();
      setLocations(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to load locations.', 'error');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!division.trim() || !majorSection.trim() || !section.trim()) {
      setError('All fields are required.');
      return;
    }
    setError('');

    try {
      const payload = {
        division: division.trim(),
        majorSection: majorSection.trim(),
        section: section.trim(),
      };

      if (editLocation) {
        await updateLocation(editLocation._id, payload);
        showToast('Section mapping updated successfully.', 'success');
      } else {
        await createLocation(payload);
        showToast('Section mapping added successfully.', 'success');
      }

      setDivision('');
      setMajorSection('');
      setSection('');
      setEditLocation(null);
      setShowForm(false);
      fetchLocations();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (loc) => {
    setEditLocation(loc);
    setDivision(loc.division);
    setMajorSection(loc.majorSection);
    setSection(loc.section);
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this section mapping? This will delete the mapping from the database, but historical entries will remain.')) return;
    try {
      await deleteLocation(id);
      showToast('Section mapping removed.', 'success');
      fetchLocations();
    } catch (err) {
      console.error(err);
      showToast('Failed to remove section mapping.', 'error');
    }
  };

  // Get unique divisions and major sections for suggestions
  const uniqueDivisions = useMemo(() => {
    return [...new Set(locations.map((l) => l.division))].filter(Boolean).sort();
  }, [locations]);

  const uniqueMajorSections = useMemo(() => {
    return [...new Set(locations.map((l) => l.majorSection))].filter(Boolean).sort();
  }, [locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return locations;
    const q = searchTerm.toLowerCase();
    return locations.filter(
      (l) =>
        l.division?.toLowerCase().includes(q) ||
        l.majorSection?.toLowerCase().includes(q) ||
        l.section?.toLowerCase().includes(q)
    );
  }, [locations, searchTerm]);

  if (!['admin', 'global_admin'].includes(dbUser?.role)) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. You must be a Global Administrator.</div>;
  }

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-navy-900">Section Config</h3>
              <p className="text-xs text-slate-500">Manage division, major section, and section mapping data</p>
            </div>
            <button
              onClick={() => {
                setEditLocation(null);
                setDivision('');
                setMajorSection('');
                setSection('');
                setError('');
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-navy-900/10 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Add New Section
            </button>
          </div>

          {/* Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-white font-bold">
                    {editLocation ? 'Edit Section Mapping' : 'Add New Section Mapping'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-100">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Division
                      </label>
                      <input
                        type="text"
                        list="divisions-list"
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        placeholder="e.g. BSP, Raipur, Nagpur"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all"
                        required
                      />
                      <datalist id="divisions-list">
                        {uniqueDivisions.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Major Section
                      </label>
                      <input
                        type="text"
                        list="major-sections-list"
                        value={majorSection}
                        onChange={(e) => setMajorSection(e.target.value)}
                        placeholder="e.g. BYT-BSP, SLH-APR"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all"
                        required
                      />
                      <datalist id="major-sections-list">
                        {uniqueMajorSections.map((ms) => (
                          <option key={ms} value={ms} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Section
                      </label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. HGR-BYT UP, BYT-KGB DN"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-navy-900 hover:bg-navy-800 text-white font-black py-4 rounded-xl shadow-lg shadow-navy-900/20 text-sm tracking-wide mt-2 transition-all active:scale-[0.98]"
                    >
                      {editLocation ? 'Update Mapping' : 'Save Section Mapping'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Table Header / Toolbar */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-navy-900 uppercase tracking-[0.2em]">Master Location Mappings</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full mt-1 inline-block">
                  {filteredLocations.length} Mapped Sections
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search division, section..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2 focus:ring-1 focus:ring-navy-800 outline-none transition-all"
                />
                <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="p-20 text-center">
                <div className="w-10 h-10 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Synchronizing Database...</p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No mappings found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/30 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4 font-black">Division</th>
                      <th className="px-8 py-4 font-black">Major Section</th>
                      <th className="px-8 py-4 font-black">Section</th>
                      <th className="px-8 py-4 font-black text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLocations.map((loc) => (
                      <tr key={loc._id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-5 font-bold text-navy-900 uppercase">
                          {loc.division}
                        </td>
                        <td className="px-8 py-5 text-xs font-bold text-slate-700 uppercase">
                          {loc.majorSection}
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-600 font-medium">
                          {loc.section}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(loc)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-navy-900 rounded-lg hover:bg-navy-50 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(loc._id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
