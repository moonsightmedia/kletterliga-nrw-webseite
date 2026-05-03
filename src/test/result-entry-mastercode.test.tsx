import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResultEntry from "@/app/pages/participant/ResultEntry";
import { useAuth } from "@/app/auth/AuthProvider";
import { useParticipantGymDetailQuery } from "@/app/pages/participant/participantQueries";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/participant/participantQueries", () => {
  return {
    participantQueryKeys: {
      competitionData: ["participant-competition-data"],
      userResults: (profileId: string) => ["participant-user-results", profileId],
      gymDetail: (gymId: string, profileId: string) => ["participant-gym-detail", gymId, profileId],
    },
    useParticipantGymDetailQuery: vi.fn(),
  };
});

vi.mock("@/services/appApi", () => ({
  upsertResult: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParticipantGymDetailQuery = vi.mocked(useParticipantGymDetailQuery);

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={["/app/gyms/gym-1/routes/route-1/result"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/gyms/:gymId/routes/:routeId/result" element={<ResultEntry />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("ResultEntry mastercode gate", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: null,
      },
    } as ReturnType<typeof useAuth>);

    mockedUseParticipantGymDetailQuery.mockReturnValue({
      gym: { id: "gym-1", name: "Testhalle" },
      routes: [
        {
          id: "route-1",
          gym_id: "gym-1",
          code: "A1",
          name: "Test Route",
          grade_range: "5",
          discipline: "toprope",
        },
      ],
      results: [],
      allResults: [],
      codeRedeemed: true,
      loading: false,
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      reload: vi.fn(),
    } as ReturnType<typeof useParticipantGymDetailQuery>);
  });

  it("requires the mastercode before saving route results", () => {
    renderPage();

    expect(screen.getByText("Mastercode zuerst einlösen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zum Mastercode" })).toHaveAttribute(
      "href",
      "/app/participation/redeem",
    );
    expect(screen.queryByText("Ergebnis speichern")).not.toBeInTheDocument();
  });
});
