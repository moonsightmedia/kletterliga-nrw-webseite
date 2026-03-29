import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Register from "@/app/pages/auth/Register";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGyms } from "@/services/appApi";

const { hasParticipantLaunchStartedMock, beforeAccountCreationOpenMock } = vi.hoisted(() => ({
  hasParticipantLaunchStartedMock: vi.fn(),
  beforeAccountCreationOpenMock: vi.fn(),
}));

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listGyms: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock("@/config/launch", () => ({
  formatAccountCreationOpenDate: () => "01.04.2026",
  formatUnlockDate: () => "01.05.2026",
  useLaunchSettings: () => ({
    accountCreationOpenDate: new Date("2026-04-01T00:00:00+02:00"),
    unlockDate: new Date("2026-05-01T00:00:00+02:00"),
    forceAccountCreationOpen: false,
    forceParticipantUnlock: false,
    beforeAccountCreationOpen: beforeAccountCreationOpenMock(),
    beforeAppUnlock: !hasParticipantLaunchStartedMock(),
    initialized: true,
    participantLaunchStarted: hasParticipantLaunchStartedMock(),
    publicRankingsEnabled: hasParticipantLaunchStartedMock(),
    participantFeatureLocked: !hasParticipantLaunchStartedMock(),
  }),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedListGyms = vi.mocked(listGyms);

describe("Register", () => {
  beforeEach(() => {
    hasParticipantLaunchStartedMock.mockReturnValue(false);
    beforeAccountCreationOpenMock.mockReturnValue(true);
    mockedUseAuth.mockReturnValue({
      signUp: vi.fn().mockResolvedValue({}),
    } as ReturnType<typeof useAuth>);
    mockedListGyms.mockResolvedValue({
      data: [],
      error: null,
    } as Awaited<ReturnType<typeof listGyms>>);
  });

  it("shows the registration gate state before account creation opens", async () => {
    render(
      <MemoryRouter
        initialEntries={["/app/register"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Die Account-Erstellung öffnet am 01.04.2026."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zum Login" })).toHaveAttribute(
      "href",
      "/app/login",
    );
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
  });
});
