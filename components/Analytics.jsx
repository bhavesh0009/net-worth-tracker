'use client';
import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import AccountSelector from './AccountSelector';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

// Format numbers in Indian style for chart axes (1.2 Cr, 12.3 Lacs, 12k)
const formatIndianNumber = (value) => {
  const absValue = Math.abs(value);
  if (absValue >= 10000000) { // >= 1 crore
    return `₹${(value / 10000000).toFixed(1)} Cr`;
  } else if (absValue >= 100000) { // >= 1 lakh
    return `₹${(value / 100000).toFixed(1)} L`;
  } else if (absValue >= 1000) { // >= 1 thousand
    return `₹${(value / 1000).toFixed(0)}k`;
  }
  return `₹${value.toFixed(0)}`;
};

const formatDate = (dateString) => {
  const dateValue = dateString?.value || dateString;
  return new Date(dateValue).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

const CHART_COLORS = [
  '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#14B8A6', '#06B6D4', '#0EA5E9', '#8B5CF6', '#D946EF', '#F43F5E'
];

export default function Analytics({ accounts, periods, records }) {
  // Initialize with top 10 accounts by absolute value from latest period
  const [selectedAccounts, setSelectedAccounts] = useState(() => {
    const latestPeriod = periods[periods.length - 1];
    if (!latestPeriod) return [];

    const latestRecords = records.filter(r => r.period_id === latestPeriod.id);
    const accountValues = accounts
      .filter(a => a.is_active)
      .map(acc => {
        const record = latestRecords.find(r => r.account_id === acc.id);
        return {
          id: acc.id,
          value: Math.abs(parseFloat(record?.amount || 0))
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(item => item.id);

    return accountValues;
  });

  // 1. Account Trend Data
  const accountTrendData = useMemo(() => {
    if (selectedAccounts.length === 0) return [];

    // First, filter out accounts with no data (all zeros)
    const accountsWithData = selectedAccounts.filter(accId => {
      const hasNonZeroValue = periods.some(period => {
        const record = records.find(r =>
          r.period_id === period.id && r.account_id === accId
        );
        return parseFloat(record?.amount || 0) !== 0;
      });
      return hasNonZeroValue;
    });

    return periods.map(period => {
      const dataPoint = { name: formatDate(period.month_date) };
      accountsWithData.forEach(accId => {
        const account = accounts.find(a => a.id === accId);
        if (!account) return;
        const record = records.find(r =>
          r.period_id === period.id && r.account_id === accId
        );
        dataPoint[account.name] = parseFloat(record?.amount || 0);
      });
      return dataPoint;
    });
  }, [selectedAccounts, periods, records, accounts]);

  // 2. Category Trend Data
  const categoryTrendData = useMemo(() => {
    return periods.map(period => {
      const periodRecords = records.filter(r => r.period_id === period.id);
      const categoryTotals = { name: formatDate(period.month_date) };

      periodRecords.forEach(record => {
        const account = accounts.find(a => a.id === record.account_id);
        if (!account) return;
        const category = account.category;
        categoryTotals[category] = (categoryTotals[category] || 0) +
          parseFloat(record.amount || 0);
      });

      return categoryTotals;
    });
  }, [periods, records, accounts]);

  // 3. Assets vs Liabilities Data
  const assetsVsLiabilitiesData = useMemo(() => {
    return periods.map(period => {
      const periodRecords = records.filter(r => r.period_id === period.id);

      const assets = periodRecords
        .filter(r => accounts.find(a => a.id === r.account_id)?.type === 'Asset')
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

      const liabilities = Math.abs(periodRecords
        .filter(r => accounts.find(a => a.id === r.account_id)?.type === 'Liability')
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0));

      return {
        name: formatDate(period.month_date),
        Assets: assets,
        Liabilities: liabilities,
        NetWorth: assets - liabilities
      };
    });
  }, [periods, records, accounts]);

  // 4. Growth Rate Data
  const growthRateData = useMemo(() => {
    const netWorthByPeriod = periods.map(period => {
      const periodRecords = records.filter(r => r.period_id === period.id);
      const assets = periodRecords
        .filter(r => accounts.find(a => a.id === r.account_id)?.type === 'Asset')
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      const liabilities = Math.abs(periodRecords
        .filter(r => accounts.find(a => a.id === r.account_id)?.type === 'Liability')
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0));
      return assets - liabilities;
    });

    return periods.slice(1).map((period, idx) => {
      const currentNW = netWorthByPeriod[idx + 1];
      const previousNW = netWorthByPeriod[idx];
      const growthAmount = currentNW - previousNW;
      const growthRate = previousNW !== 0 ? ((growthAmount / previousNW) * 100) : 0;

      return {
        name: formatDate(period.month_date),
        GrowthRate: parseFloat(growthRate.toFixed(2)),
        GrowthAmount: growthAmount,
        isPositive: growthAmount >= 0
      };
    });
  }, [periods, records, accounts]);

  // Get unique categories for stacked area chart
  const categories = useMemo(() => {
    const catSet = new Set();
    categoryTrendData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'name') catSet.add(key);
      });
    });
    return Array.from(catSet);
  }, [categoryTrendData]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
        <p className="text-slate-500 text-sm">Advanced insights into your financial trends</p>
      </div>

      {/* Account Selector */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Filter by Account</h3>
        <AccountSelector
          accounts={accounts.filter(a => a.is_active)}
          selectedAccounts={selectedAccounts}
          onSelectionChange={setSelectedAccounts}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Account Trends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Account Trends Over Time</h3>
          {selectedAccounts.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-500">
              Please select at least one account to view trends.
            </div>
          ) : selectedAccounts.length > 10 ? (
            <div className="h-80 flex flex-col items-center justify-center text-slate-500">
              <p className="text-center mb-2">Too many accounts selected ({selectedAccounts.length})</p>
              <p className="text-sm text-slate-400">Consider selecting 10 or fewer for better readability</p>
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accountTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {selectedAccounts.map((accId, idx) => {
                      const account = accounts.find(a => a.id === accId);
                      return (
                        <linearGradient key={accId} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.1}/>
                          <stop offset="95%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0}/>
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#64748B', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#94A3B8', fontSize: 11}}
                    tickFormatter={formatIndianNumber}
                    width={65}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                  {selectedAccounts.map((accId, idx) => {
                    const account = accounts.find(a => a.id === accId);
                    if (!account) return null;
                    return (
                      <Line
                        key={accId}
                        type="monotone"
                        dataKey={account.name}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Category Trends */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Category Distribution Trends</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={categoryTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {categories.map((category, idx) => (
                    <linearGradient key={category} id={`color-${category}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} tickFormatter={formatIndianNumber} width={65} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {categories.map((category, idx) => (
                  <Area
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stackId="1"
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                    fill={`url(#color-${category})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Assets vs Liabilities */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Assets vs Liabilities</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={assetsVsLiabilitiesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} tickFormatter={formatIndianNumber} width={65} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area
                  type="monotone"
                  dataKey="Assets"
                  fill="url(#colorAssets)"
                  stroke="#10B981"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Liabilities"
                  fill="url(#colorLiabilities)"
                  stroke="#EF4444"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="NetWorth"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#4F46E5' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Growth Rate */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Growth Rate</h3>
          {growthRateData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-500">
              Insufficient data to calculate growth rate.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthRateData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#94A3B8', fontSize: 11}}
                    tickFormatter={(value) => `${value}%`}
                    domain={['auto', 'auto']}
                    width={50}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value, name) => {
                      if (name === 'GrowthRate') return `${value}%`;
                      return formatCurrency(value);
                    }}
                  />
                  <Bar dataKey="GrowthRate" radius={[8, 8, 0, 0]}>
                    {growthRateData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isPositive ? '#10B981' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
