'use client';
import { useState } from 'react';

export default function AccountSelector({ accounts, selectedAccounts, onSelectionChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const assetAccounts = accounts.filter(a => a.type === 'Asset');
  const liabilityAccounts = accounts.filter(a => a.type === 'Liability');

  const handleToggle = (accountId) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(accounts.map(a => a.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleAssetsOnly = () => {
    onSelectionChange(assetAccounts.map(a => a.id));
  };

  const handleLiabilitiesOnly = () => {
    onSelectionChange(liabilityAccounts.map(a => a.id));
  };

  const renderAccountCheckbox = (account) => (
    <label
      key={account.id}
      className="flex items-center p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group"
    >
      <input
        type="checkbox"
        checked={selectedAccounts.includes(account.id)}
        onChange={() => handleToggle(account.id)}
        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
      />
      <div className="ml-3 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
            {account.name}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            account.type === 'Asset'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}>
            {account.category}
          </span>
        </div>
      </div>
    </label>
  );

  const displayLimit = 5;
  const showingAssets = isExpanded ? assetAccounts : assetAccounts.slice(0, displayLimit);
  const showingLiabilities = isExpanded ? liabilityAccounts : liabilityAccounts.slice(0, displayLimit);

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSelectAll}
          className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          Select All
        </button>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={handleAssetsOnly}
          className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          Assets Only
        </button>
        <button
          onClick={handleLiabilitiesOnly}
          className="px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
        >
          Liabilities Only
        </button>
        <div className="flex-1"></div>
        <span className="px-3 py-2 text-sm text-slate-500">
          {selectedAccounts.length} of {accounts.length} selected
        </span>
      </div>

      {/* Account Checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assets Column */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">
            Assets ({assetAccounts.length})
          </h4>
          <div className="space-y-1">
            {showingAssets.map(renderAccountCheckbox)}
            {!isExpanded && assetAccounts.length > displayLimit && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-left p-3 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Show {assetAccounts.length - displayLimit} more assets...
              </button>
            )}
          </div>
        </div>

        {/* Liabilities Column */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2">
            Liabilities ({liabilityAccounts.length})
          </h4>
          <div className="space-y-1">
            {showingLiabilities.map(renderAccountCheckbox)}
            {!isExpanded && liabilityAccounts.length > displayLimit && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-left p-3 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Show {liabilityAccounts.length - displayLimit} more liabilities...
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && accounts.length > displayLimit * 2 && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full text-center p-2 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Show Less
        </button>
      )}
    </div>
  );
}
