'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white grid place-items-center font-extrabold text-lg">T</div>
          <span className="font-extrabold text-xl tracking-tight">Tandoor</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <Link href="/" className="hover:text-brand-600 transition">Menu</Link>
          <Link href="/orders" className="hover:text-brand-600 transition">Orders</Link>
          <Link href="/login" className="hover:text-brand-600 transition">Account</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition">
            Cart
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-2 text-sm font-medium text-stone-600">
          <Link href="/" className="block py-2" onClick={() => setMenuOpen(false)}>Menu</Link>
          <Link href="/orders" className="block py-2" onClick={() => setMenuOpen(false)}>Orders</Link>
          <Link href="/login" className="block py-2" onClick={() => setMenuOpen(false)}>Account</Link>
        </div>
      )}
    </header>
  );
}
