import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Rankings from "@/app/pages/participant/Rankings";
import { useAuth } from "@/app/auth/AuthProvider";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { useSeasonSettings } from "@/services/seasonSettings";
import { buildRankingRowsForScope } from "@/app/pages/participant/participantData";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/participant/useParticipantCompetitionData", () => ({
  useParticipantCompetitionData: vi.fn(),
}));

vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: vi.fn(),
}));

vi.mock("@/app/pages/participant/participantData", () => ({
  buildRankingRowsForScope: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParticipantCompetitionData = vi.mocked(useParticipantCompetitionData);
const mockedUseSeasonSettings = vi.mocked(useSeasonSettings);
const mockedBuildRankingRowsForScope = vi.mocked(buildRankingRowsForScope);

const rankingRows = Array.from({ length: 10 }, (_, index) => ({
  profileId: `profile-${index + 1}`,
  rank: index + 1,
  name: `User ${index + 1}`,
  avatarUrl: null,
  homeGymName: `Gym ${index + 1}`,
  homeGymCity: "Köln",
  points: 100 - index,
  visitedGyms: 4,
  flashCount: 1,
  totalRoutes: 8,
  points10: 2,
  points7_5: 2,
  points5: 2,
  points2_5: 1,
  points0: 1,
}));

describe("Rankings focus window", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-8",
        gender: "m",
        league: "lead",
        birth_date: "2000-01-01",
        home_gym_id: null,
      },
      user: { id: "profile-8", user_metadata: {} },
    } as ReturnType<typeof useAuth>);

    mockedUseParticipantCompetitionData.mockReturnValue({
      profiles: [],
      results: [],
      routes: [],
      gyms: [],
      loading: false,
      error: null,
    } as ReturnType<typeof useParticipantCompetitionData>);

    mockedUseSeasonSettings.mockReturnValue({
      settings: null,
      getClassName: () => "Ü15-m",
      getStages: () => [],
    } as ReturnType<typeof useSeasonSettings>);

    mockedBuildRankingRowsForScope.mockImplementation(() => rankingRows);
  });

  it("shows the podium plus the current user's neighborhood before expanding", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Rankings />
      </MemoryRouter>,
    );

    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("User 2")).toBeInTheDocument();
    expect(screen.getByText("User 3")).toBeInTheDocument();
    expect(screen.getByText("User 6")).toBeInTheDocument();
    expect(screen.getByText("User 7")).toBeInTheDocument();
    expect(screen.getByText("User 8")).toBeInTheDocument();
    expect(screen.getByText("User 9")).toBeInTheDocument();
    expect(screen.getByText("User 10")).toBeInTheDocument();
    expect(screen.queryByText("User 4")).not.toBeInTheDocument();
    expect(screen.queryByText("User 5")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Komplette Rangliste anzeigen" }));

    expect(screen.getByText("User 4")).toBeInTheDocument();
    expect(screen.getByText("User 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fokussierte Ansicht" })).toBeInTheDocument();
  });
});
