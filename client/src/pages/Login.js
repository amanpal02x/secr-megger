import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, logout } = useAuth();
  const [loginMode, setLoginMode] = useState('user'); // 'user' for Technician, 'admin' for Admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear fields when switching between Technician and Admin
  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setError('');
  }, [loginMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Please enter both email and password');
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Enforce role check
        if (result.user.role !== loginMode) {
          logout(); // Force logout if role doesn't match intent
          setError(`This account does not have ${loginMode === 'admin' ? 'Administrative' : 'Technician'} privileges.`);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = loginMode === 'admin';

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors duration-500 ${isAdmin ? 'bg-slate-200' : 'bg-slate-100'}`}>
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Toggle Switch */}
        <div className="flex p-1 bg-slate-100 m-6 mb-0 rounded-xl border border-slate-200">
          <button 
            onClick={() => { setLoginMode('user'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${!isAdmin ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:text-navy-900'}`}
          >
            Technician
          </button>
          <button 
            onClick={() => { setLoginMode('admin'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${isAdmin ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-red-600'}`}
          >
            Administrator
          </button>
        </div>

        {/* Header Content */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-2xl transition-colors duration-500 ${isAdmin ? 'bg-red-50 text-red-600' : 'bg-gold-50 text-gold-600'}`}>
              {isAdmin ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            {isAdmin ? 'Admin Portal' : 'Staff Login'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Restricted Access for SECR Controllers' : 'Secure Entry for Technical Personnel'}
          </p>
        </div>

        {/* Form Body */}
        <div className="px-8 pb-8">
          {error && (
            <div className={`mb-6 p-3 text-xs font-bold rounded-lg border flex items-center gap-2 ${isAdmin ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Identity</label>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder={isAdmin ? 'admin@secr.gov.in' : 'technician@secr.gov.in'} 
                  className="w-full bg-slate-50 border border-slate-200 text-navy-900 rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800 transition-all group-hover:border-slate-300" 
                  required
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Key</label>
              <div className="relative group">
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-slate-50 border border-slate-200 text-navy-900 rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800 transition-all group-hover:border-slate-300" 
                  required
                />
                <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className={`w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide ${isAdmin ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20' : 'bg-navy-900 hover:bg-navy-800 text-white shadow-navy-900/20'}`}
            >
              {loading ? 'Validating Access...' : `Enter ${isAdmin ? 'Admin Portal' : 'Technician Dashboard'}`}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Protected by SECR Railway Information Systems. Unauthorized access attempts are monitored and recorded.
          </p>
        </div>
      </div>
      
      {/* Visual Indicator of Railway Zone */}
      <div className="mt-8 flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="text-right">
          <div className="text-xs font-black text-navy-900 tracking-widest leading-none">SECR</div>
          <div className="text-[8px] font-bold text-slate-500 uppercase">Bilaspur Zone</div>
        </div>
        <div className="w-px h-6 bg-slate-300"></div>
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Maintenance Register v2.0</div>
      </div>
    </div>
  );
}
