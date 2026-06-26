import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = JSON.parse(
  execSync("npx supabase projects api-keys --project-ref ssxuurccefxfhxucgepo -o json", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  }),
).find((r) => r.name === "service_role").api_key;

const sb = createClient(url, key);

async function listAllResults() {
  const merged = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("results").select("id").range(from, from + 999);
    if (error) throw error;
    merged.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return merged.length;
}

async function fetchGymCommunityStats() {
  const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
  const res = await fetch(`${url}/functions/v1/get-gym-community-stats`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!res.ok) throw new Error(`gym stats ${res.status}`);
  return res.json();
}

const natalieId = "4272ec20-5f45-42ef-9a57-02286c64c489";

const [{ data: settingsRows }, { data: profiles }, { data: routes }, { data: gyms }] = await Promise.all([
  sb.rpc("get_public_admin_settings"),
  sb.from("profiles").select("*").is("archived_at", null),
  sb.from("routes").select("*"),
  sb.from("gyms").select("*").is("archived_at", null),
]);

const settings = settingsRows?.[0];
const results = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from("results").select("*").range(from, from + 999);
  if (error) throw error;
  results.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}

const { buildRankingRowsForScope, getStageRange, buildSeasonRangeFromQualification } = await import(
  "../src/app/pages/participant/participantData.ts"
);

const getClassName = (birthDate, gender) => {
  if (!birthDate || !gender) return null;
  const cutoff = new Date(`${settings.age_cutoff_date || settings.qualification_start}T00:00:00Z`);
  const birth = new Date(`${birthDate}T00:00:00Z`);
  let age = cutoff.getUTCFullYear() - birth.getUTCFullYear();
  const md = cutoff.getUTCMonth() - birth.getUTCMonth();
  if (md < 0 || (md === 0 && cutoff.getUTCDate() < birth.getUTCDate())) age -= 1;
  const u15Max = settings.age_u16_max ?? 14;
  const u40Min = settings.age_u40_min ?? 40;
  if (age <= u15Max) return `U15-${gender}`;
  if (age < u40Min) return `Ü15-${gender}`;
  return `Ü40-${gender}`;
};

const stages = settings.stages?.length
  ? settings.stages
  : [];
const mayStage = stages.find((s) => s.key?.includes("2026-05") || s.label?.includes("Mai")) ?? stages[0];
const seasonRange = buildSeasonRangeFromQualification(settings.qualification_start, settings.qualification_end);
const stageRange = mayStage ? getStageRange(mayStage.key, stages) : null;

const seasonRows = buildRankingRowsForScope({
  profiles: profiles ?? [],
  results,
  routes: routes ?? [],
  gyms: gyms ?? [],
  leagueScope: "lead",
  gender: "w",
  ageScope: "UE15",
  seasonRange,
  getClassName,
});

const stageRows = stageRange
  ? buildRankingRowsForScope({
      profiles: profiles ?? [],
      results,
      routes: routes ?? [],
      gyms: gyms ?? [],
      leagueScope: "lead",
      gender: "w",
      ageScope: "UE15",
      stageRange,
      getClassName,
    })
  : [];

const natalieSeason = seasonRows.find((r) => r.profileId === natalieId);
const natalieStage = stageRows.find((r) => r.profileId === natalieId);
const totalResults = results.length;
const gymStats = await fetchGymCommunityStats();

const { data: publicRankings } = await sb.rpc("get_public_rankings", {
  p_league: "lead",
  p_class: "ue15-w",
});

const publicNatalie = (publicRankings ?? []).find((r) =>
  r.display_name?.toLowerCase().includes("natalie"),
);

console.log("=== E2E Ranking Verification ===");
console.log(`Total results in DB: ${totalResults}`);
console.log(`Season range: ${settings.qualification_start} – ${settings.qualification_end}`);
console.log(`May stage: ${mayStage?.label ?? "n/a"} (${mayStage?.start} – ${mayStage?.end})`);
console.log("");
console.log("Natalie Fritsch (Vorstieg Ü15 w):");
console.log(`  Season app logic: ${natalieSeason?.points ?? "n/a"} pts, rank #${natalieSeason?.rank ?? "n/a"}`);
console.log(`  Etappe 1 app logic: ${natalieStage?.points ?? "n/a"} pts, rank #${natalieStage?.rank ?? "n/a"}`);
console.log(`  Public SQL top list: ${publicNatalie ? `${publicNatalie.points} pts, rank #${publicNatalie.rank}` : "not in top 50"}`);
console.log("");
console.log(`Etappe 1 winner Ü15 w Vorstieg: ${stageRows[0]?.name ?? "n/a"} (${stageRows[0]?.points ?? 0} pts)`);
console.log(`Gym community stats entries: ${gymStats.length} gyms`);
console.log(
  `Sample gym avg: ${gymStats.find((g) => g.average_points_per_route)?.average_points_per_route?.toFixed(2) ?? "n/a"}`,
);

const checks = [
  ["DB has >1000 results", totalResults > 1000],
  ["Natalie season ~410", natalieSeason?.points === 410],
  ["Public RPC Natalie ~410", publicNatalie?.points === 410],
  ["Natalie etappe ~239.5", Math.abs((natalieStage?.points ?? 0) - 239.5) < 0.01],
  ["Natalie etappe #1", natalieStage?.rank === 1],
  ["Gym stats API responds", Array.isArray(gymStats) && gymStats.length > 0],
];

console.log("");
console.log("Checks:");
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`  ${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed += 1;
}
process.exit(failed > 0 ? 1 : 0);
