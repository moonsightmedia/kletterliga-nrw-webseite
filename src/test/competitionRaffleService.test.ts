import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));
import { raffleSource } from "@/services/competitionRaffle";

describe("raffle repeated wins", () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: {}, error: null }); });
  it("keeps previous winners in every participant filter", async () => {
    for (const scope of ["all", "semifinal", "final"] as const) {
      await raffleSource.get("2026", scope, scope !== "all");
      expect(rpc).toHaveBeenLastCalledWith("get_competition_raffle", {
        p_season: "2026", p_scope: scope, p_present_only: scope !== "all", p_repeat_allowed: true,
      });
    }
  });
  it("explicitly permits repeated winners on a new draw", async () => {
    await raffleSource.draw("2026", { scope: "semifinal", present_only: true, request_id: "request-1", prize: "Board" });
    expect(rpc).toHaveBeenCalledWith("draw_competition_raffle", {
      p_season: "2026", p_scope: "semifinal", p_present_only: true, p_request_id: "request-1", p_prize: "Board", p_repeat_allowed: true,
    });
  });
});
