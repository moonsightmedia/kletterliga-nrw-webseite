// Local-only visual and interaction check with synthetic API data.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtime = process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json';
const { chromium } = createRequire(runtime)('playwright');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3593';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local QA only');
const out = resolve('.qa-post-qualification/judge-shared');
await mkdir(out, { recursive: true });
const report = { checks: [], errors: [], note: 'Synthetic routes and codes; not a production database test.' };
const check = (label, pass) => { report.checks.push({ label, pass }); if (!pass) throw new Error(label); };
const code = 'AbCdEfGhJkMnPqRsTuVwXyZ2';
const wrongCode = '000000000000000000000000';
const routes = Array.from({ length: 14 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(300 + i).padStart(12, '0')}`,
  number: i + 1, name: `Testlinie ${i + 1}`, grade: '6a', color: 'Terrakotta',
  // Eight extra characters cover the longer production origin during local QA.
  qr_token: String(i + 1).padStart(72, 'a'),
}));
const settings = { id: 'synthetic', season_year: '2026', qualification_start: '2026-05-01', qualification_end: '2026-09-13' };
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Users/Janosch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 900 }, locale: 'de-DE', serviceWorkers: 'block' });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === new URL(base).origin) return route.continue();
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
      if (request.method() === 'OPTIONS') return reply({});
      if (url.pathname.includes('/rpc/get_public_admin_settings')) return reply(settings);
      if (url.pathname.includes('/rpc/get_competition_judge_routes')) {
        const input = request.postDataJSON();
        return input.p_password === code
          ? reply({ event: { id: 'synthetic-event', phase: 'draft' }, routes })
          : reply({ message: 'COMPETITION_JUDGE_PASSWORD_INVALID' }, 403);
      }
      if (url.pathname.includes('/auth/v1/user')) return reply({ message: 'No session' }, 401);
      return reply([]);
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.errors.push({ width, message: error.message }));
    page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('403')) report.errors.push({ width, message: message.text() }); });
    await page.goto(base + '/app/schiedsrichter');
    await page.getByLabel('Schiedsrichter-Code').waitFor();
    check(`${width}: no redirect to app login`, page.url().endsWith('/app/schiedsrichter'));
    await page.screenshot({ path: resolve(out, `judge-${width}-gate.png`) });
    if (width <= 390) {
      await page.getByLabel('Schiedsrichter-Code').fill(wrongCode);
      await page.getByRole('button', { name: 'Bereich öffnen' }).click();
      await page.getByRole('alert').getByText(/ungültig/).waitFor();
      check('wrong code keeps QR codes hidden', await page.getByRole('tab', { name: 'QR-Codes' }).count() === 0);
    }
    await page.getByLabel('Schiedsrichter-Code').fill(code);
    await page.getByRole('button', { name: 'Bereich öffnen' }).click();
    await page.getByRole('tab', { name: 'Routenuhren' }).waitFor();
    check(`${width}: 14 routes available after code`, await page.getByLabel(/Timer für Route/).count() === 14);
    await page.getByRole('button', { name: 'Route 1 starten' }).click();
    await page.getByRole('button', { name: 'Route 2 starten' }).click();
    check(`${width}: two independent timers running`, await page.getByRole('button', { name: /pausieren/ }).count() === 2);
    await page.screenshot({ path: resolve(out, `judge-${width}-timers.png`) });
    await page.getByRole('button', { name: 'QR-Code für Route 1 anzeigen' }).click();
    await page.getByRole('dialog').getByAltText('QR-Code Route 1').waitFor();
    await page.waitForTimeout(400);
    const qrImage = page.getByRole('dialog').getByAltText('QR-Code Route 1');
    const qrBounds = await qrImage.boundingBox();
    if (width <= 390) {
      check(`${width}: mobile QR has room to scan`, Boolean(qrBounds && qrBounds.width >= width - 56));
    }
    if (width <= 390) {
      await page.addScriptTag({ path: resolve('node_modules/html5-qrcode/html5-qrcode.min.js') });
      const qrScreenshot = await qrImage.screenshot();
      const decoded = await page.evaluate(async (base64) => {
        const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const file = new File([bytes], 'route.png', { type: 'image/png' });
        const container = document.createElement('div');
        container.id = 'qr-decode-check';
        document.body.append(container);
        const scanner = new window.Html5Qrcode(container.id);
        try { return await scanner.scanFile(file, true); }
        finally { scanner.clear(); container.remove(); }
      }, qrScreenshot.toString('base64'));
      check(`${width}: participant scanner decodes visible full-length route QR`, decoded === `${base}/app/wettkampf#route=${routes[0].id}&token=${routes[0].qr_token}`);
    }
    check(`${width}: direct route QR keeps both times visible`, await page.getByRole('dialog').getByLabel('Aktuelle Routenzeiten').locator('span').count() === 2);
    const dialogBounds = await page.getByRole('dialog').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height, viewport: window.innerHeight };
    });
    check(`${width}: quick QR dialog fits viewport`, dialogBounds.top >= -1 && dialogBounds.bottom <= dialogBounds.viewport + 1);
    await page.screenshot({ path: resolve(out, `judge-${width}-quick-qr.png`) });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    check(`${width}: direct route QR does not stop timers`, await page.getByRole('button', { name: /pausieren/ }).count() === 2);
    await page.getByRole('button', { name: 'Route 1 zurücksetzen' }).click();
    await page.getByRole('alertdialog').getByText(/bisherige Zeit wird gelöscht/).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    check(`${width}: reset requires confirmation`, await page.getByRole('button', { name: 'Route 1 pausieren' }).count() === 1);
    await page.getByRole('tab', { name: 'QR-Codes' }).click();
    await page.getByAltText('QR-Code Route 1').waitFor();
    if (width <= 390) await page.evaluate(() => window.scrollTo(0, 400));
    const sticky = await page.evaluate(() => ({
      scrollY: window.scrollY,
      headerTop: document.querySelector('.stitch-app-shell > header')?.getBoundingClientRect().top,
      railTop: document.querySelector('.judge-live-rail')?.getBoundingClientRect().top,
    }));
    if (width <= 390) check(`${width}: route times stay visible while scrolling QR codes`, sticky.scrollY > 0 && sticky.headerTop >= -1 && sticky.railTop >= 63 && sticky.railTop <= 65);
    await page.screenshot({ path: resolve(out, `judge-${width}-qr.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    check(`${width}: no horizontal overflow`, !overflow);
    check(`${width}: code not stored in browser storage`, !(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).includes(code));
    await page.reload();
    await page.getByLabel('Schiedsrichter-Code').waitFor();
    check(`${width}: reload requires code again`, await page.getByRole('tab', { name: 'QR-Codes' }).count() === 0);
    await page.getByLabel('Schiedsrichter-Code').fill(code);
    await page.getByRole('button', { name: 'Bereich öffnen' }).click();
    await page.getByRole('button', { name: 'Route 1 pausieren' }).waitFor();
    check(`${width}: timer survives reload after re-entry`, await page.getByRole('button', { name: /pausieren/ }).count() === 2);
    if (width === 390) {
      await page.locator('summary').getByText('Betreute Routen ändern').click();
      await page.getByLabel('Timer für Route 3 anzeigen').check();
      check('390: station selection saved on device', JSON.parse(await page.evaluate(() => localStorage.getItem('kletterliga:judge-routes:2026'))).includes(routes[2].id));
      await page.reload();
      await page.getByLabel('Schiedsrichter-Code').fill(code);
      await page.getByRole('button', { name: 'Bereich öffnen' }).click();
      await page.getByRole('button', { name: 'Route 3 starten' }).waitFor();
      check('390: selected third route restored after re-entry', await page.getByRole('button', { name: 'Route 3 starten' }).count() === 1);
    }
    await context.close();
  }
} catch (error) {
  report.errors.push({ fatal: error.message });
} finally {
  await browser.close();
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors }));
if (report.errors.length || report.checks.some((item) => !item.pass)) process.exitCode = 1;
