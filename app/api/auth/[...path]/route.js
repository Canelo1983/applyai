const BASE = process.env.NEON_AUTH_BASE_URL;

async function proxy(request, { params }) {
  if (!BASE) return Response.json({ error: 'Auth is not configured' }, { status: 500 });
  const p = await params;
  const path = Array.isArray(p.path) ? p.path.join('/') : '';
  const incoming = new URL(request.url);
  const target = `${BASE}/api/auth/${path}${incoming.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET','HEAD'].includes(request.method)) init.body = await request.arrayBuffer();
  const res = await fetch(target, init);
  const outHeaders = new Headers(res.headers);
  return new Response(res.body, { status: res.status, headers: outHeaders });
}
export const GET = proxy;
export const POST = proxy;
