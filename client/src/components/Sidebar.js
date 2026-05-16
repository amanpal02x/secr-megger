import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const NavItem = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 text-left
      ${active
        ? 'bg-gold-400/10 text-gold-400 border-l-2 border-gold-400 pl-[10px]'
        : 'text-slate-300 hover:bg-navy-800 hover:text-white border-l-2 border-transparent'
      }`}
  >
    <span className={active ? 'text-gold-400' : 'text-slate-400'}>{icon}</span>
    {label}
  </button>
);

export default function Sidebar({ activePage, setActivePage, onClose }) {
  const { dbUser, logout } = useAuth();

  return (
    <aside className="w-64 max-w-[85vw] lg:w-60 bg-navy-900 flex flex-col h-screen sticky top-0 border-r border-navy-700 shadow-2xl lg:shadow-none">

      {/* Brand & Close */}
      <div className="flex items-center justify-between px-5 py-5 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect x="1" y="1" width="32" height="32" rx="5" fill="#0c2044" stroke="#e8b830" strokeWidth="1.5"/>
              <path d="M6 24 L10 14 L14 20 L18 11 L22 16 L28 24" stroke="#e8b830" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="28" cy="9" r="2.2" fill="#e8b830"/>
            </svg>
          </div>
          <div>
            <div className="text-gold-400 font-semibold text-lg tracking-widest leading-none uppercase">SECR</div>
            <div className="text-slate-500 text-[10px] uppercase tracking-wide mt-1 font-medium">Maintenance</div>
            {['admin', 'global_admin', 'sub_admin'].includes(dbUser?.role) && (
              <div className="mt-1.5 inline-block bg-navy-800 border border-navy-700 text-gold-400 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                {(dbUser.role === 'admin' || dbUser.role === 'global_admin') ? 'Global Admin' : `${dbUser.division || 'Local'} Admin`}
              </div>
            )}
          </div>
        </div>

        {/* Close button - only visible on mobile */}
        <button 
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="mx-4 border-t border-navy-700/50" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-2 font-medium">Main Menu</p>

        {['admin', 'global_admin', 'sub_admin'].includes(dbUser?.role) ? (
          <>
            <NavItem
              active={activePage === 'dashboard'}
              onClick={() => setActivePage('dashboard')}
              label="Overview"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              }
            />
            <NavItem
              active={activePage === 'log'}
              onClick={() => setActivePage('log')}
              label="Master Data Log"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
              }
            />
            <NavItem
              active={activePage === 'users'}
              onClick={() => setActivePage('users')}
              label="User Auth"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              }
            />
          </>
        ) : (
          <>
            <NavItem
              active={activePage === 'dashboard'}
              onClick={() => setActivePage('dashboard')}
              label="My Dashboard"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              }
            />
            <NavItem
              active={activePage === 'entry'}
              onClick={() => setActivePage('entry')}
              label="New Test Entry"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              }
            />
            <NavItem
              active={activePage === 'log'}
              onClick={() => setActivePage('log')}
              label="My Activity Log"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
              }
            />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-navy-700 p-3 space-y-2.5">
        {/* Clickable Profile Card */}
        <div 
          onClick={() => setActivePage('profile')}
          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border select-none group
            ${activePage === 'profile' 
              ? 'bg-navy-950 border-navy-700 shadow-inner' 
              : 'hover:bg-navy-950/60 border-transparent hover:border-navy-800/50'
            }`}
        >
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${
            (() => {
              const name = dbUser?.name;
              const defaultGrad = 'from-navy-600 to-indigo-700';
              if (!name) return defaultGrad;
              const charCode = name.charCodeAt(0);
              if (charCode % 4 === 0) return 'from-teal-500 to-emerald-600';
              if (charCode % 4 === 1) return 'from-indigo-500 to-purple-600';
              if (charCode % 4 === 2) return 'from-amber-500 to-orange-600';
              return 'from-rose-500 to-red-600';
            })()
          } flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform group-hover:scale-105`}>
            {((name) => {
              if (!name) return 'U';
              return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            })(dbUser?.name || dbUser?.email)}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-200 truncate group-hover:text-gold-400 transition-colors">
              {dbUser?.name || 'Megger User'}
            </div>
            <div className="text-[10px] text-slate-400 truncate capitalize">
              {dbUser?.role === 'user' ? 'Technician' : dbUser?.role?.replace('_', ' ') || 'User'}
            </div>
          </div>

          {/* Settings Icon */}
          <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>

        {/* Logout Button */}
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-all border border-transparent hover:border-red-900/50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Logout Session
        </button>
      </div>
    </aside>
  );
}
