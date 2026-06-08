import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';
const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-blue-50 text-blue-600',
  PICKED_UP: 'bg-amber-50 text-amber-600',
  ON_THE_WAY: 'bg-purple-50 text-purple-600',
  DELIVERED: 'bg-green-50 text-green-600',
};

export default function Home() {
  const [online, setOnline] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  const token = localStorage.getItem('token') || '';

  const toggleOnline = async () => {
    await fetch(`${API}/riders/me/online`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    setOnline(!online);
  };

  const loadOrders = () => {
    fetch(`${API}/riders/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.activeOrders) setOrders(d.activeOrders); })
      .catch(() => {});
  };

  useEffect(() => {
    loadOrders();
    const t = setInterval(loadOrders, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!online) return;
    const id = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setLoc({ lat: latitude, lng: longitude });
        fetch(`${API}/riders/me/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: latitude, lng: longitude }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [online]);

  const updateStatus = async (orderId: string, status: string) => {
    await fetch(`${API}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Active Orders</h1>
        <button onClick={toggleOnline} className={`px-4 py-2 rounded-xl text-sm font-bold transition ${online ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {online ? '● Online' : '○ Offline'}
        </button>
      </div>
      {loc && <p className="text-xs text-slate-400">GPS: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>}
      {orders.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm">No active orders</p>
        </div>
      ) : (
        orders.map((o: any) => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{o.orderNumber}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-stone-100 text-stone-600'}`}>{o.status}</span>
            </div>
            <p className="text-slate-500 text-sm">{o.type} · {o.items?.length ?? 0} items · Rs. {Number(o.total).toLocaleString()}</p>
            <div className="flex gap-2">
              {o.status === 'ASSIGNED' && <button onClick={() => updateStatus(o.id, 'PICKED_UP')} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-2.5 text-sm transition">Picked Up</button>}
              {o.status === 'PICKED_UP' && <button onClick={() => updateStatus(o.id, 'ON_THE_WAY')} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-2.5 text-sm transition">On The Way</button>}
              {o.status === 'ON_THE_WAY' && <button onClick={() => updateStatus(o.id, 'DELIVERED')} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-2.5 text-sm transition">Delivered</button>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
