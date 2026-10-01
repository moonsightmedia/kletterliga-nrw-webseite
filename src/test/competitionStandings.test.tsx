import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompetitionStandings from "@/app/pages/competition/CompetitionStandings";

const api = vi.hoisted(() => ({
  day: vi.fn(),
  standings: vi.fn(),
  final: vi.fn(),
}));
vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: () => ({
    settings: { season_year: "2026" },
    loading: false,
  }),
}));
vi.mock("@/services/competitionDay", () => ({
  getCompetitionDay: api.day,
  listCompetitionStandings: api.standings,
}));
vi.mock("@/services/competitionFinal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/competitionFinal")>()),
  getPublicFinal: api.final,
}));

describe("competition standings", () => {
  beforeEach(() => {
    api.final.mockReset();
    api.standings.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("defaults to the released final and preserves its results if the next refresh fails", async () => {
    vi.useFakeTimers();
    api.standings.mockResolvedValue([
      {
        profile_id: "semi",
        name: "Halbfinalstarter",
        league: "lead",
        class_label: "U18",
        points: 500,
        completed_routes: 5,
        rank: 1,
      },
    ]);
    api.final
      .mockResolvedValueOnce([
        {
          key: "lead|U18",
          league: "lead",
          class_label: "U18",
          phase: "final",
          entries: [
            {
              name: "Finalstarter",
              rank: 1,
              has_result: true,
              is_top: true,
              grip: 32,
              seconds: 180,
              semifinal_rank: 1,
              start_position: 6,
              status: "ready",
            },
          ],
        },
      ])
      .mockRejectedValue(new Error("offline"));
    render(
      <MemoryRouter>
        <CompetitionStandings />
      </MemoryRouter>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("tab", { name: "Finale" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Finalstarter")).toBeInTheDocument();
    expect(
      screen.getByText("Offiziell freigegeben", { exact: false }),
    ).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Finalstarter")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("letzte Stand");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Halbfinale" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByText("Halbfinalstarter")).toBeInTheDocument();
  });

  it("shows the full 10–100-point scoring and totals up to 500", async () => {
    api.final.mockResolvedValueOnce([]);
    api.day.mockResolvedValueOnce({ event: { phase: "open" } });
    api.standings.mockResolvedValueOnce([
      {
        profile_id: "first",
        name: "Erster Teilnehmer",
        league: "lead",
        class_label: "Ü15-m",
        points: 500,
        completed_routes: 5,
        rank: 1,
      },
      {
        profile_id: "second",
        name: "Zweiter Teilnehmer",
        league: "lead",
        class_label: "Ü15-m",
        points: 80,
        completed_routes: 1,
        rank: 2,
      },
    ]);
    render(
      <MemoryRouter>
        <CompetitionStandings />
      </MemoryRouter>,
    );
    expect(await screen.findByText("500 P.")).toBeInTheDocument();
    expect(screen.getByText("80 P.")).toBeInTheDocument();
    expect(
      screen.getByText(/jeweils 0–100 Punkten \(maximal 500\)/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Platz 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Platz 2")).toBeInTheDocument();
  });
});
