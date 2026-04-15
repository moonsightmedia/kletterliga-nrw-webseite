import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileScreen from "@/app/pages/participant/ProfileScreen";
import { useAuth } from "@/app/auth/AuthProvider";
import { useLaunchSettings } from "@/config/launch";
import { useParticipantProfileEditor } from "@/app/pages/participant/useParticipantProfileEditor";
import { getMyPartnerVoucherRedemption } from "@/services/appApi";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/config/launch", () => ({
  useLaunchSettings: vi.fn(),
  formatUnlockDate: () => "01.05.2026",
}));

vi.mock("@/app/pages/participant/useParticipantProfileEditor", () => ({
  useParticipantProfileEditor: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  getMyPartnerVoucherRedemption: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseLaunchSettings = vi.mocked(useLaunchSettings);
const mockedUseParticipantProfileEditor = vi.mocked(useParticipantProfileEditor);
const mockedGetMyPartnerVoucherRedemption = vi.mocked(getMyPartnerVoucherRedemption);

const buildProfileEditorState = (overrides: Partial<ReturnType<typeof useParticipantProfileEditor>> = {}) =>
  ({
    profile: {
      id: "profile-1",
      avatar_url: null,
      participation_activated_at: null,
    },
    user: {
      email: "lukas@example.com",
    },
    loading: false,
    profileData: {
      rank: 14,
      routesLogged: 1,
      averagePoints: 2.5,
      sessionCount: 1,
      formattedPoints: "2,5",
    },
    displayName: "Lukas Müller",
    leagueLabel: "Toprope",
    avatarPreview: null,
    ...overrides,
  }) as ReturnType<typeof useParticipantProfileEditor>;

describe("ProfileScreen", () => {
  beforeEach(() => {
    window.localStorage.clear();

    mockedUseAuth.mockReturnValue({
      loading: false,
      signOut: vi.fn().mockResolvedValue(undefined),
    } as ReturnType<typeof useAuth>);
    mockedUseLaunchSettings.mockReturnValue({
      beforeAppUnlock: true,
      unlockDate: new Date("2026-05-01T00:00:00+02:00"),
    } as ReturnType<typeof useLaunchSettings>);
    mockedUseParticipantProfileEditor.mockReturnValue(buildProfileEditorState());
    mockedGetMyPartnerVoucherRedemption.mockResolvedValue({
      data: null,
      error: null,
    } as Awaited<ReturnType<typeof getMyPartnerVoucherRedemption>>);
  });

  it("shows the prelaunch state before season unlock without the participation CTA", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.getByText("Pre-Launch")).toBeInTheDocument();
    expect(screen.getByText(/die Liga startet am 01.05.2026/i)).toBeInTheDocument();
    expect(screen.getByText("Wische zum Ausblenden")).toBeInTheDocument();
    expect(screen.queryByText("Teilnahme fehlt")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mastercode freischalten" })).not.toBeInTheDocument();
  });

  it("allows dismissing the prelaunch notice and keeps it hidden on remount", () => {
    const firstRender = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pre-Launch-Hinweis ausblenden" }));
    expect(screen.queryByText("Pre-Launch")).not.toBeInTheDocument();

    firstRender.unmount();

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Pre-Launch")).not.toBeInTheDocument();
  });

  it("shows the participation notice with CTA after unlock when the profile is not activated", () => {
    mockedUseLaunchSettings.mockReturnValue({
      beforeAppUnlock: false,
      unlockDate: new Date("2026-05-01T00:00:00+02:00"),
    } as ReturnType<typeof useLaunchSettings>);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Pre-Launch")).not.toBeInTheDocument();
    expect(screen.getByText("Teilnahme fehlt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mastercode freischalten" })).toBeEnabled();
  });

  it("shows class badge once the profile is unlocked", () => {
    mockedUseLaunchSettings.mockReturnValue({
      beforeAppUnlock: false,
      unlockDate: new Date("2026-05-01T00:00:00+02:00"),
    } as ReturnType<typeof useLaunchSettings>);
    mockedUseParticipantProfileEditor.mockReturnValue(
      buildProfileEditorState({
        profile: {
          id: "profile-1",
          avatar_url: null,
          participation_activated_at: "2026-03-27T09:00:00+01:00",
        },
      }),
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Teilnahme fehlt")).not.toBeInTheDocument();
    expect(screen.getByText("Klasse offen")).toBeInTheDocument();
  });

  it("shows the partner voucher settings action", () => {
    mockedUseLaunchSettings.mockReturnValue({
      beforeAppUnlock: false,
      unlockDate: new Date("2026-05-01T00:00:00+02:00"),
    } as ReturnType<typeof useLaunchSettings>);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Gutschein einlösen Kletterladen.NRW" })).toBeInTheDocument();
  });

  it("renders a skeleton while profile data is still loading", () => {
    mockedUseParticipantProfileEditor.mockReturnValue(
      buildProfileEditorState({
        loading: true,
      }),
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ProfileScreen />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "Lukas Müller" })).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.className.includes("animate-pulse") ?? false)).toBeInTheDocument();
  });
});
