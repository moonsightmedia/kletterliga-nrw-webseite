import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EmailConfirm from "@/app/pages/auth/EmailConfirm";

const { navigateMock, getSessionMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

const { hasParticipantLaunchStartedMock } = vi.hoisted(() => ({
  hasParticipantLaunchStartedMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/config/launch", () => ({
  formatUnlockDate: () => "01.05.2026",
  hasParticipantLaunchStarted: () => hasParticipantLaunchStartedMock(),
}));

describe("EmailConfirm", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    getSessionMock.mockReset();
    hasParticipantLaunchStartedMock.mockReturnValue(false);
  });

  it("redirects confirmed users directly to the profile page", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });

    render(
      <MemoryRouter
        initialEntries={["/app/auth/confirm"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/auth/confirm" element={<EmailConfirm />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Deine E-Mail-Adresse wurde bestätigt.")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(navigateMock).toHaveBeenCalledWith("/app/profile", { replace: true });
      },
      { timeout: 3000 },
    );
  }, 10000);
});
