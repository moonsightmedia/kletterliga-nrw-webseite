import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));

import {
  correctCompetitionResult, getCompetitionAdmin, getCompetitionDay,
  getCompetitionStaffRoutes, getCompetitionJudgeRoutes, getCompetitionJudgeAccessStatus, listCompetitionStandings, saveCompetitionConfig,
  saveCompetitionRouteDraft,
  setCompetitionJudgePassword, setCompetitionPhase, setCompetitionStaff, submitCompetitionResult,
} from "@/services/competitionDay";

const config = {
  routes: Array.from({ length: 12 }, (_, index) => ({ number: index + 1, name: `Route ${index + 1}`, grade: "6a", color: "blau" })),
  assignments: [{ league: "lead" as const, class_label: "U15", route_numbers: [1, 2, 3, 4, 5] }],
  zone_points: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], flash_bonus: 2,
};

describe("competition-day RPC contract", () => {
  beforeEach(() => rpc.mockReset());

  it("loads participant state with the requested season and returns no secret fields", async () => {
    const day = { event: null, eligible: false, league: null, class_label: null, routes: [], results: [], is_staff: false, is_admin: false };
    rpc.mockResolvedValue({ data: day, error: null });
    await expect(getCompetitionDay("2026")).resolves.toEqual(day);
    expect(rpc).toHaveBeenCalledWith("get_competition_day", { p_season: "2026" });
  });

  it("keeps QR tokens behind the staff route RPC", async () => {
    rpc.mockResolvedValue({ data: [{ id: "route-id", number: 1, name: "Route", grade: "6a", color: "blau", qr_token: "opaque" }], error: null });
    await getCompetitionStaffRoutes("2026");
    expect(rpc).toHaveBeenCalledWith("get_competition_staff_routes", { p_season: "2026" });
  });

  it("uses dedicated shared-code RPCs without altering participant authorization", async () => {
    const code = "AbCdEfGhJkMnPqRsTuVwXyZ2";
    rpc.mockResolvedValue({ data: null, error: null });
    await setCompetitionJudgePassword("2026", code);
    await getCompetitionJudgeAccessStatus("2026");
    await getCompetitionJudgeRoutes("2026", code);
    expect(rpc.mock.calls).toEqual([
      ["set_competition_judge_password", { p_season: "2026", p_password: code }],
      ["get_competition_judge_access_status", { p_season: "2026" }],
      ["get_competition_judge_routes", { p_season: "2026", p_password: code }],
    ]);
  });

  it("sends config, phase, and event staff changes through fixed RPCs", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await saveCompetitionConfig("2026", config);
    await setCompetitionPhase("2026", "open");
    await setCompetitionStaff("2026", "profile-id", true);
    expect(rpc.mock.calls).toEqual([
      ["save_competition_config", { p_season: "2026", p_config: config }],
      ["set_competition_phase", { p_season: "2026", p_phase: "open" }],
      ["set_competition_staff", { p_season: "2026", p_profile_id: "profile-id", p_enabled: true }],
    ]);
  });

  it("sends only the route list for a provisional draft", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await saveCompetitionRouteDraft("2026", config.routes);
    expect(rpc).toHaveBeenCalledWith("save_competition_route_draft", { p_season: "2026", p_routes: config.routes });
  });

  it("always saves one point per zone while preserving the existing flash bonus", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await saveCompetitionConfig("2026", { ...config, zone_points: Array.from({ length: 11 }, (_, zone) => zone * 5) });
    expect(rpc).toHaveBeenCalledWith("save_competition_config", {
      p_season: "2026", p_config: { ...config, zone_points: Array.from({ length: 11 }, (_, zone) => zone) },
    });
  });

  it("sends participant submissions without a caller supplied identity", async () => {
    rpc.mockResolvedValue({ data: { id: "result-id" }, error: null });
    await submitCompetitionResult({ season: "2026", routeId: "route-id", zone: 10, flash: true, qrToken: "opaque" });
    expect(rpc).toHaveBeenCalledWith("submit_competition_result", {
      p_season: "2026", p_route_id: "route-id", p_zone: 10, p_flash: true, p_qr_token: "opaque",
    });
  });

  it("requires a reason for the audited admin correction RPC", async () => {
    rpc.mockResolvedValue({ data: { id: "result-id" }, error: null });
    await correctCompetitionResult({ resultId: "result-id", zone: 9, flash: false, reason: "judge entry correction" });
    expect(rpc).toHaveBeenCalledWith("correct_competition_result", {
      p_result_id: "result-id", p_zone: 9, p_flash: false, p_reason: "judge entry correction",
    });
  });

  it("loads the admin contract and tied standings through non-secret RPCs", async () => {
    rpc.mockResolvedValue({ data: { config, staff: [], results: [] }, error: null });
    await getCompetitionAdmin("2026");
    expect(rpc).toHaveBeenLastCalledWith("get_competition_admin", { p_season: "2026" });
    rpc.mockResolvedValue({ data: [], error: null });
    await listCompetitionStandings("2026");
    expect(rpc).toHaveBeenLastCalledWith("list_competition_standings", { p_season: "2026" });
  });

  it.each([
    ["LEAGUE_ADMIN_REQUIRED", "Liga-Administration"],
    ["COMPETITION_STAFF_REQUIRED", "Staff"],
    ["COMPETITION_NOT_OPEN", "geschlossen"],
    ["COMPETITION_NOT_ELIGIBLE", "startberechtigt"],
    ["COMPETITION_QR_INVALID", "QR-Code"],
    ["COMPETITION_RESULT_IMMUTABLE", "nicht geändert"],
    ["COMPETITION_CONFIG_LOCKED", "gesperrt"],
    ["COMPETITION_DRAFT_ONLY", "Routenentwurf"],
  ])("shows a useful message for %s", async (marker, message) => {
    rpc.mockResolvedValue({ data: null, error: { message: marker } });
    await expect(getCompetitionDay("2026")).rejects.toThrow(message);
  });
});
