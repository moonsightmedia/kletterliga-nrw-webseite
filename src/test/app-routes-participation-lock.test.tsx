import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Routes } from "react-router-dom";
import { appRoutes } from "@/app/AppRoutes";
import { useLaunchSettings } from "@/config/launch";

vi.mock("@/app/auth/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/layouts/ParticipantLayout", () => ({
  ParticipantLayout: () => <Outlet />,
}));

vi.mock("@/config/launch", async () => {
  const actual = await vi.importActual<typeof import("@/config/launch")>("@/config/launch");
  return {
    ...actual,
    useLaunchSettings: vi.fn(),
    getUnlockDate: () => new Date("2026-05-01T00:00:00+02:00"),
  };
});

const mockedUseLaunchSettings = vi.mocked(useLaunchSettings);

describe("appRoutes participation gating", () => {
  beforeEach(() => {
    mockedUseLaunchSettings.mockReturnValue({
      participantFeatureLocked: true,
    } as ReturnType<typeof useLaunchSettings>);
  });

  it("keeps the participation redeem route locked before the season starts", async () => {
    render(
      <MemoryRouter
        initialEntries={["/app/participation/redeem"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>{appRoutes}</Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Mastercode-Einlösung folgt zum Saisonstart")).toBeInTheDocument();
    expect(screen.getByText("Freischaltung am 01.05.2026")).toBeInTheDocument();
  });
});
