import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/incidentzero_lite',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

declare global {
  var _pgLitePool: Pool | undefined;
}

export const pool = globalThis._pgLitePool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgLitePool = pool;
}

pool.on('error', (err) => {
  console.error('[pg.Pool] Unexpected idle client error:', err.message);
});

export async function query<T = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return {
    rows: res.rows as T[],
    rowCount: res.rowCount,
    duration,
  };
}
