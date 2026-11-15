import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export type UserRole = 'ADMIN' | 'ENGINEER' | 'VIEWER';

export interface SessionUser {
  user_id: number;
  role: UserRole;
  full_name?: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters long.');
  }
  return secret;
}

export function signSession(user: { user_id: number; role: UserRole; full_name?: string }): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // 8-hour lifetime
  const payload = {
    user_id: user.user_id,
    role: user.role,
    full_name: user.full_name,
    exp,
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');
  return `${b64Payload}.${hmac}`;
}

export function verifySession(token: string): SessionUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [b64Payload, b64Sig] = parts;
    const secret = getSecret();
    const expectedHmac = crypto.createHmac('sha256', secret).update(b64Payload).digest();
    const actualHmac = Buffer.from(b64Sig, 'base64url');
    if (actualHmac.length !== expectedHmac.length) return null;
    if (!crypto.timingSafeEqual(actualHmac, expectedHmac)) return null;

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) return null;
    if (typeof payload.user_id !== 'number' || typeof payload.role !== 'string') return null;
    if (!['ADMIN', 'ENGINEER', 'VIEWER'].includes(payload.role)) return null;

    return {
      user_id: payload.user_id,
      role: payload.role as UserRole,
      full_name: payload.full_name,
    };
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest | Request): SessionUser | null {
  let token: string | undefined;
  if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
    token = (req as any).cookies.get('session')?.value;
  }
  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }
  if (!token) return null;
  return verifySession(token);
}

export function requireRole(
  req: NextRequest | Request,
  allowedRoles: UserRole[]
): SessionUser | NextResponse {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}
