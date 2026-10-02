import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { load, save, refresh, settingsMock } = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), refresh: vi.fn(), settingsMock: vi.fn() }));
vi.mock("@/services/competitionAttendance", () => ({ attendanceSource: { get: load, set: save } }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: settingsMock }));
import LeagueFinaleRegistrations from "@/app/pages/admin/LeagueFinaleRegistrations";

beforeEach(() => {
  vi.clearAllMocks();
  load.mockReset().mockResolvedValue({ season: "2026", phase: "draft", deadline: null, rows: [{
    profile_id: "synthetic-one", name: "Mika Testperson", league: "lead", class_label: "Freigegebene Klasse",
    registered: true, eligible: true, status: "expected", version: 0, checked_in_at: null, route_count: 5, can_late_register: false,
  }] });
  settingsMock.mockReturnValue({ settings: { season_year: "2026" }, loading: false, getSeasonYear: () => "2026", refreshSettings: refresh });
});
afterEach(cleanup);
const view = () => render(<MemoryRouter><LeagueFinaleRegistrations /></MemoryRouter>);

describe("admin event entrance page", () => {
  it("uses the attendance source and links to access configuration", async () => {
    view();
    expect(await screen.findByText("Vorstieg · Freigegebene Klasse")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Einlass & Anmeldungen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crewzugang einrichten" })).toHaveAttribute("href", "/app/admin/league/wettkampf?bereich=setup&einrichtung=access");
    expect(load).toHaveBeenCalledWith("2026", null);
  });
  it("does not rely on a legacy fallback season when settings cannot be loaded", async () => {
    settingsMock.mockReturnValue({ settings: null, loading: false, getSeasonYear: () => "2026", refreshSettings: refresh });
    view();
    expect(screen.getByRole("alert")).toHaveTextContent("aktuelle Saison");
    expect(load).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Erneut laden" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
