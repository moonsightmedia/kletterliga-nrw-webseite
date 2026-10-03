import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/services/supabase", () => ({ supabase: { rpc } }));
import { raffleSource, raffleWinnersCsv } from "@/services/competitionRaffle";

describe("raffle repeated wins", () => {
  beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: {}, error: null }); });
  it.each([true,false])("forwards repeat policy %s in every participant filter", async (repeatAllowed) => {
    for (const scope of ["all", "semifinal"] as const) {
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
  it("requests dispatch details separately from the TV pool",async()=>{
    await raffleSource.export!("2026");
    expect(rpc).toHaveBeenCalledWith("export_competition_raffle_winners",{p_season:"2026"});
  });
  it("exports every win with contact and prize and neutralizes spreadsheet formulas",()=>{
    const row={id:"d1",profile_id:"p1",winner_name:"Peter",email:"peter@example.test",prize:'Board "Spezial"',created_at:"2026-10-03T11:00:00Z",scope:"semifinal" as const};
    const csv=raffleWinnersCsv([row,{...row,id:"d2",prize:"=HYPERLINK(bad)"},{...row,id:"d3",prize:null}]);
    expect(csv).toContain('"Peter";"peter@example.test";"Board ""Spezial"""');
    expect(csv).toContain('"\'=HYPERLINK(bad)"');
    expect(csv).toContain("Überraschungsgewinn");
    expect(csv.split("\r\n")).toHaveLength(4);
  });
});
