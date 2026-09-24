import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LeagueCompetition from "@/app/pages/admin/LeagueCompetition";

const api = vi.hoisted(() => ({ day: vi.fn(), admin: vi.fn(), roster: vi.fn(), save: vi.fn(), draft: vi.fn(), phase: vi.fn(), judgeStatus: vi.fn(), setJudgeCode: vi.fn(), correct: vi.fn() }));
vi.mock("@/services/competitionDay", () => ({ getCompetitionDay: api.day, getCompetitionAdmin: api.admin, getCompetitionJudgeAccessStatus: api.judgeStatus, saveCompetitionConfig: api.save, saveCompetitionRouteDraft: api.draft, setCompetitionPhase: api.phase, setCompetitionJudgePassword: api.setJudgeCode, correctCompetitionResult: api.correct }));
vi.mock("@/services/semifinalAdminApi", () => ({ listAdminSemifinalRegistrations: api.roster }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => ({ settings: { season_year: "2026" }, loading: false }) }));
vi.mock("@/services/supabase", () => ({ supabase: { from: vi.fn() } }));
const config = { routes: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, name: `Route ${i + 1}`, grade: "6a", color: "rot" })), assignments: [{ league: "lead", class_label: "Ü15-m", route_numbers: [1, 2, 3, 4, 5] }], zone_points: Array.from({ length: 11 }, (_, i) => i), flash_bonus: 1 };
const view = () => render(<MemoryRouter><LeagueCompetition /></MemoryRouter>);
describe("competition admin", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.day.mockResolvedValue({ event: { phase: "draft", opened_at: null }, routes: config.routes.map((r) => ({ ...r, id: String(r.number) })) });
    api.admin.mockResolvedValue({ config, staff: [], results: [] });
    api.roster.mockResolvedValue([{ eligibility_status: "eligible", approved_league: "lead", approved_class_label: "Ü15-m" }]);
    api.judgeStatus.mockResolvedValue(false);
  });
  afterEach(cleanup);
  it("shows required classes and has no automatic writes", async () => {
    view(); expect(await screen.findByRole("button", { name: "Vorstieg Ü15-m für Route 1" })).toHaveTextContent("5/5");
    expect(api.phase).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation to open", async () => {
    view(); fireEvent.click(await screen.findByRole("button", { name: /^Ergebniseingabe/ }));
    fireEvent.click(screen.getByRole("button", { name: "Eingabe öffnen" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Nach der ersten Öffnung sind diese Einstellungen gesperrt");
    expect(api.phase).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    await waitFor(() => expect(api.phase).toHaveBeenCalledWith("2026", "open"));
  });
  it("does not allow opening when configuration has unsaved edits", async () => {
    view(); fireEvent.change(await screen.findByLabelText("Name · Route 1"), { target: { value: "Neuer Name" } });
    fireEvent.click(screen.getByRole("button", { name: /^Ergebniseingabe/ }));
    expect(screen.getByRole("button", { name: "Eingabe öffnen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeEnabled();
  });
  it("can explicitly save 14 placeholder routes without scoring or class assignments", async () => {
    api.day.mockResolvedValue({ event: null, routes: [] });
    api.admin.mockResolvedValue({ config: { routes: [], assignments: [], zone_points: Array(11).fill(0), flash_bonus: 0 }, staff: [], results: [] });
    api.draft.mockResolvedValue(null);
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Auf 14 Routen ergänzen" }));
    const save = screen.getByRole("button", { name: "Änderungen speichern" });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(api.draft).toHaveBeenCalledWith("2026", Array.from({ length: 14 }, (_, index) => ({ number: index + 1, name: `Route ${index + 1}`, grade: "", color: "" }))));
    expect(api.save).not.toHaveBeenCalled();
    expect(api.phase).not.toHaveBeenCalled();
  });
  it("locks sporting config but keeps pause and shared-code controls after first opening", async () => {
    api.day.mockResolvedValue({ event: { phase: "open", opened_at: "2026-10-03" }, routes: [] });
    view(); expect(await screen.findByLabelText("Name · Route 1")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eigene Farbe" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Ergebniseingabe/ }));
    expect(screen.getByRole("button", { name: "Eingabe schließen" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /^Schiedsrichter/ }));
    expect(screen.getByRole("button", { name: "Zugangscode erzeugen" })).toBeEnabled();
  });
  it("generates a strong shared code only after an explicit admin action", async () => {
    api.setJudgeCode.mockResolvedValue(null);
    view();
    fireEvent.click(await screen.findByRole("button", { name: /^Schiedsrichter/ }));
    await screen.findByRole("button", { name: "Zugangscode erzeugen" });
    expect(api.setJudgeCode).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Zugangscode erzeugen" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Der Code wird nur unmittelbar nach dem Erzeugen angezeigt");
    expect(api.setJudgeCode).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Code jetzt erzeugen" }));
    await waitFor(() => expect(api.setJudgeCode).toHaveBeenCalledOnce());
    const [season, code] = api.setJudgeCode.mock.calls[0];
    expect(season).toBe("2026");
    expect(code).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(await screen.findByText(code)).toBeInTheDocument();
  });
  it("edits classes and color on the selected route without a scoring form", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Route 2 bearbeiten" }));
    expect(screen.getByLabelText("Name · Route 2")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name · Route 1")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Schwierigkeit/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Route 2 bearbeiten" })).not.toHaveTextContent("6a");
    expect(screen.queryByText(/Grad offen/)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Vorbereitungsstand" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Zone 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Blau" }));
    expect(screen.getByRole("button", { name: "Blau" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Ungespeicherte Änderungen.")).toBeInTheDocument();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("2026", expect.objectContaining({
      zone_points: Array.from({ length: 11 }, (_, i) => i),
      routes: expect.arrayContaining([expect.objectContaining({ number: 2, color: "#327bc1", grade: "6a" })]),
    })));
  });
  it("limits a class to five routes and allows moving its assignment to another route", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Route 6 bearbeiten" }));
    expect(screen.getByRole("button", { name: "Vorstieg Ü15-m für Route 6" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Route 1 bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Vorstieg Ü15-m für Route 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Route 6 bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Vorstieg Ü15-m für Route 6" }));
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("2026", expect.objectContaining({ assignments: [{ league: "lead", class_label: "Ü15-m", route_numbers: [2, 3, 4, 5, 6] }] })));
  });
  it("requires saving the fixed scoring before opening an old unconfigured draft", async () => {
    api.admin.mockResolvedValue({ config: { ...config, zone_points: Array(11).fill(0) }, staff: [], results: [] });
    view();
    fireEvent.click(await screen.findByRole("button", { name: /^Ergebniseingabe/ }));
    expect(await screen.findByRole("button", { name: "Eingabe öffnen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("2026", expect.objectContaining({ zone_points: Array.from({ length: 11 }, (_, i) => i) })));
  });
  it("confirms route removal and does not save or remove assignments automatically", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Route 1 entfernen" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("auch aus allen Klassenzuordnungen entfernt");
    expect(screen.getByLabelText("Name · Route 1")).toBeInTheDocument();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Route entfernen" }));
    expect(screen.queryByLabelText("Name · Route 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vorstieg Ü15-m für Route 2" })).toHaveTextContent("4/5");
    expect(api.save).not.toHaveBeenCalled();
  });
  it("keeps operations collapsed and opens one menu at a time", async () => {
    view();
    const entry = await screen.findByRole("button", { name: /^Ergebniseingabe/ });
    expect(entry).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Eingabe öffnen" })).not.toBeInTheDocument();
    fireEvent.click(entry);
    expect(entry).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /^Ergebnisse/ }));
    expect(entry).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Noch keine Ergebnisse eingetragen.")).toBeVisible();
  });
  it("validates and saves a custom color with the route configuration", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Eigene Farbe" }));
    const input = screen.getByLabelText("Farbcode (Hex)");
    fireEvent.change(input, { target: { value: "#xyz" } });
    expect(screen.getByRole("button", { name: "Farbe übernehmen" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "#AbC" } });
    fireEvent.click(screen.getByRole("button", { name: "Farbe übernehmen" }));
    expect(screen.queryByLabelText("Farbcode (Hex)")).not.toBeInTheDocument();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Änderungen speichern" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("2026", expect.objectContaining({
      routes: expect.arrayContaining([expect.objectContaining({ number: 1, color: "#aabbcc" })]),
    })));
  });
});
