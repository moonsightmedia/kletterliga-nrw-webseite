import { fireEvent, render, screen } from "@testing-library/react";
import LeagueResults from "@/app/pages/admin/LeagueResults";

const appApiMocks = vi.hoisted(() => ({
  listResults: vi.fn(),
  listProfiles: vi.fn(),
  listRoutes: vi.fn(),
  listGyms: vi.fn(),
  listAuditEntries: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listResults: appApiMocks.listResults,
  listProfiles: appApiMocks.listProfiles,
  listRoutes: appApiMocks.listRoutes,
  listGyms: appApiMocks.listGyms,
  listAuditEntries: appApiMocks.listAuditEntries,
}));

describe("LeagueResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appApiMocks.listResults.mockResolvedValue({
      data: [
        {
          id: "result-1",
          profile_id: "profile-1",
          route_id: "route-1",
          points: 7.5,
          flash: true,
          status: "sent",
          rating: 4,
          feedback: "Super Route",
          created_at: "2026-03-20T12:00:00.000Z",
          updated_at: "2026-03-21T12:00:00.000Z",
        },
      ],
      error: null,
    });
    appApiMocks.listProfiles.mockResolvedValue({
      data: [
        {
          id: "profile-1",
          email: "eva@example.com",
          first_name: "Eva",
          last_name: "Eintrag",
          avatar_url: null,
          birth_date: null,
          gender: null,
          home_gym_id: null,
          league: "toprope",
          role: "participant",
          archived_at: null,
        },
      ],
      error: null,
    });
    appApiMocks.listRoutes.mockResolvedValue({
      data: [
        {
          id: "route-1",
          gym_id: "gym-1",
          discipline: "toprope",
          code: "A1",
          name: "Gelbe Wand",
          setter: null,
          color: null,
          grade_range: null,
          active: true,
        },
      ],
      error: null,
    });
    appApiMocks.listGyms.mockResolvedValue({
      data: [
        {
          id: "gym-1",
          name: "Kletterhalle West",
          city: "Dortmund",
          postal_code: null,
          address: null,
          website: null,
          logo_url: null,
          opening_hours: null,
          archived_at: null,
        },
      ],
      error: null,
    });
    appApiMocks.listAuditEntries.mockResolvedValue({
      data: [
        {
          id: "audit-1",
          entity_type: "result",
          entity_id: "result-1",
          action: "update",
          actor_user_id: "league-admin",
          before_data: { points: 5, feedback: "" },
          after_data: { points: 7.5, feedback: "Super Route" },
          created_at: "2026-03-21T12:00:00.000Z",
        },
      ],
      error: null,
    });
  });

  it("shows the audit history for a result", async () => {
    render(<LeagueResults />);

    expect(await screen.findByText("Eva Eintrag")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /verlauf fuer ergebnis a1 von eva eintrag anzeigen/i }));

    expect(await screen.findByText("Ergebnisverlauf")).toBeInTheDocument();
    expect(await screen.findByText("Punkte: 5 → 7.5")).toBeInTheDocument();
    expect(await screen.findByText("Feedback: — → Super Route")).toBeInTheDocument();
  });
});
