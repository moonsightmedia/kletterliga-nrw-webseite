import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JudgeDashboard from "@/app/pages/competition/JudgeDashboard";

const auth = vi.hoisted(() => ({ profile: { id: "judge-profile" }, loading: false }));
const settings = vi.hoisted(() => ({ settings: { season_year: "2026" }, loading: false, refreshSettings: vi.fn() }));
const service = vi.hoisted(() => ({
  getCompetitionDay: vi.fn(),
  getCompetitionStaffRoutes: vi.fn(),
}));

vi.mock("@/app/auth/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => settings }));
vi.mock("@/services/competitionDay", () => service);

const routes = [
  { id: "route-a", number: 1, name: "Kante", grade: "6", color: "red", qr_token: "private-a" },
  { id: "route-b", number: 2, name: "Dach", grade: "7", color: "blue", qr_token: "private-b" },
];

describe("judge dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    service.getCompetitionDay.mockResolvedValue({ event: { id: "event-1", phase: "open" }, is_staff: true, is_admin: false });
    service.getCompetitionStaffRoutes.mockResolvedValue(routes);
  });
  afterEach(() => cleanup());

  it("shows an explicit permission denial for profiles without event staff access", async () => {
    service.getCompetitionDay.mockResolvedValue({ event: { id: "event-1", phase: "open" }, is_staff: false, is_admin: false });
    render(<JudgeDashboard />);
    expect(await screen.findByRole("heading", { name: "Keine Schiedsrichterfreigabe" })).toBeInTheDocument();
    expect(service.getCompetitionStaffRoutes).not.toHaveBeenCalled();
  });

  it("refreshes staff access on focus and drops route data when access is revoked", async () => {
    service.getCompetitionDay
      .mockResolvedValueOnce({ event: { id: "event-1", phase: "open" }, is_staff: true, is_admin: false })
      .mockResolvedValueOnce({ event: { id: "event-1", phase: "open" }, is_staff: false, is_admin: false });
    render(<JudgeDashboard />);
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent(window, new Event("focus"));
    expect(await screen.findByRole("heading", { name: "Keine Schiedsrichterfreigabe" })).toBeInTheDocument();
  });

  it("runs independent route timers and restores a running timer after remount", async () => {
    const view = render(<JudgeDashboard />);
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent.click(screen.getByRole("button", { name: "Route 1 starten" }));
    fireEvent.click(screen.getByRole("button", { name: "Route 2 starten" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Route 1 pausieren" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Route 2 pausieren" })).toBeInTheDocument();
    });

    view.unmount();
    render(<JudgeDashboard />);
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    expect(screen.getByRole("button", { name: "Route 1 pausieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 2 pausieren" })).toBeInTheDocument();
  });

  it("keeps the QR tab limited to route codes and does not reveal token text", async () => {
    render(<JudgeDashboard />);
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "QR-Codes" }), { button: 0 });
    expect(await screen.findByRole("heading", { name: "Route 1" })).toBeInTheDocument();
    expect(screen.queryByText("private-a")).not.toBeInTheDocument();
    expect(screen.queryByText("private-b")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Route [12]/ }).length).toBeGreaterThanOrEqual(2);
  });
});
