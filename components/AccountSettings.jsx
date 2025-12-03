import { useState } from 'react';
import { PlusCircle, Wallet, CreditCard } from 'lucide-react';

export default function AccountSettings({ accounts, onToggle, onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', type: 'Asset', category: 'Cash' });

  const handleAdd = (e) => {
    e.preventDefault();
    onAdd(newAcc);
    setIsAdding(false);
    setNewAcc({ name: '', type: 'Asset', category: 'Cash' });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Manage Accounts</h2>
           <p className="text-slate-500 text-sm">Add or hide accounts from your tracker.</p>
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
        {accounts.map(acc => (
          <div key={acc.id} className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50">
             <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${acc.type === 'Asset' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {acc.type === 'Asset' ? <Wallet size={20} /> : <CreditCard size={20} />}
                </div>
                <div>
                   <p className={`font-medium ${!acc.is_active && 'text-slate-400 line-through'}`}>{acc.name}</p>
                   <p className="text-xs text-slate-400">{acc.category} • {acc.type}</p>
                </div>
             </div>
             <button
                onClick={() => onToggle(acc.id)}
                className={`text-sm px-3 py-1 rounded-full border ${acc.is_active ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-100 text-slate-400'}`}
             >
               {acc.is_active ? 'Active' : 'Hidden'}
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}
