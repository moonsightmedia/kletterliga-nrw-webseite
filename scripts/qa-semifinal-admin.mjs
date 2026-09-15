// Local-only synthetic Admin QA. All Supabase traffic is intercepted.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const runtimeRequire = createRequire("C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json");
const { chromium } = runtimeRequire("playwright");
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3492";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local QA only");
const out = resolve(".qa-post-qualification/admin");
await mkdir(out, { recursive: true });
const id = "00000000-0000-4000-8000-000000000201";
const admin = { id, email: "synthetic-admin@example.invalid", first_name: "Test", last_name: "Orga", role: "league_admin", archived_at: null, participation_activated_at: null, birth_date: null, gender: null, league: null, avatar_url: null, home_gym_id: null };
const consent = { profile_id: id, participation_terms_version: "2026-04-02-v1", participation_terms_accepted_at: "2026-05-01T10:00:00Z", privacy_notice_version: "2026-04-02-v1", privacy_notice_acknowledged_at: "2026-05-01T10:00:00Z", marketing_email_status: "not_subscribed" };
const athlete = { ...admin, id: "00000000-0000-4000-8000-000000000202", email: "synthetic-athlete@example.invalid", first_name: "Mika", last_name: "Testperson", role: "participant", participation_activated_at: "2026-05-01T10:00:00Z" };
const settings = { id: "test-settings", season_year: "2026", qualification_start: "2026-05-01", qualification_end: "2026-09-13", finale_enabled: false, finale_date: "2026-10-03", finale_registration_deadline: "2026-09-27", account_creation_opens_at: "2026-04-01T00:00:00Z", app_unlock_at: "2026-05-01T00:00:00Z" };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.synthetic-invalid-signature`;
const user = { id, aud: "authenticated", role: "authenticated", email: admin.email, app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z" };
const session = { access_token: token, refresh_token: "synthetic-invalid-refresh", expires_at: 4102444800, expires_in: 86400, token_type: "bearer", user };
const report = { synthetic: true, securityLimit: "Fixtures verify admin UI and RPC request contracts, not database authorization or audit execution.", checks: [], errors: [], writes: [] };
const browser = await chromium.launch({ headless: true, executablePath: "C:/Users/Janosch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe" });
try {
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: "de-DE", timezoneId: "Europe/Berlin", reducedMotion: "reduce", serviceWorkers: "block" });
    let cancelled = false;
    await context.addInitScript(({ session }) => {
      for (const name of ["qa-post-qualification", "ssxuurccefxfhxucgepo", "example"]) localStorage.setItem(`sb-${name}-auth-token`, JSON.stringify(session));
      sessionStorage.setItem("kl_app_sponsor_splash_seen", "v2");
    }, { session });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
      if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname) && request.method() === "GET") return route.continue();
      const respond = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(data) });
      if (request.method() === "OPTIONS") return respond({});
      if (url.pathname === "/auth/v1/user") return respond(user);
      if (url.pathname.endsWith("/rpc/admin_cancel_semifinal_registration")) {
        report.writes.push({ path: url.pathname, intercepted: true }); cancelled = true;
        return respond({ id: "test-registration", registration_status: "cancelled" });
      }
      if (url.pathname.endsWith("/rpc/get_public_admin_settings")) return respond([settings]);
      if (request.method() !== "GET" && request.method() !== "HEAD" && request.method() !== "OPTIONS") {
        report.errors.push({ path: url.pathname, unexpectedWrite: true }); return respond({}, 403);
      }
      const object = /vnd.pgrst.object/.test(request.headers().accept || "");
      const rows = (data) => respond(object ? data[0] || null : data);
      if (url.pathname.endsWith("/profiles")) return rows([admin]);
      if (url.pathname.endsWith("/profile_consents")) return rows([consent]);
      if (url.pathname.endsWith("/admin_settings")) return rows([settings]);
      if (url.pathname.endsWith("/finale_registrations")) return rows(cancelled ? [] : [{ id: "test-registration", profile_id: athlete.id, season_year: "2026", registration_status: "registered", created_at: "2026-09-14T12:00:00Z", profiles: athlete }]);
      if (url.pathname.endsWith("/semifinal_eligibility")) return rows([{ profile_id: athlete.id, season_year: "2026", status: "eligible", league: "lead", class_label: "Ü15 männlich" }]);
      return rows([]);
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push({ width, message: error.message }));
    page.on("console", (message) => { if (message.type() === "error") report.errors.push({ width, message: message.text() }); });
    await page.goto(base + "/app/admin/league/finale", { waitUntil: "networkidle" });
    try {
      await page.getByRole("heading", { name: "Halbfinal-Anmeldungen" }).waitFor({ timeout: 10000 });
    } catch (error) {
      await page.screenshot({ path: resolve(out, `admin-load-failure-${width}.png`), fullPage: true });
      report.errors.push({ width, url: page.url(), body: (await page.locator("body").innerText()).slice(0, 2500) });
      throw error;
    }
    await page.getByRole("heading", { name: "Mika Testperson" }).waitFor();
    await page.screenshot({ path: resolve(out, `admin-${width}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    report.checks.push({ width, name: "snapshot and no overflow", pass: !overflow && await page.getByText("Ü15 männlich", { exact: true }).isVisible() });
    await page.getByRole("button", { name: "Anmeldung von Mika Testperson absagen" }).click();
    await page.screenshot({ path: resolve(out, `admin-dialog-${width}.png`), fullPage: true });
    report.checks.push({ width, name: "dialog promises no automatic email", pass: await page.getByRole("alertdialog").getByText(/keine automatische E-Mail/).isVisible() });
    await page.getByRole("button", { name: "Absage speichern" }).click();
    await page.getByText("Noch keine aktiven Zusagen für diese Saison.").waitFor();
    report.checks.push({ width, name: "synthetic RPC cancellation reflected", pass: cancelled });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
if (report.errors.length || report.checks.some((check) => !check.pass)) process.exitCode = 1;
