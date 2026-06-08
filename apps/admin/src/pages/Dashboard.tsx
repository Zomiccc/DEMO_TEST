import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:4000/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, riders: 0, customers: 0 });

  useEffect(() => {
    fetch(`${API}/analytics/overview`).then(r => r.ok ? r.json() : {}).then((d: any) => setStats(d)).catch(() => {});
  }, []);

  const chart = [
    { name: 'Mon', sales: 4000 },
    { name: 'Tue', sales: 3000 },
    { name: 'Wed', sales: 5000 },
    { name: 'Thu', sales: 2780 },
    { name: 'Fri', sales: 1890 },
    { name: 'Sat', sales: 6390 },
    { name: 'Sun', sales: 7490 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.orders, color: 'bg-blue-500' },
          { label: 'Revenue', value: `Rs. ${stats.revenue.toLocaleString()}`, color: 'bg-green-500' },
          { label: 'Active Riders', value: stats.riders, color: 'bg-orange-500' },
          { label: 'Customers', value: stats.customers, color: 'bg-purple-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm font-medium">{c.label}</p>
            <p className="text-2xl font-extrabold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold mb-4">Weekly Sales</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chart}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="#f97316" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
