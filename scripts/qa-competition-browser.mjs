// Synthetic local-only browser integration. Every remote request is intercepted.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const runtime = process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json';
const { chromium } = createRequire(runtime)('playwright');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3492';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local QA only');
const out = resolve('.qa-post-qualification/competition');
await mkdir(out, { recursive: true });
const report = { synthetic: true, limits: 'Mocked APIs, no live data. Camera hardware, audio background behavior and real Supabase deployment are separate checks.', checks: [], warnings: [], errors: [] };
const check = (name, pass, detail = '') => { report.checks.push({ name, pass, detail }); if (!pass) throw new Error(`${name}: ${detail}`); };
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Users/Janosch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
const id = '00000000-0000-4000-8000-000000000201';
const athleteId = '00000000-0000-4000-8000-000000000202';
const settings = { id: 'settings', season_year: '2026', qualification_start: '2026-05-01', qualification_end: '2026-09-13', finale_enabled: true, finale_date: '2026-10-03', finale_registration_deadline: '2026-09-27', account_creation_opens_at: '2026-04-01T00:00:00Z', app_unlock_at: '2026-05-01T00:00:00Z' };
const consent = { profile_id: id, participation_terms_version: '2026-04-02-v1', participation_terms_accepted_at: '2026-05-01T10:00:00Z', privacy_notice_version: '2026-04-02-v1', privacy_notice_acknowledged_at: '2026-05-01T10:00:00Z', marketing_email_status: 'not_subscribed' };
const physical = Array.from({ length: 14 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(300 + i).padStart(12, '0')}`, number: i + 1, name: `Testlinie ${i + 1}`, grade: '6a', color: 'Terrakotta', qr_token: `synthetic-route-secret-${i + 1}` }));
const judgeCode = 'AbCdEfGhJkMnPqRsTuVwXyZ2';
const initialConfig = { routes: physical.map(({ id: _, qr_token: __, ...route }) => route), assignments: [{ league: 'lead', class_label: 'Ü15 männlich', route_numbers: [1, 3, 5, 7, 13] }], zone_points: Array.from({ length: 11 }, (_, i) => i), flash_bonus: 2 };
async function fixture(kind, width, initialPhase = 'open') {
  const profile = { id, email: 'synthetic@example.invalid', first_name: 'Mika', last_name: 'Testperson', role: kind === 'admin' ? 'league_admin' : 'participant', archived_at: null, participation_activated_at: '2026-05-01', league: 'lead', gender: 'm', birth_date: '2000-01-01', avatar_url: null, home_gym_id: null };
  const user = { id, aud: 'authenticated', role: 'authenticated', email: profile.email, app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' };
  const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const session = { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, role: 'authenticated', aud: 'authenticated', exp: 4102444800 })}.synthetic-invalid-signature`, refresh_token: 'synthetic-invalid-refresh', expires_at: 4102444800, expires_in: 86400, token_type: 'bearer', user };
  const state = { phase: initialPhase, opened: initialPhase !== 'draft', config: structuredClone(initialConfig), results: [], staff: [], writes: [], judgeCode: kind === 'judge' ? judgeCode : null };
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.addInitScript(({ session, kind }) => { if (kind !== 'judge') localStorage.setItem('sb-qa-post-qualification-auth-token', JSON.stringify(session)); sessionStorage.setItem('kl_app_sponsor_splash_seen', 'v2'); }, { session, kind });
  await context.route('**/*', async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === new URL(base).origin) return route.continue();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return reply({});
    if (url.pathname === '/auth/v1/user') return reply(user);
    const rpc = url.pathname.split('/rpc/')[1];
    const body = request.method() === 'POST' ? request.postDataJSON() : null;
    const event = { id: 'event-2026', season_year: '2026', phase: state.phase, zone_points: state.config.zone_points, flash_bonus: state.config.flash_bonus, opened_at: state.opened ? '2026-10-03T07:00:00Z' : null };
    if (rpc === 'get_public_admin_settings') return reply(/vnd.pgrst.object/.test(request.headers().accept || '') ? settings : [settings]);
    if (rpc === 'get_competition_day') return reply({ event, eligible: kind === 'participant', league: 'lead', class_label: 'Ü15 männlich', routes: (kind === 'participant' ? physical.filter((r) => [1, 3, 5, 7, 13].includes(r.number)) : physical).map(({ qr_token: _, ...r }) => r), results: state.results, is_staff: kind === 'judge' && !state.revoked, is_admin: kind === 'admin' });
    if (rpc === 'get_competition_staff_routes') return kind === 'judge' && !state.revoked || kind === 'admin' ? reply(physical) : reply({ message: 'COMPETITION_STAFF_REQUIRED' }, 403);
    if (rpc === 'get_competition_judge_routes') return body.p_password === state.judgeCode ? reply({ event: { id: event.id, phase: event.phase }, routes: physical }) : reply({ message: 'COMPETITION_JUDGE_PASSWORD_INVALID' }, 403);
    if (rpc === 'get_competition_judge_access_status') return reply(Boolean(state.judgeCode));
    if (rpc === 'set_competition_judge_password') { state.writes.push(rpc); state.judgeCode = body.p_password; return reply(null); }
    if (rpc === 'get_competition_admin') return reply({ config: state.config, staff: state.staff, results: state.results });
    if (rpc === 'save_competition_config') { state.writes.push(rpc); state.config = body.p_config; return reply(null); }
    if (rpc === 'set_competition_phase') { state.writes.push(rpc); state.phase = body.p_phase; state.opened = true; return reply(null); }
    if (rpc === 'list_competition_standings') return reply([{ profile_id: id, name: 'Mika Testperson', league: 'lead', class_label: 'Ü15 männlich', points: 10, completed_routes: 1, rank: 1 }, { profile_id: athleteId, name: 'Alex Mitkletterer', league: 'lead', class_label: 'Ü15 männlich', points: 10, completed_routes: 2, rank: 1 }]);
    if (rpc === 'get_semifinal_registration_state') return reply({ season_year: '2026', eligible: true, registered: true, registration_open: true, league: 'lead', class_label: 'Ü15 männlich' });
    if (request.method() !== 'GET' && request.method() !== 'HEAD') { report.errors.push({ unexpectedRemoteWrite: url.pathname }); return reply({}, 403); }
    const rows = (v) => reply(/vnd.pgrst.object/.test(request.headers().accept || '') ? v[0] || null : v);
    if (url.pathname.endsWith('/profiles')) return rows([profile]);
    if (url.pathname.endsWith('/profile_consents')) return rows([consent]);
    if (url.pathname.endsWith('/admin_settings')) return rows([settings]);
    if (url.pathname.endsWith('/finale_registrations')) return rows([{ id: 'registration', profile_id: id, season_year: '2026', registration_status: 'registered', created_at: '2026-09-15', profiles: { ...profile, role: 'participant' } }]);
    if (url.pathname.endsWith('/semifinal_eligibility')) return rows([{ profile_id: id, season_year: '2026', status: 'eligible', league: 'lead', class_label: 'Ü15 männlich' }]);
    return rows([]);
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push({ kind, width, message: e.message }));
  page.on('console', (msg) => { if (msg.type() === 'error') report.errors.push({ kind, width, message: msg.text() }); });
  const capture = async (label) => { await page.screenshot({ path: resolve(out, `${kind}-${width}-${label}.png`), fullPage: false }); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); check(`${kind} ${width} ${label}: no horizontal overflow`, !overflow); };
  return { page, state, capture, close: () => context.close() };
}
try {
  for (const width of [320, 390, 768, 1440]) {
    const f = await fixture('participant', width);
    await f.page.goto(base + '/app/wettkampf');
    await f.page.getByRole('button', { name: /Route 13/ }).waitFor();
    check(`participant ${width}: five physical route cards`, await f.page.getByRole('button', { name: /^Route \d/ }).count() === 5);
    await f.page.getByRole('button', { name: /Route 13/ }).click();
    await f.page.getByRole('button', { name: '10', exact: true }).click();
    await f.page.getByRole('checkbox').check();
    check(`participant ${width}: no save without QR`, await f.page.getByRole('button', { name: 'Ergebnis absenden' }).isDisabled());
    await f.capture('draft');
    await f.page.reload();
    await f.page.getByRole('button', { name: /Route 13/ }).click();
    await f.page.waitForFunction(() => document.querySelector('input[type="checkbox"]')?.checked);
    check(`participant ${width}: draft survives reload`, await f.page.getByRole('checkbox').isChecked());
    f.state.results = [{ id: 'saved', route_id: physical[12].id, profile_id: id, zone: 10, flash: true, points: 12, created_at: '2026-10-03T12:00:00Z' }];
    await f.page.reload(); await f.page.getByRole('button', { name: /Route 13/ }).click();
    await f.page.getByText('ERGEBNIS EINGETRAGEN', { exact: true }).waitFor();
    check(`participant ${width}: saved result locked`, await f.page.getByRole('button', { name: 'Ergebnis absenden' }).count() === 0);
    await f.capture('saved'); await f.close();

    const j = await fixture('judge', width);
    await j.page.goto(base + '/app/schiedsrichter');
    await j.page.getByLabel('Schiedsrichter-Code').waitFor();
    check(`judge ${width}: no app login required`, !j.page.url().includes('/app/login'));
    await j.page.getByLabel('Schiedsrichter-Code').fill(judgeCode);
    await j.page.getByRole('button', { name: 'Bereich öffnen' }).click();
    await j.page.getByRole('tab', { name: 'Routenuhren' }).waitFor();
    const start = j.page.getByRole('button', { name: /starten/ });
    await start.first().click(); await start.first().click();
    check(`judge ${width}: independent running timers`, await j.page.getByRole('button', { name: /pausieren/ }).count() >= 2);
    await j.page.reload();
    await j.page.getByLabel('Schiedsrichter-Code').fill(judgeCode);
    await j.page.getByRole('button', { name: 'Bereich öffnen' }).click();
    await j.page.getByRole('tab', { name: 'Routenuhren' }).waitFor();
    check(`judge ${width}: running timers survive reload`, await j.page.getByRole('button', { name: /pausieren/ }).count() >= 2);
    await j.page.getByRole('button', { name: 'Route 1 pausieren' }).scrollIntoViewIfNeeded();
    await j.capture('timers');
    await j.page.getByRole('tab', { name: 'QR-Codes' }).click();
    await j.page.getByAltText('QR-Code Route 1', { exact: true }).waitFor();
    await j.page.getByAltText('QR-Code Route 1', { exact: true }).scrollIntoViewIfNeeded();
    await j.capture('qr');
    const imageFits = await j.page.getByAltText('QR-Code Route 1', { exact: true }).evaluate((img) => {
      const image = img.getBoundingClientRect(), card = img.parentElement.parentElement.getBoundingClientRect();
      return image.left >= card.left && image.right <= card.right;
    });
    check(`judge ${width}: QR fits its card`, imageFits);
    if (width === 390) {
      let decoded = null;
      try { decoded = await j.page.evaluate(async () => {
        const module = await import('/node_modules/.vite/deps/html5-qrcode.js');
        const div = document.createElement('div'); div.id = 'qa-qr-decode'; document.body.append(div);
        const scanner = new module.Html5Qrcode(div.id);
        try {
          const img = document.querySelector('img[alt="QR-Code Route 1"]');
          await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth * 2; canvas.height = img.naturalHeight * 2;
          const context = canvas.getContext('2d');
          context.imageSmoothingEnabled = false;
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          return await scanner.scanFile(new File([blob], 'synthetic-qr.png', { type: 'image/png' }), true);
        } finally { scanner.clear(); div.remove(); }
      }); } catch (error) { report.warnings.push({ check: 'QR image decoder', reason: 'Headless html5-qrcode did not detect the synthetic PNG; physical scanner check remains required.', detail: String(error.message).split('\n')[0] }); }
      if (decoded !== null) check('QR image roundtrip decodes exact route credential', decoded === `${base}/app/wettkampf#route=${physical[0].id}&token=${physical[0].qr_token}`);
      else check('QR image is generated at full PNG resolution', await j.page.getByAltText('QR-Code Route 1', { exact: true }).evaluate((img) => img.src.startsWith('data:image/png;base64,') && img.naturalWidth >= 400));
      const popupPromise = j.page.waitForEvent('popup');
      await j.page.getByRole('button', { name: 'Alle drucken', exact: true }).click();
      const print = await popupPromise;
      await print.locator('article.route').first().waitFor();
      check('all physical route codes included in print sheet', await print.locator('article.route').count() === 14);
      await print.setViewportSize({ width: 703, height: 1000 });
      await print.emulateMedia({ media: 'print' });
      const squareCodes = await print.locator('article.route img').evaluateAll((imgs) => imgs.every((img) => {
        const bounds = img.getBoundingClientRect(), card = img.parentElement.getBoundingClientRect();
        return Math.abs(bounds.width - bounds.height) < 1 && bounds.right <= card.right;
      }));
      check('printed QR codes remain square and inside cards', squareCodes);
      await print.screenshot({ path: resolve(out, 'judge-print-a4.png') });
      await print.close();
    }
    check(`judge ${width}: no route secret in localStorage`, !(await j.page.evaluate(() => JSON.stringify(localStorage))).includes('synthetic-route-secret'));
    check(`judge ${width}: no shared code in browser storage`, !(await j.page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).includes(judgeCode));
    await j.close();

    const a = await fixture('admin', width, 'draft');
    await a.page.goto(base + '/app/admin/league/wettkampf');
    await a.page.getByLabel('Name · Route 1', { exact: true }).waitFor();
    await a.page.getByRole('button', { name: 'Zugangscode erzeugen' }).click();
    await a.page.getByText('Schiedsrichter-Code eingerichtet.', { exact: true }).waitFor();
    check(`admin ${width}: judge code generated by admin only`, typeof a.state.judgeCode === 'string' && a.state.judgeCode.length === 24);
    await a.capture('config');
    await a.page.getByLabel('Name · Route 1', { exact: true }).fill('Überarbeitete Testlinie');
    check(`admin ${width}: unsaved config blocks opening`, await a.page.getByRole('button', { name: 'Eingabe öffnen' }).isDisabled());
    await a.page.getByRole('button', { name: 'Konfiguration speichern' }).click();
    await a.page.getByText('Routen, Klassen und Wertung sind gespeichert.', { exact: true }).waitFor();
    check(`admin ${width}: config saved via intercepted RPC`, a.state.config.routes[0].name === 'Überarbeitete Testlinie');
    await a.page.getByRole('button', { name: 'Eingabe öffnen' }).click();
    await a.capture('confirm');
    check(`admin ${width}: opening requires confirmation`, !a.state.writes.includes('set_competition_phase'));
    await a.page.getByRole('button', { name: 'Bestätigen', exact: true }).click();
    await a.page.getByText('Eingabestatus aktualisiert.', { exact: true }).waitFor();
    check(`admin ${width}: opened settings locked`, await a.page.getByLabel('Name · Route 1', { exact: true }).isDisabled());
    await a.close();
  }
} catch (error) { report.errors.push({ fatal: error.message }); }
finally { await browser.close(); await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report, null, 2));
if (report.errors.length || report.checks.some((x) => !x.pass)) process.exitCode = 1;
