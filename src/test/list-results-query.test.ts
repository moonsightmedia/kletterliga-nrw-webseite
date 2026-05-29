import { beforeEach, describe, expect, it, vi } from "vitest";

const returns = vi.fn();
const range = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();

vi.mock("@/services/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: { from },
  supabaseConfig: { url: "https://test.supabase.co", anonKey: "test-key" },
}));

describe("listResultsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returns.mockResolvedValue({ data: [], error: null });
    range.mockReturnValue({ returns });
    eq.mockReturnValue({ range });
    select.mockReturnValue({ eq, range });
    from.mockReturnValue({ select });
  });

  it("applies profile filter only after select", async () => {
    const { listResultsForUser } = await import("@/services/appApi");

    await listResultsForUser("profile-123", { includeArchived: true });

    expect(from).toHaveBeenCalledWith("results");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("profile_id", "profile-123");
    expect(range).toHaveBeenCalledWith(0, 999);
  });
});
