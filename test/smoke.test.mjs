import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/incidentzero_lite';

test('IncidentZero Lite: Smoke Test Suite', async (t) => {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify schema tables exist
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    assert.ok(tables.includes('incidents'), 'Table incidents must exist');
    assert.ok(tables.includes('services'), 'Table services must exist');
    assert.ok(tables.includes('error_logs'), 'Table error_logs must exist');
    assert.ok(tables.includes('root_causes'), 'Table root_causes must exist');

    // 2. Test Atomic Stored Procedure sp_create_incident
    const spRes = await client.query(`
      SELECT * FROM sp_create_incident(
        'Smoke Test Outage',
        'Automated smoke test verifying stored procedure execution',
        'P1',
        1,
        1,
        'FatalError: Smoke test thread panic',
        'at test.mjs:42',
        (SELECT embedding FROM error_logs WHERE incident_id = 1 LIMIT 1)
      );
    `);
    assert.equal(spRes.rows.length, 1, 'sp_create_incident must return 1 record');
    assert.equal(spRes.rows[0].service_status_updated, 'OUTAGE', 'P1 incident must cascade service to OUTAGE');

    // 3. Test pgvector Semantic Similarity Search
    const vecRes = await client.query(`
      SELECT * FROM fn_find_similar(
        (SELECT embedding FROM error_logs WHERE incident_id = 1 LIMIT 1),
        3
      );
    `);
    assert.ok(vecRes.rows.length > 0, 'Vector search must return matches');
    assert.equal(vecRes.rows[0].incident_number, 'INC-2026-0001', 'Exact match must return INC-2026-0001');
    assert.equal(Number(vecRes.rows[0].similarity), 1.0, 'Exact vector match must yield similarity 1.0000');

  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
