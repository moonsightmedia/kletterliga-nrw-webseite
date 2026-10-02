/** Local-only browser QA. Synthetic identities; ALL Supabase traffic intercepted.
 * Usage: QA_BASE_URL=http://127.0.0.1:3498 node scripts/qa-participant-finalday.mjs
 * Start Vite with VITE_SUPABASE_URL=https://qa-post-qualification.supabase.co
 * and any non-secret synthetic VITE_SUPABASE_ANON_KEY. No live credentials needed.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const runtimeRequire = createRequire("C:/Users/Janosch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json");
const { chromium } = runtimeRequire("playwright");
const artifactLabel = "participant-finalday";
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
    if (path === "/rest/v1/rpc/get_competition_day") return respond({ event: { id: "test-event", season_year: "2026", phase: "open", zone_points: [0,2,5,7,10], flash_bonus: 0 }, eligible: true, league: "toprope", class_label: "Ü15-m", routes: Array.from({length:5}, (_,i) => ({ id: "semi-"+i, route_number:i+1, name:"Halbfinalroute "+(i+1), color:"#a15523" })), results: [], is_staff:false, is_admin:false });
    if (path === "/rest/v1/rpc/list_competition_standings") return respond([{ profile_id:id, name:"Mika Testperson", league:"toprope", class_label:"Ü15-m", points:25, completed_routes:5, rank:1 }]);
    if (path === "/rest/v1/rpc/get_competition_final_public") return respond([]);
    if (path === "/rest/v1/rpc/get_competition_live") return respond({ notices: [], classes: [] });
    if (path === "/rest/v1/rpc/get_my_certificates") return respond([]);
    if (path === "/rest/v1/rpc/get_public_admin_settings") return respond([settings]);
    if (method !== "GET" && method !== "HEAD" && !path.startsWith("/functions/v1/get-")) {
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



try {
 for (const width of [390,1440]) {
  const {page,context} = await setup(width);
  await page.goto(base + "/app");
  await page.waitForURL("**/app/wettkampf");
  await page.getByRole("dialog").waitFor();
  await snapshot(page,"welcome",width);
  await page.getByRole("button", {name:"Alles klar, los geht’s!"}).click();
  await page.getByRole("heading", {name:"Deine Routen",exact:true}).waitFor();
  await page.reload();
  await page.getByRole("button", {name:"So läuft das Halbfinale"}).waitFor();
  if(await page.getByRole("dialog").count()) throw new Error("Welcome repeated after confirmation");
  await page.getByRole("button", {name:"So läuft das Halbfinale"}).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", {name:"So läuft das Halbfinale"}).waitFor();
  if(await page.locator("nav a").count() !== 3) throw new Error("Expected three navigation links");
  await snapshot(page,"semifinal",width);
  await page.locator("nav").getByRole("link",{name:"Ranglisten",exact:true}).click();
  await page.getByRole("heading",{name:"Ranglisten",exact:true}).waitFor();
  await snapshot(page,"standings",width);
  await page.locator("nav").getByRole("link",{name:"Profil",exact:true}).click();
  await page.getByRole("heading",{name:"Deine Qualifikation",exact:true}).waitFor();
  await snapshot(page,"profile",width);
  await page.getByRole("button",{name:/Quali-Ranglisten/}).click();
  await page.waitForURL("**/app/profile/qualification/rankings");
  await page.getByRole("heading",{name:"Dein aktueller Stand",exact:true}).waitFor();
  await snapshot(page,"archive",width);
  await page.getByRole("button",{name:"Zurück",exact:true}).click();
  await page.waitForURL("**/app/profile");
  await page.getByRole("button",{name:/Meine Quali-Ergebnisse/}).click();
  await page.waitForURL("**/app/profile/history");
  await page.getByText("Verlauf",{exact:true}).first().waitFor();
  await page.goto(base+"/app/rankings");
  await page.waitForURL("**/app/wettkampf/rangliste");
  await context.close();
 }
 if (report.errors.length || report.unexpectedRequests.length || report.checks.some(x => !x.pass)) throw new Error("QA report contains failures");
 await writeFile(resolve(artifactDir,"report.json"),JSON.stringify(report,null,2));
 console.log(JSON.stringify({pages:report.pages.length,errors:report.errors,unexpected:report.unexpectedRequests,overflow:report.checks.filter(x=>!x.pass)}));
} finally {await browser.close();}






