import { db } from '../../../lib/db';

async function authSession(request) {
  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) return null;
  const res = await fetch(`${base}/api/auth/get-session`, { headers: { cookie: request.headers.get('cookie') || '' }, cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ? data : null;
}

export async function GET(request) {
  try {
    const session = await authSession(request);
    if (!session) return Response.json({ user: null }, { status: 401 });
    const sql = db();
    const email = session.user.email;
    const name = session.user.name || null;
    const rows = await sql`INSERT INTO users(email,name) VALUES(${email},${name}) ON CONFLICT(email) DO UPDATE SET name=COALESCE(EXCLUDED.name,users.name) RETURNING id,email,name,plan,created_at`;
    return Response.json({ user: rows[0], authUser: session.user });
  } catch { return Response.json({ error:'Unable to load account' }, { status:500 }); }
}
