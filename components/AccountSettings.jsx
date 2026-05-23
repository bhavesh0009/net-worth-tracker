import { useState } from 'react';
import { PlusCircle, Wallet, CreditCard } from 'lucide-react';

const formatChangedAt = (ts) => {
  // BigQuery TIMESTAMP comes back as { value: '...' }; plain ISO strings also supported.
  const v = ts?.value || ts;
  if (!v) return null;
  return new Date(v).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

function AccountRow({ acc, onSetActive }) {
  const disabledOn = !acc.is_active ? formatChangedAt(acc.status_changed_at) : null;

  const handleDisable = () => {
    const ok = window.confirm(
      `Disable "${acc.name}"?\n\nThis hides the account from new snapshots. All past data is kept and totals are unchanged. You can re-enable anytime.`
    );
    if (ok) onSetActive(acc.id, false);
  };

  const handleEnable = () => onSetActive(acc.id, true);

  return (
    <div className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${acc.type === 'Asset' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {acc.type === 'Asset' ? <Wallet size={20} /> : <CreditCard size={20} />}
        </div>
        <div>
          <p className={`font-medium ${!acc.is_active ? 'text-slate-400 line-through' : ''}`}>{acc.name}</p>
          <p className="text-xs text-slate-400">
            {acc.category} • {acc.type}
            {disabledOn ? ` • Disabled ${disabledOn}` : ''}
          </p>
        </div>
      </div>
      {acc.is_active ? (
        <button
          onClick={handleDisable}
          className="text-sm px-3 py-1 rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50"
        >
          Disable
        </button>
      ) : (
        <button
          onClick={handleEnable}
          className="text-sm px-3 py-1 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
        >
          Enable
        </button>
      )}
    </div>
  );
}

export default function AccountSettings({ accounts, onSetActive, onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'Asset', category: 'Cash' });

  const handleAdd = (e) => {
    e.preventDefault();
    onAdd(newAcc);
    setIsAdding(false);
    setNewAcc({ name: '', type: 'Asset', category: 'Cash' });
  };

  const activeAccounts = accounts.filter(a => a.is_active);
  const disabledAccounts = accounts.filter(a => !a.is_active);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manage Accounts</h2>
          <p className="text-slate-500 text-sm">Add accounts, or disable ones you&apos;ve closed. Disabling keeps all past data.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700"
        >
          <PlusCircle size={18} /> Add Account
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-100 p-6 rounded-2xl mb-6 animate-slide-down">
          <form onSubmit={handleAdd} className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Account Name</label>
              <input required type="text" className="w-full p-2 rounded border" placeholder="e.g. Bitcoin Wallet" value={newAcc.name} onChange={e => setNewAcc({...newAcc, name: e.target.value})}/>
            </div>
            <div className="w-32">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
              <select className="w-full p-2 rounded border" value={newAcc.type} onChange={e => setNewAcc({...newAcc, type: e.target.value})}>
                <option>Asset</option>
                <option>Liability</option>
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
              <select className="w-full p-2 rounded border" value={newAcc.category} onChange={e => setNewAcc({...newAcc, category: e.target.value})}>
                <option>Cash</option>
                <option>Equity</option>
                <option>Real Estate</option>
                <option>Retirement</option>
                <option>Loan</option>
                <option>Credit Card</option>
              </select>
            </div>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded">Save</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {activeAccounts.map(acc => (
          <AccountRow key={acc.id} acc={acc} onSetActive={onSetActive} />
        ))}
      </div>

      {disabledAccounts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Disabled accounts</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {disabledAccounts.map(acc => (
              <AccountRow key={acc.id} acc={acc} onSetActive={onSetActive} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
