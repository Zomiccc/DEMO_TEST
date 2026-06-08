import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600', CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600', READY: 'bg-purple-50 text-purple-600',
  ASSIGNED: 'bg-indigo-50 text-indigo-600', ON_THE_WAY: 'bg-cyan-50 text-cyan-600',
  DELIVERED: 'bg-green-50 text-green-600', CANCELLED: 'bg-red-50 text-red-600',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/orders`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.ok ? r.json() : []).then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Orders</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-semibold">#</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-left px-4 py-3 font-semibold">Total</th><th className="text-left px-4 py-3 font-semibold">Date</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-stone-100'}`}>{o.status}</span></td>
                <td className="px-4 py-3 font-semibold">Rs. {Number(o.total).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No orders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
