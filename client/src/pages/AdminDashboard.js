import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import DataLog from './DataLog';
import * as XLSX from 'xlsx';
import { createLocationsBulk, clearAllEntries } from '../utils/api';

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

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and Password are required.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const formattedPhone = phone && !phone.startsWith('+') ? `+91${phone}` : phone;
      
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          phoneNumber: phone || undefined, 
          email: email || undefined, 
          password: password,
          role 
        })
      });

      if (res.ok) {
        setSuccess('User successfully authorized.');
        setPhone('');
        setEmail('');
        setPassword('');
        setRole('user');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to add user');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      <div className="bg-navy-900 px-8 py-6 flex items-end justify-between">
        <div>
          <div className="inline-flex items-center text-[10px] font-bold text-gold-400 bg-gold-400/10 border border-gold-400/20 rounded px-2 py-0.5 uppercase tracking-widest mb-2">
            Global Admin Access
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-0.5">Full control over records and user authorization</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-navy-800 rounded-lg p-1 border border-navy-700">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'log',      label: 'Master Log' },
            { id: 'users',    label: 'User Auth' },
            { id: 'system',   label: 'System' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
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

      {/* Dynamic Content Based on Tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <Dashboard setActivePage={setActivePage} />}
        
        {activeTab === 'log' && <DataLog showToast={showToast} />}

        {activeTab === 'users' && (
          <div className="p-8 max-w-5xl mx-auto w-full grid grid-cols-3 gap-8">
            {/* Add User Form */}
            <div className="col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-navy-900 mb-4">Authorize Personnel</h3>
                {error && <div className="mb-4 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-100">{error}</div>}
                {success && <div className="mb-4 p-2 bg-green-50 text-green-700 text-xs rounded border border-green-100">{success}</div>}
                
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email ID</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tech@secr.gov.in" className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-navy-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Temp Password</label>
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 chars" className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-navy-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone (Optional)</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10 digit mobile" className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-navy-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Assigned Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)} className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:ring-2 focus:ring-navy-500 outline-none">
                      <option value="user">Technician (Standard)</option>
                      <option value="admin">Administrator (Full Access)</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-navy-800 hover:bg-navy-900 text-white font-semibold py-2.5 rounded shadow-sm text-sm transition-colors">
                    Save Personnel
                  </button>
                </form>
              </div>
            </div>

            {/* Users List */}
            <div className="col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Authorized Personnel</h3>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-slate-500 italic">Loading database...</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-white border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 font-medium">Identity</th>
                        <th className="px-6 py-3 font-medium">Role</th>
                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u._id} className="hover:bg-slate-50">
                          <td className="px-6 py-3">
                            <div className="font-medium text-navy-900">{u.email}</div>
                            {u.phoneNumber && <div className="text-[10px] text-slate-400 font-mono">{u.phoneNumber}</div>}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {dbUser._id !== u._id && (
                              <button onClick={() => handleDelete(u._id)} className="text-red-500 hover:text-red-700 text-xs font-semibold underline underline-offset-4">
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
            {/* Master Data Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Update Dropdown Options</h3>
              </div>
              <div className="p-8 flex items-center gap-8">
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
