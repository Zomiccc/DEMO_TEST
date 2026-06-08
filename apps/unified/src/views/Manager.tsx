import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, rs } from '../api';

const SCOLORS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600',
  READY: 'bg-purple-50 text-purple-600',
  ASSIGNED: 'bg-indigo-50 text-indigo-600',
  ON_THE_WAY: 'bg-cyan-50 text-cyan-600',
  DELIVERED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function ManagerView({ screen, token }: { screen: string; token: string }) {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, riders: 0, customers: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (screen === 'dashboard') {
      api.analytics(token).then((d: any) => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
    }
    if (screen === 'orders') api.allOrders(token).then(setOrders).catch(() => setOrders([]));
    if (screen === 'inventory') api.inventory(token).then(setInventory).catch(() => setInventory([]));
  }, [screen, token]);

  if (screen === 'dashboard') {
    const chart = [{ name: 'Mon', sales: 40 }, { name: 'Tue', sales: 30 }, { name: 'Wed', sales: 50 }, { name: 'Thu', sales: 27 }, { name: 'Fri', sales: 18 }, { name: 'Sat', sales: 63 }, { name: 'Sun', sales: 74 }];
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Orders', value: stats.orders }, { label: 'Revenue', value: `Rs. ${stats.revenue?.toLocaleString() ?? 0}` }, { label: 'Riders', value: stats.riders }, { label: 'Customers', value: stats.customers }].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-slate-500 text-xs font-semibold">{c.label}</p><p className="text-xl font-extrabold mt-1">{c.value}</p></div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-3">Weekly Sales</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={chart}><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="sales" fill="#f97316" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (screen === 'orders') return (
    <div className="p-4 space-y-3">
      {orders.map((o: any) => (
        <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex justify-between mb-1"><span className="font-bold text-sm">{o.orderNumber}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCOLORS[o.status] || 'bg-stone-100'}`}>{o.status}</span></div>
          <p className="text-slate-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</p>
          <p className="text-brand-600 font-bold text-sm mt-1">{rs(Number(o.total))}</p>
        </div>
      ))}
      {orders.length === 0 && <p className="text-center text-slate-400 py-10">No orders</p>}
    </div>
  );

  if (screen === 'inventory') return (
    <div className="p-4 space-y-3">
      {inventory.map((i: any) => (
        <div key={i.id} className="flex justify-between bg-white rounded-xl border border-slate-200 p-3">
          <div><p className="font-semibold text-sm">{i.name}</p><p className="text-slate-500 text-xs">{i.sku || '—'}</p></div>
          <div className="text-right"><p className={`font-bold text-sm ${Number(i.quantity) <= Number(i.reorderLevel) ? 'text-red-500' : ''}`}>{Number(i.quantity)} {i.unit}</p><p className="text-slate-500 text-xs">Reorder: {Number(i.reorderLevel)}</p></div>
        </div>
      ))}
      {inventory.length === 0 && <p className="text-center text-slate-400 py-10">No items</p>}
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-extrabold text-lg">Kitchen Display</h2>
      <p className="text-center text-slate-400 py-10">Use the KDS tab for kitchen view</p>
    </div>
  );
}
