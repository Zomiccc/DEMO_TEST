'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('cart');
    if (raw) setItems(JSON.parse(raw));
  }, []);

  const save = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const changeQty = (id: string, d: number) => {
    const next = items.map(i => i.productId === id ? { ...i, qty: Math.max(1, i.qty + d) } : i).filter(i => i.qty > 0);
    save(next);
  };

  const remove = (id: string) => save(items.filter(i => i.productId !== id));

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-6">Your Cart</h1>
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 mb-4">Your cart is empty.</p>
            <Link href="/" className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl px-6 py-3 transition">Browse Menu</Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map(i => (
                <div key={i.productId} className="flex items-center gap-4 bg-white rounded-2xl border border-stone-200 p-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 grid place-items-center text-2xl">🍽️</div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{i.name}</p>
                    <p className="text-stone-500 text-xs">{rs(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => changeQty(i.productId, -1)} className="w-7 h-7 rounded-lg bg-stone-100 font-bold">−</button>
                    <span className="w-5 text-center text-sm font-semibold">{i.qty}</span>
                    <button onClick={() => changeQty(i.productId, 1)} className="w-7 h-7 rounded-lg bg-stone-100 font-bold">+</button>
                  </div>
                  <button onClick={() => remove(i.productId)} className="text-stone-400 hover:text-red-500 text-sm">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-semibold">{rs(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Delivery (0–7 km)</span><span className="font-semibold text-green-600">Free</span></div>
              <div className="flex justify-between text-base font-extrabold border-t pt-3"><span>Total</span><span>{rs(subtotal)}</span></div>
              <Link href="/checkout" className="block w-full text-center bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-3 transition">Proceed to Checkout</Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
