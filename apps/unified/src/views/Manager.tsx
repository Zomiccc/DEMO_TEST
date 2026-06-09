import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api, rs } from '../api';

const SCOLORS: Record<string, string> = {
  PENDING: 'bg-stone-100 text-stone-600',
  CONFIRMED: 'bg-blue-50 text-blue-600',
  PREPARING: 'bg-amber-50 text-amber-600',
  READY: 'bg-purple-50 text-purple-600',
  ASSIGNED: 'bg-indigo-50 text-indigo-600',
  ON_THE_WAY: 'bg-cyan-50 text-cyan-600',
  DELIVERED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function ManagerView({ screen, token }: { screen: string; token: string }) {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, riders: 0, customers: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Menu form state
  const [newProduct, setNewProduct] = useState({ name: '', description: '', basePrice: '', categoryId: '', sku: '' });
  const [productMsg, setProductMsg] = useState('');

  // Offers state
  const [offers, setOffers] = useState([
    { id: '1', code: 'WELCOME20', label: '20% OFF', desc: 'First order discount', discount: 20, minOrder: 500, active: true },
    { id: '2', code: 'FAMILY15', label: '15% OFF', desc: 'Family feast deal', discount: 15, minOrder: 1500, active: true },
    { id: '3', code: 'FREEDEL', label: 'FREE DELIVERY', desc: 'Free delivery on orders 1000+', discount: 0, minOrder: 1000, active: true },
    { id: '4', code: 'LUNCH25', label: '25% OFF', desc: 'Lunch special 12PM-3PM', discount: 25, minOrder: 800, active: false },
  ]);
  const [newOffer, setNewOffer] = useState({ code: '', label: '', desc: '', discount: '', minOrder: '' });
  const [offerMsg, setOfferMsg] = useState('');

  useEffect(() => {
    if (screen === 'dashboard') {
      api.analytics(token).then((d: any) => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
    }
    if (screen === 'orders') api.allOrders(token).then(setOrders).catch(() => setOrders([]));
    if (screen === 'inventory') api.inventory(token).then(setInventory).catch(() => setInventory([]));
    if (screen === 'menu') {
      api.products({}).then((d) => setProducts(d.items || [])).catch(() => setProducts([]));
      api.categories().then((c) => setCategories(c)).catch(() => setCategories([]));
    }
  }, [screen, token]);

  const addProduct = () => {
    if (!newProduct.name || !newProduct.basePrice || !newProduct.categoryId) { setProductMsg('Fill all required fields'); return; }
    const p = { id: String(Date.now()), name: newProduct.name, description: newProduct.description, basePrice: Number(newProduct.basePrice), categoryId: newProduct.categoryId, sku: newProduct.sku || `SKU-${Date.now()}` };
    setProducts((prev) => [p, ...prev]);
    setNewProduct({ name: '', description: '', basePrice: '', categoryId: '', sku: '' });
    setProductMsg('Product added!');
    setTimeout(() => setProductMsg(''), 2000);
  };

  const addOffer = () => {
    if (!newOffer.code || !newOffer.label || !newOffer.discount) { setOfferMsg('Fill all required fields'); return; }
    const o = { id: String(Date.now()), code: newOffer.code.toUpperCase(), label: newOffer.label, desc: newOffer.desc, discount: Number(newOffer.discount), minOrder: Number(newOffer.minOrder) || 0, active: true };
    setOffers((prev) => [o, ...prev]);
    setNewOffer({ code: '', label: '', desc: '', discount: '', minOrder: '' });
    setOfferMsg('Offer created!');
    setTimeout(() => setOfferMsg(''), 2000);
  };

  const toggleOffer = (id: string) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, active: !o.active } : o));
  };

  if (screen === 'dashboard') {
    const chart = [{ name: 'Mon', sales: 40 }, { name: 'Tue', sales: 30 }, { name: 'Wed', sales: 50 }, { name: 'Thu', sales: 27 }, { name: 'Fri', sales: 18 }, { name: 'Sat', sales: 63 }, { name: 'Sun', sales: 74 }];
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Orders', value: stats.orders, color: 'text-blue-600' }, { label: 'Revenue', value: `Rs. ${stats.revenue?.toLocaleString() ?? 0}`, color: 'text-green-600' }, { label: 'Riders', value: stats.riders, color: 'text-purple-600' }, { label: 'Customers', value: stats.customers, color: 'text-orange-600' }].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-slate-500 text-xs font-semibold">{c.label}</p><p className={`text-xl font-extrabold mt-1 ${c.color}`}>{c.value}</p></div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-3">Weekly Sales</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={chart}><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="sales" fill="#f97316" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (screen === 'menu') return (
    <div className="p-4 space-y-4">
      <h2 className="font-extrabold text-lg">Menu Management</h2>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700">Add New Product</p>
        <input type="text" placeholder="Product Name *" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
        <textarea placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="w-full bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200 h-16 resize-none" />
        <div className="flex gap-2">
          <input type="number" placeholder="Price (Rs) *" value={newProduct.basePrice} onChange={(e) => setNewProduct({ ...newProduct, basePrice: e.target.value })} className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
          <input type="text" placeholder="SKU" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
        </div>
        <select value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} className="w-full bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200">
          <option value="">Select Category *</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {productMsg && <p className={`text-xs font-bold ${productMsg.includes('added') ? 'text-green-600' : 'text-red-500'}`}>{productMsg}</p>}
        <button onClick={addProduct} className="w-full bg-brand-500 text-white font-bold rounded-xl py-2.5 text-sm">Add Product</button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-700">Menu Items ({products.length})</p>
        {products.slice(0, 20).map((p: any) => (
          <div key={p.id} className="flex justify-between bg-white rounded-xl border border-slate-200 p-3">
            <div><p className="font-semibold text-sm">{p.name}</p><p className="text-slate-500 text-xs">{p.sku || '—'}</p></div>
            <div className="text-right"><p className="font-bold text-sm text-brand-600">{rs(Number(p.basePrice))}</p><p className="text-slate-500 text-[10px]">{categories.find((c) => c.id === p.categoryId)?.name || 'Uncategorized'}</p></div>
          </div>
        ))}
        {products.length === 0 && <p className="text-center text-slate-400 py-6">No products found</p>}
      </div>
    </div>
  );

  if (screen === 'offers') return (
    <div className="p-4 space-y-4">
      <h2 className="font-extrabold text-lg">Offers & Promotions</h2>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700">Create New Offer</p>
        <div className="flex gap-2">
          <input type="text" placeholder="Code (e.g. SAVE20) *" value={newOffer.code} onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value.toUpperCase() })} className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200 font-mono" />
          <input type="text" placeholder="Label *" value={newOffer.label} onChange={(e) => setNewOffer({ ...newOffer, label: e.target.value })} className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
        </div>
        <input type="text" placeholder="Description" value={newOffer.desc} onChange={(e) => setNewOffer({ ...newOffer, desc: e.target.value })} className="w-full bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
        <div className="flex gap-2">
          <input type="number" placeholder="Discount % *" value={newOffer.discount} onChange={(e) => setNewOffer({ ...newOffer, discount: e.target.value })} className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
          <input type="number" placeholder="Min Order (Rs)" value={newOffer.minOrder} onChange={(e) => setNewOffer({ ...newOffer, minOrder: e.target.value })} className="flex-1 bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200" />
        </div>
        {offerMsg && <p className={`text-xs font-bold ${offerMsg.includes('created') ? 'text-green-600' : 'text-red-500'}`}>{offerMsg}</p>}
        <button onClick={addOffer} className="w-full bg-violet-500 text-white font-bold rounded-xl py-2.5 text-sm">Create Offer</button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-700">Active Offers ({offers.filter((o) => o.active).length})</p>
        {offers.map((o) => (
          <div key={o.id} className={`bg-white rounded-xl border p-3 ${o.active ? 'border-green-200' : 'border-slate-200 opacity-60'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm">{o.label}</p>
                <p className="text-slate-500 text-xs">{o.desc}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">Code: {o.code} · Min: Rs. {o.minOrder}</p>
              </div>
              <button onClick={() => toggleOffer(o.id)} className={`text-[10px] font-bold px-2 py-1 rounded-full ${o.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                {o.active ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (screen === 'orders') return (
    <div className="p-4 space-y-3">
      {orders.map((o: any) => (
        <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex justify-between mb-1"><span className="font-bold text-sm">{o.orderNumber}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCOLORS[o.status] || 'bg-stone-100'}`}>{o.status}</span></div>
          <p className="text-slate-500 text-xs">{new Date(o.createdAt).toLocaleDateString()}</p>
          <p className="text-brand-600 font-bold text-sm mt-1">{rs(Number(o.total))}</p>
        </div>
      ))}
      {orders.length === 0 && <p className="text-center text-slate-400 py-10">No orders</p>}
    </div>
  );

  if (screen === 'inventory') return (
    <div className="p-4 space-y-3">
      {inventory.map((i: any) => (
        <div key={i.id} className="flex justify-between bg-white rounded-xl border border-slate-200 p-3">
          <div><p className="font-semibold text-sm">{i.name}</p><p className="text-slate-500 text-xs">{i.sku || '—'}</p></div>
          <div className="text-right"><p className={`font-bold text-sm ${Number(i.quantity) <= Number(i.reorderLevel) ? 'text-red-500' : ''}`}>{Number(i.quantity)} {i.unit}</p><p className="text-slate-500 text-xs">Reorder: {Number(i.reorderLevel)}</p></div>
        </div>
      ))}
      {inventory.length === 0 && <p className="text-center text-slate-400 py-10">No items</p>}
    </div>
  );

  return (
    <div className="p-4 space-y-3">
      <h2 className="font-extrabold text-lg">Kitchen Display</h2>
      <p className="text-center text-slate-400 py-10">Use the KDS tab for kitchen view</p>
    </div>
  );
}
