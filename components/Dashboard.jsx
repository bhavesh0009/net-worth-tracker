import {
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import StatCard from './StatCard';

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
  // BigQuery returns dates as objects with .value property
  const dateValue = dateString?.value || dateString;
  return new Date(dateValue).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'];

export default function Dashboard({ accounts, periods, records }) {
  // Calculate latest stats
  const latestPeriod = periods[periods.length - 1];
  const previousPeriod = periods[periods.length - 2];

  const latestRecords = records.filter(r => r.period_id === latestPeriod?.id);

  const totalAssets = latestRecords
    .filter(r => accounts.find(a => a.id === r.account_id)?.type === 'Asset')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const totalLiabilities = Math.abs(latestRecords
    .filter(r => accounts.find(a => a.id === r.account_id)?.type === 'Liability')
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0));

  // If we have detailed records for latest period, calculate; otherwise use total_nw from period
  const netWorth = latestRecords.length > 0
    ? totalAssets - totalLiabilities
    : parseFloat(latestPeriod?.total_nw || 0);

  const prevNetWorth = previousPeriod ? parseFloat(previousPeriod.total_nw || 0) : netWorth;
  const change = netWorth - prevNetWorth;
  const changePercent = prevNetWorth !== 0 ? ((change / prevNetWorth) * 100).toFixed(1) : '0.0';

  // Prepare Chart Data
  const chartData = periods.map(p => ({
    name: formatDate(p.month_date),
    NetWorth: parseFloat(p.total_nw || 0),
    notes: p.notes
  }));

  // Prepare MoM Velocity Data (last 12 months)
  const momVelocityData = periods.slice(-12).map((p, idx, arr) => {
    const currentNW = parseFloat(p.total_nw || 0);
    const previousNW = idx > 0 ? parseFloat(arr[idx - 1].total_nw || 0) : currentNW;
    const change = currentNW - previousNW;
    return {
      name: formatDate(p.month_date),
      change: change,
      isPositive: change >= 0,
      notes: p.notes || ''
    };
  });

  // Prepare Allocation Data
  const allocationMap = {};
  latestRecords.forEach(r => {
    const acc = accounts.find(a => a.id === r.account_id);
    if (acc && acc.type === 'Asset') {
      allocationMap[acc.category] = (allocationMap[acc.category] || 0) + parseFloat(r.amount || 0);
    }
  });

  const pieData = Object.keys(allocationMap).map(key => ({
    name: key,
    value: allocationMap[key]
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Net Worth"
          value={formatCurrency(netWorth)}
          subtext={`${change >= 0 ? '+' : ''}${formatCurrency(change)} (${changePercent}%) vs last month`}
          type={change >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Assets"
          value={formatCurrency(totalAssets)}
          type="neutral"
          icon={Wallet}
        />
        <StatCard
          title="Total Liabilities"
          value={formatCurrency(totalLiabilities)}
          type="negative"
          icon={TrendingDown}
        />
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Wealth Trend</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94A3B8', fontSize: 11}}
                  tickFormatter={formatIndianNumber}
                  width={65}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Area
                  type="monotone"
                  dataKey="NetWorth"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorNw)"
                  activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Asset Allocation</h3>
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value, name, props) => {
                    const percentage = ((value / totalAssets) * 100).toFixed(1);
                    return `${formatCurrency(value)} (${percentage}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-800">{((item.value / totalAssets) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Net Worth Velocity (MoM) Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Net Worth Velocity (MoM)</h3>
          <p className="text-sm text-slate-500">How much wealth you added (or lost) each month.</p>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={momVelocityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', padding: '12px' }}
                itemStyle={{ color: '#fff' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-600">
                        <p className="font-medium text-white mb-1">{data.name}</p>
                        <p className={`font-bold text-lg ${data.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {data.change > 0 ? '+' : ''}{formatCurrency(data.change)}
                        </p>
                        {data.notes && (
                          <p className="text-xs text-slate-300 mt-2 italic">"{data.notes}"</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="change" radius={[8, 8, 0, 0]}>
                {momVelocityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Snapshot Mini-Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
           <h3 className="text-lg font-bold text-slate-800">Latest Snapshot Breakdown</h3>
           <p className="text-sm text-slate-500">{latestPeriod?.notes}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {latestRecords.map(record => {
                const acc = accounts.find(a => a.id === record.account_id);
                return (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{acc?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${acc?.type === 'Asset' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {acc?.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-700 tracking-wide">
                      {formatCurrency(record.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
