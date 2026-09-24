import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JudgeDashboard from "@/app/pages/competition/JudgeDashboard";
import { getCompetitionTimerStorageKey } from "@/lib/competitionTimers";
import { JUDGE_ACCESS_MAX_AGE_MS, JUDGE_ACCESS_STORAGE_KEY, saveJudgeAccess } from "@/lib/judgeAccessSession";

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
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toContain(code);
  });

  it("restores a remembered code after closing the tab but validates it again", async () => {
    const first = render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    first.unmount();
    render(<JudgeDashboard />);
    expect(await screen.findByRole("heading", { name: "Routen für die Zeitnahme" })).toBeInTheDocument();
    expect(service.getCompetitionJudgeRoutes).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText("Schiedsrichter-Code")).not.toBeInTheDocument();
  });

  it("does not restore an expired code", async () => {
    saveJudgeAccess(localStorage, "2026", code, Date.now() - JUDGE_ACCESS_MAX_AGE_MS - 1);
    render(<JudgeDashboard />);
    expect(await screen.findByLabelText("Schiedsrichter-Code")).toBeInTheDocument();
    expect(service.getCompetitionJudgeRoutes).not.toHaveBeenCalled();
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toBeNull();
  });

  it("does not expose route QR codes before a restored code is revalidated", async () => {
    saveJudgeAccess(localStorage, "2026", code);
    let approve: (value: { event: { id: string; phase: string }; routes: typeof routes }) => void = () => undefined;
    service.getCompetitionJudgeRoutes.mockReturnValue(new Promise((resolve) => { approve = resolve; }));
    render(<JudgeDashboard />);
    expect(await screen.findByText(/Schiedsrichterbereich wird geladen/)).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "QR-Codes" })).not.toBeInTheDocument();
    approve({ event: { id: "event-1", phase: "open" }, routes });
    expect(await screen.findByRole("tab", { name: "QR-Codes" })).toBeInTheDocument();
  });

  it("forgets a remembered code when the organiser has rotated it", async () => {
    saveJudgeAccess(localStorage, "2026", code);
    service.getCompetitionJudgeRoutes.mockRejectedValue(new Error("Der Schiedsrichter-Code ist ungültig oder wurde ausgetauscht."));
    render(<JudgeDashboard />);
    expect(await screen.findByLabelText("Schiedsrichter-Code")).toBeInTheDocument();
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole("tab", { name: "QR-Codes" })).not.toBeInTheDocument();
  });

  it("removes remembered access when the judge leaves the station", async () => {
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    fireEvent.click(screen.getByRole("button", { name: "Verlassen" }));
    expect(await screen.findByLabelText("Schiedsrichter-Code")).toBeInTheDocument();
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole("tab", { name: "QR-Codes" })).not.toBeInTheDocument();
  });

  it("rejects a rotated or invalid code without exposing routes", async () => {
    service.getCompetitionJudgeRoutes.mockRejectedValue(new Error("Der Schiedsrichter-Code ist ungültig oder wurde ausgetauscht."));
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    expect(await screen.findByRole("alert")).toHaveTextContent("ungültig");
    expect(screen.queryByRole("heading", { name: "Routen für die Zeitnahme" })).not.toBeInTheDocument();
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toBeNull();
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
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toBeNull();
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

  it("runs independent route timers and restores them with remembered access", async () => {
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
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    expect(screen.getByRole("button", { name: "Route 1 pausieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 2 pausieren" })).toBeInTheDocument();
  });

  it("remembers the chosen station and gives every timer a direct QR shortcut", async () => {
    localStorage.setItem("kletterliga:judge-routes:2026", JSON.stringify(["route-b"]));
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    expect(screen.queryByRole("button", { name: "Route 1 starten" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 2 starten" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "QR-Code für Route 2 anzeigen" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Route 2");
    expect(await screen.findByAltText("QR-Code Route 2")).toBeInTheDocument();
  });

  it("shows explicit last-minute and end-of-time instructions", async () => {
    localStorage.setItem(getCompetitionTimerStorageKey("shared-judge", "2026"), JSON.stringify({
      "route-a": { routeId: "route-a", elapsedMs: 0, startedAt: Date.now() - 4 * 60 * 1000 - 5000 },
      "route-b": { routeId: "route-b", elapsedMs: 5 * 60 * 1000, startedAt: null },
    }));
    render(<JudgeDashboard />);
    await screen.findByLabelText("Schiedsrichter-Code");
    unlock();
    await screen.findByRole("heading", { name: "Routen für die Zeitnahme" });
    expect(screen.getByText("Letzte Minute jetzt laut ankündigen.")).toBeInTheDocument();
    expect(screen.getByText("Fünf Minuten vorbei – Kletternde ablassen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 2 beendet" })).toBeDisabled();
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
