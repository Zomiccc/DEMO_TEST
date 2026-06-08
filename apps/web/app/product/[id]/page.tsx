'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { api, Product } from '@/lib/api';

const EMOJI = ['🍔','🍕','🍟','🍗','🥤','🌮','🍜','🥗'];
const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (id) api.product(id as string).then(setProduct).catch(() => setProduct(null));
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    const raw = localStorage.getItem('cart');
    const cart: CartItem[] = raw ? JSON.parse(raw) : [];
    const existing = cart.find(i => i.productId === product.id);
    if (existing) existing.qty += qty;
    else cart.push({ productId: product.id, name: product.name, price: product.basePrice, qty });
    localStorage.setItem('cart', JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!product) return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-20 text-center text-stone-400">Loading...</main>
    </>
  );

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-stone-500 hover:text-brand-600 mb-4 inline-block">← Back to menu</Link>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="h-56 bg-gradient-to-br from-stone-100 to-stone-200 grid place-items-center text-8xl">{EMOJI[0]}</div>
          <div className="p-6">
            <h1 className="text-2xl font-extrabold">{product.name}</h1>
            <p className="text-stone-500 mt-2">{product.description}</p>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-lg bg-stone-100 font-bold text-lg">−</button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-9 h-9 rounded-lg bg-stone-100 font-bold text-lg">+</button>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-2xl font-extrabold text-brand-600">{rs(product.basePrice * qty)}</span>
              <button onClick={addToCart} className="bg-stone-900 hover:bg-brand-600 text-white font-semibold rounded-xl px-6 py-3 transition">
                {added ? 'Added!' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
