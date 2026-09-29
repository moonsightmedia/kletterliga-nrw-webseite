import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompetitionStandings from "@/app/pages/competition/CompetitionStandings";

const api = vi.hoisted(() => ({ day: vi.fn(), standings: vi.fn() }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => ({ settings: { season_year: "2026" }, loading: false }) }));
vi.mock("@/services/competitionDay", () => ({ getCompetitionDay: api.day, listCompetitionStandings: api.standings }));

describe("competition standings", () => {
  afterEach(cleanup);

  it("shows the full 10–100-point scoring and totals up to 500", async () => {
    api.day.mockResolvedValueOnce({ event: { phase: "open" } });
    api.standings.mockResolvedValueOnce([
      { profile_id: "first", name: "Erster Teilnehmer", league: "lead", class_label: "Ü15-m", points: 500, completed_routes: 5, rank: 1 },
      { profile_id: "second", name: "Zweiter Teilnehmer", league: "lead", class_label: "Ü15-m", points: 80, completed_routes: 1, rank: 2 },
    ]);
    render(<MemoryRouter><CompetitionStandings /></MemoryRouter>);
    expect(await screen.findByText("500 P.")).toBeInTheDocument();
    expect(screen.getByText("80 P.")).toBeInTheDocument();
    expect(screen.getByText(/jeweils 0–100 Punkten \(maximal 500\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Platz 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Platz 2")).toBeInTheDocument();
  });
});
