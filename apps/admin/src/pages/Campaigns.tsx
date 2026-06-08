import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetch(`${API}/campaigns`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.ok ? r.json() : []).then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  const create = async () => {
    await fetch(`${API}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ name, discountPercent: discount, channel: 'PUSH' }),
    });
    setName(''); setDiscount(0);
    const r = await fetch(`${API}/campaigns`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (r.ok) setCampaigns(await r.json());
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Campaigns</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 space-y-3">
        <h2 className="font-bold text-sm">Create Campaign</h2>
        <div className="flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Campaign name" className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} placeholder="Discount %" className="w-28 bg-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={create} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-2 text-sm transition">Create</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold">Discount</th><th className="text-left px-4 py-3 font-semibold">Status</th></tr></thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.discountPercent}%</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-600'}`}>{c.active ? 'Active' : 'Draft'}</span></td>
              </tr>
            ))}
            {campaigns.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No campaigns</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
