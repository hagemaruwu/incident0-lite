import { NextResponse } from 'next/server';

// Friendly messages for the CHECK constraints PostgreSQL auto-names from 01_schema.sql
const CHECK_MESSAGES: Record<string, string> = {
  incidents_severity_check: 'Severity must be one of P1, P2, P3, P4.',
  incidents_status_check: 'Status must be one of OPEN, INVESTIGATING, RESOLVED, CLOSED.',
  error_logs_log_level_check: 'Log level must be one of INFO, WARN, ERROR, FATAL.',
  services_tier_check: 'Tier must be one of TIER_0, TIER_1, TIER_2.',
  services_status_check: 'Service status must be one of OPERATIONAL, DEGRADED, OUTAGE.',
  users_role_check: 'Role must be one of ADMIN, ENGINEER, VIEWER.',
  root_causes_category_check: 'Root cause category is not a recognised value.',
};

const FK_MESSAGES: Record<string, string> = {
  incidents_service_id_fkey: 'The selected service does not exist.',
  incidents_assigned_to_fkey: 'The assigned user does not exist.',
};

/**
 * Translates a PostgreSQL constraint error into an HTTP 400/409 response so that
 * database-level validation reaches the user as a readable message.
 * Returns null for anything that is not a known client-side data error.
 */
export function dbErrorResponse(error: any): NextResponse | null {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const code: string | undefined = error?.code;
  const constraint: string | undefined = error?.constraint;
  switch (code) {
    case '23514': // check_violation
      return NextResponse.json(
        { error: (constraint && CHECK_MESSAGES[constraint]) || 'Value rejected by a database CHECK constraint.', code, constraint },
        { status: 400 }
      );
    case '23503': // foreign_key_violation
      return NextResponse.json(
        { error: (constraint && FK_MESSAGES[constraint]) || 'Referenced record does not exist or is still in use.', code, constraint },
        { status: 400 }
      );
    case '23502': // not_null_violation
      return NextResponse.json({ error: `Field "${error?.column ?? 'unknown'}" is required.`, code }, { status: 400 });
    case '23505': // unique_violation
      return NextResponse.json({ error: 'A record with this value already exists.', code, constraint }, { status: 409 });
    case '22001': // string_data_right_truncation
      return NextResponse.json({ error: 'A text field exceeds its maximum length.', code }, { status: 400 });
    case '22P02': // invalid_text_representation (e.g. non-numeric id)
      return NextResponse.json({ error: 'A field has an invalid format.', code }, { status: 400 });
    default:
      return null;
  }
}
