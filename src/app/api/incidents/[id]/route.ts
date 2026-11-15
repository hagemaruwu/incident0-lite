import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRole } from '@/lib/auth';

const VALID_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(req, ['ADMIN', 'ENGINEER']);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const { id } = await context.params;
    const incidentId = parseInt(id, 10);
    if (isNaN(incidentId) || incidentId <= 0 || String(incidentId) !== id) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status } = body || {};
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const res = await query(
      `UPDATE incidents 
       SET status = $1 
       WHERE incident_id = $2 
       RETURNING incident_id, incident_number, status, resolved_at`,
      [status, incidentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, incident: res.rows[0] });
  } catch (error: any) {
    console.error('[incidents/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const { id } = await context.params;
    const incidentId = parseInt(id, 10);
    if (isNaN(incidentId) || incidentId <= 0 || String(incidentId) !== id) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const res = await query(
      `DELETE FROM incidents WHERE incident_id = $1 RETURNING incident_id;`,
      [incidentId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted_id: res.rows[0].incident_id });
  } catch (error: any) {
    console.error('[incidents/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
