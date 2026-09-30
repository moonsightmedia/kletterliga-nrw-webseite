import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompetitionCenter from "@/app/pages/admin/CompetitionCenter";

const api = vi.hoisted(() => ({ final: vi.fn(), semifinal: vi.fn() }));
vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: () => ({
    settings: { season_year: "2026" },
    loading: false,
  }),
}));
vi.mock("@/services/competitionFinal", () => ({ getFinalAdmin: api.final }));
vi.mock("@/services/competitionDay", () => ({
  getCompetitionAdmin: api.semifinal,
}));
vi.mock("@/app/pages/admin/LeagueCompetition", () => ({
  default: () => <p>Halbfinalkonfiguration</p>,
}));

describe("competition center", () => {
  afterEach(cleanup);
  it("loads an empty competition and exposes the five operating views", async () => {
    api.final.mockResolvedValue({
      phase: "draft",
      classes: [],
      routes: [],
      semifinal: [],
      stations: [],
      display: null,
      notices: [],
      audit: [],
      semifinal_audit: [],
    });
    api.semifinal.mockResolvedValue({
      config: { routes: [], assignments: [] },
      staff: [],
      results: [],
    });
    render(
      <MemoryRouter>
        <CompetitionCenter />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Wettkampfzentrale" }),
    ).toBeInTheDocument();
    for (const name of [
      "Übersicht",
      "Halbfinale",
      "Finalstartlisten",
      "Finale",
      "Anzeige & Hinweise",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    expect(screen.getByText("Vorbereitung")).toBeInTheDocument();
  });
});
