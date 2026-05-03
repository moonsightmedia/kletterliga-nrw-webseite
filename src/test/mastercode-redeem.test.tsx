import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MastercodeRedeem from "@/app/pages/participant/MastercodeRedeem";
import { useAuth } from "@/app/auth/AuthProvider";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/participant/useParticipantCompetitionData", () => ({
  useParticipantCompetitionData: vi.fn(),
}));

vi.mock("@/components/CodeQrScanner", () => ({
  CodeQrScanner: () => <div>Scanner-Vorschau</div>,
}));

vi.mock("@/services/appApi", () => ({
  redeemMasterCode: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParticipantCompetitionData = vi.mocked(useParticipantCompetitionData);

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MastercodeRedeem />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("MastercodeRedeem", () => {
  beforeEach(() => {
    mockedUseParticipantCompetitionData.mockReturnValue({
      viewerMasterRedemption: null,
      loading: false,
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      reload: vi.fn(),
      profiles: [],
      results: [],
      routes: [],
      gyms: [],
      gymStats: [],
    } as ReturnType<typeof useParticipantCompetitionData>);
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: null,
      },
      refreshProfile: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);
  });

  it("renders the redemption form before participation is activated", () => {
    renderPage();

    expect(screen.getByText("Mastercode freischalten")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("KL-MASTER-XXXXXX-XXXX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jetzt freischalten" })).toBeDisabled();
  });

  it("shows the redemption form when the profile flag is active but no mastercode row exists (recovery)", () => {
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: "2026-03-27T09:00:00+01:00",
      },
      refreshProfile: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);

    renderPage();

    expect(screen.getByPlaceholderText("KL-MASTER-XXXXXX-XXXX")).toBeInTheDocument();
    expect(screen.queryByText("Dein Profil ist offiziell freigeschaltet")).not.toBeInTheDocument();
  });

  it("renders the activated summary once the profile is unlocked", () => {
    mockedUseParticipantCompetitionData.mockReturnValue({
      viewerMasterRedemption: { redeemed_at: "2026-03-27T09:00:00+01:00", gym_id: null },
      loading: false,
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      reload: vi.fn(),
      profiles: [],
      results: [],
      routes: [],
      gyms: [],
      gymStats: [],
    } as ReturnType<typeof useParticipantCompetitionData>);
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: "2026-03-27T09:00:00+01:00",
      },
      refreshProfile: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);

    renderPage();

    expect(screen.getByText("Dein Profil ist offiziell freigeschaltet")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("KL-MASTER-XXXXXX-XXXX")).not.toBeInTheDocument();
  });
});
