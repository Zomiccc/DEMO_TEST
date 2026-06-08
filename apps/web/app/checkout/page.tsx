'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { api } from '@/lib/api';

const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [token, setToken] = useState('');
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('cart');
    if (raw) setItems(JSON.parse(raw));
    setToken(localStorage.getItem('token') ?? '');
  }, []);

  const calc = async () => {
    if (!token || items.length === 0) return;
    setLoading(true);
    try {
      const res = await api.checkout({
        branchId: 'demo-branch',
        type: 'DELIVERY',
        items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
      }, token);
      setPricing(res);
    } catch { /* demo fallback */ }
    setLoading(false);
  };

  const place = async () => {
    if (!token) { alert('Please log in first'); router.push('/login'); return; }
    setLoading(true);
    try {
      const order = await api.placeOrder({
        branchId: 'demo-branch',
        type: 'DELIVERY',
        items: items.map(i => ({ productId: i.productId, quantity: i.qty })),
        paymentMethod: 'CASH_ON_DELIVERY',
      }, token);
      localStorage.removeItem('cart');
      alert(`Order placed! ${order.orderNumber}`);
      router.push('/orders');
    } catch (e: any) { alert(e.message ?? 'Failed to place order'); }
    setLoading(false);
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold mb-6">Checkout</h1>
        {items.length === 0 ? (
          <p className="text-stone-400">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {items.map(i => (
              <div key={i.productId} className="flex justify-between bg-white rounded-xl border border-stone-200 p-4">
                <span className="font-medium text-sm">{i.name} × {i.qty}</span>
                <span className="font-semibold text-sm">{rs(i.qty * i.price)}</span>
              </div>
            ))}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-semibold">{rs(pricing?.subtotal ?? subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-stone-500">Delivery</span><span className="font-semibold text-green-600">{pricing?.deliveryFee ? rs(pricing.deliveryFee) : 'Free'}</span></div>
              {pricing?.discount > 0 && <div className="flex justify-between text-sm"><span className="text-stone-500">Discount</span><span className="font-semibold text-green-600">−{rs(pricing.discount)}</span></div>}
              <div className="flex justify-between text-base font-extrabold border-t pt-3"><span>Total</span><span>{rs(pricing?.total ?? subtotal)}</span></div>
              <button onClick={place} disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition">
                {loading ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
