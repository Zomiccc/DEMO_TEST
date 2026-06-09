import { useEffect, useState, useRef } from 'react';
import { api } from '../api';

const STATUS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600',
  READY: 'bg-green-50 text-green-600',
};

const FAKE_ITEMS = [
  [{ name: 'Chicken Biryani', qty: 2 }, { name: 'Naan', qty: 4 }, { name: 'Raita', qty: 1 }],
  [{ name: 'Zinger Burger', qty: 1 }, { name: 'Fries', qty: 1 }, { name: 'Coke', qty: 1 }],
  [{ name: 'Beef Burger', qty: 2 }, { name: 'Onion Rings', qty: 1 }],
  [{ name: 'Chicken Karahi', qty: 1 }, { name: 'Roti', qty: 6 }],
  [{ name: 'Pizza Large', qty: 1 }, { name: 'Garlic Bread', qty: 1 }],
  [{ name: 'Chicken Tikka', qty: 4 }, { name: 'Mint Chutney', qty: 2 }],
];

export default function KitchenView({ token }: { token: string }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });
  const [newArrival, setNewArrival] = useState(false);
  const [orderTimes, setOrderTimes] = useState<Record<string, number>>({});
  const timerRef = useRef<any>(null);

  const load = async () => {
    try {
      const data = await api.kdsQueue(token);
      setQueue((prev) => {
        const merged = [...prev];
        data.forEach((d: any) => {
          const ex = merged.find((m) => m.id === d.id);
          if (!ex) merged.push(d);
        });
        return merged;
      });
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  // Simulate incoming fake orders
  useEffect(() => {
    const addFake = () => {
      const items = FAKE_ITEMS[Math.floor(Math.random() * FAKE_ITEMS.length)];
      const orderNum = 'RMS-' + (7800 + Math.floor(Math.random() * 200));
      const newOrder = {
        id: 'fake-' + Date.now(),
        status: 'PENDING',
        order: { orderNumber: orderNum, type: Math.random() > 0.3 ? 'DELIVERY' : 'DINE_IN' },
        items: items.map((i) => ({ product: { name: i.name }, name: i.name, quantity: i.qty })),
        createdAt: new Date().toISOString(),
        isFake: true,
      };
      setQueue((prev) => [newOrder, ...prev]);
      setNewArrival(true);
      setOrderTimes((prev) => ({ ...prev, [newOrder.id]: Date.now() }));
      setTimeout(() => setNewArrival(false), 3000);
    };

    // Add first fake order after 3s, then every 15-25s
    const first = setTimeout(addFake, 3000);
    timerRef.current = setInterval(addFake, 15000 + Math.random() * 10000);
    return () => { clearTimeout(first); if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Update order timer every second
  useEffect(() => {
    const t = setInterval(() => setOrderTimes((prev) => ({ ...prev })), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setStats({
      pending: queue.filter((q) => q.status === 'PENDING').length,
      preparing: queue.filter((q) => q.status === 'PREPARING').length,
      ready: queue.filter((q) => q.status === 'READY').length,
    });
  }, [queue]);

  const action = async (id: string, act: string) => {
    try { await api.kdsAction(id, act, token); load(); } catch { /* ignore */ }
    // Also update fake orders locally
    setQueue((prev) => prev.map((q) => {
      if (q.id !== id) return q;
      if (act === 'start') return { ...q, status: 'PREPARING' };
      if (act === 'ready') return { ...q, status: 'READY' };
      if (act === 'served') return { ...q, status: 'SERVED' };
      return q;
    }));
    if (act === 'served') {
      setTimeout(() => setQueue((prev) => prev.filter((q) => q.id !== id)), 2000);
    }
  };

  const elapsed = (id: string) => {
    const start = orderTimes[id] || Date.now();
    const secs = Math.floor((Date.now() - start) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header with notification */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-extrabold text-lg">Kitchen Display</h2>
          {newArrival && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">NEW</span>}
        </div>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="bg-stone-100 px-2 py-1 rounded-full">Pending {stats.pending}</span>
          <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Prep {stats.preparing}</span>
          <span className="bg-green-50 text-green-600 px-2 py-1 rounded-full">Ready {stats.ready}</span>
        </div>
      </div>

      {/* New order sound visual */}
      {newArrival && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 animate-pulse">
          <span className="text-xl">🔔</span>
          <p className="text-sm font-bold text-red-700">New order received! Please check the queue.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {queue.filter((q) => q.status !== 'SERVED').map((q: any) => (
          <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-2 ${q.status === 'PREPARING' ? 'border-amber-300' : q.status === 'READY' ? 'border-green-300' : newArrival && q.isFake ? 'border-red-300 shadow-md' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">{q.order?.orderNumber || 'POS Order'}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400 font-mono">{elapsed(q.id)}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[q.status] || 'bg-stone-100'}`}>{q.status}</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs">{q.order?.type} · {q.items?.length ?? 0} items</p>
            <div className="space-y-1">
              {(q.items || []).map((it: any, idx: number) => (
                <div key={idx} className="text-xs flex justify-between">
                  <span>{it.product?.name || it.name} × {it.quantity}</span>
                  {it.instructions && <span className="text-amber-600 text-[10px]">{it.instructions}</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              {q.status === 'PENDING' && <button onClick={() => action(q.id, 'start')} className="flex-1 bg-amber-500 text-white font-bold rounded-lg py-2 text-xs">Start Cooking</button>}
              {q.status === 'PREPARING' && <button onClick={() => action(q.id, 'ready')} className="flex-1 bg-green-500 text-white font-bold rounded-lg py-2 text-xs">Mark Ready</button>}
              {q.status === 'READY' && <button onClick={() => action(q.id, 'served')} className="flex-1 bg-slate-800 text-white font-bold rounded-lg py-2 text-xs">Served</button>}
            </div>
          </div>
        ))}
      </div>
      {queue.filter((q) => q.status !== 'SERVED').length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">👨‍🍳</p>
          <p className="text-sm font-bold">Kitchen queue empty</p>
          <p className="text-xs mt-1">Waiting for new orders...</p>
        </div>
      )}
    </div>
  );
}
