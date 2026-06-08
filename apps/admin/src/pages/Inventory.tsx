import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/inventory?branchId=demo-branch`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.ok ? r.json() : []).then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Inventory</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold">SKU</th><th className="text-left px-4 py-3 font-semibold">Stock</th><th className="text-left px-4 py-3 font-semibold">Reorder</th></tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="px-4 py-3 text-slate-500">{i.sku ?? '—'}</td>
                <td className="px-4 py-3">{Number(i.quantity)} {i.unit}</td>
                <td className="px-4 py-3">{Number(i.reorderLevel)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No items</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
