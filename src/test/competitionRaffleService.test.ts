import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));
import { raffleSource } from "@/services/competitionRaffle";

describe("raffle repeated wins", () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: {}, error: null }); });
  it.each([true,false])("forwards repeat policy %s in every participant filter", async (repeatAllowed) => {
    for (const scope of ["all", "semifinal", "final"] as const) {
      await raffleSource.get("2026", scope, scope !== "all", repeatAllowed);
      expect(rpc).toHaveBeenLastCalledWith("get_competition_raffle", {
        p_season: "2026", p_scope: scope, p_present_only: scope !== "all", p_repeat_allowed: repeatAllowed,
      });
    }
  });
  it.each([true,false])("snapshots repeat policy %s on a new draw", async (repeatAllowed) => {
    await raffleSource.draw("2026", { scope: "semifinal", present_only: true, repeat_allowed:repeatAllowed, request_id: "request-1", prize: "Board" });
    expect(rpc).toHaveBeenCalledWith("draw_competition_raffle", {
      p_season: "2026", p_scope: "semifinal", p_present_only: true, p_request_id: "request-1", p_prize: "Board", p_repeat_allowed: repeatAllowed,
    });
  });
});
