import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

export default function Earnings() {
  const [earnings, setEarnings] = useState<any[]>([]);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(`${API}/riders/me/earnings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setEarnings).catch(() => setEarnings([]));
  }, []);

  const total = earnings.reduce((s: number, e: any) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Earnings</h1>
      <div className="bg-brand-500 text-white rounded-2xl p-5">
        <p className="text-brand-100 text-sm font-medium">Total Earnings</p>
        <p className="text-3xl font-extrabold mt-1">Rs. {total.toLocaleString()}</p>
      </div>
      <div className="space-y-3">
        {earnings.map((e: any) => (
          <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{e.order?.orderNumber ?? 'Order'}</p>
              <p className="text-slate-500 text-xs">{new Date(e.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`text-sm font-bold ${e.status === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>Rs. {Number(e.amount).toLocaleString()}</span>
          </div>
        ))}
        {earnings.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No earnings yet</p>}
      </div>
    </div>
  );
}
