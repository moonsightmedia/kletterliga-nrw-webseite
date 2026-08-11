import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route as RouterRoute, Routes } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import GymDetail from "@/app/pages/participant/GymDetail";
import { useParticipantGymDetailQuery } from "@/app/pages/participant/participantQueries";
import type { ParticipantGymDetailData } from "@/app/pages/participant/participantQueries";
import type { Result, Route } from "@/services/appTypes";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/participant/participantQueries", () => ({
  useParticipantGymDetailQuery: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParticipantGymDetailQuery = vi.mocked(useParticipantGymDetailQuery);

const routes: Route[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `toprope-${index + 1}`,
    gym_id: "gym-1",
    discipline: "toprope" as const,
    code: `T${index + 1}`,
    name: index === 0 ? "Toprope meist eingetragen" : `Toprope ${index + 1}`,
    setter: null,
    color: null,
    grade_range: null,
    active: true,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    id: `lead-${index + 1}`,
    gym_id: "gym-1",
    discipline: "lead" as const,
    code: `V${index + 1}`,
    name: index === 1 ? "Vorstieg Community-Favorit" : `Vorstieg ${index + 1}`,
    setter: null,
    color: null,
    grade_range: null,
    active: true,
  })),
];

const results: Result[] = [
  {
    id: "result-toprope",
    profile_id: "profile-1",
    route_id: "toprope-1",
    points: 5,
    flash: false,
    status: "climbed",
    rating: 4,
    feedback: null,
    created_at: "2026-08-11T08:00:00.000Z",
    updated_at: null,
  },
  {
    id: "result-lead",
    profile_id: "profile-1",
    route_id: "lead-1",
    points: 10,
    flash: false,
    status: "climbed",
    rating: 5,
    feedback: null,
    created_at: "2026-08-11T08:01:00.000Z",
    updated_at: null,
  },
];

const queryData: ParticipantGymDetailData = {
  gym: {
    id: "gym-1",
    name: "Testhalle",
    city: "Münster",
    postal_code: "48143",
    address: null,
    website: null,
    logo_url: null,
    opening_hours: null,
  },
  routes,
  results,
  communityStats: {
    gym_id: "gym-1",
    rating_count: 5,
    average_rating: 4.6,
    route_stats: [
      {
        route_id: "toprope-1",
        rating_count: 2,
        average_rating: 4,
        entry_count: 9,
      },
      {
        route_id: "lead-2",
        rating_count: 3,
        average_rating: 5,
        entry_count: 4,
      },
    ],
  },
  communityStatsError: null,
  codeRedeemed: true,
};

const queryResult = {
  ...queryData,
  data: queryData,
  loading: false,
  isInitialLoading: false,
  isRefreshing: false,
  error: null,
  reload: vi.fn(async () => {}),
};

const setQueryData = (overrides: Partial<ParticipantGymDetailData> = {}) => {
  const data = { ...queryData, ...overrides };
  mockedUseParticipantGymDetailQuery.mockReturnValue({
    ...queryResult,
    ...data,
    data,
  } as ReturnType<typeof useParticipantGymDetailQuery>);
};

const setLeague = (profileLeague: "toprope" | "lead" | null, metadataLeague: string | null) => {
  mockedUseAuth.mockReturnValue({
    profile: {
      id: "profile-1",
      league: profileLeague,
    },
    user: {
      user_metadata: metadataLeague ? { league: metadataLeague } : {},
    },
  } as ReturnType<typeof useAuth>);
};

const renderPage = () =>
  render(
    <MemoryRouter
      initialEntries={["/app/gyms/gym-1"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <RouterRoute path="/app/gyms/:gymId" element={<GymDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("GymDetail route scopes and community highlights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueryData();
  });

  it("counts only the participant's Toprope routes while keeping hall-wide highlights", () => {
    setLeague("toprope", "lead");
    renderPage();

    expect(screen.getByText("1 von 10 Routen eingetragen")).toBeInTheDocument();
    expect(screen.getByText("5 Punkte erzielt")).toBeInTheDocument();
    expect(screen.queryByText("2 von 20 Routen eingetragen")).not.toBeInTheDocument();
    expect(screen.getByText("Vorstieg Community-Favorit")).toBeInTheDocument();
    expect(screen.getByText("Toprope meist eingetragen")).toBeInTheDocument();
    expect(screen.getByText("Basierend auf 5 abgegebenen Bewertungen in dieser Halle.")).toBeInTheDocument();
  });

  it("prioritizes the profile league and counts only the participant's lead routes", () => {
    setLeague("lead", "toprope");
    renderPage();

    expect(screen.getByText("1 von 10 Routen eingetragen")).toBeInTheDocument();
    expect(screen.getByText("10 Punkte erzielt")).toBeInTheDocument();
    expect(screen.queryByText("15 Punkte erzielt")).not.toBeInTheDocument();
  });

  it("keeps the hall detail usable when the optional aggregate endpoint fails", () => {
    setLeague("toprope", null);
    setQueryData({
      communityStats: null,
      communityStatsError: "Service nicht erreichbar",
    });

    renderPage();

    expect(screen.getByText("1 von 10 Routen eingetragen")).toBeInTheDocument();
    expect(screen.getByText("Aktuell nicht verfügbar")).toBeInTheDocument();
    expect(
      screen.getByText("Die Bewertungsdaten konnten nicht geladen werden. Dein Hallenstatus bleibt davon unberührt."),
    ).toBeInTheDocument();
    expect(screen.getByText("Routenbewertungen sind aktuell nicht verfügbar.")).toBeInTheDocument();
    expect(screen.getByText("Routenstatistiken sind aktuell nicht verfügbar.")).toBeInTheDocument();
  });

  it("uses a valid metadata league for legacy profiles", () => {
    setLeague(null, "lead");
    renderPage();

    expect(screen.getByText("1 von 10 Routen eingetragen")).toBeInTheDocument();
    expect(screen.getByText("10 Punkte erzielt")).toBeInTheDocument();
  });

  it("shows an explicit profile state instead of falling back to all 20 routes", () => {
    setLeague(null, null);
    renderPage();

    expect(screen.getByText("Liga im Profil nicht hinterlegt")).toBeInTheDocument();
    expect(screen.queryByText(/von 20 Routen eingetragen/)).not.toBeInTheDocument();
  });

  it("shows the exact zero-of-ten state when no route has been entered", () => {
    setLeague("toprope", null);
    setQueryData({ results: [] });
    renderPage();

    expect(screen.getByText("0 von 10 Routen eingetragen")).toBeInTheDocument();
    expect(screen.getByText("0 Punkte erzielt")).toBeInTheDocument();
  });

  it("falls back to inactive routes only inside the participant's league", () => {
    setLeague("toprope", null);
    setQueryData({
      routes: routes.map((route) =>
        route.discipline === "toprope" ? { ...route, active: false } : route,
      ),
      results: [],
    });
    renderPage();

    expect(screen.getByText("0 von 10 Routen eingetragen")).toBeInTheDocument();
    expect(screen.queryByText(/von 20 Routen eingetragen/)).not.toBeInTheDocument();
  });
});
