import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/services/competitionAttendance", () => ({ getCompetitionAttendance: load, attendanceSource: { get: load, set: vi.fn() } }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => ({ settings: { season_year: "2026" }, loading: false }) }));
import { CompetitionCheckInContent } from "@/app/pages/competition/CompetitionCheckIn";
beforeEach(() => { load.mockReset().mockResolvedValue({ season: "2026", phase: "draft", deadline: null, rows: [] }); });
afterEach(cleanup);
describe("crew entrance password", () => {
  it("does not request participant names before a server-validated password", async () => {
    render(<CompetitionCheckInContent season="2026" />);
    expect(load).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Einlasspasswort"), { target: { value: "synthetic-fixture-only" } });
    fireEvent.click(screen.getByRole("button", { name: "Einlass öffnen" }));
    expect(await screen.findByRole("button", { name: "Abmelden" })).toBeInTheDocument();
    await waitFor(() => expect(load).toHaveBeenCalledWith("2026", "synthetic-fixture-only"));
    expect(screen.queryByLabelText("Einlasspasswort")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abmelden" }));
    expect(screen.getByLabelText("Einlasspasswort")).toHaveValue("");
  });
  it("keeps the password form if validation fails and exposes no attendance list", async () => {
    load.mockRejectedValueOnce(new Error("Das Einlasspasswort ist ungültig."));
    render(<CompetitionCheckInContent season="2026" />);
    fireEvent.change(screen.getByLabelText("Einlasspasswort"), { target: { value: "synthetic-fixture-only" } });
    fireEvent.click(screen.getByRole("button", { name: "Einlass öffnen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ungültig");
    expect(screen.queryByRole("navigation", { name: "Einlassfilter" })).not.toBeInTheDocument();
  });
});
