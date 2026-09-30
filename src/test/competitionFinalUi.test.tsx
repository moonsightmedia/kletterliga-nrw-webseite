import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LiveScreen from "@/app/pages/competition/LiveScreen";

const api = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/services/competitionFinal", () => ({
  getLiveCompetition: api.live,
  resultLabel: (entry: { has_result: boolean; grip: number }) =>
    entry.has_result ? `Griff ${entry.grip}` : "Offen",
}));

describe("final live screen", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    api.live.mockReset();
  });

  it("continues rotating classes while five-second refreshes arrive", async () => {
    vi.useFakeTimers();
    api.live.mockResolvedValue({
      season: "2026",
      phase: "final",
      pinned_key: null,
      interval_seconds: 15,
      class_keys: [],
      semifinal_open: false,
      updated_at: "2026-10-03T16:30:00Z",
      notices: [],
      classes: [
        {
          key: "lead|Klasse A",
          league: "lead",
          class_label: "Klasse A",
          phase: "running",
          entries: [
            {
              name: "Anna",
              rank: 1,
              has_result: true,
              grip: 20,
              status: "ready",
              seconds: 120,
            },
          ],
        },
        {
          key: "lead|Klasse B",
          league: "lead",
          class_label: "Klasse B",
          phase: "running",
          entries: [
            {
              name: "Ben",
              rank: 1,
              has_result: true,
              grip: 22,
              status: "ready",
              seconds: 140,
            },
          ],
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/live/2026"]}>
        <Routes>
          <Route path="/live/:season" element={<LiveScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Anna")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16000);
    });
    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(api.live).toHaveBeenCalledTimes(4);
  });
});
