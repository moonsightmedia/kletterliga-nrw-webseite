import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileScreen from "@/app/pages/participant/ProfileScreen";
import { useAuth } from "@/app/auth/AuthProvider";
import { useParticipantProfileEditor } from "@/app/pages/participant/useParticipantProfileEditor";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/app/pages/participant/useParticipantProfileEditor", () => ({
  useParticipantProfileEditor: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseParticipantProfileEditor = vi.mocked(useParticipantProfileEditor);

const buildProfileEditorState = (overrides: Partial<ReturnType<typeof useParticipantProfileEditor>> = {}) =>
  ({
    profile: {
      id: "profile-1",
      participation_activated_at: null,
    },
    user: {
      email: "lukas@example.com",
    },
    profileData: {
      rank: 14,
      routesLogged: 1,
      averagePoints: 2.5,
      sessionCount: 1,
      formattedPoints: "2,5",
    },
    displayName: "Lukas Müller",
    leagueLabel: "TOPROPE",
    avatarPreview: null,
    ...overrides,
  }) as ReturnType<typeof useParticipantProfileEditor>;

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      signOut: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);
    mockedUseParticipantProfileEditor.mockReturnValue(buildProfileEditorState());
  });

  it("renders the participant overview with statistics and settings", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Lukas Müller" })).toBeInTheDocument();
    expect(screen.getByText("Punkte/Route")).toBeInTheDocument();
    expect(screen.getAllByText("2,5")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Mastercode freischalten" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Passwort ändern" })).toBeInTheDocument();
  });

  it("shows the activated mastercode state once participation is unlocked", () => {
    mockedUseParticipantProfileEditor.mockReturnValue(
      buildProfileEditorState({
        profile: {
          id: "profile-1",
          participation_activated_at: "2026-03-27T09:00:00+01:00",
        },
      }),
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /Teilnahme aktiviert/i })).toBeDisabled();
  });
});
