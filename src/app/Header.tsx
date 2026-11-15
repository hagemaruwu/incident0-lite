'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState<{ user_id: number; role: string; full_name?: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user_id) {
          setUser(data);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <header className="border-b border-[#27272a] bg-[#121215] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <Link href="/" className="font-mono font-bold text-sm tracking-wider text-zinc-100 hover:text-white">
            INCIDENTZERO <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal">LITE</span>
          </Link>
        </div>
        <nav className="flex items-center gap-3 text-xs font-mono">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded transition ${pathname === '/' ? 'text-white bg-zinc-800 font-bold' : 'text-zinc-300 hover:text-white hover:bg-zinc-800'}`}
          >
            War Room
          </Link>
          <Link
            href="/evaluation"
            className={`px-3 py-1.5 rounded border transition ${pathname === '/evaluation' ? 'bg-blue-900/80 text-white border-blue-600 font-bold' : 'bg-blue-950/60 text-blue-400 border-blue-800/60 hover:bg-blue-900/60'}`}
          >
            Analytics & Reports
          </Link>
          {user ? (
            <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
              <span className="text-zinc-300 font-mono text-[11px] hidden sm:inline">{user.full_name || 'User'}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  user.role === 'ADMIN'
                    ? 'bg-purple-950/70 text-purple-300 border-purple-800/70'
                    : user.role === 'ENGINEER'
                    ? 'bg-blue-950/70 text-blue-300 border-blue-800/70'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                {user.role}
              </span>
              <button
                onClick={handleLogout}
                className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition text-[11px]"
              >
                Logout
              </button>
            </div>
          ) : pathname !== '/login' ? (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white transition"
            >
              Login
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
