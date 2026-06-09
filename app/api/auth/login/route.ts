import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

async function signToken(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const raw = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${payload}.${b64}`;
}

export async function POST(req: NextRequest) {
  const { username, password } = (await req.json()) as { username: string; password: string };

  const validUser  = process.env.AUTH_USERNAME;
  const hashStored = process.env.AUTH_PASSWORD_HASH;
  const secret     = process.env.SESSION_SECRET ?? '';

  if (!validUser || !hashStored || !secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const ok = username === validUser && (await bcrypt.compare(password, hashStored));
  if (!ok) {
    // Constant-time delay to prevent timing attacks
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
  }

  const token = await signToken(username, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('albert_session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   365 * 24 * 60 * 60,   // 1 year — no timeout
    path:     '/',
  });
  return res;
}
