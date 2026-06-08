import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { api, rs } from '../api';
import L from 'leaflet';

const SCOLORS: Record<string, string> = {
  ASSIGNED: 'bg-blue-50 text-blue-600',
  PICKED_UP: 'bg-amber-50 text-amber-600',
  ON_THE_WAY: 'bg-purple-50 text-purple-600',
  DELIVERED: 'bg-green-50 text-green-600',
};

const riderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 15); }, [center, map]);
  return null;
}

export default function RiderView({ screen, token }: { screen: string; token: string }) {
  const [online, setOnline] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [rider, setRider] = useState<any>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const watchRef = useRef<number | null>(null);

  const load = async () => {
    try {
      const data = await api.riderMe(token);
      setRider(data.rider);
      setOrders(data.activeOrders || []);
      setOnline(data.rider?.isOnline ?? false);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (screen === 'earnings') {
      api.riderEarnings(token).then(setEarnings).catch(() => setEarnings([]));
    }
  }, [screen, token]);

  useEffect(() => {
    if (!online) { if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; } return; }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLoc({ lat: latitude, lng: longitude });
        api.riderLocation({ lat: latitude, lng: longitude, heading: pos.coords.heading || undefined, speed: pos.coords.speed || undefined }, token).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    );
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, [online, token]);

  const toggle = async () => {
    try {
      await api.riderOnline(!online, token);
      setOnline((o) => !o);
    } catch { alert('Failed to toggle status'); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.updateOrderStatus(id, status, token); load(); } catch { alert('Failed to update status'); }
  };

  if (screen === 'earnings') {
    const total = earnings.reduce((s: number, e: any) => s + Number(e.amount), 0);
    return (
      <div className="p-4 space-y-4">
        <div className="bg-brand-500 text-white rounded-2xl p-5">
          <p className="text-brand-100 text-xs font-semibold">Total Earnings</p>
          <p className="text-3xl font-extrabold mt-1">{rs(total)}</p>
        </div>
        {earnings.map((e: any) => (
          <div key={e.id} className="flex justify-between bg-white rounded-xl border border-slate-200 p-3">
            <div>
              <p className="font-semibold text-sm">{e.order?.orderNumber ?? 'Order'}</p>
              <p className="text-slate-500 text-xs">{new Date(e.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="text-sm font-bold text-green-600">{rs(Number(e.amount))}</span>
          </div>
        ))}
        {earnings.length === 0 && <p className="text-center text-slate-400 py-10">No earnings yet</p>}
      </div>
    );
  }

  if (screen === 'profile') {
    if (!rider) return <p className="text-center text-slate-400 py-20">Loading...</p>;
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-brand-100 grid place-items-center text-3xl">🛵</div>
          <div>
            <p className="font-bold text-lg">{rider.user?.fullName ?? 'Rider'}</p>
            <p className="text-slate-500 text-sm">{rider.user?.phone}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium">{rider.vehicleType ?? 'Bike'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Plate</span><span className="font-medium">{rider.vehiclePlate}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`font-medium ${rider.status === 'APPROVED' ? 'text-green-600' : 'text-amber-600'}`}>{rider.status}</span></div>
          {loc && <div className="flex justify-between"><span className="text-slate-500">GPS</span><span className="font-medium text-xs">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span></div>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-64">
          {loc ? (
            <MapContainer center={[loc.lat, loc.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapUpdater center={[loc.lat, loc.lng]} />
              <Marker position={[loc.lat, loc.lng]} icon={riderIcon}><Popup>Your location</Popup></Marker>
            </MapContainer>
          ) : <p className="text-center text-slate-400 py-20">GPS not available</p>}
        </div>
      </div>
    );
  }

  if (selectedOrder) {
    const o = selectedOrder;
    const dest = o.address;
    const center: [number, number] = loc ? [loc.lat, loc.lng] : [31.5204, 74.3587];
    return (
      <div className="p-4 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedOrder(null)} className="text-sm text-stone-500 hover:text-brand-600 font-medium">← Back</button>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SCOLORS[o.status] || 'bg-stone-100'}`}>{o.status}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="font-bold text-sm">{o.orderNumber}</p>
          <p className="text-slate-500 text-xs">{o.type} · {o.items?.length ?? 0} items · {rs(Number(o.total))}</p>
          {dest && <p className="text-slate-500 text-xs mt-1">📍 {dest.line1}, {dest.city}</p>}
          <div className="mt-3 flex gap-2">
            {o.status === 'ASSIGNED' && <button onClick={() => updateStatus(o.id, 'PICKED_UP')} className="flex-1 bg-brand-500 text-white font-bold rounded-xl py-2 text-xs transition">Picked Up</button>}
            {o.status === 'PICKED_UP' && <button onClick={() => updateStatus(o.id, 'ON_THE_WAY')} className="flex-1 bg-brand-500 text-white font-bold rounded-xl py-2 text-xs transition">On The Way</button>}
            {o.status === 'ON_THE_WAY' && <button onClick={() => updateStatus(o.id, 'DELIVERED')} className="flex-1 bg-green-500 text-white font-bold rounded-xl py-2 text-xs transition">Delivered</button>}
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[300px]">
          <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {loc && <Marker position={[loc.lat, loc.lng]} icon={riderIcon}><Popup>You are here</Popup></Marker>}
            {dest?.lat && dest?.lng && <Marker position={[dest.lat, dest.lng]} icon={destIcon}><Popup>Delivery address</Popup></Marker>}
          </MapContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg">Active Orders</h2>
        <button onClick={toggle} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${online ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {online ? '● Online' : '○ Offline'}
        </button>
      </div>
      {loc && <p className="text-xs text-slate-400">GPS: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>}
      {orders.map((o: any) => (
        <div key={o.id} onClick={() => setSelectedOrder(o)} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 cursor-pointer hover:shadow-md transition">
          <div className="flex justify-between">
            <span className="font-bold text-sm">{o.orderNumber}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCOLORS[o.status] || 'bg-stone-100'}`}>{o.status}</span>
          </div>
          <p className="text-slate-500 text-xs">{o.type} · {o.items?.length ?? 0} items · {rs(Number(o.total))}</p>
          {o.address && <p className="text-slate-500 text-xs">📍 {o.address.line1}</p>}
          <div className="flex gap-2">
            {o.status === 'ASSIGNED' && <button onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'PICKED_UP'); }} className="flex-1 bg-brand-500 text-white font-bold rounded-xl py-2 text-xs transition">Picked Up</button>}
            {o.status === 'PICKED_UP' && <button onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'ON_THE_WAY'); }} className="flex-1 bg-brand-500 text-white font-bold rounded-xl py-2 text-xs transition">On The Way</button>}
            {o.status === 'ON_THE_WAY' && <button onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'DELIVERED'); }} className="flex-1 bg-green-500 text-white font-bold rounded-xl py-2 text-xs transition">Delivered</button>}
          </div>
        </div>
      ))}
      {orders.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm">No active orders</p>
          {online && <p className="text-xs mt-2">You're online and ready for assignments</p>}
        </div>
      )}
    </div>
  );
}
