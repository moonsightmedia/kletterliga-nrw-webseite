import { render, screen, within } from "@testing-library/react";
import { useAuth } from "@/app/auth/AuthProvider";
import { useGymAdminOverviewQuery } from "@/app/pages/admin/gymAdminQueries";
import GymAdminDashboard from "@/app/pages/admin/GymAdminDashboard";
import GymStats from "@/app/pages/admin/GymStats";

const appApiMocks = vi.hoisted(() => ({
  getGym: vi.fn(),
  listGymCodesByGym: vi.fn(),
}));

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/admin/gymAdminQueries", () => ({
  useGymAdminOverviewQuery: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  getGym: appApiMocks.getGym,
  listGymCodesByGym: appApiMocks.listGymCodesByGym,
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseOverview = vi.mocked(useGymAdminOverviewQuery);

const overviewData = {
  gymId: "gym-1",
  routes: [
    {
      id: "route-1",
      gym_id: "gym-1",
      discipline: "toprope" as const,
      code: "T1",
      name: "Testkante",
      setter: null,
      color: "blau",
      grade_range: null,
      active: true,
    },
  ],
  results: {
    gym_id: "gym-1",
    result_count: 1,
    participant_count: 1,
    flash_count: 0,
    average_score: 5,
    route_stats: [
      { route_id: "route-1", result_count: 1, flash_count: 0, average_score: 5 },
    ],
    daily_results: [],
    results: [],
    next_cursor: null,
  },
  highlights: null,
  highlightsError: "Bewertungen nicht erreichbar",
};

describe("gym admin auxiliary loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      profile: { id: "gym-admin-1", role: "gym_admin" },
    } as ReturnType<typeof useAuth>);
    mockedUseOverview.mockReturnValue({
      data: overviewData,
      loading: false,
      refreshing: false,
      error: null,
      reload: vi.fn().mockResolvedValue(undefined),
    });
    appApiMocks.getGym.mockResolvedValue({
      data: {
        id: "gym-1",
        name: "Kletterhalle Test",
        city: "Münster",
        postal_code: null,
        address: null,
        website: null,
        logo_url: null,
        opening_hours: null,
      },
      error: null,
    });
  });

  it("does not present pending dashboard code data as real zero values", async () => {
    appApiMocks.listGymCodesByGym.mockReturnValue(new Promise(() => undefined));

    render(<GymAdminDashboard />);

    expect(await screen.findByText("Hallencodes werden geladen")).toBeInTheDocument();
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
    expect(screen.queryByText("Noch keine Hallencodes")).not.toBeInTheDocument();
  });

  it("shows a statistics error instead of converting a failed code request to zero percent", async () => {
    appApiMocks.listGymCodesByGym.mockResolvedValue({
      data: null,
      error: { message: "Hallencodes nicht erreichbar" },
    });

    render(<GymStats />);

    expect((await screen.findAllByText("Hallencodes nicht erreichbar")).length).toBeGreaterThan(0);
    const codeCard = screen.getByText("Code-Einlösung").closest(".group");
    expect(codeCard).not.toBeNull();
    expect(within(codeCard as HTMLElement).getByText("–")).toBeInTheDocument();
    expect(within(codeCard as HTMLElement).queryByText("0%", { exact: true })).not.toBeInTheDocument();
  });
});
