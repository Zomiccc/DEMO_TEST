'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await api.login({ email, password });
        localStorage.setItem('token', res.accessToken);
        router.push('/');
      } else {
        const res = await api.register({ email, password, fullName: name, phone });
        localStorage.setItem('token', res.accessToken);
        router.push('/');
      }
    } catch (e: any) {
      alert(e.message ?? 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <>
      <Header />
      <main className="max-w-sm mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab('login')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${tab === 'login' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>Log In</button>
            <button onClick={() => setTab('register')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${tab === 'register' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>Sign Up</button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {tab === 'register' && (
              <>
                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" required />
                <input type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </>
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" required />
            <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition">
              {loading ? 'Please wait...' : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
