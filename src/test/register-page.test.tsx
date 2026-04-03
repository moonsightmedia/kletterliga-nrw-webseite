import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  const signUpMock = vi.fn();

  beforeAll(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  beforeEach(() => {
    signUpMock.mockReset();
    signUpMock.mockResolvedValue({});
    hasParticipantLaunchStartedMock.mockReturnValue(false);
    beforeAccountCreationOpenMock.mockReturnValue(true);
    mockedUseAuth.mockReturnValue({
      signUp: signUpMock,
    } as ReturnType<typeof useAuth>);
    mockedListGyms.mockResolvedValue({
      data: [],
      error: null,
    } as Awaited<ReturnType<typeof listGyms>>);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
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
      await screen.findByText(/Die Account-Erstellung öffnet am 01\.04\.2026\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zum Login" })).toHaveAttribute(
      "href",
      "/app/login",
    );
    expect(screen.getByRole("link", { name: "Zur Startseite" })).toHaveAttribute("href", "/");
  });

  it("requires the mandatory checkbox and forwards both consent values on signup", async () => {
    beforeAccountCreationOpenMock.mockReturnValue(false);
    hasParticipantLaunchStartedMock.mockReturnValue(true);

    render(
      <MemoryRouter
        initialEntries={["/app/register"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/register" element={<Register />} />
          <Route path="/app/register/success" element={<div>Success</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "Jana" } });
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "Muster" } });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), {
      target: { value: "jana@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

    fireEvent.change(screen.getByLabelText("Passwort"), {
      target: { value: "supersecret" },
    });
    fireEvent.change(screen.getByLabelText(/Passwort bestätigen/i), {
      target: { value: "supersecret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Weiter/i }));

    fireEvent.change(screen.getAllByLabelText("Geburtsdatum")[0], {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getAllByLabelText("Wertungsklasse")[0], {
      target: { value: "w" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Vorstieg/i })[0]);

    const submitButton = screen.getByRole("button", { name: "Jetzt registrieren" });
    const checkboxes = screen.getAllByRole("checkbox");

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(submitButton).toBeDisabled();

    fireEvent.click(checkboxes[0]);
    expect(submitButton).toBeEnabled();

    fireEvent.click(checkboxes[1]);
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jana@example.com",
          requiredConsentAccepted: true,
          marketingOptInRequested: true,
        }),
      ),
    );
  });
});
