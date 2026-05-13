import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import DataLog from './DataLog';
import * as XLSX from 'xlsx';
import { createLocationsBulk, clearAllEntries, getUsers, createUser, updateUser, deleteUser } from '../utils/api';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function AdminDashboard({ setActivePage, showToast }) {
  const { dbUser, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [name, setName] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!email || (!editUser && !password)) {
      setError('Email and Password are required.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const payload = { 
        name: name || undefined,
        phoneNumber: phone || undefined, 
        email: email || undefined, 
        role 
      };
      if (password) payload.password = password;

      if (editUser) {
        await updateUser(editUser._id, payload);
        showToast('Personnel details updated.', 'success');
      } else {
        await createUser(payload);
        showToast('User successfully added.', 'success');
      }

      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setRole('user');
      setEditUser(null);
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (u) => {
    setEditUser(u);
    setName(u.name || '');
    setEmail(u.email || '');
    setPhone(u.phoneNumber || '');
    setRole(u.role || 'user');
    setPassword('');
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    try {
      await deleteUser(id);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkMasterUpload = async () => {
    if (!bulkFile) { showToast('Please select a file first.', 'error'); return; }
    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Fill-down logic for merged cells
        let lastDiv = "";
        let lastMS = "";
        
        const cleanedData = jsonData.map(row => {
          const div = (row.DIVISION || row.division || lastDiv).toString().trim();
          const ms = (row['MAJOR SECTION'] || row.majorSection || lastMS).toString().trim();
          const sec = (row.SECTION || row.section || "").toString().trim();
          
          if (div) lastDiv = div;
          if (ms) lastMS = ms;
          
          return {
            DIVISION: div,
            'MAJOR SECTION': ms,
            SECTION: sec
          };
        }).filter(row => row.DIVISION && row['MAJOR SECTION'] && row.SECTION);

        await createLocationsBulk(cleanedData);
        showToast(`Success! ${cleanedData.length} sections imported.`, 'success');
        setBulkFile(null);
      };
      reader.readAsArrayBuffer(bulkFile);
    } catch (err) {
      showToast('Upload failed. Check file format.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('WARNING: This will delete ALL maintenance entries in the database. Continue?')) return;
    try {
      await clearAllEntries();
      showToast('Database records cleared successfully.', 'success');
    } catch {
      showToast('Failed to clear database.', 'error');
    }
  };

  if (dbUser?.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. You must be an administrator.</div>;
  }

  return (
    <div className="flex-1 bg-slate-100 min-h-screen flex flex-col">
      {/* Portal Header */}
      <div className="bg-navy-900 px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center text-[10px] font-bold text-gold-400 bg-gold-400/10 border border-gold-400/20 rounded px-2 py-0.5 uppercase tracking-widest mb-2">
            Global Admin Access
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">Admin Portal</h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">Full control over records and user authorization</p>
        </div>
        
        {/* Tabs - Scrollable on mobile */}
        <div className="flex bg-navy-800 rounded-lg p-1 border border-navy-700 overflow-x-auto no-scrollbar">
          <div className="flex min-w-max">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'log',      label: 'Master Log' },
              { id: 'users',    label: 'User Auth' },
              { id: 'system',   label: 'System' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                  ? 'bg-gold-500 text-navy-900 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Content Based on Tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <Dashboard setActivePage={setActivePage} />}
        
        {activeTab === 'log' && <DataLog showToast={showToast} />}
        {activeTab === 'users' && (
          <div className="p-4 md:p-8 w-full">
            
            {/* Header with Add Button */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-navy-900">Add User</h3>
                <p className="text-xs text-slate-500">Authorize and manage technicians or administrative staff</p>
              </div>
              <button 
                onClick={() => { setEditUser(null); setName(''); setEmail(''); setPhone(''); setPassword(''); setShowForm(true); }}
                className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-navy-900/10 transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                Add New User
              </button>
            </div>

            {/* Modal-style Overlay for Form */}
            {showForm && (
              <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-white font-bold">{editUser ? 'Edit User Details' : 'Add New User'}</h3>
                    <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  
                  <div className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-100">{error}</div>}
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Personnel Name" className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email ID</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tech@secr.gov.in" className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 digits" className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assigned Role</label>
                          <select value={role} onChange={e => setRole(e.target.value)} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all">
                            <option value="user">Technician</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{editUser ? 'New Password (Optional)' : 'Security Password'}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={editUser ? "Keep empty for no change" : "Minimum 6 characters"} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-navy-800 outline-none transition-all" required={!editUser} />
                      </div>
                      <button type="submit" className="w-full bg-navy-900 hover:bg-navy-800 text-white font-black py-4 rounded-xl shadow-lg shadow-navy-900/20 text-sm tracking-wide mt-2 transition-all active:scale-[0.98]">
                        {editUser ? 'Update Personnel' : 'Finalize & Save User'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Users List - Full Width */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-black text-navy-900 uppercase tracking-[0.2em]">Authorized Personnel Database</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">{users.length} Active Accounts</span>
              </div>
              {loading ? (
                <div className="p-20 text-center">
                  <div className="w-10 h-10 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Synchronizing Database...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/30 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4 font-black">Identity & Contact</th>
                        <th className="px-8 py-4 font-black">Access Level</th>
                        <th className="px-8 py-4 font-black">Account Status</th>
                        <th className="px-8 py-4 font-black text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {users.map(u => (
                        <tr key={u._id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-navy-50 text-navy-700 rounded-full flex items-center justify-center font-black text-xs border border-navy-100">
                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <div>
                                <div className="font-bold text-navy-900">{u.name || 'Unnamed Personnel'}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  <span>{u.email}</span>
                                  {u.phoneNumber && (
                                    <>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                      <span className="font-mono">{u.phoneNumber}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${u.role === 'admin' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                              {u.role === 'admin' ? 'Administrator' : 'Technician'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Active</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEdit(u)} 
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-navy-900 rounded-lg hover:bg-navy-50 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                Edit
                              </button>
                              {dbUser._id !== u._id && (
                                <button 
                                  onClick={() => handleDelete(u._id)} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                  Remove
                                </button>
                              )}
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
        )}

        {activeTab === 'system' && (
          <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
            {/* Master Data Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Update Dropdown Options</h3>
              </div>
              <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-4">Upload an Excel file to redefine all Division, Major Section, and Section options.</p>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={e => setBulkFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                  />
                </div>
                <button 
                  onClick={handleBulkMasterUpload}
                  disabled={processing || !bulkFile}
                  className="bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-navy-900 font-bold px-6 py-3 rounded-xl transition-all"
                >
                  {processing ? 'Processing...' : 'Upload Options'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
