import { useState } from 'react';
import { ArrowLeft, Save, Check } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export default function NewSnapshot({ accounts, periods, records, onSave, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Initialize values with the LATEST known record for each account (Pre-fill feature)
  const lastPeriodId = periods[periods.length - 1]?.id;

  // Store initial values to track changes
  const [initialValues] = useState(() => {
    const initialState = {};
    accounts.forEach(acc => {
      if (!acc.is_active) return;
      const lastRecord = records.find(r => r.period_id === lastPeriodId && r.account_id === acc.id);
      initialState[acc.id] = lastRecord ? parseFloat(lastRecord.amount || 0) : 0;
    });
    return initialState;
  });

  const [values, setValues] = useState(() => ({ ...initialValues }));

  const handleValueChange = (accId, newValue) => {
    // Basic validation to prevent NaN
    const numValue = parseFloat(newValue) || 0;
    setValues(prev => ({ ...prev, [accId]: numValue }));
  };

  // Check if a value has been updated
  const isUpdated = (accId) => {
    return parseFloat(values[accId] || 0) !== parseFloat(initialValues[accId] || 0);
  };

  // Live Calculations
  const currentAssets = accounts
    .filter(a => a.type === 'Asset' && values[a.id] !== undefined)
    .reduce((sum, a) => sum + parseFloat(values[a.id] || 0), 0);

  const currentLiabilities = accounts
    .filter(a => a.type === 'Liability' && values[a.id] !== undefined)
    .reduce((sum, a) => sum + parseFloat(values[a.id] || 0), 0);

  const estimatedNW = currentAssets - currentLiabilities;
  const previousNW = parseFloat(periods[periods.length - 1]?.total_nw || 0);
  const diff = estimatedNW - previousNW;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check for unchanged values
    const unchangedAccounts = accounts
      .filter(a => a.is_active)
      .filter(a => !isUpdated(a.id))
      .map(a => a.name);

    if (unchangedAccounts.length > 0) {
      const message = `The following accounts have not been updated and will use previous month's values:\n\n${unchangedAccounts.join('\n')}\n\nDo you want to continue?`;
      if (!window.confirm(message)) {
        return;
      }
    }

    onSave({
      date,
      notes,
      values,
      total_nw: estimatedNW
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">New Monthly Snapshot</h2>
          <p className="text-slate-500 text-sm">Update your balances for this month.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Inputs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Snapshot Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Note</label>
            <input
              type="text"
              placeholder="e.g. Bonus received, Market dip..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ASSETS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Assets</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {accounts.filter(a => a.type === 'Asset' && a.is_active).map(acc => (
                <div key={acc.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">{acc.name}</p>
                    <p className="text-xs text-slate-400">{acc.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        value={values[acc.id]}
                        onChange={(e) => handleValueChange(acc.id, e.target.value)}
                        className="w-40 pl-8 pr-3 py-2 text-right font-semibold text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tracking-wide"
                      />
                    </div>
                    {isUpdated(acc.id) && (
                      <div className="flex items-center justify-center w-6 h-6 bg-emerald-100 rounded-full">
                        <Check size={14} className="text-emerald-600" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="p-4 bg-emerald-50 flex justify-between items-center">
                 <span className="font-medium text-emerald-900">Total Assets</span>
                 <span className="font-bold text-emerald-700 text-lg">{formatCurrency(currentAssets)}</span>
              </div>
            </div>
          </div>

          {/* LIABILITIES */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider">Liabilities</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {accounts.filter(a => a.type === 'Liability' && a.is_active).map(acc => (
                <div key={acc.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">{acc.name}</p>
                    <p className="text-xs text-slate-400">{acc.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        value={values[acc.id]}
                        onChange={(e) => handleValueChange(acc.id, e.target.value)}
                        className="w-40 pl-8 pr-3 py-2 text-right font-semibold text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent tracking-wide"
                      />
                    </div>
                    {isUpdated(acc.id) && (
                      <div className="flex items-center justify-center w-6 h-6 bg-emerald-100 rounded-full">
                        <Check size={14} className="text-emerald-600" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="p-4 bg-rose-50 flex justify-between items-center">
                 <span className="font-medium text-rose-900">Total Liabilities</span>
                 <span className="font-bold text-rose-700 text-lg">{formatCurrency(currentLiabilities)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Footer / Summary */}
        <div className="sticky bottom-4 bg-slate-800 text-white p-4 rounded-xl shadow-xl flex items-center justify-between animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
            <div>
              <p className="text-slate-400 text-xs uppercase">Est. Net Worth</p>
              <p className="text-xl font-bold">{formatCurrency(estimatedNW)}</p>
            </div>
            <div className="hidden md:block h-8 w-px bg-slate-600"></div>
            <div>
               <p className="text-slate-400 text-xs uppercase">Difference</p>
               <p className={`text-lg font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {diff > 0 ? '+' : ''}{formatCurrency(diff)}
               </p>
            </div>
          </div>
          <div className="flex gap-3">
             <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">Cancel</button>
             <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/30"
             >
                <Save size={18} />
                Save Snapshot
             </button>
          </div>
        </div>
      </form>
    </div>
  );
}
