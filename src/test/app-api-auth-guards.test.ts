const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/services/supabase", () => ({
  isSupabaseConfigured: true,
  supabaseConfig: {
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  },
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
    },
  },
}));

import { deleteGym, redeemGymCode, redeemMasterCode } from "@/services/appApi";

describe("appApi auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null } });
    global.fetch = vi.fn();
  });

  it("does not call redeem-gym-code without a session token", async () => {
    const result = await redeemGymCode("KL-1234");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("erneut");
  });

  it("does not call redeem-master-code without a session token", async () => {
    const result = await redeemMasterCode("KL-MASTER-1234");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("erneut");
  });

  it("does not call delete-gym without a session token", async () => {
    const result = await deleteGym("gym-1");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("erneut");
  });
});
