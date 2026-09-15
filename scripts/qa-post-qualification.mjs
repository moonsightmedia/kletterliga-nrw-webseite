/** Local-only browser QA. Synthetic identities; ALL Supabase traffic intercepted.
 * Usage: node scripts/qa-post-qualification.mjs before|after|after-navigation|after-responsive
 * Start Vite with VITE_SUPABASE_URL=https://qa-post-qualification.supabase.co
 * and any non-secret synthetic VITE_SUPABASE_ANON_KEY. No live credentials needed.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const runtimeRequire = createRequire("C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json");
const { chromium } = runtimeRequire("playwright");
const artifactLabel = process.argv[2] || "before";
const mode = artifactLabel.startsWith("after") ? "after" : "before";
const onlyNavigation = artifactLabel === "after-navigation";
const onlyResponsive = artifactLabel === "after-responsive";
const onlyFocus = artifactLabel === "after-focus";
const onlyMotion = artifactLabel === "after-motion";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3492";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("QA is localhost-only");
const artifactDir = resolve(".qa-post-qualification", artifactLabel);
await mkdir(artifactDir, { recursive: true });
const id = "00000000-0000-4000-8000-000000000101";
const profile = { id, email: "synthetic-participant@example.invalid", first_name: "Mika", last_name: "Testperson", avatar_url: null, birth_date: "1995-05-10", gender: "m", home_gym_id: "test-gym", league: "toprope", role: "participant", participation_activated_at: "2026-05-01T10:00:00Z", archived_at: null };
const consent = { profile_id: id, participation_terms_version: "2026-04-02-v1", participation_terms_accepted_at: "2026-05-01T10:00:00Z", privacy_notice_version: "2026-04-02-v1", privacy_notice_acknowledged_at: "2026-05-01T10:00:00Z", marketing_email_status: "not_subscribed" };
const gym = { id: "test-gym", name: "Test-Kletterhalle", city: "Teststadt", postal_code: "12345", address: "Teststraße 1", website: null, logo_url: null, opening_hours: null, archived_at: null };
const climbingRoute = { id: "test-route", gym_id: gym.id, discipline: "toprope", code: "T1", name: "Synthetische Testroute", setter: "Testteam", color: "#e28334", grade_range: "6–7", active: true };
const result = { id: "test-result", profile_id: id, route_id: climbingRoute.id, points: 10, flash: true, status: "climbed", rating: 4, feedback: "Schöne technische Route – synthetisches QA-Feedback.", created_at: "2026-09-12T10:00:00Z", updated_at: "2026-09-12T10:00:00Z" };
const redemption = { redeemed_at: "2026-05-01T10:00:00Z", gym_id: gym.id };
const settings = { id: "test-season", season_year: "2026", qualification_start: "2026-05-01", qualification_end: "2026-09-13", age_u16_max: 15, age_u40_min: 40, age_cutoff_date: "2026-05-01", class_labels: null, finale_enabled: false, finale_date: "2026-10-03", finale_registration_deadline: "2026-09-27", top_30_per_class: 30, wildcards_per_class: 10, account_creation_opens_at: "2026-04-01T00:00:00+02:00", app_unlock_at: "2026-05-01T00:00:00+02:00", force_account_creation_open: false, force_participant_unlock: false, stage_months: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"], stages: null, updated_at: "2026-09-14T10:00:00Z" };
const user = { id, aud: "authenticated", role: "authenticated", email: profile.email, email_confirmed_at: "2026-05-01T10:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: "2026-05-01T10:00:00Z" };
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, role: "authenticated", aud: "authenticated", exp: 4102444800 })}.synthetic-not-a-valid-signature`;
const session = { access_token: token, refresh_token: "synthetic-refresh-not-valid", token_type: "bearer", expires_in: 86400, expires_at: 4102444800, user };
const report = { mode, synthetic: true, securityLimit: "Fixtures prove UI behavior only, not live RLS or database triggers.", checks: [], pages: [], errors: [], expectedErrors: [], unexpectedRequests: [], writes: [], focus: [] };
const browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_PATH || "C:/Users/Janosch/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe" });

async function setup(width, scenario = "closed") {
  const fixtureGym = scenario === "navigation" ? { ...gym, name: "Kletterwelt Sauerland" } : gym;
  const context = await browser.newContext({ viewport: { width, height: 950 }, locale: "de-DE", timezoneId: "Europe/Berlin", reducedMotion: scenario === "motion" ? "no-preference" : "reduce", serviceWorkers: "block" });
  let registered = ["registered", "revoked"].includes(scenario);
  let attempts = 0;
  let mutationAttempts = 0;
  const state = () => ({ eligible: !["pending", "ineligible", "revoked"].includes(scenario), eligibility_status: ["pending", "revoked"].includes(scenario) ? "pending" : scenario === "ineligible" ? "not_eligible" : "eligible", registered, registration_open: !["closed", "deadline"].includes(scenario), registration_deadline: "2026-09-27T22:00:00Z", finale_date: "2026-10-03", season_year: "2026", league: "toprope", class_label: "Ü15-m" });
  await context.addInitScript(({ session }) => {
    for (const name of ["qa-post-qualification", "ssxuurccefxfhxucgepo", "example"]) localStorage.setItem(`sb-${name}-auth-token`, JSON.stringify(session));
    sessionStorage.setItem("kl_app_sponsor_splash_seen", "v2");
  }, { session });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return route.continue();
    if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname) && request.method() === "GET") return route.continue();
    const path = url.pathname;
    const method = request.method();
    const respond = (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    if (!url.hostname.endsWith(".supabase.co") && url.hostname !== "example.invalid") {
      // Prevent analytics, maps, and remote images leaving the isolated fixture run.
      if (/\.(png|jpg|jpeg|webp|svg)$/.test(path)) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>' });
      return route.fulfill({ status: 200, contentType: "text/plain", body: "" });
    }
    if (method === "OPTIONS") return respond({});
    if (path === "/auth/v1/user") return respond(user);
    if (path === "/rest/v1/rpc/get_semifinal_registration_state") {
      attempts++;
      if (scenario === "loading") await new Promise((r) => setTimeout(r, 4000));
      if (scenario === "error" && attempts < 2) return respond({ message: "Synthetischer Verbindungsfehler", code: "QA_NETWORK" }, 503);
      return respond(state());
    }
    if (["/rest/v1/rpc/register_for_semifinal", "/rest/v1/rpc/cancel_semifinal_registration"].includes(path)) {
      report.writes.push({ scenario, path, method, intercepted: true });
      mutationAttempts++;
      if (scenario === "mutation-error" && mutationAttempts === 1) return respond({ message: "Synthetischer Verbindungsfehler", code: "QA_NETWORK" }, 503);
      await new Promise((r) => setTimeout(r, 350));
      registered = path.endsWith("/register_for_semifinal");
      return respond(state());
    }
    if (path === "/rest/v1/rpc/get_public_admin_settings") return respond([settings]);
    if (method !== "GET" && method !== "HEAD") {
      report.unexpectedRequests.push({ scenario, path, method, blocked: true });
      return respond({ code: "QA_WRITE_BLOCKED", message: "Unexpected write blocked by QA" }, 403);
    }
    const object = /vnd.pgrst.object/.test(request.headers().accept || "");
    const rows = (data) => respond(object ? data[0] || null : data);
    switch (path) {
      case "/rest/v1/admin_settings": return rows([{ ...settings, finale_enabled: scenario !== "closed" }]);
      case "/rest/v1/profiles": return rows([profile]);
      case "/rest/v1/profile_consents": return rows([consent]);
      case "/rest/v1/gyms": return rows([fixtureGym]);
      case "/rest/v1/routes": return rows([climbingRoute]);
      case "/rest/v1/results": return rows(scenario === "empty-result" ? [] : [result]);
      case "/rest/v1/master_codes": return rows([{ ...redemption, redeemed_by: id }]);
      case "/rest/v1/gym_codes": return rows([{ id: "test-redemption", ...redemption, redeemed_by: id }]);
      case "/rest/v1/finale_registrations": return rows(registered ? [{ id: "test-registration", profile_id: id, created_at: "2026-09-14T10:00:00Z" }] : []);
      case "/rest/v1/instagram_posts":
      case "/rest/v1/profile_overrides":
      case "/rest/v1/partner_voucher_redemptions": return rows([]);
      case "/functions/v1/get-participant-competition-data": return respond({ profiles: [profile], results: [result], routes: [climbingRoute], gyms: [fixtureGym], viewerMasterRedemption: redemption });
      case "/functions/v1/get-gym-community-stats": return respond([{ gym_id: gym.id, visitor_count: 1, average_points_per_route: 10 }]);
      case "/functions/v1/get-gym-route-highlights": return respond({ gym_id: gym.id, rating_count: 1, average_rating: 4, route_stats: [{ route_id: climbingRoute.id, average_rating: 4, entry_count: 1 }] });
      default:
        report.unexpectedRequests.push({ scenario, path, method, blocked: true });
        return respond({ message: "Missing synthetic QA fixture" }, 501);
    }
  });
  const page = await context.newPage();
  if (scenario === "motion") {
    await page.clock.install({ time: new Date("2026-09-14T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-09-14T12:00:01Z"));
  } else await page.clock.setFixedTime(new Date(scenario === "deadline" ? "2026-09-28T10:00:00Z" : "2026-09-14T12:00:00Z"));
  page.on("pageerror", (error) => report.errors.push({ scenario, type: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const target = ["error", "mutation-error"].includes(scenario) && /503|Synthetischer/.test(message.text()) ? report.expectedErrors : report.errors;
    target.push({ scenario, type: "console", message: message.text() });
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const target = ["error", "mutation-error"].includes(scenario) && response.status() === 503 ? report.expectedErrors : report.errors;
    target.push({ scenario, type: "http", path: new URL(response.url()).pathname, status: response.status() });
  });
  return { context, page };
}

async function snapshot(page, label, width, fullPage = true) {
  await page.evaluate(() => document.fonts.ready);
  const image = resolve(artifactDir, `${label}-${width}.png`);
  await page.screenshot({ path: image, fullPage });
  const evidence = await page.evaluate(() => ({ url: location.pathname, text: document.body.innerText, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, headings: [...document.querySelectorAll("h1,h2,h3")].map((x) => x.textContent), clippedElements: [...document.querySelectorAll("h1,h2,h3,p,dl,button")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map((el) => ({ tag: el.tagName, text: el.textContent?.trim().slice(0, 80), right: el.getBoundingClientRect().right })), inputs: [...document.querySelectorAll("input,textarea,select")].map((el) => ({ tag: el.tagName, disabled: el.disabled, readOnly: el.readOnly })), unnamedControls: [...document.querySelectorAll("button,a,input,textarea,select")].filter((el) => !el.textContent?.trim() && !el.getAttribute("aria-label") && !el.getAttribute("title") && !el.getAttribute("placeholder") && !el.querySelector("img[alt]")).length }));
  report.pages.push({ label, width, image, ...evidence });
  if (evidence.scrollWidth > width + 1) report.checks.push({ label, width, pass: false, detail: "Horizontal overflow" });
  if (mode === "after" && ["home", "finale-closed"].includes(label)) report.checks.push({ label, width, pass: !evidence.clippedElements.length, detail: "No clipped content outside viewport, even with overflow-hidden parents" });
  return evidence;
}

async function checkKeyboardFocus(page, scenario) {
  await page.keyboard.press("Tab");
  const evidence = await page.evaluate(() => {
    const el = document.activeElement;
    const style = getComputedStyle(el);
    return { tag: el.tagName, text: el.textContent?.trim().slice(0, 100), label: el.getAttribute("aria-label"), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  report.focus.push({ scenario, ...evidence });
  report.checks.push({ label: scenario, width: 390, pass: evidence.tag !== "BODY" && ((evidence.outlineStyle !== "none" && evidence.outlineWidth !== "0px") || evidence.boxShadow !== "none"), detail: "Keyboard reaches a control with visible focus styling" });
}

try {
  if (onlyMotion) {
    for (const width of [320, 390, 768, 1440]) {
      const { context, page } = await setup(width, "motion");
      await page.goto(base + "/app", { waitUntil: "domcontentloaded" });
      await page.getByTestId("qualification-transition").waitFor();
      const animations = await page.evaluate(() => document.getAnimations().map((animation) => {
        animation.pause();
        animation.currentTime = 800;
        return { name: animation.animationName, duration: animation.effect?.getTiming().duration };
      }));
      const mid = await snapshot(page, "intro-progress", width);
      report.checks.push({ label: "intro", width, pass: !mid.clippedElements.length && /Die Quali ist/i.test(mid.text) && animations.some((a) => a.name === "qualification-ring"), detail: "Real completion animation and configured stages render without clipping" });
      await page.evaluate(() => document.getAnimations().forEach((animation) => { animation.currentTime = 2000; }));
      await snapshot(page, "intro-complete", width);
      await page.clock.runFor(2700);
      await page.getByRole("heading", { name: "Halbfinalanmeldung", exact: true }).waitFor();
      report.checks.push({ label: "automatic transition", width, pass: !(await page.getByTestId("qualification-transition").count()) && new URL(page.url()).pathname === "/app", detail: "The existing start URL becomes the semifinal page automatically" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "Halbfinalanmeldung", exact: true }).waitFor();
      report.checks.push({ label: "seen intro", width, pass: !(await page.getByTestId("qualification-transition").count()), detail: "Intro does not replay on reload" });
      await context.close();
    }
    const skipped = await setup(390, "motion");
    await skipped.page.goto(base + "/app", { waitUntil: "domcontentloaded" });
    const skip = skipped.page.getByRole("button", { name: "Direkt zum Halbfinale", exact: true });
    await skip.waitFor();
    await skip.focus();
    await skipped.page.keyboard.press("Enter");
    await skipped.page.getByRole("heading", { name: "Halbfinalanmeldung", exact: true }).waitFor();
    report.checks.push({ label: "skip", pass: !(await skipped.page.getByTestId("qualification-transition").count()) && await skipped.page.locator("#semifinal-heading").evaluate((element) => element === document.activeElement), detail: "Keyboard skip reaches semifinal and transfers focus without waiting for timers" });
    await skipped.context.close();
    const reduced = await setup(390, "eligible");
    await reduced.page.goto(base + "/app", { waitUntil: "networkidle" });
    report.checks.push({ label: "reduced motion", pass: !(await reduced.page.getByTestId("qualification-transition").count()) && await reduced.page.getByRole("heading", { name: "Halbfinalanmeldung", exact: true }).isVisible(), detail: "Reduced motion shows the registration immediately" });
    await reduced.context.close();
  }
  for (const width of onlyNavigation || onlyFocus || onlyMotion ? [] : mode === "after" ? [320, 390, 768, 1440] : [390, 768, 1440]) {
    const { context, page } = await setup(width);
    for (const [label, path] of [["home", "/app"], ["finale-closed", "/app/finale"], ["result", "/app/gyms/test-gym/routes/test-route/result"], ...(mode === "after" ? [["rankings", "/app/rankings"], ["routes", "/app/gyms/test-gym/routes"], ["history", "/app/profile/history"]] : [])]) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const voucherDismiss = page.getByRole("button", { name: "Später", exact: true });
      if (await voucherDismiss.isVisible()) await voucherDismiss.click();
      const evidence = await snapshot(page, label, width);
      if (mode === "after") {
        if (label === "home") report.checks.push({ label, width, pass: /Halbfinale/i.test(evidence.text), detail: "Semifinal focus visible" });
        if (label === "finale-closed") report.checks.push({ label, width, pass: evidence.url === "/app/finale" && /03\.10|3\. Oktober|03\. Oktober/.test(evidence.text), detail: "Event remains accessible while registration closed" });
        if (label === "result") report.checks.push({ label, width, pass: !/Ergebnis speichern/i.test(evidence.text) && evidence.text.includes(result.feedback) && !evidence.inputs.some((input) => !input.disabled && !input.readOnly), detail: "Archived result and feedback shown without save or editable controls" });
      }
    }
    await context.close();
  }
  if (mode === "after" && !onlyResponsive && !onlyMotion) {
    if (!onlyNavigation && !onlyFocus) for (const [width, height] of [[320, 640], [390, 844], [768, 1024], [1440, 1000], [844, 390]]) {
      const { context, page } = await setup(width, "eligible");
      try {
        await page.setViewportSize({ width, height });
        await page.goto(base + "/app/finale", { waitUntil: "networkidle" });
        const trigger = page.getByRole("button", { name: "Verbindlich zum Halbfinale anmelden", exact: true });
        await trigger.click();
        const dialog = page.getByRole("alertdialog", { name: "Bereit fürs Halbfinale?" });
        await dialog.waitFor();
        await page.screenshot({ path: resolve(artifactDir, `confirmation-${width}x${height}.png`) });
        const fit = await dialog.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= innerWidth + 1 && bounds.top >= 0 && bounds.bottom <= innerHeight + 1 && element.scrollWidth <= element.clientWidth + 1 && getComputedStyle(element).backgroundColor === "rgb(0, 61, 85)";
        });
        report.checks.push({ label: "confirmation-responsive", width, height, pass: fit, detail: "Dialog remains inside the viewport with scrollable content" });
        const cancel = dialog.getByRole("button", { name: "Zurück", exact: true });
        report.checks.push({ label: "confirmation-safe-focus", width, height, pass: await cancel.evaluate((el) => el === document.activeElement), detail: "Initial keyboard focus is on the non-binding action" });
        await page.keyboard.press("Tab");
        const confirm = dialog.getByRole("button", { name: "Jetzt verbindlich anmelden", exact: true });
        const reachable = await confirm.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return el === document.activeElement && rect.bottom <= innerHeight && rect.top >= 0 && el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) && style.outlineStyle !== "none";
        });
        report.checks.push({ label: "confirmation-keyboard", width, height, pass: reachable, detail: "Confirmation is reachable with visible, unobscured focus" });
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await page.waitForFunction(() => document.activeElement?.tagName === "BUTTON" && document.activeElement.textContent?.includes("Verbindlich zum Halbfinale anmelden"));
        report.checks.push({ label: "confirmation-escape", width, height, pass: await trigger.evaluate((el) => el === document.activeElement), detail: "Escape closes and restores trigger focus" });
      } finally { await context.close(); }
    }
    for (const scenario of onlyNavigation ? [] : onlyFocus ? ["eligible"] : ["pending", "ineligible", "eligible", "registered", "revoked", "deadline", "loading", "error", "mutation-error"]) {
      const { context, page } = await setup(390, scenario);
      try {
        await page.goto(base + "/app/finale", { waitUntil: "domcontentloaded" });
        await page.getByText(/Halbfinale/i).first().waitFor();
        if (scenario === "loading") {
          const loadingEvidence = await snapshot(page, "registration-loading", 390);
          report.checks.push({ label: scenario, pass: /lädt|laden|prüfen|wird geprüft|Lade/i.test(loadingEvidence.text), detail: "Loading state is explicit" });
          await page.waitForTimeout(4200);
        } else {
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(300);
        }
        const evidence = await snapshot(page, `registration-${scenario}${["loading", "mutation-error"].includes(scenario) ? "-initial" : ""}`, 390);
        const registerButton = page.getByRole("button", { name: "Verbindlich zum Halbfinale anmelden", exact: true });
        if (["pending", "ineligible", "deadline"].includes(scenario)) {
          report.checks.push({ label: scenario, pass: !(await registerButton.isVisible()) || !(await registerButton.isEnabled()), detail: "No active registration action without eligibility or after deadline" });
        }
        if (scenario === "eligible") {
          await checkKeyboardFocus(page, scenario);
          for (let tab = 0; tab < 12; tab++) {
            await page.keyboard.press("Tab");
            if (await registerButton.evaluate((el) => document.activeElement === el)) break;
          }
          const keyboardReachable = await registerButton.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return { focused: document.activeElement === el, unobstructed: Boolean(top && el.contains(top)), top: rect.top, bottom: rect.bottom };
          });
          report.focus.push({ scenario, ...keyboardReachable });
          report.checks.push({ label: scenario, width: 390, pass: keyboardReachable.focused && keyboardReachable.unobstructed, detail: "Registration control is not covered when reached through keyboard Tab" });
          await snapshot(page, "registration-keyboard-viewport", 390, false);
          await registerButton.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
          await registerButton.focus();
          const reachable = await registerButton.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return Boolean(top && el.contains(top));
          });
          report.checks.push({ label: scenario, width: 390, pass: reachable, detail: "Scrolled registration control is not covered by fixed navigation" });
          await snapshot(page, "registration-focused-viewport", 390, false);
          await registerButton.click();
          const confirmation = page.getByRole("alertdialog", { name: "Bereit fürs Halbfinale?" });
          await confirmation.waitFor();
          report.checks.push({ label: "confirmation-no-early-write", pass: !report.writes.some((write) => write.scenario === scenario), detail: "First click opens confirmation without a registration request" });
          await snapshot(page, "registration-confirmation", 390, false);
          await confirmation.getByRole("button", { name: "Zurück", exact: true }).click();
          await confirmation.waitFor({ state: "hidden" });
          report.checks.push({ label: "confirmation-cancel", pass: await registerButton.evaluate((el) => el === document.activeElement) && !report.writes.some((write) => write.scenario === scenario), detail: "Cancel restores focus and makes no request" });
          await registerButton.click();
          await confirmation.getByRole("button", { name: "Jetzt verbindlich anmelden", exact: true }).click();
          await page.getByText(/Du bist angemeldet|Anmeldung bestätigt|angemeldet/i).first().waitFor();
          const success = await snapshot(page, "registration-success", 390);
          report.checks.push({ label: scenario, pass: /angemeldet|bestätigt/i.test(success.text), detail: "Registration success is durable and visible" });
          await page.reload({ waitUntil: "networkidle" });
          report.checks.push({ label: scenario, pass: /angemeldet|bestätigt/i.test(await page.locator("body").innerText()), detail: "Registered state survives reload" });
        }
        if (scenario === "registered") {
          const cancel = page.getByRole("button", { name: /abmelden|anmeldung zurücknehmen/i });
          await cancel.click();
          const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
          await dialog.waitFor();
          await snapshot(page, "registration-cancel-dialog", 390);
          await dialog.getByRole("button", { name: /abmelden|zurücknehmen|bestätigen/i }).click();
          await page.waitForTimeout(300);
          const cancelled = await snapshot(page, "registration-cancelled", 390);
          report.checks.push({ label: scenario, pass: !/Du bist angemeldet|Anmeldung bestätigt/i.test(cancelled.text), detail: "Cancellation needs confirmation and updates state" });
        }
        if (scenario === "revoked") {
          report.checks.push({ label: scenario, pass: /Anmeldung gespeichert.*Freigabe offen/i.test(evidence.text) && !/Du bist angemeldet|Bestätigte Startklasse/i.test(evidence.text), detail: "Retained registration with revoked eligibility does not promise an approved start" });
        }
        if (scenario === "error") {
          report.checks.push({ label: scenario, pass: /nicht|Fehler|erneut/i.test(evidence.text), detail: "Load error is not shown as a false registration success" });
          await page.getByRole("button", { name: /erneut|neu laden|noch einmal/i }).click();
          await page.waitForTimeout(350);
          report.checks.push({ label: scenario, pass: await registerButton.isVisible() && await registerButton.isEnabled(), detail: "Retry recovers the registration state" });
          await snapshot(page, "registration-recovered", 390);
        }
        if (scenario === "mutation-error") {
          await registerButton.click();
          const confirm = page.getByRole("alertdialog").getByRole("button", { name: "Jetzt verbindlich anmelden", exact: true });
          await confirm.click();
          await page.waitForTimeout(400);
          const failed = await snapshot(page, "registration-mutation-error", 390);
          report.checks.push({ label: scenario, pass: !/Du bist angemeldet|Anmeldung bestätigt/i.test(failed.text) && /nicht|Fehler|erneut/i.test(failed.text), detail: "Failed mutation does not show a false success" });
          await confirm.click();
          await page.waitForTimeout(450);
          report.checks.push({ label: scenario, pass: /angemeldet|bestätigt/i.test(await page.locator("body").innerText()), detail: "Failed mutation can be retried successfully" });
        }
      } catch (error) {
        report.errors.push({ scenario, type: "interaction", message: error.message });
      } finally {
        await context.close();
      }
    }
    if (!onlyNavigation && !onlyFocus) {
    const { context, page } = await setup(390, "empty-result");
    await page.goto(base + "/app/gyms/test-gym/routes/test-route/result", { waitUntil: "networkidle" });
    const empty = await snapshot(page, "result-empty", 390);
    report.checks.push({ label: "empty-result", pass: /kein Ergebnis eingetragen/i.test(empty.text) && !empty.inputs.some((input) => !input.disabled && !input.readOnly), detail: "Missing result remains read-only after qualification" });
    await context.close();
    }

    if (!onlyFocus) {
    const navigation = await setup(390, "navigation");
    try {
      await navigation.page.goto(base + "/app", { waitUntil: "networkidle" });
      await navigation.page.getByRole("navigation").getByRole("link", { name: "Ergebnisse", exact: true }).click();
      await navigation.page.waitForURL("**/app/gyms");
      await snapshot(navigation.page, "navigation-gyms", 390);
      await navigation.page.locator('a[href="/app/gyms/test-gym"]').click();
      await navigation.page.waitForURL("**/app/gyms/test-gym");
      await navigation.page.locator('a[href="/app/gyms/test-gym/routes"]').click();
      await navigation.page.waitForURL("**/app/gyms/test-gym/routes");
      await navigation.page.locator('a[href="/app/gyms/test-gym/routes/test-route/result"]').click();
      await navigation.page.waitForURL("**/app/gyms/test-gym/routes/test-route/result");
      const archived = await snapshot(navigation.page, "navigation-archived-result", 390);
      report.checks.push({ label: "navigation", pass: archived.text.includes(result.feedback) && !archived.inputs.some((input) => !input.disabled && !input.readOnly), detail: "Real navigation: Home → results → gym → routes → archived result" });
      await navigation.page.getByRole("navigation").getByRole("link", { name: "Rangliste", exact: true }).click();
      await navigation.page.waitForURL("**/app/rankings");
      await navigation.page.getByText("Mika Testperson", { exact: true }).waitFor();
      await navigation.page.getByRole("navigation").getByRole("link", { name: "Halbfinale", exact: true }).click();
      await navigation.page.waitForURL("**/app");
      report.checks.push({ label: "navigation", pass: await navigation.page.getByRole("heading", { name: "Halbfinalanmeldung", exact: true }).isVisible(), detail: "Rankings remain reachable and primary navigation returns to semifinal" });
    } catch (error) {
      report.errors.push({ type: "navigation", message: error.message });
    } finally {
      await navigation.context.close();
    }
    }
  }
} catch (error) {
  report.errors.push({ type: "harness", message: error.message });
  process.exitCode = 1;
} finally {
  await browser.close();
  if (report.errors.length || report.unexpectedRequests.length || report.checks.some((check) => !check.pass)) process.exitCode = 1;
  await writeFile(resolve(artifactDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ artifactDir, pageCount: report.pages.length, passedChecks: report.checks.filter((check) => check.pass).length, failedChecks: report.checks.filter((check) => !check.pass), errors: report.errors, unexpectedRequests: report.unexpectedRequests, interceptedWrites: report.writes.length }, null, 2));
}
