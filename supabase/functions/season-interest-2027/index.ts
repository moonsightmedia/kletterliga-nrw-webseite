const origins = new Set(['https://www.kletterliga-nrw.de', 'https://kletterliga-nrw.de', 'http://127.0.0.1:5391']);
const recent = new Map<string, { count: number; expires: number }>();

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? '';
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'https://www.kletterliga-nrw.de', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  const respond = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
  if (!origins.has(origin)) return respond(403, { error: 'Origin not allowed' });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });
  // In-memory abuse guard; IP addresses are never written to the interest table.
  const now = Date.now();
  for (const [key, value] of recent) if (value.expires < now) recent.delete(key);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const bucket = recent.get(ip) ?? { count: 0, expires: now + 60_000 };
  if (bucket.count >= 10 || recent.size > 10_000) return respond(429, { error: 'Bitte versuche es später erneut.' });
  bucket.count += 1;
  recent.set(ip, bucket);
  if (Number(request.headers.get('content-length') ?? 0) > 512) return respond(413, { error: 'Request too large' });
  let body: unknown;
  try { const text = await request.text(); if (text.length > 512) return respond(413, { error: 'Request too large' }); body = JSON.parse(text); }
  catch { return respond(400, { error: 'Invalid request' }); }
  const id = (body as { browser_id?: unknown })?.browser_id;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return respond(400, { error: 'Invalid browser ID' });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return respond(503, { error: 'Service unavailable' });
  try {
    const result = await fetch(`${url}/rest/v1/season_interest_2027?on_conflict=browser_id`, { method: 'POST', headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ browser_id: id }), signal: AbortSignal.timeout(8000) });
    if (!result.ok) return respond(503, { error: 'Speichern gerade nicht möglich.' });
    return respond(200, { saved: true });
  } catch { return respond(503, { error: 'Speichern gerade nicht möglich.' }); }
});
