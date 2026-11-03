import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedder';

// GET /api/incidents - List incidents or search similar post-mortems
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const correlateText = searchParams.get('correlate');

    // If correlate query provided, run vector similarity search
    if (correlateText && correlateText.trim().length > 0) {
      const queryVec = generateEmbedding(correlateText);
      const vecSql = `SELECT * FROM fn_find_similar($1::vector, 3);`;
      const vecRes = await query(vecSql, [JSON.stringify(queryVec)]);
      return NextResponse.json({ matches: vecRes.rows });
    }

    // Default: Return all incidents with joined service & engineer
    const sql = `
      SELECT 
        i.incident_id,
        i.incident_number,
        i.title,
        i.description,
        i.severity,
        i.status,
        i.declared_at,
        i.resolved_at,
        s.service_name,
        s.status AS service_status,
        u.full_name AS assigned_engineer
      FROM incidents i
      JOIN services s ON i.service_id = s.service_id
      JOIN users u ON i.assigned_to = u.user_id
      ORDER BY i.declared_at DESC;
    `;
    const res = await query(sql);

    // Also fetch service summary view
    const viewRes = await query(`SELECT * FROM vw_incident_summary ORDER BY service_id ASC;`);

    return NextResponse.json({
      incidents: res.rows,
      service_summaries: viewRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/incidents - Atomic incident declaration via Stored Procedure
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description = '',
      severity = 'P2',
      service_id = 1,
      assigned_to = 1,
      message,
      stack_trace = '',
    } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and error message are required' }, { status: 400 });
    }

    // 1. Generate 768-d unit-normalized embedding
    const embedding = generateEmbedding(`${message} ${stack_trace}`);

    // 2. Execute Stored Procedure sp_create_incident
    const spSql = `
      SELECT * FROM sp_create_incident($1, $2, $3, $4, $5, $6, $7, $8::vector);
    `;
    const res = await query(spSql, [
      title,
      description,
      severity,
      Number(service_id),
      Number(assigned_to),
      message,
      stack_trace,
      JSON.stringify(embedding),
    ]);

    return NextResponse.json({
      success: true,
      created: res.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
