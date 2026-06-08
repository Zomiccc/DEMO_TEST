import { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600',
  READY: 'bg-green-50 text-green-600',
};

export default function KitchenView({ token }: { token: string }) {
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0 });

  const load = async () => {
    try {
      const data = await api.kdsQueue(token);
      setQueue(data);
      setStats({
        pending: data.filter((q: any) => q.status === 'PENDING').length,
        preparing: data.filter((q: any) => q.status === 'PREPARING').length,
        ready: data.filter((q: any) => q.status === 'READY').length,
      });
    } catch { setQueue([]); }
  };

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const action = async (id: string, act: string) => {
    try { await api.kdsAction(id, act, token); load(); } catch { alert('Failed'); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg">Kitchen Display</h2>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="bg-stone-100 px-2 py-1 rounded-full">Pending {stats.pending}</span>
          <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-full">Prep {stats.preparing}</span>
          <span className="bg-green-50 text-green-600 px-2 py-1 rounded-full">Ready {stats.ready}</span>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {queue.map((q: any) => (
          <div key={q.id} className={`bg-white rounded-xl border p-4 space-y-2 ${q.status === 'PREPARING' ? 'border-amber-300' : q.status === 'READY' ? 'border-green-300' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">{q.order?.orderNumber || 'POS Order'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[q.status] || 'bg-stone-100'}`}>{q.status}</span>
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
              {q.status === 'PENDING' && <button onClick={() => action(q.id, 'start')} className="flex-1 bg-amber-500 text-white font-bold rounded-lg py-2 text-xs">Start</button>}
              {q.status === 'PREPARING' && <button onClick={() => action(q.id, 'ready')} className="flex-1 bg-green-500 text-white font-bold rounded-lg py-2 text-xs">Ready</button>}
              {q.status === 'READY' && <button onClick={() => action(q.id, 'served')} className="flex-1 bg-slate-800 text-white font-bold rounded-lg py-2 text-xs">Served</button>}
            </div>
          </div>
        ))}
      </div>
      {queue.length === 0 && <p className="text-center text-slate-400 py-20">Kitchen queue empty</p>}
    </div>
  );
}
