import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedder';
import { requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = requireRole(req, ['ADMIN', 'ENGINEER', 'VIEWER']);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const correlateText = req.nextUrl.searchParams.get('correlate');
    if (correlateText?.trim()) {
      const vec = generateEmbedding(correlateText);
      const vecRes = await query(`SELECT * FROM fn_find_similar($1::vector, 3);`, [JSON.stringify(vec)]);
      return NextResponse.json({ matches: vecRes.rows });
    }

    const sql = `
      SELECT i.incident_id, i.incident_number, i.title, i.severity, i.status, i.declared_at,
             s.service_name, s.status AS service_status, u.full_name AS assigned_engineer
      FROM incidents i
      JOIN services s ON i.service_id = s.service_id
      JOIN users u ON i.assigned_to = u.user_id
      ORDER BY i.declared_at DESC;
    `;
    const res = await query(sql);
    const viewRes = await query(`SELECT * FROM vw_incident_summary ORDER BY service_id ASC;`);

    return NextResponse.json({ incidents: res.rows, service_summaries: viewRes.rows });
  } catch (error: any) {
    console.error('Incidents GET route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireRole(req, ['ADMIN', 'ENGINEER']);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const { title, description = '', severity = 'P2', service_id = 1, message, stack_trace = '' } = await req.json();
    if (!title || !message) return NextResponse.json({ error: 'Title and message required' }, { status: 400 });

    // Ignore client assigned_to; enforce logged-in user's user_id
    const assigned_to = auth.user_id;

    const embedding = generateEmbedding(`${message} ${stack_trace}`);
    const res = await query(`SELECT * FROM sp_create_incident($1, $2, $3, $4, $5, $6, $7, $8::vector);`, [
      title, description, severity, Number(service_id), Number(assigned_to), message, stack_trace, JSON.stringify(embedding)
    ]);

    return NextResponse.json({ success: true, created: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Incidents POST route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
