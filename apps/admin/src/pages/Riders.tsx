import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

export default function RidersPage() {
  const [riders, setRiders] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/riders/pending`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.ok ? r.json() : []).then(setRiders).catch(() => setRiders([]));
  }, []);

  const approve = async (id: string) => {
    await fetch(`${API}/riders/${id}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    setRiders(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Riders — Pending Approval</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold">Phone</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-left px-4 py-3 font-semibold">Action</th></tr></thead>
          <tbody>
            {riders.map(r => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{r.user?.fullName ?? '—'}</td>
                <td className="px-4 py-3">{r.user?.phone ?? '—'}</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600">{r.status}</span></td>
                <td className="px-4 py-3"><button onClick={() => approve(r.id)} className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition">Approve</button></td>
              </tr>
            ))}
            {riders.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No pending riders</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
