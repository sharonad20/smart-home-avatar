import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'albert_session';

async function verifySession(token: string, secret: string): Promise<boolean> {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return false;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — never redirect
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const token  = request.cookies.get(SESSION_COOKIE)?.value ?? '';
  const secret = process.env.SESSION_SECRET ?? '';

  if (!token || !secret || !(await verifySession(token, secret))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect every route except static assets and PWA files
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icons|.*\\.(?:png|jpg|jpeg|svg|ico|webp|wasm|onnx|js\\.map)).*)',
  ],
};
