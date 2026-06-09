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
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
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
      const receipt = {
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        subtotal,
        tax,
        payment,
        type,
        tableNumber,
      };
      setLastReceipt(receipt);
      setCart([]);
      setPosOrders((prev) => [{ orderNumber: order.orderNumber, total: order.total, status: order.status, createdAt: order.createdAt }, ...prev]);
      setShowReceipt(true);
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
            <button onClick={place} disabled={cart.length === 0} className="w-full bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm shadow-md">
              {cart.length === 0 ? 'Add Items' : 'Charge & Print Receipt'}
            </button>
            <button onClick={() => setCart([])} className="w-full text-stone-400 text-xs py-1 hover:text-red-500">Clear Cart</button>
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

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-green-100 rounded-full grid place-items-center text-2xl mx-auto">✓</div>
              <p className="text-sm font-bold text-green-700">Payment Successful!</p>
              <p className="text-xs text-slate-500">Receipt printed</p>
            </div>
            <div className="border-t border-dashed border-slate-300 pt-3 space-y-2">
              <div className="text-center">
                <p className="font-extrabold text-lg">Tandoor</p>
                <p className="text-[10px] text-slate-500">Gulberg III, Lahore</p>
                <p className="text-[10px] text-slate-500">+92 42 0000 0000</p>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Order</span>
                <span className="font-bold">{lastReceipt.orderNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Type</span>
                <span className="font-bold">{lastReceipt.type.replace('_', ' ')}</span>
              </div>
              {lastReceipt.tableNumber && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Table</span>
                  <span className="font-bold">{lastReceipt.tableNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Payment</span>
                <span className="font-bold">{lastReceipt.payment}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                {lastReceipt.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{it.name} × {it.qty}</span>
                    <span className="font-medium">{rs(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Subtotal</span><span>{rs(lastReceipt.subtotal)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Tax (16%)</span><span>{rs(lastReceipt.tax)}</span></div>
                <div className="flex justify-between text-sm font-extrabold"><span>Total</span><span>{rs(Number(lastReceipt.total))}</span></div>
              </div>
              <p className="text-center text-[10px] text-slate-400 pt-2">Thank you for dining with us!</p>
            </div>
            <button onClick={() => setShowReceipt(false)} className="w-full bg-stone-900 text-white font-bold rounded-xl py-2.5 text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
