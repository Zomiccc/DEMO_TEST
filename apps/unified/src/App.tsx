import { useEffect, useState } from 'react';
import CustomerView from './views/Customer';
import RiderView from './views/Rider';
import CashierView from './views/Cashier';
import KitchenView from './views/Kitchen';
import ManagerView from './views/Manager';
import { api } from './api';

export type Role = 'CUSTOMER' | 'RIDER' | 'CASHIER' | 'KITCHEN' | 'MANAGER' | 'SUPER_ADMIN';
export const API = '/api';
export const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

function decodeJwt(token: string): any {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function getRoleFromToken(token: string): Role {
  const payload = decodeJwt(token);
  const roles: string[] = payload?.roles || [];
  if (roles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
  if (roles.includes('RESTAURANT_ADMIN')) return 'MANAGER';
  if (roles.includes('RIDER')) return 'RIDER';
  if (roles.includes('CASHIER')) return 'CASHIER';
  if (roles.includes('KITCHEN_STAFF')) return 'KITCHEN';
  return 'CUSTOMER';
}

const TABS: Record<string, { key: string; label: string; icon: string }[]> = {
  CUSTOMER: [{ key: 'home', label: 'Menu', icon: '🍽️' }, { key: 'cart', label: 'Cart', icon: '🛒' }, { key: 'orders', label: 'Orders', icon: '📦' }],
  RIDER: [{ key: 'home', label: 'Orders', icon: '📦' }, { key: 'earnings', label: 'Earnings', icon: '💰' }, { key: 'profile', label: 'Profile', icon: '👤' }],
  CASHIER: [],
  KITCHEN: [],
  MANAGER: [{ key: 'dashboard', label: 'Dash', icon: '📊' }, { key: 'orders', label: 'Orders', icon: '📦' }, { key: 'kds', label: 'KDS', icon: '🔥' }, { key: 'inventory', label: 'Stock', icon: '📦' }],
  SUPER_ADMIN: [{ key: 'dashboard', label: 'Dash', icon: '📊' }, { key: 'orders', label: 'Orders', icon: '📦' }, { key: 'inventory', label: 'Stock', icon: '📦' }],
};

const OFFERS = [
  { code: 'WELCOME20', label: '20% OFF', desc: 'First order discount', color: 'from-pink-500 to-rose-500' },
  { code: 'FAMILY15', label: '15% OFF', desc: 'Family feast deal', color: 'from-violet-500 to-purple-500' },
  { code: 'FREEDEL', label: 'FREE', desc: 'Delivery on orders 1000+', color: 'from-emerald-500 to-teal-500' },
];

export default function App() {
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [screen, setScreen] = useState('home');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOffers, setShowOffers] = useState(true);

  useEffect(() => {
    if (token) {
      const detected = getRoleFromToken(token);
      setRole(detected);
    }
  }, [token]);

  const quickLogin = async (e: string, p: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email: e, password: p });
      setToken(res.accessToken);
      localStorage.setItem('token', res.accessToken);
    } catch (err: any) {
      alert(err.message ?? 'Login failed');
    }
    setLoading(false);
  };

  const submit = async () => {
    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await api.login({ email, password });
        setToken(res.accessToken);
        localStorage.setItem('token', res.accessToken);
      } else {
        const res = await api.register({ email, password, fullName: name, phone });
        setToken(res.accessToken);
        localStorage.setItem('token', res.accessToken);
      }
    } catch (e: any) {
      alert(e.message ?? 'Authentication failed');
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-brand-900">
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white grid place-items-center font-extrabold text-2xl mx-auto shadow-lg shadow-brand-500/30">T</div>
            <h1 className="font-extrabold text-2xl mt-4 text-white tracking-tight">Tandoor</h1>
            <p className="text-stone-400 text-sm mt-1">Restaurant Management & Delivery</p>
          </div>

          {/* Offers Banner */}
          {showOffers && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">🔥 Hot Offers</p>
                <button onClick={() => setShowOffers(false)} className="text-stone-500 text-xs">Hide</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
                {OFFERS.map((o) => (
                  <div key={o.code} className={`snap-start shrink-0 w-36 bg-gradient-to-br ${o.color} rounded-xl p-3 text-white shadow-lg`}>
                    <p className="text-lg font-extrabold">{o.label}</p>
                    <p className="text-[10px] opacity-90 mt-0.5">{o.desc}</p>
                    <p className="text-[10px] font-mono mt-1 opacity-70">{o.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auth Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setTab('login')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${tab === 'login' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'}`}>Log In</button>
              <button onClick={() => setTab('register')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition ${tab === 'register' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'}`}>Sign Up</button>
            </div>
            <div className="space-y-3">
              {tab === 'register' && (
                <>
                  <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <input type="tel" placeholder="Phone (e.g. +923001234567)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </>
              )}
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <button onClick={submit} disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition shadow-lg shadow-brand-500/20">
                {loading ? 'Please wait...' : tab === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </div>

            {/* Quick Login Buttons */}
            <div className="border-t border-stone-100 pt-4 space-y-2">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center">Quick Demo Login</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Customer', email: 'customer@rms.local', pass: 'Customer@123', color: 'bg-blue-50 text-blue-700' },
                  { label: 'Rider', email: 'rider@rms.local', pass: 'Rider@123', color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Cashier', email: 'cashier@rms.local', pass: 'Cashier@123', color: 'bg-amber-50 text-amber-700' },
                  { label: 'Kitchen', email: 'kitchen@rms.local', pass: 'Kitchen@123', color: 'bg-rose-50 text-rose-700' },
                ].map((d) => (
                  <button key={d.label} onClick={() => quickLogin(d.email, d.pass)} disabled={loading}
                    className={`py-2 rounded-xl text-xs font-bold transition ${d.color} hover:shadow-md`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <button onClick={() => quickLogin('superadmin@rms.local', 'SuperAdmin@123')} disabled={loading}
                className="w-full py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition">
                Admin Login
              </button>
            </div>
          </div>

          {/* Fake Stats */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[{ v: '12K+', l: 'Orders' }, { v: '45', l: 'Riders' }, { v: '4.8', l: 'Rating' }].map((s) => (
              <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <p className="text-white font-extrabold text-lg">{s.v}</p>
                <p className="text-stone-400 text-[10px] font-bold uppercase">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tabs = TABS[role] || [];

  return (
    <div className="h-screen flex flex-col max-w-2xl mx-auto bg-stone-50 shadow-2xl">
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 grid place-items-center font-extrabold text-sm text-white">T</div>
          <span className="font-bold text-sm text-stone-800">Tandoor</span>
          <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase">{role.replace('_', ' ')}</span>
        </div>
        <button onClick={() => { setToken(''); localStorage.removeItem('token'); }} className="text-xs text-stone-400 hover:text-red-500 font-medium">Logout</button>
      </header>
      <div className="flex-1 overflow-auto">
        {role === 'CUSTOMER' && <CustomerView screen={screen} token={token} />}
        {role === 'RIDER' && <RiderView screen={screen} token={token} />}
        {role === 'CASHIER' && <CashierView token={token} />}
        {role === 'KITCHEN' && <KitchenView token={token} />}
        {(role === 'MANAGER' || role === 'SUPER_ADMIN') && <ManagerView screen={screen} token={token} />}
      </div>
      {tabs.length > 0 && (
        <nav className="flex border-t border-stone-200 bg-white shrink-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setScreen(t.key)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${screen === t.key ? 'text-brand-600' : 'text-stone-400'}`}>
              <span className="text-lg">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
