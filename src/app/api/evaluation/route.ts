import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedder';

export const dynamic = 'force-dynamic';

const RUBRIC_QUERIES: Record<string, { title: string; rubric: string; sql: string; getParams?: () => any[] }> = {
  MULTI_JOIN: {
    title: 'Multi-Table JOIN with ORDER BY',
    rubric: 'Section 6: Multi-table JOINs across incidents, services, and users',
    sql: `
SELECT 
    i.incident_id,
    i.incident_number,
    i.title,
    i.severity,
    i.status,
    s.service_name,
    s.tier,
    u.full_name AS assigned_engineer
FROM incidents i
JOIN services s ON i.service_id = s.service_id
JOIN users u ON i.assigned_to = u.user_id
ORDER BY i.declared_at DESC;
    `.trim(),
  },
  GROUP_HAVING: {
    title: 'GROUP BY with Aggregate & HAVING Filter',
    rubric: 'Section 6: Aggregate metrics grouped by service with threshold filtering',
    sql: `
SELECT 
    s.service_name,
    s.tier,
    s.status,
    COUNT(i.incident_id) AS incident_count
FROM services s
JOIN incidents i ON s.service_id = i.service_id
GROUP BY s.service_id, s.service_name, s.tier, s.status
HAVING COUNT(i.incident_id) >= 1
ORDER BY incident_count DESC;
    `.trim(),
  },
  SUBQUERY: {
    title: 'Correlated / Nested Subquery',
    rubric: 'Section 6: Identifying SREs actively assigned to critical P1 outages',
    sql: `
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.role,
    u.department
FROM users u
WHERE u.user_id IN (
    SELECT DISTINCT assigned_to
    FROM incidents
    WHERE severity = 'P1'
);
    `.trim(),
  },
  WINDOW_FUNCTION: {
    title: 'Analytic Window Function (DENSE_RANK)',
    rubric: 'Section 6: Ranking engineers by incident resolution workload',
    sql: `
SELECT 
    u.user_id,
    u.full_name,
    u.role,
    COUNT(i.incident_id) AS total_incidents,
    DENSE_RANK() OVER (ORDER BY COUNT(i.incident_id) DESC) AS workload_rank
FROM users u
LEFT JOIN incidents i ON u.user_id = i.assigned_to
GROUP BY u.user_id, u.full_name, u.role
ORDER BY workload_rank ASC;
    `.trim(),
  },
  VECTOR_SIMILARITY: {
    title: 'pgvector HNSW Cosine Similarity Search',
    rubric: 'Section 8: Vector search retrieving post-mortems via <=> operator',
    sql: `
SELECT * FROM fn_find_similar($1::vector, 3);
    `.trim(),
    getParams: () => [JSON.stringify(generateEmbedding('ResourcePool connection timeout pool exhausted'))],
  },
};

export async function GET(req: NextRequest) {
  try {
    const queryKey = req.nextUrl.searchParams.get('key') || 'MULTI_JOIN';
    const spec = RUBRIC_QUERIES[queryKey];

    if (!spec) {
      return NextResponse.json({ error: 'Unknown query key' }, { status: 400 });
    }

    const params = spec.getParams ? spec.getParams() : [];
    const res = await query(spec.sql, params);

    return NextResponse.json({
      key: queryKey,
      title: spec.title,
      rubric: spec.rubric,
      sql: spec.sql,
      rows: res.rows,
      rowCount: res.rowCount,
      duration_ms: res.duration,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
