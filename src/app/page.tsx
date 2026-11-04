'use client';

import { useState, useEffect } from 'react';

export default function WarRoomDashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [serviceSummaries, setServiceSummaries] = useState<any[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('P1');
  const [serviceId, setServiceId] = useState('1');
  const [message, setMessage] = useState('');
  const [stackTrace, setStackTrace] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  async function loadData() {
    const res = await fetch('/api/incidents');
    const data = await res.json();
    if (data.incidents) setIncidents(data.incidents);
    if (data.service_summaries) setServiceSummaries(data.service_summaries);
  }

  useEffect(() => { loadData(); }, []);

  // Debounced Vector Similarity Search
  useEffect(() => {
    if (!message || message.trim().length < 5) { setMatches([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/incidents?correlate=${encodeURIComponent(message)}`);
      const data = await res.json();
      if (data.matches) setMatches(data.matches);
    }, 300);
    return () => clearTimeout(timer);
  }, [message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, severity, service_id: serviceId, assigned_to: 1, message, stack_trace: stackTrace }),
    });
    setTitle(''); setMessage(''); setStackTrace(''); setMatches([]);
    setSubmitting(false);
    await loadData();
  }

  const list = selectedSeverity === 'ALL' ? incidents : incidents.filter(i => i.severity === selectedSeverity);

  return (
    <div className="space-y-6 text-xs">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row justify-between pb-3 border-b border-zinc-800 gap-2">
        <div>
          <h1 className="text-lg font-bold text-white font-mono">SRE INCIDENT WAR ROOM</h1>
          <p className="text-zinc-400 text-[11px]">Telemetry & Root-Cause Engine</p>
        </div>
        <div className="flex gap-2">
          {serviceSummaries.map(s => (
            <div key={s.service_id} className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[10px]">
              <span className="text-zinc-300 font-bold">{s.service_name}</span>:{' '}
              <span className={s.current_status === 'OUTAGE' ? 'text-red-400' : 'text-emerald-400'}>{s.current_status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Declare Incident Form & Vector Match */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-[#121215] border border-zinc-800 space-y-3">
            <div className="font-bold text-zinc-200 font-mono">DECLARE NEW INCIDENT</div>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Incident Title"
              className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200 outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200">
                <option value="P1">P1 (Outage)</option><option value="P2">P2 (Degraded)</option><option value="P3">P3 (Minor)</option>
              </select>
              <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200">
                <option value="1">auth-service</option><option value="2">payment-gateway</option><option value="3">order-processor</option>
              </select>
            </div>
            <textarea required rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Error Telemetry Message..."
              className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-[11px] outline-none" />
            <textarea rows={2} value={stackTrace} onChange={e => setStackTrace(e.target.value)} placeholder="Stack Trace (Optional)..."
              className="w-full bg-[#18181b] border border-zinc-800 rounded p-2 text-zinc-200 font-mono text-[11px] outline-none" />
            <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-white font-bold transition">
              {submitting ? 'Creating Incident...' : 'Declare Incident'}
            </button>
          </form>

          {/* Vector Matches */}
          <div className="p-4 rounded-lg bg-[#121215] border border-zinc-800 space-y-2">
            <div className="font-mono text-[11px] text-zinc-400 font-bold">SIMILAR INCIDENTS & ROOT CAUSES</div>
            {matches.length === 0 ? (
              <p className="text-zinc-600 text-[11px] italic">Type error telemetry above to trigger vector cosine similarity matching.</p>
            ) : (
              matches.map(m => (
                <div key={m.incident_id} className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px]">
                  <div className="flex justify-between font-mono">
                    <span className="text-blue-400 font-bold">{m.incident_number}</span>
                    <span className="text-emerald-400">{(m.similarity * 100).toFixed(1)}% Match</span>
                  </div>
                  <div className="text-zinc-300 font-medium">{m.title}</div>
                  <div className="text-zinc-500 text-[10px] mt-1 font-mono">Root Cause: {m.summary}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Incidents Table */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#121215] border border-zinc-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-zinc-200 font-mono">INCIDENT QUEUE ({list.length})</span>
            <div className="flex gap-1">
              {['ALL', 'P1', 'P2', 'P3'].map(s => (
                <button key={s} onClick={() => setSelectedSeverity(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono ${selectedSeverity === s ? 'bg-zinc-700 text-white font-bold' : 'bg-zinc-900 text-zinc-400'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[10px]">
                <th className="py-1.5">ID</th><th className="py-1.5">SEV</th><th className="py-1.5">STATUS</th><th className="py-1.5">SERVICE</th><th className="py-1.5">ENGINEER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {list.map(i => (
                <tr key={i.incident_id} className="hover:bg-zinc-900/40">
                  <td className="py-2 text-blue-400 font-bold">{i.incident_number}</td>
                  <td className="py-2"><span className={`px-1 rounded text-[9px] font-bold ${i.severity === 'P1' ? 'bg-red-950 text-red-400' : 'bg-zinc-800 text-zinc-300'}`}>{i.severity}</span></td>
                  <td className="py-2 text-zinc-400">{i.status}</td>
                  <td className="py-2 text-zinc-300">{i.service_name}</td>
                  <td className="py-2 text-zinc-400">{i.assigned_engineer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
