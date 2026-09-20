const BASE = process.env.NEON_AUTH_BASE_URL;

async function proxy(request, { params }) {
  if (!BASE) {
    return Response.json({ error: 'Auth is not configured' }, { status: 500 });
  }

  const p = await params;
  const path = Array.isArray(p.path) ? p.path.join('/') : '';
  const incoming = new URL(request.url);
  const base = BASE.replace(/\/$/, '');
  const target = new URL(`${base}/${path}${incoming.search}`);

  // Forward only the headers Neon Auth needs. Vercel proxy/forwarded host
  // headers can cause Better Auth to reject the request as an invalid host.
  const headers = new Headers();
  for (const name of ['accept', 'accept-language', 'content-type', 'cookie', 'user-agent']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Preserve the public app origin for Better Auth's trusted-origin checks,
  // while allowing fetch() to generate the correct Host header for Neon.
  const origin = request.headers.get('origin');
  if (origin) headers.set('origin', origin);

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);
  const outHeaders = new Headers(res.headers);

  // Do not leak upstream transport headers back through Vercel.
  outHeaders.delete('content-encoding');
  outHeaders.delete('content-length');
  outHeaders.delete('transfer-encoding');

  return new Response(res.body, {
    status: res.status,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
