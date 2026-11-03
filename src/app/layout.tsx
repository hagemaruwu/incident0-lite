import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IncidentZero Lite - SRE Incident Engine',
  description: 'DBMS Experiential Learning Level 3 Capstone Project',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-[#27272a] bg-[#121215] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <Link href="/" className="font-mono font-bold text-sm tracking-wider text-zinc-100 hover:text-white">
                INCIDENTZERO <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal">LITE</span>
              </Link>
              <span className="text-zinc-600">|</span>
              <span className="text-xs text-zinc-400 hidden sm:inline">DBMS Level 3 Capstone (PES University)</span>
            </div>
            <nav className="flex items-center gap-3 text-xs font-mono">
              <Link
                href="/"
                className="px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
              >
                War Room
              </Link>
              <Link
                href="/evaluation"
                className="px-3 py-1.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60 hover:bg-blue-900/60 transition"
              >
                Analytics & Reports
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
