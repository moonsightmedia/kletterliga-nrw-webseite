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

import {
  deleteGym,
  getGymAdminResults,
  getGymRouteHighlights,
  redeemGymCode,
  redeemMasterCode,
} from "@/services/appApi";

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

  it("does not call route highlights without a session token", async () => {
    const result = await getGymRouteHighlights("gym-1");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("erneut");
  });

  it("does not call gym admin results without a session token", async () => {
    const result = await getGymAdminResults("gym-1");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.error?.message).toContain("erneut");
  });

  it("returns a fail-soft error when the optional route highlights request rejects", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });
    global.fetch = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(getGymRouteHighlights("gym-1")).resolves.toEqual({
      data: null,
      error: { message: "Routenstatistik konnte nicht geladen werden." },
    });
  });

  it("returns a fail-soft error when reading the auth session rejects", async () => {
    supabaseMocks.getSession.mockRejectedValue(new Error("session storage unavailable"));

    await expect(getGymRouteHighlights("gym-1")).resolves.toEqual({
      data: null,
      error: { message: "Routenstatistik konnte nicht geladen werden." },
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("accepts only the aggregate route highlights contract", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        gym_id: "gym-1",
        rating_count: 2,
        average_rating: 4.5,
        route_stats: [
          {
            id: "private-result",
            route_id: "route-1",
            rating_count: 2,
            average_rating: 4.5,
            entry_count: 3,
          },
        ],
      }),
    });

    const result = await getGymRouteHighlights("gym-1");

    expect(result.error).toBeNull();
    expect(result.data?.rating_count).toBe(2);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/get-gym-route-highlights?gym_id=gym-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
      }),
    );
  });

  it("rejects malformed success payloads without throwing", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        gym_id: "gym-1",
        rating_count: 2,
        average_rating: 4.5,
        route_stats: null,
      }),
    });

    await expect(getGymRouteHighlights("gym-1")).resolves.toEqual({
      data: null,
      error: { message: "Routenstatistik hat ein unerwartetes Format." },
    });
  });

  it("accepts and sanitizes only the gym admin result whitelist", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        gym_id: "gym-1",
        result_count: 1,
        participant_count: 1,
        flash_count: 1,
        average_score: 6,
        route_stats: [
          { route_id: "route-1", result_count: 1, flash_count: 1, average_score: 6 },
        ],
        daily_results: [{ date: "2026-08-11", count: 1 }],
        results: [
          {
            route_id: "route-1",
            profile_id: "private-profile",
            email: "private@example.com",
            feedback: "private feedback",
            points: 5,
            flash: true,
            status: "climbed",
            rating: 4,
            submitted_on: "2026-08-11",
            edited: false,
          },
        ],
        next_cursor: null,
      }),
    });

    const response = await getGymAdminResults("gym-1", { limit: 25 });

    expect(response.error).toBeNull();
    expect(response.data?.results).toEqual([
      {
        route_id: "route-1",
        points: 5,
        flash: true,
        status: "climbed",
        rating: 4,
        submitted_on: "2026-08-11",
        edited: false,
      },
    ]);
    expect(JSON.stringify(response.data)).not.toContain("private-profile");
    expect(JSON.stringify(response.data)).not.toContain("private@example.com");
    expect(JSON.stringify(response.data)).not.toContain("private feedback");
    expect(JSON.stringify(response.data)).not.toContain("private-result");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/get-gym-admin-results?gym_id=gym-1&limit=25",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
      }),
    );
  });

  it("returns a controlled error when the gym admin result request rejects", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
    });
    global.fetch = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(getGymAdminResults("gym-1")).resolves.toEqual({
      data: null,
      error: { message: "Hallenergebnisse konnten nicht geladen werden." },
    });
  });
});
