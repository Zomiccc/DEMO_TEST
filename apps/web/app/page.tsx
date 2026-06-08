'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { api, Category, Product } from '@/lib/api';

const EMOJI = ['🍔','🍕','🍟','🍗','🥤','🌮','🍜','🥗'];
const rs = (n: number) => 'Rs. ' + Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });

export default function HomePage() {
  const [cats, setCats] = useState<Category[]>([{ id: 'all', name: 'All', slug: 'all' }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories().then(setCats).catch(() => setCats([{ id: 'all', name: 'All', slug: 'all' }]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { search };
    if (activeCat !== 'all') params.categoryId = activeCat;
    api.products(params).then(d => setProducts(d.items)).catch(() => setProducts([])).finally(() => setLoading(false));
  }, [activeCat, search]);

  const filtered = products.filter(p => activeCat === 'all' || p.categoryId === activeCat);

  return (
    <>
      <Header />
      <section className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <p className="uppercase tracking-widest text-brand-100 text-xs font-semibold mb-3">Free delivery within 7 km</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight max-w-2xl">Crave it. Tap it. <br/>We deliver it hot.</h1>
          <p className="mt-4 text-brand-100 max-w-lg">Fresh from the kitchen to your door. Real-time tracking, wallet, and loyalty points.</p>
        </div>
      </section>

      <nav className="bg-white border-b border-stone-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {[{ id: 'all', name: 'All' }, ...cats].map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ${activeCat === c.id ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {c.name}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <input type="text" placeholder="Search dishes..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 max-w-md bg-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <p className="text-stone-500 text-sm">{loading ? 'Loading...' : `${filtered.length} items`}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <Link href={`/product/${p.id}`} key={p.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg transition block">
              <div className="h-32 bg-gradient-to-br from-stone-100 to-stone-200 grid place-items-center text-6xl">{EMOJI[i % EMOJI.length]}</div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold leading-snug">{p.name}</h3>
                  {p.isFeatured && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">★</span>}
                </div>
                <p className="text-stone-500 text-sm mt-1 line-clamp-2 h-10 overflow-hidden">{p.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-extrabold text-brand-600">{rs(p.basePrice)}</span>
                  <span className="bg-stone-900 text-white text-sm font-semibold rounded-lg px-3 py-1.5">View</span>
                </div>
              </div>
            </Link>
          ))}
          {!loading && filtered.length === 0 && <p className="text-stone-400 col-span-full py-12 text-center">No dishes match your search.</p>}
        </div>
      </main>

      <footer className="border-t border-stone-200 py-10 text-center text-stone-400 text-sm">
        Tandoor · Next.js 14 Customer App
      </footer>
    </>
  );
}
