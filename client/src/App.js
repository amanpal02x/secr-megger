import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import EntryForm from './pages/EntryForm';
import DataLog from './pages/DataLog';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';

function MainApp() {
  const { dbUser, loading } = useAuth();
  const [page, setPage] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (dbUser) {
      // For Admin, always default to the 'admin' portal if on dashboard or empty
      if (dbUser.role === 'admin') {
        if (!page || page === 'dashboard') {
          setPage('admin');
        }
      } else {
        // For Technician, default to 'dashboard' if empty
        if (!page) {
          setPage('dashboard');
        }
      }
    }
  }, [dbUser, page]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-100 font-bold text-navy-500">Loading App...</div>;
  }

  if (!dbUser) {
    return <Login />;
  }

  if (page === 'admin' && dbUser.role === 'admin') {
    return (
      <div className="flex h-screen overflow-hidden font-sans">
        <Sidebar activePage={page} setActivePage={setPage} />
        <AdminDashboard setActivePage={setPage} showToast={showToast} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar activePage={page} setActivePage={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <TechnicianDashboard setActivePage={setPage} />}
        {page === 'entry'     && <EntryForm setActivePage={setPage} showToast={showToast} />}
        {page === 'log'       && <DataLog showToast={showToast} />}
      </main>
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
