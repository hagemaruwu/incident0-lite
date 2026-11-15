import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
}

test('IncidentZero Lite: Smoke Test Suite', async (t) => {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify schema tables exist
    await t.test('schema tables exist', async () => {
      const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      const tables = tablesRes.rows.map(r => r.table_name);
      assert.ok(tables.includes('incidents'), 'Table incidents must exist');
      assert.ok(tables.includes('services'), 'Table services must exist');
      assert.ok(tables.includes('error_logs'), 'Table error_logs must exist');
      assert.ok(tables.includes('root_causes'), 'Table root_causes must exist');
    });

    // 2. Test Atomic Stored Procedure sp_create_incident
    await t.test('sp_create_incident cascades status', async () => {
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
    });

    // 3. Test pgvector Semantic Similarity Search
    await t.test('pgvector semantic similarity search', async () => {
      const vecRes = await client.query(`
        SELECT * FROM fn_find_similar(
          (SELECT embedding FROM error_logs WHERE incident_id = 1 LIMIT 1),
          3
        );
      `);
      assert.ok(vecRes.rows.length > 0, 'Vector search must return matches');
      assert.equal(vecRes.rows[0].incident_number, 'INC-2026-0001', 'Exact match must return INC-2026-0001');
      assert.equal(Number(vecRes.rows[0].similarity), 1.0, 'Exact vector match must yield similarity 1.0000');
    });

    // 4. Verify users.password_hash column exists
    await t.test('users.password_hash column exists', async () => {
      const colRes = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
      `);
      assert.equal(colRes.rows.length, 1, 'Column password_hash must exist on table users');
    });

    // 5. Verify correct password verifies via crypt()
    await t.test('correct password verifies via crypt()', async () => {
      const authRes = await client.query(`
        SELECT email FROM users WHERE password_hash = crypt('Demo@123', password_hash)
      `);
      assert.equal(authRes.rows.length, 4, 'All 4 seeded users must verify with Demo@123');
    });

    // 6. Verify wrong password does not verify via crypt()
    await t.test('wrong password does not verify via crypt()', async () => {
      const wrongRes = await client.query(`
        SELECT email FROM users WHERE password_hash = crypt('WrongPassword', password_hash)
      `);
      assert.equal(wrongRes.rows.length, 0, 'Wrong password must verify 0 users');
    });

    // 7. Verify invalid severity is rejected by CHECK constraint
    await t.test('invalid severity is rejected by CHECK constraint', async () => {
      await client.query('SAVEPOINT sp_invalid_sev');
      await assert.rejects(
        () => client.query(`
          INSERT INTO incidents (incident_number, title, description, severity, status, service_id, assigned_to)
          VALUES ('INC-TEST-INV', 'Invalid Sev', 'Desc', 'P9', 'OPEN', 1, 1)
        `),
        (err) => err.code === '23514',
        'Inserting invalid severity P9 must fail with CHECK violation'
      );
      await client.query('ROLLBACK TO SAVEPOINT sp_invalid_sev');
    });

    // 8. Verify deleting service with incidents is rejected (RESTRICT)
    await t.test('deleting service with incidents is rejected by FK RESTRICT', async () => {
      await client.query('SAVEPOINT sp_del_svc');
      await assert.rejects(
        () => client.query('DELETE FROM services WHERE service_id = 1'),
        (err) => err.code === '23503',
        'Deleting service with associated incidents must fail with FK RESTRICT violation'
      );
      await client.query('ROLLBACK TO SAVEPOINT sp_del_svc');
    });

    // 9. Verify audit trigger records the acting user, not the assignee
    await t.test('status history records acting user from app.current_user_id', async () => {
      // incident 4 is assigned to user 1; user 2 performs the change
      await client.query(`SELECT set_config('app.current_user_id', '2', true)`);
      await client.query(`UPDATE incidents SET status = 'INVESTIGATING' WHERE incident_id = 4`);
      const histRes = await client.query(`
        SELECT changed_by FROM incident_status_history
        WHERE incident_id = 4 AND new_status = 'INVESTIGATING'
        ORDER BY history_id DESC LIMIT 1
      `);
      assert.equal(histRes.rows[0].changed_by, 2, 'changed_by must be the acting user (2), not the assignee (1)');
      await client.query(`SELECT set_config('app.current_user_id', '', true)`);
    });

  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
});
