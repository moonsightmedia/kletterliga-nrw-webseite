/** Explicit release smoke test against the linked 2026 project.
 * Creates only tagged synthetic Auth accounts, never sends email, and cleans up
 * exactly those accounts in finally. Credentials/sessions remain in memory.
 * Usage: node scripts/qa-semifinal-live.mjs closed|preapproval|open http://127.0.0.1:3492
 * preapproval temporarily tests the open phase while no real athlete is approved,
 * restores the original closed setting in finally, and never changes age settings.
 * Requires an already authenticated Supabase CLI. Never enable debug logging.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const mode = process.argv[2];
const base = process.argv[3] || 'http://127.0.0.1:3492';
if (!['closed', 'preapproval', 'open'].includes(mode)) throw new Error('Explicit release mode required');
if (!['127.0.0.1', 'localhost', 'www.kletterliga-nrw.de', 'kletterliga-nrw.de'].includes(new URL(base).hostname)) throw new Error('Unreviewed UI host');
const project = 'ssxuurccefxfhxucgepo';
const url = `https://${project}.supabase.co`;
const marker = `semifinal-release-${randomUUID()}`;
const output = resolve('.qa-post-qualification', `live-${mode}`);
const report = { observedAt: new Date().toISOString(), mode, base, mocked: false, checks: [], consoleErrors: [], failedRequests: [], cleanedAccounts: 0, success: false };
const accounts = [];
let browser;
let admin;
let before;
let temporaryOpening;
const check = (label, condition) => { if (!condition) throw new Error(label); report.checks.push(label); };
const unwrap = (label, response) => { if (response.error) throw new Error(`${label} (${response.error.code || response.error.status || 'failed'})`); return response.data; };
async function fingerprint() {
  const answer = {};
  for (const table of ['profiles', 'results', 'routes']) {
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const page = unwrap(`${table} preservation read`, await admin.from(table).select('*').order('id').range(start, start + 999));
      rows.push(...page);
      if (page.length < 1000) break;
    }
    answer[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
  }
  return answer;
}
async function createAccount(label, anonKey) {
  const email = `${marker}-${label}@example.invalid`;
  const password = randomBytes(36).toString('base64url');
  const created = unwrap('Create dedicated synthetic account', await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { qa_release_marker: marker }, user_metadata: { first_name: 'Release-QA', last_name: label, birth_date: '1995-01-01', gender: 'm', league: 'toprope' } }));
  const account = { id: created.user.id, email, password, label };
  accounts.push(account);
  const profile = unwrap('Auth profile bootstrap', await admin.from('profiles').select('id,role,participation_activated_at').eq('id', account.id).single());
  check(`${label}: trusted Auth bootstrap creates unactivated participant`, profile.role === 'participant' && profile.participation_activated_at === null);
  unwrap('Activate own synthetic participant', await admin.from('profiles').update({ participation_activated_at: '2026-05-01T10:00:00Z' }).eq('id', account.id));
  unwrap('Synthetic consent fixture without email', await admin.from('profile_consents').upsert({ profile_id: account.id, participation_terms_version: '2026-04-02-v1', participation_terms_accepted_at: new Date().toISOString(), privacy_notice_version: '2026-04-02-v1', privacy_notice_acknowledged_at: new Date().toISOString(), marketing_email_status: 'not_subscribed' }));
  account.client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  unwrap('Real Auth password login', await account.client.auth.signInWithPassword({ email, password }));
  return account;
}
async function loginPage(account, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, locale: 'de-DE', timezoneId: 'Europe/Berlin', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.addInitScript(() => sessionStorage.setItem('kl_app_sponsor_splash_seen', 'v2'));
  const page = await context.newPage();
  page.on('pageerror', () => report.consoleErrors.push('Uncaught page error'));
  page.on('requestfailed', request => report.failedRequests.push({ path: new URL(request.url()).pathname, method: request.method(), error: request.failure()?.errorText }));
  // Stop mail endpoints if a regression accidentally introduces an email action.
  await page.route('**/functions/v1/*', route => {
    if (/send-|request-signup|resend-|password-recovery|marketing/.test(new URL(route.request().url()).pathname)) return route.abort('blockedbyclient');
    return route.continue();
  });
  await page.goto(`${base}/app/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('E-Mail-Adresse', { exact: true }).fill(account.email);
  await page.getByLabel('Passwort', { exact: true }).fill(account.password);
  await page.locator('button[type="submit"]').click();
  return { page, context };
}

try {
  await mkdir(output, { recursive: true });
  let keys;
  try {
    keys = JSON.parse(execFileSync(resolve('node_modules/supabase/bin/supabase.exe'), ['projects', 'api-keys', '--project-ref', project, '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 45000 }));
  } catch { throw new Error('CLI credential lookup failed; output suppressed'); }
  const serviceKey = keys.find(key => key.name === 'service_role')?.api_key;
  const anonKey = keys.find(key => key.name === 'anon')?.api_key;
  if (!serviceKey || !anonKey) throw new Error('Required linked-project credentials unavailable');
  admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  keys = null;
  const settings = unwrap('Season preflight', await admin.from('admin_settings').select('id,season_year,finale_enabled,age_u16_max,finale_registration_deadline').single());
  check('Expected 2026 registration phase', settings.season_year === '2026' && settings.finale_enabled === (mode === 'open') && settings.finale_registration_deadline === '2026-09-27');
  before = await fingerprint();
  if (mode === 'preapproval') {
    const approved = unwrap('Preapproval gate: no existing eligibility', await admin.from('semifinal_eligibility').select('profile_id').eq('season_year', '2026'));
    check('No real athlete can register during isolated-account open-phase test', approved.length === 0);
    temporaryOpening = settings.id;
    unwrap('Temporarily enable only the no-eligibility test phase', await admin.from('admin_settings').update({ finale_enabled: true }).eq('id', settings.id).eq('finale_enabled', false));
  }
  const participant = await createAccount('participant', anonKey);
  const state = async () => unwrap('Real participant status RPC', await participant.client.rpc('get_semifinal_registration_state'));
  check('Missing approval denies eligibility', !(await state()).eligible);
  check('Missing approval denies signup', Boolean((await participant.client.rpc('register_for_semifinal')).error));
  check('Participant cannot grant approval', Boolean((await participant.client.rpc('set_semifinal_eligibility', { p_profile_id: participant.id, p_status: 'eligible', p_league: 'toprope', p_class_label: 'Ü15-m' })).error));
  check('Participant cannot edit competitive profile after qualification', (await participant.client.from('profiles').update({ birth_date: '1994-01-01' }).eq('id', participant.id)).error?.code === '42501');
  const route = unwrap('Read existing route for rejected-write check', await admin.from('routes').select('id').eq('discipline', 'toprope').limit(1).single());
  check('Database rejects post-qualification result insert', (await participant.client.from('results').insert({ profile_id: participant.id, route_id: route.id, points: 10, flash: false })).error?.code === '42501');
  unwrap('Approve only dedicated QA account', await admin.from('semifinal_eligibility').insert({ season_year: '2026', profile_id: participant.id, status: 'eligible', league: 'toprope', class_label: 'Ü15-m' }));
  check('Real RPC returns approved class', (await state()).eligible && (await state()).class_label === 'Ü15-m');
  if (mode === 'closed') {
    check('Global closed phase denies registration', !(await state()).registration_open && Boolean((await participant.client.rpc('register_for_semifinal')).error));
    const runtimeRequire = createRequire('C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
    const { chromium } = runtimeRequire('playwright');
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Janosch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
    const { page, context } = await loginPage(participant);
    const signup = page.getByRole('button', { name: 'Verbindlich zum Halbfinale anmelden' });
    await signup.waitFor({ state: 'visible', timeout: 30000 });
    check('Deployed home shows real closed registration UI', await signup.isDisabled());
    await page.screenshot({ path: resolve(output, 'closed-mobile.png'), fullPage: true });
    await context.close();
  } else {
    if (mode === 'open') check('Strict U15 cutoff published', settings.age_u16_max === 14);
    const runtimeRequire = createRequire('C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
    const { chromium } = runtimeRequire('playwright');
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/Janosch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
    const { page, context } = await loginPage(participant);
    await page.getByRole('button', { name: 'Verbindlich zum Halbfinale anmelden' }).waitFor({ state: 'visible', timeout: 30000 });
    await page.screenshot({ path: resolve(output, 'eligible-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Verbindlich zum Halbfinale anmelden' }).click();
    const confirmation = page.getByRole('alertdialog', { name: 'Bereit fürs Halbfinale?' });
    await confirmation.waitFor();
    check('Opening confirmation does not register', !(await state()).registered);
    await page.screenshot({ path: resolve(output, 'confirmation-mobile.png'), fullPage: true });
    await confirmation.getByRole('button', { name: 'Zurück', exact: true }).click();
    await confirmation.waitFor({ state: 'hidden' });
    check('Cancelling confirmation leaves registration unchanged', !(await state()).registered);
    await page.getByRole('button', { name: 'Verbindlich zum Halbfinale anmelden' }).click();
    await confirmation.getByRole('button', { name: 'Jetzt verbindlich anmelden', exact: true }).click();
    await page.getByRole('button', { name: /Anmeldung zurückziehen|Vom Halbfinale abmelden|Abmelden/i }).waitFor({ state: 'visible', timeout: 15000 });
    check('Mobile UI registration persisted by real RPC', (await state()).registered);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Anmeldung zurückziehen|Vom Halbfinale abmelden|Abmelden/i }).waitFor({ state: 'visible', timeout: 15000 });
    check('Registered state survives a real reload', (await state()).registered);
    await page.screenshot({ path: resolve(output, 'registered-mobile.png'), fullPage: true });
    unwrap('Idempotent repeat registration', await participant.client.rpc('register_for_semifinal'));
    const rows = unwrap('Read own QA registrations', await admin.from('finale_registrations').select('id,registration_status').eq('profile_id', participant.id).eq('season_year', '2026'));
    check('Duplicate registration keeps one row', rows.length === 1 && rows[0].registration_status === 'registered');
    await page.getByRole('button', { name: /Anmeldung zurückziehen|Vom Halbfinale abmelden|Abmelden/i }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Abmeldung bestätigen' }).click();
    await page.getByRole('button', { name: 'Verbindlich zum Halbfinale anmelden' }).waitFor({ state: 'visible', timeout: 15000 });
    check('Mobile cancellation persists while retaining row', !(await state()).registered && unwrap('Cancelled row', await admin.from('finale_registrations').select('registration_status').eq('id', rows[0].id).single()).registration_status === 'cancelled');
    await page.getByRole('button', { name: 'Verbindlich zum Halbfinale anmelden' }).click();
    await confirmation.getByRole('button', { name: 'Jetzt verbindlich anmelden', exact: true }).click();
    await page.getByRole('button', { name: /Anmeldung zurückziehen|Vom Halbfinale abmelden|Abmelden/i }).waitFor({ state: 'visible', timeout: 15000 });
    check('Re-registration works', (await state()).registered);
    await context.close();
    const organizer = await createAccount('admin', anonKey);
    unwrap('Elevate only the tagged synthetic admin fixture', await admin.from('profiles').update({ role: 'league_admin' }).eq('id', organizer.id));
    check('Non-admin cannot cancel another registration', Boolean((await participant.client.rpc('admin_cancel_semifinal_registration', { p_registration_id: rows[0].id })).error));
    const visible = unwrap('Real admin registration listing', await organizer.client.from('finale_registrations').select('id').eq('id', rows[0].id));
    check('Real admin RLS can read the synthetic registration', visible.length === 1);
    const adminUi = await loginPage(organizer, 1440);
    await adminUi.page.waitForURL('**/app/admin/league', { timeout: 30000 });
    await adminUi.page.goto(`${base}/app/admin/league/finale`, { waitUntil: 'networkidle' });
    await adminUi.page.getByRole('heading', { name: 'Release-QA participant', exact: true }).waitFor({ timeout: 15000 });
    await adminUi.page.getByLabel('Anmeldungen nach Name oder E-Mail suchen').fill('Release-QA participant');
    await adminUi.page.screenshot({ path: resolve(output, 'admin-desktop.png'), fullPage: true });
    await adminUi.page.getByRole('button', { name: 'Anmeldung von Release-QA participant absagen', exact: true }).click();
    await adminUi.page.getByRole('alertdialog').getByRole('button', { name: 'Absage speichern' }).click();
    await adminUi.page.getByRole('alertdialog').waitFor({ state: 'hidden', timeout: 15000 });
    await adminUi.page.getByRole('heading', { name: 'Release-QA participant', exact: true }).waitFor({ state: 'hidden', timeout: 15000 });
    check('Real admin UI cancellation updates participant state', !(await state()).registered);
    await adminUi.context.close();
    const audit = unwrap('Real admin audit read', await organizer.client.from('semifinal_registration_audit').select('id').eq('profile_id', participant.id));
    check('Actual approval and registration writes are audited', audit.length >= 5);
    check('No uncaught browser errors', report.consoleErrors.length === 0);
  }
  report.success = true;
} catch (error) {
  // Do not serialize SDK/Playwright error objects: they may contain credentials.
  report.failure = error instanceof Error ? error.message.replace(/semifinal-release-[^\s]*@example\.invalid/g, '[synthetic email]').slice(0, 700) : 'Unknown QA failure';
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (temporaryOpening) {
    try {
      unwrap('Restore original closed registration phase', await admin.from('admin_settings').update({ finale_enabled: false }).eq('id', temporaryOpening));
      check('Registration closed again before any real athlete approval', !unwrap('Verify closed setting', await admin.from('admin_settings').select('finale_enabled').eq('id', temporaryOpening).single()).finale_enabled);
    } catch { report.phaseRestoreFailure = true; report.success = false; process.exitCode = 1; }
  }
  for (const account of accounts.reverse()) {
    try {
      const actual = unwrap('Verify exact synthetic cleanup target', await admin.auth.admin.getUserById(account.id));
      if (actual.user.id !== account.id || actual.user.email !== account.email || actual.user.app_metadata.qa_release_marker !== marker) throw new Error('Synthetic account ownership verification failed');
      unwrap('Delete only this run synthetic Auth account', await admin.auth.admin.deleteUser(account.id));
      const remaining = unwrap('Verify synthetic profile cascade cleanup', await admin.from('profiles').select('id').eq('id', account.id));
      check('Synthetic account cascade cleanup verified', remaining.length === 0);
      report.cleanedAccounts++;
    } catch { report.cleanupFailure = true; report.success = false; process.exitCode = 1; }
  }
  if (before) {
    try {
      const after = await fingerprint();
      report.preservation = { before, after };
      check('All existing profiles, results and routes preserved exactly', JSON.stringify(before) === JSON.stringify(after));
    } catch (error) { report.preservationFailure = error.message; report.success = false; process.exitCode = 1; }
  }
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
