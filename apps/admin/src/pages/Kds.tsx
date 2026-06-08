import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';
const STATUS = { QUEUED: 'bg-stone-100 text-stone-600', PREPARING: 'bg-amber-50 text-amber-600', READY: 'bg-green-50 text-green-600', SERVED: 'bg-slate-100 text-slate-500' };

export default function KdsPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const branchId = 'demo-branch';

  const load = () => {
    fetch(`${API}/kds/queue?branchId=${branchId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.ok ? r.json() : []).then(setQueue).catch(() => setQueue([]));
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const action = async (id: string, act: 'start' | 'ready' | 'served') => {
    await fetch(`${API}/kds/${id}/${act}`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Kitchen Display</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {queue.map(q => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">{q.order?.orderNumber}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS[q.status as keyof typeof STATUS] ?? 'bg-stone-100'}`}>{q.status}</span>
            </div>
            <p className="text-slate-500 text-sm">{q.order?.type} · {q.order?.items?.length} items</p>
            <div className="mt-4 flex gap-2">
              {q.status === 'QUEUED' && <button onClick={() => action(q.id, 'start')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg py-2 transition">Start</button>}
              {q.status === 'PREPARING' && <button onClick={() => action(q.id, 'ready')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg py-2 transition">Ready</button>}
              {q.status === 'READY' && <button onClick={() => action(q.id, 'served')} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg py-2 transition">Served</button>}
            </div>
          </div>
        ))}
        {queue.length === 0 && <p className="col-span-full text-center text-slate-400 py-12">Kitchen queue empty</p>}
      </div>
    </div>
  );
}
