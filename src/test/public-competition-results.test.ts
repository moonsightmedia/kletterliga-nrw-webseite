import { beforeEach, describe, expect, it, vi } from "vitest";

const clients = vi.hoisted(() => {
  const publicRpc = vi.fn();
  return { publicRpc, userRpc: vi.fn(), createClient: vi.fn(() => ({ rpc: publicRpc })) };
});
vi.mock("@/services/supabase", () => ({
  supabase: { rpc: clients.userRpc },
  supabaseConfig: { url: "https://example.invalid", anonKey: "sb_publishable_test_fixture" },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: clients.createClient }));
import { getPublicSemifinal, getPublicFinal, getLiveCompetition, getFinalAdmin, saveFinalRoute } from "@/services/competitionFinal";

describe("public competition results without app authentication", () => {
  beforeEach(() => {
    clients.userRpc.mockReset().mockResolvedValue({ data: null, error: { message: "JWT expired" } });
    clients.publicRpc.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it("does not restore, refresh or detect an app login in the public client", async () => {
    await getPublicSemifinal("2026");
    expect(clients.createClient).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "kletterliga-public-results" },
    });
  });

  it("loads semifinal rankings while the authenticated client rejects an expired session", async () => {
    const rows = [{ name: "Testperson", points: 100, rank: 1 }];
    clients.publicRpc.mockResolvedValue({ data: rows, error: null });
    expect(await getPublicSemifinal("2026")).toEqual(rows);
    expect(clients.publicRpc).toHaveBeenCalledWith("get_competition_semifinal_public", { p_season: "2026" });
    expect(clients.userRpc).not.toHaveBeenCalled();
  });

  it("also reads final rankings anonymously", async () => {
    expect(await getPublicFinal("2026")).toEqual([]);
    expect(clients.publicRpc).toHaveBeenCalledWith("get_competition_final_public", { p_season: "2026" });
    expect(clients.userRpc).not.toHaveBeenCalled();
  });

  it("loads the public TV display without depending on an expired app session", async () => {
    const display = { phase: "semifinal", classes: [], notices: [] };
    clients.publicRpc.mockResolvedValue({ data: display, error: null });
    expect(await getLiveCompetition("2026")).toEqual(display);
    expect(clients.publicRpc).toHaveBeenCalledWith("get_competition_live", { p_season: "2026" });
    expect(clients.userRpc).not.toHaveBeenCalled();
  });

  it("keeps private administration and writes dependent on the authenticated client", async () => {
    await expect(getFinalAdmin("2026")).rejects.toThrow("JWT expired");
    await expect(saveFinalRoute("2026", 1, "Test", 30)).rejects.toThrow("JWT expired");
    expect(clients.publicRpc).not.toHaveBeenCalled();
  });
});
