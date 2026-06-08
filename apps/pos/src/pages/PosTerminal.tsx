import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

interface Product {
  id: string;
  name: string;
  basePrice: number;
}

const rs = (n: number) => 'Rs. ' + n.toLocaleString('en-PK');

export default function PosTerminal() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ productId: string; name: string; price: number; qty: number }[]>([]);
  const [type, setType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [table, setTable] = useState('');
  const [payment, setPayment] = useState<'CASH' | 'CARD' | 'WALLET'>('CASH');
  const [msg, setMsg] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(`${API}/products?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setProducts(d.items || []))
      .catch(() => setProducts([
        { id: 'p1', name: 'Classic Burger', basePrice: 450 },
        { id: 'p2', name: 'Pepperoni Pizza', basePrice: 950 },
        { id: 'p3', name: 'Chicken Wings', basePrice: 650 },
        { id: 'p4', name: 'Loaded Fries', basePrice: 350 },
        { id: 'p5', name: 'Milkshake', basePrice: 280 },
      ]));
  }, []);

  const add = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { productId: p.id, name: p.name, price: p.basePrice, qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.productId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const place = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`${API}/pos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          branchId: 'demo-branch',
          type,
          tableNumber: table || undefined,
          items: cart.map(i => ({ productId: i.productId, quantity: i.qty })),
          paymentMethod: payment,
        }),
      });
      if (res.ok) {
        setMsg('Order placed!');
        setCart([]);
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg('Failed');
      }
    } catch { setMsg('Error'); }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <h1 className="font-extrabold text-lg">Tandoor POS</h1>
        <div className="flex gap-2">
          <button onClick={() => setType('DINE_IN')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${type === 'DINE_IN' ? 'bg-brand-500 text-white' : 'bg-slate-700'}`}>Dine In</button>
          <button onClick={() => setType('TAKEAWAY')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${type === 'TAKEAWAY' ? 'bg-brand-500 text-white' : 'bg-slate-700'}`}>Takeaway</button>
        </div>
      </header>
      {msg && <div className="bg-green-500 text-white text-center text-sm font-semibold py-1.5">{msg}</div>}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-2/3 p-4 overflow-auto">
          <div className="grid grid-cols-3 gap-3">
            {products.map(p => (
              <button key={p.id} onClick={() => add(p)} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition text-left">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-brand-600 font-bold text-sm mt-1">{rs(p.basePrice)}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="w-1/3 border-l border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-bold text-sm">Current Order</h2>
            {type === 'DINE_IN' && (
              <input value={table} onChange={e => setTable(e.target.value)} placeholder="Table #" className="mt-2 w-full bg-slate-100 rounded-lg px-3 py-1.5 text-sm" />
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.map(i => (
              <div key={i.productId} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{i.name}</p>
                  <p className="text-slate-500 text-xs">{rs(i.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeQty(i.productId, -1)} className="w-6 h-6 rounded bg-slate-100 font-bold">−</button>
                  <span className="w-4 text-center text-sm font-semibold">{i.qty}</span>
                  <button onClick={() => changeQty(i.productId, 1)} className="w-6 h-6 rounded bg-slate-100 font-bold">+</button>
                </div>
              </div>
            ))}
            {cart.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Tap products to add</p>}
          </div>
          <div className="p-4 border-t border-slate-200 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-bold">{rs(subtotal)}</span></div>
            <select value={payment} onChange={e => setPayment(e.target.value as any)} className="w-full bg-slate-100 rounded-lg px-3 py-2 text-sm">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="WALLET">Wallet</option>
            </select>
            <button onClick={place} disabled={cart.length === 0} className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition">
              Place Order · {rs(subtotal)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
