import { Pool, PoolConfig } from 'pg';

declare global {
  var _pgLitePool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis._pgLitePool) {
    return globalThis._pgLitePool;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }
  const poolConfig: PoolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  const p = new Pool(poolConfig);
  p.on('error', (err) => {
    console.error('[pg.Pool] Unexpected idle client error:', err.message);
  });
  if (process.env.NODE_ENV !== 'production') {
    globalThis._pgLitePool = p;
  }
  return p;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const instance = getPool();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});

/**
 * Runs `fn` inside one explicit transaction with the acting user's id stored in the
 * transaction-local setting `app.current_user_id`. The audit trigger
 * fn_trg_incident_status_history reads it to record who made the change.
 */
export async function withActor<T>(
  userId: number,
  fn: (q: <R = any>(text: string, params?: any[]) => Promise<{ rows: R[]; rowCount: number | null }>) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [String(userId)]);
    const result = await fn(async (text, params) => {
      const res = await client.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount };
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function query<T = any>(text: string, params?: any[]) {
  const p = getPool();
  const start = Date.now();
  const res = await p.query(text, params);
  const duration = Date.now() - start;
  return {
    rows: res.rows as T[],
    rowCount: res.rowCount,
    duration,
  };
}
