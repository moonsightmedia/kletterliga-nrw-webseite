import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResultEntry from "@/app/pages/participant/ResultEntry";
import { useQualificationPhase } from "@/services/useQualificationPhase";
import { upsertResult } from "@/services/appApi";

const fixtures = vi.hoisted(() => ({ results: [{ id: "r1", route_id: "route-1", profile_id: "p1", points: 10, flash: true, rating: 4, feedback: "Meine gespeicherte Rückmeldung" }] }));
vi.mock("@/app/auth/AuthProvider", () => ({ useAuth: () => ({ profile: { id: "p1" } }) }));
vi.mock("@/services/useQualificationPhase", () => ({ useQualificationPhase: vi.fn() }));
vi.mock("@/services/appApi", () => ({ upsertResult: vi.fn() }));
vi.mock("@/app/pages/participant/useParticipantCompetitionData", () => ({ useParticipantCompetitionData: () => ({ viewerMasterRedemption: null }) }));
vi.mock("@/app/pages/participant/participantQueries", () => ({
  participantQueryKeys: {},
  useParticipantGymDetailQuery: () => ({
    routes: [{ id: "route-1", gym_id: "gym-1", name: "Archivroute", code: "T1", discipline: "toprope" }],
    results: fixtures.results, codeRedeemed: false, loading: false, error: null,
  }),
}));

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={["/app/gyms/gym-1/routes/route-1/result"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes><Route path="/app/gyms/:gymId/routes/:routeId/result" element={<ResultEntry />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>);
}

describe("qualification archive", () => {
  beforeEach(() => {
    vi.mocked(useQualificationPhase).mockReturnValue({ phase: "closed", canEditResults: false, hasEnded: true, qualificationEnd: "2026-09-13" });
  });
  it("keeps existing score, rating and feedback readable without input/code gates", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Archivroute" })).toBeInTheDocument();
    expect(screen.getByText(/11/)).toBeInTheDocument();
    expect(screen.getByText("4 von 5 Sternen")).toBeInTheDocument();
    expect(screen.getByText("Meine gespeicherte Rückmeldung")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Halbfinale & Anmeldung/ })).toHaveAttribute("href", "/app/finale");
    expect(upsertResult).not.toHaveBeenCalled();
  });
  it("fails closed if season configuration cannot be loaded", () => {
    vi.mocked(useQualificationPhase).mockReturnValue({ phase: "unavailable", canEditResults: false, hasEnded: false, qualificationEnd: null });
    renderPage();
    expect(screen.getByText("Ergebniseingabe gesperrt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /speichern/i })).not.toBeInTheDocument();
  });
  it("switches from the qualification gate to the archive after the deadline", () => {
    vi.mocked(useQualificationPhase).mockReturnValue({ phase: "active", canEditResults: true, hasEnded: false, qualificationEnd: "2026-09-13" });
    const page = renderPage();
    expect(screen.getByText("Mastercode zuerst einlösen")).toBeInTheDocument();
    vi.mocked(useQualificationPhase).mockReturnValue({ phase: "closed", canEditResults: false, hasEnded: true, qualificationEnd: "2026-09-13" });
    page.unmount();
    renderPage();
    expect(screen.getByText("Qualifikation abgeschlossen")).toBeInTheDocument();
    expect(screen.queryByText("Mastercode zuerst einlösen")).not.toBeInTheDocument();
    expect(upsertResult).not.toHaveBeenCalled();
  });
});
