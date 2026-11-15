import type { Metadata } from 'next';
import './globals.css';
import Header from './Header';

export const metadata: Metadata = {
  title: 'IncidentZero Lite - SRE Incident Engine',
  description: 'SRE incident management with vector similarity search',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
