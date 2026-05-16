import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../utils/api';

export default function Profile() {
  const { dbUser, updateUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: dbUser?.name || '',
    email: dbUser?.email || '',
    phoneNumber: dbUser?.phoneNumber || '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Get dynamic colors for avatar based on initials hash
  const getAvatarGradient = (name) => {
    const defaultGrad = 'from-navy-600 to-indigo-700';
    if (!name) return defaultGrad;
    const charCode = name.charCodeAt(0);
    if (charCode % 4 === 0) return 'from-teal-500 to-emerald-600';
    if (charCode % 4 === 1) return 'from-indigo-500 to-purple-600';
    if (charCode % 4 === 2) return 'from-amber-500 to-orange-600';
    return 'from-rose-500 to-red-600';
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setMessage({ text: '', type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const updatedUser = await updateProfile(payload);
      updateUserProfile(updatedUser);
      
      // Clear password fields
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ 
        text: err.response?.data?.message || 'Failed to update profile. Please try again.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    global_admin: 'Global Admin',
    sub_admin: 'Sub Admin',
    user: 'Technician',
    admin: 'Administrator'
  };

  return (
    <div className="flex-1 bg-slate-100 min-h-screen">
      {/* Top Banner Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6">
        <div className="inline-flex items-center text-[10px] md:text-[11px] font-medium text-navy-600 bg-navy-600/8 border border-navy-600/15 rounded px-2 py-0.5 uppercase tracking-wide mb-2">
          Account Settings
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-navy-900 tracking-tight">My Profile</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">Manage your personal information and security credentials</p>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        {/* Unified Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden transition-all duration-300">
          
          {/* Card Header (Gradient & User Bio) */}
          <div className="bg-gradient-to-r from-navy-900 to-indigo-950 px-6 py-8 sm:px-8 text-white flex flex-col sm:flex-row items-center gap-5 sm:gap-6 relative overflow-hidden">
            {/* Dynamic background accents for premium feel */}
            <div className="absolute right-0 top-0 w-40 h-40 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Avatar */}
            <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarGradient(dbUser?.name)} flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-white/10 select-none transform hover:scale-105 transition-transform duration-200`}>
              {getInitials(dbUser?.name || dbUser?.email)}
            </div>

            {/* Info Stack */}
            <div className="text-center sm:text-left space-y-1.5 flex-1 z-10">
              <h2 className="text-xl font-bold tracking-tight text-white">{dbUser?.name || 'Megger User'}</h2>
              <div className="text-xs text-slate-300 font-mono flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3">
                <span>{dbUser?.email}</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-500" />
                <span className="font-sans font-medium">{dbUser?.phoneNumber}</span>
              </div>
              
              {/* Pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-900 bg-gold-400 px-2.5 py-0.5 rounded-full shadow-sm">
                  {roleLabels[dbUser?.role] || dbUser?.role}
                </span>
                {dbUser?.division && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                    {dbUser.division} Division
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card Body (Form) */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            {message.text && (
              <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2.5 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border-green-200 shadow-sm' 
                  : 'bg-red-50 text-red-700 border-red-200 shadow-sm'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {message.text}
              </div>
            )}

            {/* Personal Details Section */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Personal Details</h3>
                <p className="text-[10px] text-slate-400">Keep your contact information up-to-date</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-navy-800">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-4 focus:ring-navy-500/5 transition-all duration-150"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="phoneNumber" className="text-xs font-semibold text-navy-800">Phone Number</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-4 focus:ring-navy-500/5 transition-all duration-150"
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-navy-800">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-4 focus:ring-navy-500/5 transition-all duration-150"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Security &amp; Password</h3>
                <p className="text-[10px] text-slate-400">Leave blank if you don't want to change your password</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-navy-800">New Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-4 focus:ring-navy-500/5 transition-all duration-150"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-navy-800">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-navy-500 focus:ring-4 focus:ring-navy-500/5 transition-all duration-150"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="border-t border-slate-100 pt-5 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-navy-900 hover:bg-navy-800 px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:bg-slate-300 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save Settings
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
