import { mkdir, writeFile } from 'node:fs/promises';

// Read only the same anonymous endpoints that serve the public website.
const site = 'https://www.kletterliga-nrw.de';
const html = await (await fetch(site)).text();
const scriptPath = html.match(/src="([^"]+\.js)"/)?.[1];
if (!scriptPath) throw Error('Public website bundle missing');
let bundle = await (await fetch(new URL(scriptPath, site))).text();
const importedChunks = [...bundle.matchAll(/["'](\.\/[A-Za-z0-9_-]+\.js)["']/g)].map(match => new URL(match[1], new URL(scriptPath, site)));
bundle += (await Promise.all([...new Set(importedChunks.map(String))].map(async path => (await fetch(path)).text()))).join('\n');
const url = bundle.match(/https:\/\/ssxuurccefxfhxucgepo\.supabase\.co/)?.[0];
const key = bundle.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
if (!url || !key) throw Error('Public configuration unavailable');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
async function read(path, body) {
  const response = await fetch(url + path, { headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw Error(`Anonymous endpoint failed: ${path} (${response.status})`);
  return response.json();
}
const final = await read('/rest/v1/rpc/get_competition_final_public', { p_season: '2026' });
const semifinal = await read('/rest/v1/rpc/get_competition_semifinal_public', { p_season: '2026' });
const gyms = await read('/rest/v1/gyms?select=name,city,website&archived_at=is.null&order=name');
if (final.some(item => item.phase !== 'final')) throw Error('Final classes not released');
const settingsResponse = await read('/rest/v1/rpc/get_public_admin_settings', {});
const settings = Array.isArray(settingsResponse) ? settingsResponse[0] : settingsResponse;
if (!settings?.qualification_start?.startsWith('2026') || !settings?.qualification_end?.startsWith('2026')) throw Error('Qualification endpoint no longer refers to season 2026; preserve the existing snapshot');
const qualification = [];
for (const league of ['lead', 'toprope']) {
  for (const category of ['u15-w', 'u15-m', 'ue15-w', 'ue15-m', 'ue40-w', 'ue40-m']) {
    const rows = await read('/functions/v1/get-public-rankings', { league, class: category });
    if (rows.length >= 50) throw Error('Public ranking limit reached; obtain a complete season export before replacing the snapshot');
    qualification.push({ league, category, rows });
  }
}
await mkdir('src/preview/data', { recursive: true });
await writeFile('src/preview/data/season-2026.json', JSON.stringify({ season: '2026', retrievedAt: new Date().toISOString(), source: 'Existing anonymous public result endpoints', qualificationStart: settings.qualification_start, qualificationEnd: settings.qualification_end, qualificationLimit: 50, gyms, final, semifinal, qualification }, null, 2) + '\n');
console.log(JSON.stringify({ finalClasses: final.length, finalEntries: final.reduce((n,c)=>n+c.entries.length,0), semifinalEntries: semifinal.length, qualificationEntries: qualification.reduce((n,c)=>n+c.rows.length,0), gyms: gyms.map(g=>g.name) }));
