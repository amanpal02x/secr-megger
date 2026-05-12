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
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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

        {dbUser?.role === 'admin' ? (
          <>
            <NavItem
              active={activePage === 'admin'}
              onClick={() => setActivePage('admin')}
              label="Admin Portal"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
      <div className="border-t border-navy-700 p-4 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-600 mb-0.5">Railway Zone</p>
          <p className="text-xs text-slate-300 font-medium">South East Central</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-600 mb-0.5">Today</p>
          <p className="text-xs text-slate-300 font-medium">{today}</p>
        </div>
        <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/30 rounded-full px-3 py-1.5 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400 font-medium">System Online</span>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-950/30 transition-all border border-transparent hover:border-red-900/50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Logout Session
        </button>
      </div>
    </aside>
  );
}
