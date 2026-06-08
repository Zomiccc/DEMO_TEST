import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OrdersPage from './pages/Orders';
import RidersPage from './pages/Riders';
import InventoryPage from './pages/Inventory';
import KdsPage from './pages/Kds';
import CampaignsPage from './pages/Campaigns';

const nav = [
  { path: '/', label: 'Dashboard' },
  { path: '/orders', label: 'Orders' },
  { path: '/riders', label: 'Riders' },
  { path: '/inventory', label: 'Inventory' },
  { path: '/kds', label: 'KDS' },
  { path: '/campaigns', label: 'Campaigns' },
];

export default function App() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="p-5 font-extrabold text-lg">Tandoor Admin</div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(n => (
            <NavLink key={n.path} to={n.path} end className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/kds" element={<KdsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
        </Routes>
      </main>
    </div>
  );
}
