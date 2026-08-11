import { fireEvent, render, screen, within } from "@testing-library/react";
import GymRoutesAdmin from "@/app/pages/admin/GymRoutesAdmin";
import { useAuth } from "@/app/auth/AuthProvider";

const appApiMocks = vi.hoisted(() => ({
  createRoute: vi.fn(),
  deleteRoute: vi.fn(),
  getGymRouteHighlights: vi.fn(),
  listGymAdminsByProfile: vi.fn(),
  listRoutesByGym: vi.fn(),
  updateRoute: vi.fn(),
}));

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  createRoute: appApiMocks.createRoute,
  deleteRoute: appApiMocks.deleteRoute,
  getGymRouteHighlights: appApiMocks.getGymRouteHighlights,
  listGymAdminsByProfile: appApiMocks.listGymAdminsByProfile,
  listRoutesByGym: appApiMocks.listRoutesByGym,
  updateRoute: appApiMocks.updateRoute,
}));

vi.mock("@/components/ui/use-toast", () => ({ toast: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const routes = [
  {
    id: "route-1",
    gym_id: "gym-1",
    discipline: "toprope" as const,
    code: "T1",
    name: "Alpha",
    setter: null,
    color: "blau",
    grade_range: null,
    active: true,
  },
  {
    id: "route-2",
    gym_id: "gym-1",
    discipline: "toprope" as const,
    code: "T2",
    name: "Beta",
    setter: null,
    color: "rot",
    grade_range: null,
    active: true,
  },
];

describe("GymRoutesAdmin route ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      profile: { id: "gym-admin-1", role: "gym_admin" },
    } as ReturnType<typeof useAuth>);
    appApiMocks.listGymAdminsByProfile.mockResolvedValue({
      data: [{ gym_id: "gym-1" }],
      error: null,
    });
    appApiMocks.listRoutesByGym.mockResolvedValue({ data: routes, error: null });
    appApiMocks.createRoute.mockResolvedValue({ data: null, error: null });
    appApiMocks.deleteRoute.mockResolvedValue({ data: null, error: null });
    appApiMocks.updateRoute.mockResolvedValue({ data: null, error: null });
  });

  it("maps rating aggregates by route id instead of response order", async () => {
    appApiMocks.getGymRouteHighlights.mockResolvedValue({
      data: {
        gym_id: "gym-1",
        rating_count: 3,
        average_rating: 3.5,
        route_stats: [
          { route_id: "route-2", rating_count: 1, average_rating: 2, entry_count: 1 },
          { route_id: "route-1", rating_count: 2, average_rating: 4.5, entry_count: 2 },
        ],
      },
      error: null,
    });

    render(<GymRoutesAdmin />);

    const alphaHeading = await screen.findByText(/T1.*Alpha/);
    const betaHeading = screen.getByText(/T2.*Beta/);
    const alphaCard = alphaHeading.closest(".border-2");
    const betaCard = betaHeading.closest(".border-2");

    expect(alphaCard).not.toBeNull();
    expect(betaCard).not.toBeNull();
    expect(within(alphaCard as HTMLElement).getByText(/Ø 4,5.*2 Bewertungen/)).toBeInTheDocument();
    expect(within(betaCard as HTMLElement).getByText(/Ø 2.*1 Bewertung/)).toBeInTheDocument();
  });

  it("keeps route editing available when ratings cannot be loaded", async () => {
    appApiMocks.getGymRouteHighlights.mockResolvedValue({
      data: null,
      error: { message: "Bewertungen nicht erreichbar" },
    });

    render(<GymRoutesAdmin />);

    expect(await screen.findAllByText("Bewertungen derzeit nicht verfügbar")).toHaveLength(2);
    const editButtons = screen.getAllByRole("button", { name: "Bearbeiten" });
    expect(editButtons).toHaveLength(2);

    fireEvent.click(editButtons[0]);
    expect(await screen.findByText("Route bearbeiten")).toBeInTheDocument();
  });
});
