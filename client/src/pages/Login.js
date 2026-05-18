import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, sendOtp, loginWithOtp, resetPassword, logout } = useAuth();
  const [loginMode, setLoginMode] = useState('user'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [techLoginSubMode, setTechLoginSubMode] = useState('otp');
  const [view, setView] = useState('login');
  const [newPassword, setNewPassword] = useState('');


  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setPhone('');
    setOtp('');
    setOtpSent(false);
    setError('');
    setSuccess('');
  }, [loginMode, techLoginSubMode, view]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return setError('Please enter mobile number');
    setError('');
    setLoading(true);
    try {
      const result = await sendOtp(phone);
      if (result.success) {
        setOtpSent(true);
        setSuccess('OTP sent to your mobile number.');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (loginMode === 'admin') {
        if (!email || !password) {
          setError('Please enter both email and password');
          setLoading(false);
          return;
        }
        result = await login(email, password);
      } else {
        if (techLoginSubMode === 'creds') {
          if (!email || !password) {
            setError('Please enter both email and password');
            setLoading(false);
            return;
          }
          result = await login(email, password);
        } else {
          if (!otp) {
            setError('Please enter the OTP');
            setLoading(false);
            return;
          }
          result = await loginWithOtp(phone, otp);
        }
      }

      if (result.success) {

        const userRole = result.user.role;
        const isAuthorized = loginMode === 'admin' 
          ? ['admin', 'global_admin', 'sub_admin'].includes(userRole)
          : userRole === 'user';

        if (!isAuthorized) {
          logout();
          setError(`This account does not have ${loginMode === 'admin' ? 'Administrative' : 'Technician'} privileges.`);
          setOtpSent(false);
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!phone || !otp || !newPassword) return setError('Missing required fields');
    setLoading(true);
    try {
      const result = await resetPassword(phone, otp, newPassword);
      if (result.success) {
        setSuccess('Password reset successfully! You can now login.');
        setTimeout(() => setView('login'), 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = loginMode === 'admin';

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors duration-500 ${isAdmin ? 'bg-slate-200' : 'bg-slate-100'}`}>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

        {}
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

        {}
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

        {}
        <div className="px-8 pb-8">
          {view === 'forgot' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center">
                <h3 className="text-xl font-bold text-navy-900">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">Verify your identity via mobile OTP</p>
              </div>

              {error && <div className="p-3 text-xs font-bold rounded-lg border bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                {error}
              </div>}

              {success && <div className="p-3 text-xs font-bold rounded-lg border bg-green-50 text-green-700 border-green-100 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                {success}
              </div>}

              <form onSubmit={otpSent ? handleResetPassword : handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Mobile Number</label>
                  <div className="relative group">
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={otpSent} placeholder="10-digit mobile" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 pl-11 text-sm outline-none transition-all focus:ring-2 focus:ring-navy-800 disabled:opacity-50" required />
                    <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                  </div>
                </div>

                {otpSent && (
                  <>
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">6-Digit OTP</label>
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="••••••" maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-navy-800 text-center tracking-[1em] font-bold" required />
                    </div>
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Security Password</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-navy-800" required />
                    </div>
                  </>
                )}

                <button type="submit" disabled={loading} className="w-full bg-navy-900 hover:bg-navy-800 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 text-sm uppercase tracking-widest">
                  {loading ? 'Processing...' : (otpSent ? 'Update Password' : 'Send Verification OTP')}
                </button>
                <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-bold text-slate-400 hover:text-navy-900 uppercase tracking-widest transition-colors">Back to Login</button>
              </form>
            </div>
          ) : (
            <>
              {error && (
                <div className={`mb-6 p-3 text-xs font-bold rounded-lg border flex items-center gap-2 ${isAdmin ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-3 text-xs font-bold rounded-lg border bg-green-50 text-green-700 border-green-100 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  {success}
                </div>
              )}

              {isAdmin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@secr.gov.in"
                    className="w-full bg-slate-50 border border-slate-200 text-navy-900 rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800 transition-all group-hover:border-slate-300"
                    required
                  />
                  <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
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
                className="w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
              >
                {loading ? 'Validating Access...' : 'Enter Admin Portal'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              {}
              <div className="flex justify-center -mt-2">
                <div className="inline-flex p-1 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
                  <button 
                    type="button"
                    onClick={() => setTechLoginSubMode('otp')}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${techLoginSubMode === 'otp' ? 'bg-white shadow-md text-navy-900 ring-1 ring-slate-100' : 'text-slate-400 hover:text-navy-900'}`}
                  >
                    Mobile OTP
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTechLoginSubMode('creds')}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${techLoginSubMode === 'creds' ? 'bg-white shadow-md text-navy-900 ring-1 ring-slate-100' : 'text-slate-400 hover:text-navy-900'}`}
                  >
                    Email Login
                  </button>
                </div>
              </div>

              {techLoginSubMode === 'creds' ? (
                <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technician Email</label>
                    <div className="relative group">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your.name@secr.gov.in"
                        className="w-full bg-slate-50 border border-slate-200 text-navy-900 rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800 transition-all group-hover:border-slate-300"
                        required
                      />
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                      <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-bold text-navy-600 hover:underline">Forgot Password?</button>
                    </div>
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
                    className="w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide bg-navy-900 hover:bg-navy-800 text-white shadow-navy-900/20"
                  >
                    {loading ? 'Authenticating...' : 'Sign In as Technician'}
                  </button>
                </form>
              ) : (
                <form onSubmit={otpSent ? handleLogin : handleSendOtp} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Mobile Number</label>
                    <div className="relative group">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        disabled={otpSent}
                        placeholder="10-digit mobile"
                        className="w-full bg-slate-50 border border-slate-200 text-navy-900 rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800 transition-all group-hover:border-slate-300 disabled:opacity-60"
                        required
                      />
                      <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      {otpSent ? (
                        <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setSuccess(''); }} className="text-[10px] font-bold text-navy-600 uppercase tracking-tight hover:underline">Change Number</button>
                      ) : (
                        <div />
                      )}
                      <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-bold text-navy-600 uppercase tracking-tight hover:underline">Forgot Password?</button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">6-Digit OTP Code</label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          placeholder="••••••"
                          maxLength={6}
                          className="w-full bg-slate-50 border border-slate-200 text-navy-900 rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800 transition-all group-hover:border-slate-300"
                          required
                        />
                        <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide bg-navy-900 hover:bg-navy-800 text-white shadow-navy-900/20"
                  >
                    {loading ? 'Processing...' : (otpSent ? 'Verify & Enter Dashboard' : 'Request OTP')}
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>

      </div>

      {}
      <div className="mt-8 flex items-center gap-3 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="w-px h-6 bg-slate-300"></div>
        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Maintenance Register</div>
      </div>
    </div>
  );
}
