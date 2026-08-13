import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GymResults from "@/app/pages/admin/GymResults";
import { useAuth } from "@/app/auth/AuthProvider";
import { useGymAdminOverviewQuery } from "@/app/pages/admin/gymAdminQueries";
import { getGymAdminResults } from "@/services/appApi";
import type {
  GymAdminOverviewData,
} from "@/app/pages/admin/gymAdminQueries";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/admin/gymAdminQueries", async () => {
  const actual = await vi.importActual<typeof import("@/app/pages/admin/gymAdminQueries")>(
    "@/app/pages/admin/gymAdminQueries",
  );
  return {
    ...actual,
    useGymAdminOverviewQuery: vi.fn(),
  };
});

vi.mock("@/services/appApi", () => ({
  getGymAdminResults: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseOverview = vi.mocked(useGymAdminOverviewQuery);
const mockedGetGymAdminResults = vi.mocked(getGymAdminResults);
const reload = vi.fn().mockResolvedValue(undefined);

const openIndividualResults = () => {
  const tab = screen.getByRole("tab", { name: "Einzelergebnisse" });
  fireEvent.click(tab);
};

const privateResult = {
  id: "result-1",
  route_id: "route-1",
  points: 7,
  flash: true,
  status: "sent",
  rating: 4,
  submitted_on: "2026-08-10",
  edited: false,
  created_at: "2026-08-10T10:00:00.000Z",
  updated_at: null,
  participant_name: "Eva Geheim",
  email: "eva.geheim@example.com",
  feedback: "Privater Freitext",
};

const populatedOverview: GymAdminOverviewData = {
  gymId: "gym-1",
  routes: [
    {
      id: "route-1",
      gym_id: "gym-1",
      discipline: "toprope",
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
    flash_count: 1,
    average_score: 8,
    route_stats: [
      { route_id: "route-1", result_count: 1, flash_count: 1, average_score: 8 },
    ],
    daily_results: [],
    results: [privateResult],
    next_cursor: null,
  },
  highlights: {
    gym_id: "gym-1",
    rating_count: 1,
    average_rating: 4,
    route_stats: [
      { route_id: "route-1", rating_count: 1, average_rating: 4, entry_count: 1 },
    ],
  },
  highlightsError: null,
};

const mockOverview = ({
  data = populatedOverview,
  loading = false,
  error = null,
}: {
  data?: GymAdminOverviewData;
  loading?: boolean;
  error?: string | null;
} = {}) => {
  mockedUseOverview.mockReturnValue({
    data,
    loading,
    refreshing: false,
    error,
    reload,
  });
};

describe("GymResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      profile: { id: "gym-admin-1", role: "gym_admin" },
    } as ReturnType<typeof useAuth>);
    mockOverview();
  });

  it("renders route results and ratings without exposing private participant data or admin actions", () => {
    render(<GymResults />);

    expect(screen.getByRole("tab", { name: "Nach Routen" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Route T1/)).toHaveTextContent("Route T1 · Testkante");
    expect(screen.getByText("Gesamter Datenbestand")).toBeInTheDocument();

    openIndividualResults();

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Flash")).toBeInTheDocument();
    expect(screen.getByText("4 von 5")).toBeInTheDocument();
    expect(screen.getByText("Nur Lesen")).toBeInTheDocument();

    expect(screen.queryByText("Eva Geheim")).not.toBeInTheDocument();
    expect(screen.queryByText("eva.geheim@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("Privater Freitext")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /bearbeiten|löschen|verlauf/i }),
    ).not.toBeInTheDocument();
  });

  it("supports arrow, Home and End keys in the result view tabs", () => {
    render(<GymResults />);

    const routeTab = screen.getByRole("tab", { name: "Nach Routen" });
    const resultTab = screen.getByRole("tab", { name: "Einzelergebnisse" });
    routeTab.focus();

    fireEvent.keyDown(routeTab, { key: "ArrowRight" });
    expect(resultTab).toHaveAttribute("aria-selected", "true");
    expect(resultTab).toHaveFocus();

    fireEvent.keyDown(resultTab, { key: "Home" });
    expect(routeTab).toHaveAttribute("aria-selected", "true");
    expect(routeTab).toHaveFocus();

    fireEvent.keyDown(routeTab, { key: "End" });
    expect(resultTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows a stable empty state for an assigned hall without results", () => {
    mockOverview({
      data: {
        ...populatedOverview,
        results: {
          ...populatedOverview.results!,
          result_count: 0,
          participant_count: 0,
          flash_count: 0,
          average_score: null,
          results: [],
        },
      },
    });

    render(<GymResults />);
    openIndividualResults();

    expect(screen.getByText("Für diese Halle liegen noch keine Ergebnisse vor.")).toBeInTheDocument();
  });

  it("shows query errors and retries on request", async () => {
    mockOverview({ error: "Hallenergebnisse sind gerade nicht erreichbar" });

    render(<GymResults />);

    expect(screen.getByText("Hallenergebnisse sind gerade nicht erreichbar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("explains a missing hall assignment without rendering an empty results dashboard", () => {
    mockOverview({
      data: {
        gymId: null,
        routes: [],
        results: null,
        highlights: null,
        highlightsError: null,
      },
    });

    render(<GymResults />);

    expect(screen.getByText(/Keine Halle zugewiesen/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ergebnisse & Bewertungen" })).toBeInTheDocument();
  });

  it("loads the next anonymous result page with the assigned hall and cursor", async () => {
    mockOverview({
      data: {
        ...populatedOverview,
        results: {
          ...populatedOverview.results!,
          result_count: 2,
          next_cursor: "1",
        },
      },
    });
    mockedGetGymAdminResults.mockResolvedValue({
      data: {
        ...populatedOverview.results!,
        result_count: 2,
        results: [
          {
            route_id: "route-1",
            points: 3,
            flash: false,
            status: "sent",
            rating: null,
            submitted_on: "2026-08-09",
            edited: false,
          },
        ],
        next_cursor: null,
      },
      error: null,
    });

    render(<GymResults />);
    openIndividualResults();
    fireEvent.click(screen.getByRole("button", { name: "Weitere Ergebnisse laden" }));

    await waitFor(() => {
      expect(mockedGetGymAdminResults).toHaveBeenCalledWith("gym-1", {
        limit: 50,
        cursor: "1",
      });
    });
    expect(await screen.findByText("Nicht bewertet", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("2 von 2 geladenen Ergebnissen")).toBeInTheDocument();
  });

  it("filters the complete route overview independently from loaded result pages", () => {
    mockOverview({
      data: {
        ...populatedOverview,
        routes: [
          ...populatedOverview.routes,
          {
            id: "route-10",
            gym_id: "gym-1",
            discipline: "lead",
            code: "T10",
            name: "Vorstiegsdach",
            setter: null,
            color: "rot",
            grade_range: null,
            active: true,
          },
        ],
        results: {
          ...populatedOverview.results!,
          route_stats: [
            ...populatedOverview.results!.route_stats,
            { route_id: "route-10", result_count: 0, flash_count: 0, average_score: null },
          ],
        },
      },
    });

    render(<GymResults />);

    expect(screen.getByText("2 von 2 Routen")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Disziplin"), { target: { value: "lead" } });

    expect(screen.getByText("1 von 2 Routen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Route T10/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Route T1 · Testkante/ })).not.toBeInTheDocument();
  });

  it("marks historical route ratings as unavailable instead of unrated", () => {
    mockOverview({
      data: {
        ...populatedOverview,
        routes: populatedOverview.routes.map((route) => ({ ...route, active: false })),
      },
    });

    render(<GymResults />);

    expect(screen.getByText("Für inaktive Route nicht verfügbar")).toBeInTheDocument();
    expect(screen.queryByText("Keine Bewertung")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Bewertung"), { target: { value: "unrated" } });
    expect(screen.getByText("Für diese Filter wurden keine passenden Routen gefunden.")).toBeInTheDocument();
  });
});
