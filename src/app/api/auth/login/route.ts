import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signSession, UserRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, password } = body || {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const res = await query<{ user_id: number; full_name: string; role: UserRole }>(
      `SELECT user_id, full_name, role FROM users 
       WHERE email = $1 AND password_hash IS NOT NULL AND password_hash = crypt($2, password_hash)`,
      [email.trim().toLowerCase(), password]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = res.rows[0];
    const token = signSession({
      user_id: user.user_id,
      role: user.role,
      full_name: user.full_name,
    });

    const response = NextResponse.json({
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.role,
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('[auth/login] Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
