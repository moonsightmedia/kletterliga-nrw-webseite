import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RoleGuard } from "@/app/auth/ProtectedRoute";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  APP_STARTUP_SPLASH_KEY,
  APP_STARTUP_SPLASH_VALUE,
} from "@/app/startup/appStartupSplash";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const setAuthState = (value: Partial<ReturnType<typeof useAuth>>) => {
  mockedUseAuth.mockReturnValue(value as ReturnType<typeof useAuth>);
};

const authUser = { id: "user-1" } as unknown as ReturnType<typeof useAuth>["user"];

describe("route guards", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
    window.sessionStorage.clear();
  });

  it("shows a sponsor-branded loading state while auth is still resolving", () => {
    setAuthState({ loading: true, user: null, role: "guest" });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <ProtectedRoute>
          <div>Geschuetzter Inhalt</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Zugang wird gepr\u00fcft")).toBeInTheDocument();
    expect(screen.getByText("App startet")).toBeInTheDocument();
    expect(screen.getByText("Powered by Kletterladen NRW")).toBeInTheDocument();
    expect(screen.getByAltText("Logo Kletterladen NRW")).toBeInTheDocument();
    expect(screen.queryByText("Hauptsponsor")).not.toBeInTheDocument();
    expect(screen.queryByText("kletterladen.nrw")).not.toBeInTheDocument();
  });

  it("falls back to the regular loading state after the sponsor splash was already shown", () => {
    window.sessionStorage.setItem(APP_STARTUP_SPLASH_KEY, APP_STARTUP_SPLASH_VALUE);
    setAuthState({ loading: true, user: null, role: "guest" });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <ProtectedRoute>
          <div>Geschuetzter Inhalt</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Zugang wird gepr\u00fcft")).toBeInTheDocument();
    expect(screen.queryByText("Powered by Kletterladen NRW")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to the login route", () => {
    setAuthState({ loading: false, user: null, role: "guest" });

    render(
      <MemoryRouter initialEntries={["/app/profile"]}>
        <Routes>
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute>
                <div>Geschuetzter Inhalt</div>
              </ProtectedRoute>
            }
          />
          <Route path="/app/login" element={<div>Login Seite</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login Seite")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    setAuthState({ loading: false, user: authUser, role: "participant" });

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <ProtectedRoute>
          <div>Geschuetzter Inhalt</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText("Geschuetzter Inhalt")).toBeInTheDocument();
  });

  it("redirects users without the required role back into the app", () => {
    setAuthState({ loading: false, user: authUser, role: "participant" });

    render(
      <MemoryRouter initialEntries={["/app/admin/league"]}>
        <Routes>
          <Route
            path="/app/admin/league"
            element={
              <RoleGuard allow={["league_admin"]}>
                <div>Admin Bereich</div>
              </RoleGuard>
            }
          />
          <Route path="/app" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
