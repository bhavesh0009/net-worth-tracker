'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import NewSnapshot from '@/components/NewSnapshot';
import AccountSettings from '@/components/AccountSettings';

export default function Home() {
  const { data: session, status } = useSession();
  const [view, setView] = useState('dashboard');

  // Data State
  const [accounts, setAccounts] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllData();
    }
  }, [status]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch accounts
      const accountsRes = await fetch('/api/accounts');
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts');
      const accountsData = await accountsRes.json();

      // Fetch periods
      const periodsRes = await fetch('/api/periods');
      if (!periodsRes.ok) throw new Error('Failed to fetch periods');
      const periodsData = await periodsRes.json();

      // Fetch records for all periods
      const allRecords = [];
      for (const period of periodsData) {
        const recordsRes = await fetch(`/api/records?period_id=${period.id}`);
        if (recordsRes.ok) {
          const periodRecords = await recordsRes.json();
          allRecords.push(...periodRecords);
        }
      }

      setAccounts(accountsData);
      setPeriods(periodsData);
      setRecords(allRecords);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle snapshot save
  const handleSaveSnapshot = async (data) => {
    try {
      const response = await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create snapshot');

      // Refresh data after saving
      await fetchAllData();
      setView('dashboard');
    } catch (err) {
      console.error('Error saving snapshot:', err);
      alert('Failed to save snapshot. Please try again.');
    }
  };

  // Handle toggle account
  const handleToggleAccount = async (id) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Failed to toggle account');

      // Update local state
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a));
    } catch (err) {
      console.error('Error toggling account:', err);
      alert('Failed to update account. Please try again.');
    }
  };

  // Handle add account
  const handleAddAccount = async (acc) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acc),
      });

      if (!response.ok) throw new Error('Failed to create account');

      const newAccount = await response.json();
      setAccounts(prev => [...prev, newAccount]);
    } catch (err) {
      console.error('Error adding account:', err);
      alert('Failed to add account. Please try again.');
    }
  };

  // Auth loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">NW</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">WealthTrack</h1>
          <p className="text-slate-600 mb-8">Personal Net Worth Tracker</p>
          <button
            onClick={() => signIn('google')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          <p className="text-xs text-slate-500 mt-4">Secure authentication via Google OAuth</p>
        </div>
      </div>
    );
  }

  // Data loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-rose-600">⚠</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Data</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={fetchAllData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main app (authenticated and data loaded)
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">NW</div>
          <span className="text-lg font-bold hidden lg:block tracking-tight">WealthTrack</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="hidden lg:block font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setView('entry')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'entry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <PlusCircle size={20} />
            <span className="hidden lg:block font-medium">New Snapshot</span>
          </button>

          <button
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={20} />
            <span className="hidden lg:block font-medium">Accounts</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <LogOut size={20} />
            <span className="hidden lg:block font-medium">Sign Out</span>
          </button>
        </div>

        <div className="p-6 text-xs text-slate-500 hidden lg:block">
          <p>v1.0.0</p>
          <p className="truncate">{session?.user?.email}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-4 lg:p-8">
        <header className="flex justify-between items-center mb-8">
           <h1 className="text-2xl font-bold text-slate-800 capitalize">{view === 'entry' ? 'Update Finances' : view}</h1>
           <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden md:block">Welcome back!</span>
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                {session?.user?.name?.charAt(0) || 'U'}
              </div>
           </div>
        </header>

        {view === 'dashboard' && periods.length > 0 && (
          <Dashboard accounts={accounts} periods={periods} records={records} />
        )}

        {view === 'dashboard' && periods.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-600 mb-4">No data yet. Create your first snapshot!</p>
            <button
              onClick={() => setView('entry')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg"
            >
              Create First Snapshot
            </button>
          </div>
        )}

        {view === 'entry' && (
          <NewSnapshot
            accounts={accounts}
            periods={periods}
            records={records}
            onSave={handleSaveSnapshot}
            onCancel={() => setView('dashboard')}
          />
        )}

        {view === 'settings' && (
          <AccountSettings
            accounts={accounts}
            onToggle={handleToggleAccount}
            onAdd={handleAddAccount}
          />
        )}
      </main>
    </div>
  );
}
