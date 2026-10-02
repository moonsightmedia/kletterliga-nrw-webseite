import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompetitionCenter, {
  CompetitionCenterContent,
} from "@/app/pages/admin/CompetitionCenter";

const api = vi.hoisted(() => ({ final: vi.fn(), semifinal: vi.fn() }));
vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: () => ({
    settings: { season_year: "2026" },
    loading: false,
  }),
}));
vi.mock("@/services/competitionFinal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/competitionFinal")>()),
  getFinalAdmin: api.final,
}));
vi.mock("@/services/competitionDay", () => ({
  getCompetitionAdmin: api.semifinal,
  setCompetitionPhase: vi.fn(),
  correctCompetitionResult: vi.fn(),
}));
vi.mock("@/app/pages/admin/LeagueCompetition", () => ({
  default: () => <p>Halbfinalkonfiguration</p>,
}));

describe("competition center", () => {
  afterEach(cleanup);
  it("keeps the semifinal view focused on semifinal results even when that class has a running final", async () => {
    api.final.mockResolvedValue({
      phase: "closed",
      classes: [
        {
          id: "final-class",
          league: "lead",
          class_label: "Testklasse",
          phase: "running",
          version: 1,
          entries: [],
          stale: false,
        },
      ],
      routes: [],
      semifinal: [
        {
          profile_id: "athlete",
          name: "Robin Test",
          league: "lead",
          class_label: "Testklasse",
          points: 0,
          completed: 0,
          rank: 1,
          excluded: null,
          missing: [],
        },
      ],
      semifinal_results: [],
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
        <CompetitionCenterContent season="2026" initialTab="semifinal" />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "Halbfinale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Halbfinalrangliste",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Finalergebnisse begleiten" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Finalergebnisse begleiten"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Finalfeld bestätigen" }),
    ).not.toBeInTheDocument();
  });
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
