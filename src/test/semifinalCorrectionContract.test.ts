import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));
import { correctCompetitionResult } from "@/services/competitionDay";

describe("semifinal admin correction contract", () => {
  beforeEach(() => rpc.mockReset());
  const input = {
    resultId: "result-id",
    zone: 8,
    reason: "Papierliste geprüft",
    expected: { zone: 0, points: 0, changedAt: null },
  };
  it("passes the observed result and audit time to the transactional guarded correction", async () => {
    rpc.mockResolvedValue({ data: { zone: 8, points: 80 }, error: null });
    await expect(correctCompetitionResult(input)).resolves.toMatchObject({
      points: 80,
    });
    expect(rpc).toHaveBeenCalledWith("correct_competition_semifinal_result", {
      p_result_id: "result-id",
      p_zone: 8,
      p_reason: input.reason,
      p_expected_zone: 0,
      p_expected_points: 0,
      p_expected_changed_at: null,
    });
  });
  it("shows an actionable conflict instead of success when the server rejects a stale result", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "COMPETITION_VERSION_CONFLICT" },
    });
    await expect(correctCompetitionResult(input)).rejects.toThrow(
      "aktuellen Wert laden",
    );
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
