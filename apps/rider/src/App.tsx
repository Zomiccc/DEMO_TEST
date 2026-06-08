import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';

export default function App() {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl">
      <main className="flex-1 overflow-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <nav className="flex border-t border-slate-200 bg-white">
        {[
          { path: '/', label: 'Orders', icon: '📦' },
          { path: '/earnings', label: 'Earnings', icon: '💰' },
          { path: '/profile', label: 'Profile', icon: '👤' },
        ].map(n => (
          <NavLink key={n.path} to={n.path} end className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition ${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
