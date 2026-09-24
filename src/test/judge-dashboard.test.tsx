import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JudgeDashboard from "@/app/pages/competition/JudgeDashboard";

const settings = vi.hoisted(() => ({ settings: { season_year: "2026" }, loading: false, refreshSettings: vi.fn() }));
const service = vi.hoisted(() => ({ getCompetitionJudgeRoutes: vi.fn() }));

vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => settings }));
vi.mock("@/services/competitionDay", () => service);

const routes = [
  { id: "route-a", number: 1, name: "Kante", grade: "6", color: "red", qr_token: "private-a" },
  { id: "route-b", number: 2, name: "Dach", grade: "7", color: "blue", qr_token: "private-b" },
];
const code = "AbCdEfGhJkMnPqRsTuVwXyZ2";

function unlock() {
  fireEvent.change(screen.getByLabelText("Schiedsrichter-Code"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Bereich öffnen" }));
}

describe("judge dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    service.getCompetitionJudgeRoutes.mockResolvedValue({ event: { id: "event-1", phase: "open" }, routes });
  });
  afterEach(() => cleanup());

  it("opens without an app account after the shared code is entered", async () => {
    render(<JudgeDashboard />);
    expect(await screen.findByLabelText("Schiedsrichter-Code")).toBeInTheDocument();
    expect(service.getCompetitionJudgeRoutes).not.toHaveBeenCalled();
    unlock();
    expect(await screen.findByRole("heading", { name: "Routen für die Zeitnahme" })).toBeInTheDocument();
    expect(service.getCompetitionJudgeRoutes).toHaveBeenCalledWith("2026", code);
  });

  it("rejects a rotated or invalid code without exposing routes", async () => {
    service.getCompetitionJudgeRoutes.mockRejectedValue(new Error("Der Schiedsrichter-Code ist ungültig oder wurde ausgetauscht."));
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    expect(await screen.findByRole("alert")).toHaveTextContent("ungültig");
    expect(screen.queryByRole("heading", { name: "Routen für die Zeitnahme" })).not.toBeInTheDocument();
  });

  it("rechecks the code on focus and hides QR data after rotation", async () => {
    service.getCompetitionJudgeRoutes
      .mockResolvedValueOnce({ event: { id: "event-1", phase: "open" }, routes })
      .mockRejectedValueOnce(new Error("Der Schiedsrichter-Code ist ungültig oder wurde ausgetauscht."));
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent(window, new Event("focus"));
    expect(await screen.findByRole("alert")).toHaveTextContent("ungültig");
    expect(screen.queryByRole("heading", { name: "Routen für die Zeitnahme" })).not.toBeInTheDocument();
  });

  it("keeps local timers visible during a temporary connection failure", async () => {
    service.getCompetitionJudgeRoutes
      .mockResolvedValueOnce({ event: { id: "event-1", phase: "open" }, routes })
      .mockRejectedValueOnce(new Error("network unavailable"));
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent.click(screen.getByRole("button", { name: "Route 1 starten" }));
    fireEvent(window, new Event("focus"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Verbindung unterbrochen");
    expect(screen.getByRole("button", { name: "Route 1 pausieren" })).toBeInTheDocument();
  });

  it("runs independent route timers and restores them after re-entry", async () => {
    const view = render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent.click(screen.getByRole("button", { name: "Route 1 starten" }));
    fireEvent.click(screen.getByRole("button", { name: "Route 2 starten" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Route 1 pausieren" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Route 2 pausieren" })).toBeInTheDocument();
    });

    view.unmount();
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    expect(screen.getByRole("button", { name: "Route 1 pausieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 2 pausieren" })).toBeInTheDocument();
  });

  it("keeps the QR tab limited to route codes and does not reveal token text", async () => {
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "QR-Codes" }), { button: 0 });
    expect(await screen.findByRole("heading", { name: "Route 1" })).toBeInTheDocument();
    expect(screen.queryByText("private-a")).not.toBeInTheDocument();
    expect(screen.queryByText("private-b")).not.toBeInTheDocument();
  });
});
