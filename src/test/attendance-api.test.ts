import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));
import { getCompetitionAttendance, setCompetitionAttendance, setCompetitionAttendancePassword } from "@/services/competitionAttendance";
beforeEach(() => rpc.mockReset().mockResolvedValue({ data: {}, error: null }));
describe("attendance transaction API", () => {
  it("sends the version and request ID with the authenticated crew action", async () => {
    await setCompetitionAttendance("2026", "synthetic-profile", "late-register", 4, "synthetic-request", null, "synthetic-fixture-only");
    expect(rpc).toHaveBeenCalledWith("set_competition_attendance", {
      p_season: "2026", p_profile: "synthetic-profile", p_action: "late-register", p_version: 4,
      p_request_id: "synthetic-request", p_reason: null, p_password: "synthetic-fixture-only",
    });
  });
  it("requests no public participant list without admin or crew authorization", async () => {
    await getCompetitionAttendance("2026");
    expect(rpc).toHaveBeenCalledWith("get_competition_attendance", { p_season: "2026", p_password: null });
  });
  it.each([
    ["ATTENDANCE_CONFLICT", "inzwischen geändert"],
    ["ATTENDANCE_PASSWORD_INVALID", "Einlasspasswort"],
    ["ATTENDANCE_CLASS_LOCKED", "Finalfeld"],
    ["ATTENDANCE_ROUTES_MISSING", "Halbfinalrouten"],
    ["ATTENDANCE_RESULTS_EXIST", "bereits Halbfinalergebnisse"],
    ["COMPETITION_DEADLINE_REACHED", "Nachmeldungen sind geschlossen"],
    ["COMPETITION_NOT_ELIGIBLE", "Startberechtigung fehlt"],
  ])("reports %s without exposing raw database errors", async (code, expected) => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: code } });
    await expect(getCompetitionAttendance("2026")).rejects.toThrow(expected);
  });
  it("supports immediate credential revocation without generating a replacement", async () => {
    await setCompetitionAttendancePassword("2026", null);
    expect(rpc).toHaveBeenCalledWith("set_competition_attendance_password", { p_season: "2026", p_password: null });
  });
});
