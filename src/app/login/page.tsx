'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Invalid email or password');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Network error during login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 rounded-lg bg-[#121215] border border-zinc-800 space-y-4 text-xs font-mono">
      <div className="space-y-1 text-center">
        <h1 className="text-base font-bold text-white tracking-wider">INCIDENTZERO LOGIN</h1>
        <p className="text-zinc-400 text-[11px]">Role-Based Access Control Authentication</p>
      </div>

      {error && (
        <div className="p-2.5 rounded bg-red-950/40 border border-red-900/50 text-red-400 text-[11px]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-zinc-400 mb-1 text-[11px]">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@incidentzero.internal"
            className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200 outline-none focus:border-zinc-600"
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-1 text-[11px]">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200 outline-none focus:border-zinc-600"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-white font-bold transition disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="pt-3 border-t border-zinc-800/80 text-[10px] text-zinc-500 space-y-1">
        <div className="font-bold text-zinc-400">Demo Accounts (Password: Demo@123):</div>
        <div><span className="text-purple-400 font-semibold">ADMIN:</span> aditya.raj@incidentzero.internal</div>
        <div><span className="text-blue-400 font-semibold">ENGINEER:</span> alakh.gupta@incidentzero.internal, priya.sharma@incidentzero.internal</div>
        <div><span className="text-zinc-400 font-semibold">VIEWER:</span> auditor@incidentzero.internal</div>
      </div>
    </div>
  );
}
