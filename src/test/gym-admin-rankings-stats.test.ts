import { buildGymAdminRankings } from "../../supabase/functions/get-gym-admin-rankings/rankings.ts";

const settings = {
  qualification_start: "2026-05-01",
  qualification_end: "2026-09-30",
  age_cutoff_date: "2026-05-01",
  age_u16_max: 14,
  age_u40_min: 40,
};

const profiles = [
  {
    id: "p-b",
    email: "berta@example.com",
    first_name: "Berta",
    last_name: "Berg",
    birth_date: "1990-01-01",
    gender: "m" as const,
    league: "toprope" as const,
    role: "participant",
    participation_activated_at: "2026-05-01T00:00:00.000Z",
    archived_at: null,
  },
  {
    id: "p-a",
    email: "anton@example.com",
    first_name: "Anton",
    last_name: "Alpin",
    birth_date: "1990-01-01",
    gender: "m" as const,
    league: null,
    role: "participant",
    participation_activated_at: "2026-05-01T00:00:00.000Z",
    archived_at: null,
  },
  {
    id: "archived",
    email: "archiv@example.com",
    first_name: "Archiv",
    last_name: "Person",
    birth_date: "1990-01-01",
    gender: "m" as const,
    league: "toprope" as const,
    role: "participant",
    participation_activated_at: "2026-05-01T00:00:00.000Z",
    archived_at: "2026-08-01T00:00:00.000Z",
  },
];

const routes = [
  { id: "toprope", discipline: "toprope" as const },
  { id: "second-toprope", discipline: "toprope" as const },
  { id: "lead", discipline: "lead" as const },
];

describe("buildGymAdminRankings", () => {
  it("matches participant scoring, season range and deterministic tie ordering", () => {
    const rows = buildGymAdminRankings({
      league: "toprope",
      gender: "m",
      age: "UE15",
      profiles,
      routes,
      results: [
        { profile_id: "p-b", route_id: "toprope", points: 10, flash: true, created_at: "2026-06-01T10:00:00Z" },
        { profile_id: "p-b", route_id: "second-toprope", points: 10, flash: true, created_at: "2026-06-02T10:00:00Z" },
        { profile_id: "p-a", route_id: "toprope", points: 10, flash: true, created_at: "2026-06-01T10:00:00Z" },
        { profile_id: "p-a", route_id: "second-toprope", points: 10, flash: true, created_at: "2026-06-02T10:00:00Z" },
        { profile_id: "p-a", route_id: "lead", points: 10, flash: true, created_at: "2026-06-03T10:00:00Z" },
        { profile_id: "p-b", route_id: "toprope", points: 10, flash: true, created_at: "2026-10-01T10:00:00Z" },
      ],
      settings,
    });

    expect(rows).toEqual([
      { rank: 1, display_name: "Anton Alpin", points: 22 },
      { rank: 2, display_name: "Berta Berg", points: 22 },
    ]);
    expect(Object.keys(rows[0])).toEqual(["rank", "display_name", "points"]);
  });

  it("uses the participant fallback of an unbounded season when the range is incomplete", () => {
    expect(
      buildGymAdminRankings({
        league: "toprope",
        gender: "m",
        age: "UE15",
        profiles,
        routes,
        results: [
          {
            profile_id: "p-b",
            route_id: "toprope",
            points: 10,
            flash: false,
            created_at: "2027-01-01T10:00:00Z",
          },
        ],
        settings: { ...settings, qualification_end: null },
      }),
    ).toEqual([
      { rank: 1, display_name: "Berta Berg", points: 10 },
      { rank: 2, display_name: "Anton Alpin", points: 0 },
    ]);
  });

  it("uses the canonical email fallback only for ordering and never returns it", () => {
    const rows = buildGymAdminRankings({
      league: "toprope",
      gender: "m",
      age: "UE15",
      profiles: [
        {
          ...profiles[0],
          id: "named",
          first_name: "Berta",
          last_name: "Berg",
          email: "berta@example.com",
        },
        {
          ...profiles[0],
          id: "unnamed",
          first_name: null,
          last_name: null,
          email: "anna@example.com",
        },
      ],
      routes,
      results: [],
      settings,
    });

    expect(rows).toEqual([
      { rank: 1, display_name: "Unbekannt", points: 0 },
      { rank: 2, display_name: "Berta Berg", points: 0 },
    ]);
    expect(JSON.stringify(rows)).not.toContain("anna@example.com");
  });
});
