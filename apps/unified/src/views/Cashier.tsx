import { useEffect, useState } from 'react';
import { api, rs, type Product } from '../api';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  variantName?: string;
}

export default function CashierView({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [type, setType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableNumber, setTableNumber] = useState('');
  const [payment, setPayment] = useState<'CASH' | 'CARD' | 'WALLET'>('CASH');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [categories, setCategories] = useState<any[]>([{ id: 'all', name: 'All' }]);
  const [posOrders, setPosOrders] = useState<any[]>([]);

  const TABLES = Array.from({ length: 12 }, (_, i) => ({
    number: String(i + 1),
    name: `Table ${i + 1}`,
    capacity: i < 4 ? 4 : i < 8 ? 6 : 8,
  }));

  useEffect(() => {
    api.products({}).then((d) => setProducts(d.items)).catch(() => setProducts([]));
    api.categories().then((c) => setCategories([{ id: 'all', name: 'All' }, ...c])).catch(() => {});
  }, [token]);

  const filtered = products.filter((p) => {
    const matchesCat = activeCat === 'all' || p.categoryId === activeCat;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const add = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      if (ex) return prev.map((i) => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, price: p.basePrice, qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter((i) => i.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const place = async () => {
    if (cart.length === 0) return;
    if (type === 'DINE_IN' && !tableNumber) { setMsg('Select a table'); return; }
    try {
      const order = await api.posOrder({
        type,
        tableNumber: type === 'DINE_IN' ? tableNumber : undefined,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.qty })),
        paymentMethod: payment,
      }, token);
      setCart([]);
      setPosOrders((prev) => [{ orderNumber: order.orderNumber, total: order.total, status: order.status, createdAt: order.createdAt }, ...prev]);
      setMsg('Order placed!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) { setMsg(e.message ?? 'Failed to place order'); }
  };

  return (
    <div className="h-full flex flex-col">
      {msg && <div className="bg-green-50 text-green-700 text-xs font-bold px-4 py-2 text-center">{msg}</div>}
      <div className="flex-1 flex overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-stone-100 rounded-xl px-3 py-2 text-sm" />
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="bg-stone-100 rounded-xl px-3 py-2 text-sm">
              <option value="DINE_IN">Dine In</option>
              <option value="TAKEAWAY">Takeaway</option>
            </select>
          </div>
          {type === 'DINE_IN' && (
            <div className="flex gap-2 flex-wrap">
              {TABLES.map((t) => (
                <button key={t.number} onClick={() => setTableNumber(t.number)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tableNumber === t.number ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  {t.name} ({t.capacity}p)
                </button>
              ))}
              {tableNumber && <button onClick={() => setTableNumber('')} className="text-xs text-red-500">Clear</button>}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold ${activeCat === c.id ? 'bg-brand-500 text-white' : 'bg-stone-100'}`}>{c.name}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => add(p)} className="bg-white border border-stone-200 rounded-xl p-3 text-left hover:shadow-md transition active:scale-95">
                <p className="font-bold text-xs line-clamp-2 h-8">{p.name}</p>
                <p className="text-brand-600 text-xs font-bold mt-1">{rs(p.basePrice)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-80 border-l border-stone-200 bg-white flex flex-col">
          <div className="p-4 border-b border-stone-200">
            <h2 className="font-bold text-sm">Current Order</h2>
            <p className="text-xs text-stone-400">{type === 'DINE_IN' ? (tableNumber ? `Table ${tableNumber}` : 'No table') : 'Takeaway'}</p>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.map((i) => (
              <div key={i.productId} className="flex items-center gap-2">
                <div className="flex-1 text-sm"><p className="font-medium">{i.name}</p><p className="text-stone-400 text-xs">{rs(i.price)}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(i.productId, -1)} className="w-6 h-6 rounded bg-stone-100 text-xs font-bold">−</button>
                  <span className="w-4 text-center text-xs font-bold">{i.qty}</span>
                  <button onClick={() => changeQty(i.productId, 1)} className="w-6 h-6 rounded bg-stone-100 text-xs font-bold">+</button>
                </div>
                <span className="text-xs font-bold w-12 text-right">{rs(i.qty * i.price)}</span>
              </div>
            ))}
            {cart.length === 0 && <p className="text-center text-stone-400 text-sm py-10">Tap products to add</p>}
          </div>
          <div className="p-4 border-t border-stone-200 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-stone-500">Subtotal</span><span className="font-bold">{rs(subtotal)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-stone-500">Tax (16%)</span><span className="font-bold">{rs(tax)}</span></div>
            <div className="flex justify-between text-sm font-extrabold border-t pt-2"><span>Total</span><span>{rs(total)}</span></div>
            <div className="flex gap-2">
              {(['CASH', 'CARD', 'WALLET'] as const).map((m) => (
                <button key={m} onClick={() => setPayment(m)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${payment === m ? 'bg-brand-500 text-white' : 'bg-stone-100'}`}>{m}</button>
              ))}
            </div>
            <button onClick={place} disabled={cart.length === 0} className="w-full bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm">Place Order</button>
            <button onClick={() => setCart([])} className="w-full text-stone-400 text-xs py-1">Clear Cart</button>
            {posOrders.length > 0 && (
              <div className="pt-3 border-t border-stone-200 space-y-2">
                <p className="text-[10px] font-bold text-stone-400 uppercase">Recent Orders</p>
                {posOrders.slice(0, 5).map((o, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="font-bold">{rs(Number(o.total))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
