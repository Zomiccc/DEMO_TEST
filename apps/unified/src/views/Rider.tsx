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

const FAKE_ORDERS = [
  { id: 'fo1', orderNumber: 'RMS-7821', type: 'DELIVERY', total: 1850, items: [{ name: 'Chicken Biryani', qty: 2 }, { name: 'Naan', qty: 4 }], distance: '2.3 km', time: '12 min', earnings: 180, address: { line1: 'Block C, Gulberg III', city: 'Lahore', lat: 31.5124, lng: 74.3527 } },
  { id: 'fo2', orderNumber: 'RMS-7823', type: 'DELIVERY', total: 950, items: [{ name: 'Zinger Burger', qty: 1 }, { name: 'Fries', qty: 1 }], distance: '1.1 km', time: '5 min', earnings: 120, address: { line1: 'Model Town Park', city: 'Lahore', lat: 31.5089, lng: 74.3245 } },
  { id: 'fo3', orderNumber: 'RMS-7825', type: 'DELIVERY', total: 2450, items: [{ name: 'Family Deal', qty: 1 }], distance: '4.2 km', time: '18 min', earnings: 250, address: { line1: 'DHA Phase 4', city: 'Lahore', lat: 31.4789, lng: 74.3889 } },
];

export default function RiderView({ screen, token }: { screen: string; token: string }) {
  const [online, setOnline] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [rider, setRider] = useState<any>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const [acceptedOrders, setAcceptedOrders] = useState<any[]>([]);
  const [todayStats] = useState({ trips: 8, earnings: 1840, onlineHours: '4h 12m', rating: 4.9 });
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

  useEffect(() => {
    if (!online) { setIncomingOrder(null); return; }
    const timer = setTimeout(() => {
      const random = FAKE_ORDERS[Math.floor(Math.random() * FAKE_ORDERS.length)];
      setIncomingOrder({ ...random, id: random.id + '-' + Date.now() });
    }, 3000);
    return () => clearTimeout(timer);
  }, [online]);

  const toggle = async () => {
    try {
      await api.riderOnline(!online, token);
      setOnline((o) => !o);
    } catch { alert('Failed to toggle status'); }
  };

  const acceptOrder = () => {
    if (incomingOrder) {
      setAcceptedOrders((prev) => [{ ...incomingOrder, status: 'ASSIGNED', acceptedAt: Date.now() }, ...prev]);
      setIncomingOrder(null);
    }
  };

  const declineOrder = () => {
    setIncomingOrder(null);
    setTimeout(() => {
      if (online) {
        const random = FAKE_ORDERS[Math.floor(Math.random() * FAKE_ORDERS.length)];
        setIncomingOrder({ ...random, id: random.id + '-' + Date.now() });
      }
    }, 8000);
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.updateOrderStatus(id, status, token); load(); } catch { alert('Failed to update status'); }
    setAcceptedOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
  };

  if (screen === 'earnings') {
    const total = earnings.reduce((s: number, e: any) => s + Number(e.amount), 0);
    return (
      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-5 shadow-lg">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Today is Earnings</p>
          <p className="text-3xl font-extrabold mt-1">{rs(total || todayStats.earnings)}</p>
          <div className="flex gap-4 mt-3">
            <div><p className="text-white/70 text-[10px]">Trips</p><p className="font-bold text-sm">{todayStats.trips}</p></div>
            <div><p className="text-white/70 text-[10px]">Online</p><p className="font-bold text-sm">{todayStats.onlineHours}</p></div>
            <div><p className="text-white/70 text-[10px]">Rating</p><p className="font-bold text-sm">{todayStats.rating}</p></div>
          </div>
        </div>
        <p className="text-sm font-bold text-slate-700">Recent Trips</p>
        {[
          { orderNumber: 'RMS-7815', amount: 180, time: '2:34 PM', dest: 'Gulberg III' },
          { orderNumber: 'RMS-7812', amount: 250, time: '1:48 PM', dest: 'DHA Phase 3' },
          { orderNumber: 'RMS-7809', amount: 120, time: '12:15 PM', dest: 'Model Town' },
          { orderNumber: 'RMS-7805', amount: 200, time: '11:30 AM', dest: 'Johar Town' },
        ].map((t, i) => (
          <div key={i} className="flex justify-between bg-white rounded-xl border border-slate-200 p-3">
            <div><p className="font-semibold text-sm">{t.orderNumber}</p><p className="text-slate-500 text-xs">{t.dest} · {t.time}</p></div>
            <span className="text-sm font-bold text-green-600">+{rs(t.amount)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (screen === 'profile') {
    if (!rider) return <p className="text-center text-slate-400 py-20">Loading...</p>;
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-800 grid place-items-center text-3xl text-white">🛵</div>
          <div>
            <p className="font-bold text-lg">{rider.user?.fullName ?? 'Rider'}</p>
            <p className="text-slate-500 text-sm">{rider.user?.phone}</p>
            <div className="flex items-center gap-1 mt-0.5"><span className="text-amber-400 text-xs">★</span><span className="text-xs font-bold text-slate-600">{todayStats.rating}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-medium">{rider.vehicleType ?? 'Honda CD70'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Plate</span><span className="font-medium">{rider.vehiclePlate}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`font-medium ${rider.status === 'APPROVED' ? 'text-green-600' : 'text-amber-600'}`}>{rider.status}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Completed Trips</span><span className="font-medium">{todayStats.trips}</span></div>
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
    const progress = o.status === 'ASSIGNED' ? 10 : o.status === 'PICKED_UP' ? 40 : o.status === 'ON_THE_WAY' ? 70 : 100;
    return (
      <div className="p-4 space-y-4 h-full flex flex-col">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedOrder(null)} className="text-sm text-stone-500 hover:text-brand-600 font-medium">← Back</button>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SCOLORS[o.status] || 'bg-stone-100'}`}>{o.status}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span className={progress >= 10 ? 'text-blue-600' : ''}>Pickup</span>
            <span className={progress >= 40 ? 'text-amber-600' : ''}>Collected</span>
            <span className={progress >= 70 ? 'text-purple-600' : ''}>En Route</span>
            <span className={progress >= 100 ? 'text-green-600' : ''}>Delivered</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500" style={{ width: progress + '%' }} />
          </div>
          <p className="font-bold text-sm">{o.orderNumber}</p>
          <p className="text-slate-500 text-xs">{o.type} · {o.items?.length ?? 0} items · {rs(Number(o.total))}</p>
          {dest && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-bold text-slate-700">📍 Delivery Address</p>
              <p className="text-sm text-slate-800">{dest.line1}</p>
              <p className="text-xs text-slate-500">{dest.city}</p>
            </div>
          )}
          <div className="flex gap-2">
            {o.status === 'ASSIGNED' && <button onClick={() => updateStatus(o.id, 'PICKED_UP')} className="flex-1 bg-blue-500 text-white font-bold rounded-xl py-2.5 text-sm transition">Mark Picked Up</button>}
            {o.status === 'PICKED_UP' && <button onClick={() => updateStatus(o.id, 'ON_THE_WAY')} className="flex-1 bg-purple-500 text-white font-bold rounded-xl py-2.5 text-sm transition">Start Delivery</button>}
            {o.status === 'ON_THE_WAY' && <button onClick={() => updateStatus(o.id, 'DELIVERED')} className="flex-1 bg-green-500 text-white font-bold rounded-xl py-2.5 text-sm transition">Mark Delivered</button>}
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden min-h-[250px]">
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
      {/* Big Online Toggle */}
      <div className={`rounded-2xl p-5 text-center transition ${online ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20' : 'bg-slate-200 text-slate-500'}`}>
        <div className="text-4xl mb-2">{online ? '🛵' : '😴'}</div>
        <p className="text-lg font-extrabold">{online ? 'You are Online' : 'You are Offline'}</p>
        <p className="text-xs opacity-70 mt-1">{online ? 'Searching for delivery requests nearby...' : 'Go online to receive orders'}</p>
        <button onClick={toggle} className={`mt-3 px-8 py-3 rounded-xl text-sm font-bold transition ${online ? 'bg-white text-green-600 hover:bg-green-50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
          {online ? 'GO OFFLINE' : 'GO ONLINE'}
        </button>
        {loc && online && (
          <p className="text-[10px] opacity-60 mt-2 font-mono">📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
        )}
      </div>

      {/* Today's Stats */}
      {online && (
        <div className="grid grid-cols-3 gap-2">
          {[{ label: 'Trips', value: todayStats.trips }, { label: 'Earnings', value: 'Rs. ' + todayStats.earnings }, { label: 'Online', value: todayStats.onlineHours }].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
              <p className="text-sm font-extrabold text-slate-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Incoming Order Popup */}
      {online && incomingOrder && (
        <div className="bg-white rounded-2xl border-2 border-blue-500 p-4 space-y-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-sm font-extrabold text-blue-700">New Delivery Request!</p>
              <p className="text-xs text-slate-500">{incomingOrder.distance} away · {incomingOrder.time} drive</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-bold text-slate-700">{incomingOrder.orderNumber}</p>
            <p className="text-xs text-slate-500">{incomingOrder.items.map((i: any) => i.name + ' x' + i.qty).join(', ')}</p>
            <p className="text-xs text-slate-500">📍 {incomingOrder.address.line1}</p>
            <p className="text-sm font-bold text-green-600">You will earn: {rs(incomingOrder.earnings)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={declineOrder} className="flex-1 bg-slate-200 text-slate-600 font-bold rounded-xl py-2.5 text-sm">Decline</button>
            <button onClick={acceptOrder} className="flex-[2] bg-blue-500 text-white font-bold rounded-xl py-2.5 text-sm">Accept</button>
          </div>
        </div>
      )}

      {/* Accepted Orders */}
      {acceptedOrders.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700">Your Deliveries</p>
          {acceptedOrders.map((o: any) => (
            <div key={o.id} onClick={() => setSelectedOrder(o)} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 cursor-pointer hover:shadow-md transition">
              <div className="flex justify-between">
                <span className="font-bold text-sm">{o.orderNumber}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCOLORS[o.status] || 'bg-stone-100'}`}>{o.status}</span>
              </div>
              <p className="text-slate-500 text-xs">📍 {o.address.line1}</p>
              <p className="text-xs font-bold text-green-600">Earnings: {rs(o.earnings)}</p>
              <div className="flex gap-2">
                {o.status === 'ASSIGNED' && <button onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'PICKED_UP'); }} className="flex-1 bg-blue-500 text-white font-bold rounded-xl py-2 text-xs transition">Pick Up</button>}
                {o.status === 'PICKED_UP' && <button onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'ON_THE_WAY'); }} className="flex-1 bg-purple-500 text-white font-bold rounded-xl py-2 text-xs transition">Start Delivery</button>}
                {o.status === 'ON_THE_WAY' && <button onClick={(e) => { e.stopPropagation(); updateStatus(o.id, 'DELIVERED'); }} className="flex-1 bg-green-500 text-white font-bold rounded-xl py-2 text-xs transition">Delivered</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Searching for orders */}
      {online && !incomingOrder && acceptedOrders.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold">Searching for orders...</p>
          <p className="text-xs mt-1">Stay near busy areas for more requests</p>
        </div>
      )}

      {/* Offline empty state */}
      {!online && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-sm font-bold">You are offline</p>
          <p className="text-xs mt-1">Go online to start receiving delivery requests</p>
        </div>
      )}
    </div>
  );
}
