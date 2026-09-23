import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LeagueCompetition from "@/app/pages/admin/LeagueCompetition";

const api = vi.hoisted(() => ({ day: vi.fn(), admin: vi.fn(), roster: vi.fn(), save: vi.fn(), phase: vi.fn(), staff: vi.fn(), correct: vi.fn() }));
vi.mock("@/services/competitionDay", () => ({ getCompetitionDay: api.day, getCompetitionAdmin: api.admin, saveCompetitionConfig: api.save, setCompetitionPhase: api.phase, setCompetitionStaff: api.staff, correctCompetitionResult: api.correct }));
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
  });
  afterEach(cleanup);
  it("shows required classes and has no automatic writes", async () => {
    view(); expect(await screen.findByText("Vorstieg · Ü15-m")).toBeInTheDocument();
    expect(screen.getByText("1 Personen · 5/5 Routen")).toBeInTheDocument();
    expect(api.phase).not.toHaveBeenCalled(); expect(api.save).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation to open", async () => {
    view(); fireEvent.click(await screen.findByRole("button", { name: "Eingabe öffnen" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Nach der ersten Öffnung sind diese Einstellungen gesperrt");
    expect(api.phase).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    await waitFor(() => expect(api.phase).toHaveBeenCalledWith("2026", "open"));
  });
  it("does not allow opening when configuration has unsaved edits", async () => {
    view(); fireEvent.change(await screen.findByLabelText("Name · Route 1"), { target: { value: "Neuer Name" } });
    expect(screen.getByRole("button", { name: "Eingabe öffnen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Konfiguration speichern" })).toBeEnabled();
  });
  it("locks sporting config but keeps pause and staff controls after first opening", async () => {
    api.day.mockResolvedValue({ event: { phase: "open", opened_at: "2026-10-03" }, routes: [] });
    view(); expect(await screen.findByLabelText("Name · Route 1")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Eingabe schließen" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Konto suchen" })).toBeEnabled();
  });
});
