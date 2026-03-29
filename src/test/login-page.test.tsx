import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "@/app/pages/auth/Login";
import { useAuth } from "@/app/auth/AuthProvider";

const { hasParticipantLaunchStartedMock, beforeAppUnlockMock } = vi.hoisted(() => ({
  hasParticipantLaunchStartedMock: vi.fn(),
  beforeAppUnlockMock: vi.fn(),
}));

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/config/launch", () => ({
  formatUnlockDate: () => "01.05.2026",
  useLaunchSettings: () => ({
    accountCreationOpenDate: new Date("2026-04-01T00:00:00+02:00"),
    unlockDate: new Date("2026-05-01T00:00:00+02:00"),
    forceAccountCreationOpen: false,
    forceParticipantUnlock: false,
    beforeAccountCreationOpen: false,
    beforeAppUnlock: beforeAppUnlockMock(),
    initialized: true,
    participantLaunchStarted: hasParticipantLaunchStartedMock(),
    publicRankingsEnabled: hasParticipantLaunchStartedMock(),
    participantFeatureLocked: beforeAppUnlockMock(),
  }),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("Login", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    hasParticipantLaunchStartedMock.mockReturnValue(false);
    beforeAppUnlockMock.mockReturnValue(true);
    mockedUseAuth.mockReturnValue({
      session: null,
      user: null,
      signIn: vi.fn().mockResolvedValue({}),
      signUp: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue({}),
      resendConfirmation: vi.fn().mockResolvedValue({}),
      profile: null,
      role: "guest",
      loading: false,
      refreshProfile: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useAuth>);
  });

  it("renders the confirmation success notice from the query string", async () => {
    render(
      <MemoryRouter
        initialEntries={["/app/login?confirmed=true"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Deine Adresse wurde erfolgreich bestätigt. Du kannst dich jetzt direkt anmelden.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jetzt registrieren" })).toHaveAttribute(
      "href",
      "/app/register",
    );
  });

  it("shows live participant availability after the season start", async () => {
    hasParticipantLaunchStartedMock.mockReturnValue(true);
    beforeAppUnlockMock.mockReturnValue(false);

    render(
      <MemoryRouter
        initialEntries={["/app/login?registered=true"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Bitte bestätige jetzt deine E-Mail. Danach landest du direkt in deinem Profil. Hallen, Codes und Ranglisten sind dort bereits offen.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the live availability chip on the regular login screen after launch", () => {
    hasParticipantLaunchStartedMock.mockReturnValue(true);
    beforeAppUnlockMock.mockReturnValue(false);

    render(
      <MemoryRouter
        initialEntries={["/app/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Ligafunktionen jetzt offen")).toBeInTheDocument();
  });

  it("shows an archived account notice after the auth provider signs the user out", async () => {
    window.sessionStorage.setItem("kl_archived_account_notice", "1");

    render(
      <MemoryRouter
        initialEntries={["/app/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(
        "Dieses Konto wurde archiviert. Bitte kontaktiere die Liga, wenn du wieder freigeschaltet werden möchtest.",
      ),
    ).toBeInTheDocument();
  });
});
