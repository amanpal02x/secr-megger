import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import EntryForm from './pages/EntryForm';
import DataLog from './pages/DataLog';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Locations from './pages/Locations';


function MainApp() {
  const { dbUser, loading } = useAuth();
  const [page, setPage] = useState('');
  const [toast, setToast] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (dbUser && !page) {
      const searchParams = new URLSearchParams(window.location.search);
      let initialPage = searchParams.get('page');
      
      if (!initialPage) {
        initialPage = 'dashboard';
        window.history.replaceState({ page: initialPage }, '', `?page=${initialPage}`);
      } else {
        window.history.replaceState({ page: initialPage }, '', `?page=${initialPage}`);
      }
      setPage(initialPage);
    }
  }, [dbUser, page]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.page) {
        setPage(event.state.page);
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        const p = searchParams.get('page');
        if (p) setPage(p);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetPage = useCallback((newPage) => {
    setPage(prev => {
      if (prev !== newPage) {
        window.history.pushState({ page: newPage }, '', `?page=${newPage}`);
        return newPage;
      }
      return prev;
    });
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);


  useEffect(() => {
    setIsSidebarOpen(false);
  }, [page]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-100 font-bold text-navy-500 text-center p-4">Loading App...</div>;
  }

  if (!dbUser) {
    const appName = "Megger";
    const subdomain = "megger";
    const origin = window.location.origin;
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `https://secrtelecom.com/login?app=${encodeURIComponent(appName)}&subdomain=${subdomain}&path=${encodeURIComponent(path)}&redirect_to=${encodeURIComponent(origin)}`;
    return null;
  }

  const renderPage = () => {
    const isAdmin = ['admin', 'global_admin', 'sub_admin'].includes(dbUser.role);
    switch (page) {
      case 'dashboard': return isAdmin ? <Dashboard setActivePage={handleSetPage} /> : <UserDashboard setActivePage={handleSetPage} />;
      case 'entry':     return <EntryForm setActivePage={handleSetPage} showToast={showToast} />;
      case 'log':       return <DataLog showToast={showToast} />;
      case 'users':     return isAdmin ? <AdminDashboard setActivePage={handleSetPage} showToast={showToast} /> : <UserDashboard setActivePage={handleSetPage} />;
      case 'locations': return ['admin', 'global_admin'].includes(dbUser.role) ? <Locations showToast={showToast} /> : <UserDashboard setActivePage={handleSetPage} />;
      case 'profile':   return <Profile />;
      default:          return isAdmin ? <Dashboard setActivePage={handleSetPage} /> : <UserDashboard setActivePage={handleSetPage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-100">
      {}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar activePage={page} setActivePage={handleSetPage} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {}
        <header className="lg:hidden bg-navy-900 text-white px-4 py-3 flex items-center justify-between shadow-md z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gold-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-gold-400 font-bold tracking-tighter text-lg">SECR</span>
            <span className="w-px h-4 bg-navy-700"></span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium pt-0.5">Portal</span>
          </div>
          <div className="w-8"></div> {}
        </header>

        <main className="flex-1 overflow-y-auto focus:outline-none bg-slate-100">
          {renderPage()}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
