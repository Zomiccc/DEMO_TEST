'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { api, Order } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600',
  READY: 'bg-purple-50 text-purple-600',
  ASSIGNED: 'bg-indigo-50 text-indigo-600',
  PICKED_UP: 'bg-sky-50 text-sky-600',
  ON_THE_WAY: 'bg-cyan-50 text-cyan-600',
  DELIVERED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.orders(token).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-6">My Orders</h1>
        {loading ? (
          <p className="text-stone-400">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-stone-400">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-stone-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{o.orderNumber}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-stone-100 text-stone-600'}`}>{o.status}</span>
                </div>
                <p className="text-stone-500 text-sm">{new Date(o.createdAt).toLocaleDateString('en-PK')}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="font-extrabold text-brand-600">{rs(o.total)}</span>
                  <button className="text-sm font-medium text-brand-600 hover:underline">Track</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
