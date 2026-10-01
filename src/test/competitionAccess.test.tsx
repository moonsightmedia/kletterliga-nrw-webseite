import { Suspense } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "@/app/AppRoutes";

const access = vi.hoisted(() => ({
  role: "guest",
  user: null as null | { id: string },
  auth: vi.fn(),
  live: vi.fn(),
}));
vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: () => {
    access.auth();
    return {
      user: access.user,
      role: access.role,
      loading: false,
      hasAcceptedRequiredConsents: true,
    };
  },
}));
vi.mock("@/app/layouts/AuthLayout", () => ({ AuthLayout: () => <Outlet /> }));
vi.mock("@/app/layouts/AdminLayout", () => ({ AdminLayout: () => <Outlet /> }));
vi.mock("@/app/layouts/ParticipantLayout", () => ({
  ParticipantLayout: () => <Outlet />,
}));
vi.mock("@/app/pages/auth/Login", () => ({
  default: () => <h1>Persönlich anmelden</h1>,
}));
vi.mock("@/app/pages/participant/ParticipantStart", () => ({
  default: () => <h1>Teilnehmerbereich</h1>,
}));
vi.mock("@/app/pages/admin/CompetitionCenter", () => ({
  default: () => <h1>Geschützte Wettkampfzentrale</h1>,
}));
vi.mock("@/services/competitionFinal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/competitionFinal")>()),
  getLiveCompetition: access.live,
}));

function open(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<p>Laden</p>}>
        <Routes>{appRoutes}</Routes>
      </Suspense>
    </MemoryRouter>,
  );
}
describe("actual competition route access", () => {
  beforeEach(() => {
    access.auth.mockClear();
    access.live.mockClear();
    access.user = null;
    access.role = "guest";
    access.live.mockResolvedValue({
      season: "2026",
      phase: "semifinal",
      class_keys: [],
      pinned_key: null,
      interval_seconds: 15,
      classes: [],
      notices: [],
      updated_at: new Date().toISOString(),
    });
  });
  afterEach(cleanup);
  it("opens the TV route without invoking an authentication guard", async () => {
    open("/live/2026");
    expect(
      await screen.findByRole("heading", { name: "Halbfinale 2026" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(access.live).toHaveBeenCalledWith("2026"));
    expect(access.auth).not.toHaveBeenCalled();
  });
  it("requires login for René's competition center", async () => {
    open("/app/admin/league/wettkampf");
    expect(
      await screen.findByRole("heading", { name: "Persönlich anmelden" }),
    ).toBeInTheDocument();
  });
  it("denies a participant account access to the center", async () => {
    access.user = { id: "participant" };
    access.role = "participant";
    open("/app/admin/league/wettkampf");
    expect(
      await screen.findByRole("heading", { name: "Teilnehmerbereich" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Geschützte Wettkampfzentrale"),
    ).not.toBeInTheDocument();
  });
  it("allows a personal league admin account", async () => {
    access.user = { id: "rene" };
    access.role = "league_admin";
    open("/app/admin/league/wettkampf");
    expect(
      await screen.findByRole("heading", {
        name: "Geschützte Wettkampfzentrale",
      }),
    ).toBeInTheDocument();
  });
});
