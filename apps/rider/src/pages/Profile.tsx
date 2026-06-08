import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

export default function Profile() {
  const [rider, setRider] = useState<any>(null);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(`${API}/riders/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(setRider).catch(() => {});
  }, []);

  if (!rider) return <p className="text-center text-slate-400 py-20">Loading...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Profile</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-brand-100 grid place-items-center text-2xl">🛵</div>
          <div>
            <p className="font-bold">{rider.user?.fullName ?? 'Rider'}</p>
            <p className="text-slate-500 text-sm">{rider.user?.phone ?? ''}</p>
          </div>
        </div>
        <div className="border-t pt-3 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium">{rider.vehicleType ?? 'Bike'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Plate</span><span className="font-medium">{rider.vehicleNumber ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`font-medium ${rider.status === 'APPROVED' ? 'text-green-600' : 'text-amber-600'}`}>{rider.status}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Rating</span><span className="font-medium">{rider.rating ? Number(rider.rating).toFixed(1) : '—'} ⭐</span></div>
        </div>
      </div>
    </div>
  );
}
