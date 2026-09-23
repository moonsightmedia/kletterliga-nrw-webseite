/**
 * Destructive-capable live release QA for the linked production Supabase project.
 * It creates only `.invalid` synthetic users and an isolated random season, tests
 * the competition-day RPCs over real Auth/PostgREST, then removes only owned data.
 * It leaves live season settings untouched. The trusted service-role test client
 * creates registration fixtures for its isolated season; participant and staff
 * actions are then exercised through normal authenticated RPCs.
 *
 * Usage: node scripts/qa-competition-live.mjs run
 * This script is intentionally not executed as part of its implementation.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.argv[2] !== "run") throw new Error("Explicit `run` argument required; no live calls were made");

const project = "ssxuurccefxfhxucgepo";
const url = `https://${project}.supabase.co`;
const marker = `competition-day-qa-${randomUUID()}`;
const season = `qa-${randomBytes(8).toString("hex")}`;
if (season === "2026" || season.length > 20) throw new Error("Synthetic season generation failed");
const output = resolve(".qa-post-qualification", "competition-live", marker);
const report = { observedAt: new Date().toISOString(), project, season, checks: [], success: false, cleanedAccounts: 0 };
const accounts = [];
let admin;
let eventCreated = false;
const check = (label, condition) => {
  if (!condition) throw new Error(label);
  report.checks.push(label);
};
const unwrap = (label, response) => {
  if (response.error) {
    const code = response.error.code || response.error.status || "failed";
    throw new Error(`${label} (${code})`);
  }
  return response.data;
};

async function legacyFingerprint() {
  const columns = [
    ["profiles", "id"], ["results", "id"], ["routes", "id"],
    ["finale_registrations", "id"], ["semifinal_eligibility", "season_year"],
    ["semifinal_registration_audit", "id"],
  ];
  const snapshot = {};
  for (const [table, order] of columns) {
    const rows = [];
    for (let start = 0; ; start += 500) {
      let request = admin.from(table).select("*").order(order);
      if (table === "semifinal_eligibility") request = request.order("profile_id");
      const page = unwrap(`${table} preservation read`, await request.range(start, start + 499));
      rows.push(...page);
      if (page.length < 500) break;
    }
    snapshot[table] = { count: rows.length, sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
  }
  return snapshot;
}

async function createAccount(label, anonKey) {
  const email = `${marker}-${label}@example.invalid`;
  const password = randomBytes(36).toString("base64url");
  const created = unwrap("Create tagged synthetic Auth account", await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { qa_competition_day_marker: marker, qa_competition_day_label: label },
    user_metadata: { first_name: "Competition QA", last_name: label, birth_date: "1995-01-01", gender: "m", league: "lead" },
  }));
  const account = { id: created.user.id, email, password, label };
  accounts.push(account);
  const profile = unwrap("Verify Auth profile bootstrap", await admin.from("profiles").select("id,role,participation_activated_at").eq("id", account.id).single());
  check(`${label}: bootstrap role and activation verified`, profile.id === account.id && profile.role === "participant" && profile.participation_activated_at === null);
  unwrap("Activate only tagged synthetic profile", await admin.from("profiles").update({ participation_activated_at: new Date().toISOString() }).eq("id", account.id));
  account.client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  unwrap("Real Auth password login", await account.client.auth.signInWithPassword({ email, password }));
  return account;
}

const rpc = (client, name, args = {}) => client.rpc(name, args);

try {
  await mkdir(output, { recursive: true });
  let keys;
  try {
    keys = JSON.parse(execFileSync(resolve("node_modules/supabase/bin/supabase.exe"), ["projects", "api-keys", "--project-ref", project, "-o", "json"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 45000,
    }));
  } catch {
    throw new Error("Supabase CLI credential lookup failed; output suppressed");
  }
  const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
  const anonKey = keys.find((key) => key.name === "anon")?.api_key;
  if (!serviceKey || !anonKey) throw new Error("Required linked-project credentials unavailable");
  admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  keys = null;

  const settings = unwrap("Live-season safety preflight", await admin.from("admin_settings").select("season_year,finale_enabled").single());
  check("Synthetic season is not the live season", settings.season_year !== season && season !== "2026");
  const collision = unwrap("Synthetic season collision check", await admin.from("competition_day_events").select("id").eq("season_year", season));
  check("Random season has no pre-existing competition event", collision.length === 0);
  const before = await legacyFingerprint();
  report.legacyBefore = before;

  const organizer = await createAccount("admin", anonKey);
  const staff = await createAccount("staff", anonKey);
  const participant = await createAccount("participant", anonKey);
  unwrap("Elevate only tagged synthetic admin", await admin.from("profiles").update({ role: "league_admin" }).eq("id", organizer.id));
  const adminProfile = unwrap("Confirm synthetic admin role", await admin.from("profiles").select("role").eq("id", organizer.id).single());
  check("Synthetic admin role persisted", adminProfile.role === "league_admin");

  unwrap("Approve only synthetic participant for isolated season", await admin.from("semifinal_eligibility").insert({
    season_year: season, profile_id: participant.id, status: "eligible", league: "lead", class_label: "QA-Open",
  }));
  unwrap("Register only synthetic participant for isolated season", await admin.from("finale_registrations").insert({
    season_year: season, profile_id: participant.id, registration_status: "registered",
  }));
  const registration = unwrap("Verify synthetic registration", await admin.from("finale_registrations").select("id,registration_status").eq("profile_id", participant.id).eq("season_year", season));
  check("Participant registration exists only in random season", registration.length === 1 && registration[0].registration_status === "registered");

  const routes = Array.from({ length: 5 }, (_, index) => ({ number: index + 1, name: `QA Route ${index + 1}`, grade: "6a", color: "QA" }));
  const config = {
    routes,
    assignments: [{ league: "lead", class_label: "QA-Open", route_numbers: [1, 2, 3, 4, 5] }],
    zone_points: Array.from({ length: 11 }, (_, index) => index), flash_bonus: 1,
  };
  unwrap("Save isolated competition config", await rpc(organizer.client, "save_competition_config", { p_season: season, p_config: config }));
  eventCreated = true;
  const eventRows = unwrap("Read exact isolated event identity", await admin.from("competition_day_events").select("id,season_year,phase").eq("season_year", season));
  check("Exactly one draft event created for random season", eventRows.length === 1 && eventRows[0].phase === "draft");

  check("Participant cannot configure event", Boolean((await rpc(participant.client, "save_competition_config", { p_season: season, p_config: config })).error));
  check("Staff cannot configure event before grant", Boolean((await rpc(staff.client, "save_competition_config", { p_season: season, p_config: config })).error));
  check("Staff cannot open event", Boolean((await rpc(staff.client, "set_competition_phase", { p_season: season, p_phase: "open" })).error));
  unwrap("Grant staff access only to tagged staff profile", await rpc(organizer.client, "set_competition_staff", { p_season: season, p_profile_id: staff.id, p_enabled: true }));
  const staffRoutes = unwrap("Real staff route credentials RPC", await rpc(staff.client, "get_competition_staff_routes", { p_season: season }));
  check("Staff receives five routes with QR credentials", staffRoutes.length === 5 && staffRoutes.every((route) => typeof route.qr_token === "string" && route.qr_token.length >= 32));
  check("Unassigned participant cannot read staff route credentials", Boolean((await rpc(participant.client, "get_competition_staff_routes", { p_season: season })).error));
  unwrap("Open isolated event via admin RPC", await rpc(organizer.client, "set_competition_phase", { p_season: season, p_phase: "open" }));

  const targetRoute = staffRoutes[0];
  const wrongQr = await rpc(participant.client, "submit_competition_result", { p_season: season, p_route_id: targetRoute.id, p_zone: 6, p_flash: false, p_qr_token: "incorrect-synthetic-token" });
  check("Wrong route credential is rejected", Boolean(wrongQr.error));
  check("Staff cannot submit participant result", Boolean((await rpc(staff.client, "submit_competition_result", { p_season: season, p_route_id: targetRoute.id, p_zone: 6, p_flash: false, p_qr_token: targetRoute.qr_token })).error));
  const submitted = unwrap("Submit participant result via real Auth RPC", await rpc(participant.client, "submit_competition_result", { p_season: season, p_route_id: targetRoute.id, p_zone: 6, p_flash: false, p_qr_token: targetRoute.qr_token }));
  check("Valid QR submission persists expected score", submitted.route_id === targetRoute.id && submitted.profile_id === participant.id && submitted.zone === 6 && Number(submitted.points) === 6);
  const duplicate = await rpc(participant.client, "submit_competition_result", { p_season: season, p_route_id: targetRoute.id, p_zone: 7, p_flash: false, p_qr_token: targetRoute.qr_token });
  check("Conflicting duplicate result is rejected", Boolean(duplicate.error));
  check("Staff cannot correct participant result", Boolean((await rpc(staff.client, "correct_competition_result", { p_result_id: submitted.id, p_zone: 8, p_flash: false, p_reason: "QA role denial" })).error));
  unwrap("Correct synthetic result with audit reason", await rpc(organizer.client, "correct_competition_result", { p_result_id: submitted.id, p_zone: 8, p_flash: false, p_reason: "Automated isolated release QA correction" }));
  const audit = unwrap("Read correction audit through admin result payload", await rpc(organizer.client, "get_competition_admin", { p_season: season }));
  check("Admin sees corrected synthetic result", audit.results.some((row) => row.id === submitted.id && row.zone === 8 && Number(row.points) === 8));
  const auditRows = unwrap("Verify exact result audit record", await admin.from("competition_day_result_audit").select("result_id,reason,before_data,after_data").eq("result_id", submitted.id));
  check("Correction is audited before cleanup", auditRows.length === 1 && auditRows[0].before_data.zone === 6 && auditRows[0].after_data.zone === 8 && auditRows[0].reason === "Automated isolated release QA correction");
  unwrap("Close isolated event", await rpc(organizer.client, "set_competition_phase", { p_season: season, p_phase: "closed" }));
  const closed = unwrap("Verify isolated event is closed", await rpc(organizer.client, "get_competition_admin", { p_season: season }));
  check("Closed event keeps test result available to admin", closed.results.some((row) => row.id === submitted.id));
  check("Closed event rejects new synthetic result", Boolean((await rpc(participant.client, "submit_competition_result", { p_season: season, p_route_id: staffRoutes[1].id, p_zone: 3, p_flash: false, p_qr_token: staffRoutes[1].qr_token })).error));
  report.success = true;
} catch (error) {
  // Never serialize SDK errors, credentials, user IDs, or email addresses.
  report.failure = error instanceof Error ? error.message.replace(/\([^)]*\)/g, "(redacted)").slice(0, 500) : "Unknown QA failure";
  process.exitCode = 1;
} finally {
  if (admin && eventCreated) {
    try {
      const events = unwrap("Verify exact event cleanup ownership", await admin.from("competition_day_events").select("id,season_year,created_at").eq("season_year", season));
      if (events.length > 1 || events.some((event) => event.season_year !== season)) throw new Error("Unexpected synthetic event cleanup target");
      if (events.length === 1) {
        unwrap("Delete only this random-season event", await admin.from("competition_day_events").delete().eq("id", events[0].id).eq("season_year", season));
        const remaining = unwrap("Verify event cascade cleanup", await admin.from("competition_day_events").select("id").eq("id", events[0].id));
        check("Synthetic event and dependent competition data removed", remaining.length === 0);
      }
    } catch { report.cleanupFailure = true; report.success = false; process.exitCode = 1; }
  }
  for (const account of accounts.reverse()) {
    try {
      const actual = unwrap("Verify exact synthetic account cleanup target", await admin.auth.admin.getUserById(account.id));
      if (actual.user.id !== account.id || actual.user.email !== account.email || actual.user.app_metadata.qa_competition_day_marker !== marker) throw new Error("Synthetic account ownership verification failed");
      const profileAudit = unwrap("Read owned synthetic profile audit", await admin.from("data_change_audit")
        .select("id,entity_type,entity_id,after_data").eq("entity_type", "profile").eq("entity_id", account.id));
      if (profileAudit.some((row) => row.entity_id !== account.id || row.after_data?.email !== account.email)) {
        throw new Error("Synthetic profile audit ownership verification failed");
      }
      if (profileAudit.length) {
        unwrap("Delete only owned synthetic profile audit", await admin.from("data_change_audit")
          .delete().in("id", profileAudit.map((row) => row.id)));
      }
      unwrap("Delete only this run synthetic Auth account", await admin.auth.admin.deleteUser(account.id));
      const remaining = unwrap("Verify synthetic profile cascade cleanup", await admin.from("profiles").select("id").eq("id", account.id));
      check("Synthetic account cascade cleanup verified", remaining.length === 0);
      // Auth deletion cascades eligibility/registration rows and writes their DELETE audit records.
      const registrationAudit = unwrap("Read owned synthetic semifinal audit", await admin.from("semifinal_registration_audit")
        .select("id,profile_id,season_year").eq("profile_id", account.id));
      if (registrationAudit.some((row) => row.profile_id !== account.id || row.season_year !== season)) {
        throw new Error("Synthetic semifinal audit ownership verification failed");
      }
      if (registrationAudit.length) {
        unwrap("Delete only owned synthetic semifinal audit", await admin.from("semifinal_registration_audit")
          .delete().in("id", registrationAudit.map((row) => row.id)));
      }
      report.cleanedAccounts++;
    } catch { report.cleanupFailure = true; report.success = false; process.exitCode = 1; }
  }
  if (admin && report.legacyBefore) {
    try {
      const after = await legacyFingerprint();
      report.legacyAfter = after;
      check("Legacy profiles/results/routes/registration tables preserved", JSON.stringify(report.legacyBefore) === JSON.stringify(after));
    } catch { report.preservationFailure = true; report.success = false; process.exitCode = 1; }
  }
  // Persist only an allowlisted, secret-free report. Strip internal cleanup data.
  const safeReport = {
    observedAt: report.observedAt, project: report.project, season: report.season,
    checks: report.checks, success: report.success, cleanedAccounts: report.cleanedAccounts,
    ...(report.failure && { failure: report.failure }),
    ...(report.cleanupFailure && { cleanupFailure: true }),
    ...(report.preservationFailure && { preservationFailure: true }),
  };
  try {
    await writeFile(resolve(output, "report.json"), JSON.stringify(safeReport, null, 2));
  } catch {
    report.reportWriteFailure = true;
    process.exitCode = 1;
  }
  console.log(JSON.stringify(safeReport));
}
