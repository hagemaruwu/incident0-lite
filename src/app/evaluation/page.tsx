'use client';

import { useState, useEffect } from 'react';

const TABS = [
  { key: 'MULTI_JOIN', label: '1. Multi-Table JOIN' },
  { key: 'GROUP_HAVING', label: '2. GROUP BY + HAVING' },
  { key: 'SUBQUERY', label: '3. Nested Subquery' },
  { key: 'WINDOW_FUNCTION', label: '4. Window Function (RANK)' },
  { key: 'VECTOR_SIMILARITY', label: '5. pgvector HNSW Search' },
];

export default function EvaluationLab() {
  const [activeKey, setActiveKey] = useState('MULTI_JOIN');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runQuery(key: string) {
    setActiveKey(key);
    setLoading(true);
    const res = await fetch(`/api/evaluation?key=${key}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { runQuery('MULTI_JOIN'); }, []);

  return (
    <div className="space-y-6 text-xs">
      <div className="pb-2 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white font-mono">SYSTEM ANALYTICS & REPORTS</h1>
        <p className="text-zinc-400 text-[11px]">Database telemetry aggregates, workload rankings, and vector similarity retrieval.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => runQuery(t.key)}
            className={`p-2.5 rounded border text-left font-mono transition ${activeKey === t.key ? 'bg-blue-950/60 border-blue-600 text-white font-bold' : 'bg-[#121215] border-zinc-800 text-zinc-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 font-mono">Executing query against PostgreSQL 16...</div>
      ) : data ? (
        <div className="p-4 rounded-lg bg-[#121215] border border-zinc-800 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
            <div>
              <span className="font-bold text-white font-mono">{data.title}</span>
              <span className="text-zinc-500 text-[11px] block">{data.rubric}</span>
            </div>
            <div className="font-mono text-[11px] flex gap-2">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">Rows: {data.rowCount}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">{data.duration_ms} ms</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono text-zinc-500 mb-1">RESULT SET ({data.rowCount} rows):</div>
            <div className="overflow-x-auto border border-zinc-800 rounded">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                    {data.rows.length > 0 && Object.keys(data.rows[0]).map(c => <th key={c} className="p-2">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-900/40">
                      {Object.values(row).map((v: any, j: number) => (
                        <td key={j} className="p-2 text-zinc-300">{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
