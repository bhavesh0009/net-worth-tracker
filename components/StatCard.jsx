export default function StatCard({ title, value, subtext, type = 'neutral', icon: Icon }) {
  const valueColor = type === 'positive' ? 'text-emerald-600' : type === 'negative' ? 'text-rose-600' : 'text-slate-800';
  const bgIconColor = type === 'positive' ? 'bg-emerald-100 text-emerald-600' : type === 'negative' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${valueColor}`}>{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bgIconColor}`}>
        {Icon && <Icon size={24} />}
      </div>
    </div>
  );
}
