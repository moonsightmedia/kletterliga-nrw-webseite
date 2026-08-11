const appApiMocks = vi.hoisted(() => ({
  checkGymCodeRedeemed: vi.fn(),
  fetchViewerMasterRedemptionForViewer: vi.fn(),
  getGym: vi.fn(),
  getGymRouteHighlights: vi.fn(),
  getParticipantCompetitionData: vi.fn(),
  listGymCommunityStats: vi.fn(),
  listGyms: vi.fn(),
  listResultsForUser: vi.fn(),
  listRoutes: vi.fn(),
  listRoutesByGym: vi.fn(),
}));

vi.mock("@/services/appApi", () => appApiMocks);

import { fetchParticipantGymDetailData } from "@/app/pages/participant/participantQueries";

describe("fetchParticipantGymDetailData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appApiMocks.getGym.mockResolvedValue({ data: { id: "gym-1", name: "Testhalle" }, error: null });
    appApiMocks.listRoutesByGym.mockResolvedValue({ data: [], error: null });
    appApiMocks.listResultsForUser.mockResolvedValue({ data: [], error: null });
    appApiMocks.checkGymCodeRedeemed.mockResolvedValue({ data: true, error: null });
  });

  it("keeps core hall data available when the optional highlights endpoint fails", async () => {
    appApiMocks.getGymRouteHighlights.mockResolvedValue({
      data: null,
      error: { message: "Highlights nicht erreichbar" },
    });

    await expect(fetchParticipantGymDetailData("gym-1", "profile-1")).resolves.toMatchObject({
      gym: { id: "gym-1", name: "Testhalle" },
      routes: [],
      results: [],
      communityStats: null,
      communityStatsError: "Highlights nicht erreichbar",
      codeRedeemed: true,
    });
  });

  it("still rejects when required hall data fails", async () => {
    appApiMocks.getGym.mockResolvedValue({ data: null, error: { message: "Halle nicht erreichbar" } });
    appApiMocks.getGymRouteHighlights.mockResolvedValue({ data: null, error: null });

    await expect(fetchParticipantGymDetailData("gym-1", "profile-1")).rejects.toThrow(
      "Halle nicht erreichbar",
    );
  });

  it("also isolates an unexpected rejection from the optional highlights client", async () => {
    appApiMocks.getGymRouteHighlights.mockRejectedValue(new Error("unerwarteter Netzwerkfehler"));

    await expect(fetchParticipantGymDetailData("gym-1", "profile-1")).resolves.toMatchObject({
      gym: { id: "gym-1", name: "Testhalle" },
      communityStats: null,
      communityStatsError: "unerwarteter Netzwerkfehler",
      codeRedeemed: true,
    });
  });
});
