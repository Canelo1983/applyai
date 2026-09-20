import { db } from '../../../lib/db';

async function authSession(request) {
  // Read the session through our own auth proxy. This keeps the browser's
  // ApplyAI cookie/origin intact and avoids calling the Neon Auth host with
  // the wrong hostname/origin combination.
  const incoming = new URL(request.url);
  const sessionUrl = new URL('/api/auth/get-session', incoming.origin);
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  headers.set('accept', 'application/json');

  const res = await fetch(sessionUrl, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.user ? data : null;
}

export async function GET(request) {
  try {
    const session = await authSession(request);
    if (!session) {
      return Response.json({ user: null }, {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const sql = db();
    const email = session.user.email;
    const name = session.user.name || null;
    const rows = await sql`
      INSERT INTO users(email,name)
      VALUES(${email},${name})
      ON CONFLICT(email) DO UPDATE
      SET name=COALESCE(EXCLUDED.name,users.name)
      RETURNING id,email,name,plan,created_at
    `;

    return Response.json(
      { user: rows[0], authUser: session.user },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('ApplyAI /api/me error', error);
    return Response.json({ error: 'Unable to load account' }, { status: 500 });
  }
}
