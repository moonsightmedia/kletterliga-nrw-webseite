import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LiveScreen from "@/app/pages/competition/LiveScreen";
import CompetitionLiveView from "@/app/components/CompetitionLiveView";
import type { LiveData } from "@/services/competitionFinal";

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
    vi.restoreAllMocks();
  });

  const data = (): LiveData => ({
    season: "2026",
    phase: "semifinal",
    pinned_key: null,
    interval_seconds: 5,
    class_keys: [],
    semifinal_open: false,
    updated_at: new Date().toISOString(),
    notices: [],
    classes: [
      {
        key: "lead|A",
        league: "lead",
        class_label: "A",
        entries: Array.from({ length: 9 }, (_, i) => ({
          name: `Person ${i + 1}`,
          rank: i + 1,
          points: 100,
          completed: 5,
        })),
      },
      {
        key: "lead|B",
        league: "lead",
        class_label: "B",
        entries: [
          { name: "Nächste Klasse", rank: 1, points: 200, completed: 5 },
        ],
      },
    ],
  });

  it("visits page two before rotating to the next class and has no administration controls", async () => {
    vi.useFakeTimers();
    render(
      <CompetitionLiveView
        data={data()}
        season="2026"
        lastSuccess={new Date()}
      />,
    );
    expect(screen.getByText("Person 1")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 9")).toBeInTheDocument();
    expect(screen.queryByText("Person 1")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Nächste Klasse")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("removes an expired fullscreen notice and resumes rotation even while offline", async () => {
    vi.useFakeTimers();
    const value = data();
    value.notices = [
      {
        id: "notice",
        title: "Start verschoben",
        body: "Bitte warten",
        show_tv: true,
        show_app: true,
        fullscreen: true,
        expires_at: new Date(Date.now() + 2000).toISOString(),
      },
    ];
    render(
      <CompetitionLiveView
        data={value}
        season="2026"
        lastSuccess={new Date()}
        offline
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Start verschoben" }),
    ).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.queryByText("Bitte warten")).not.toBeInTheDocument();
    expect(screen.getByText("Person 1")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 9")).toBeInTheDocument();
    expect(
      screen.getByText("Daten sind möglicherweise veraltet"),
    ).toBeInTheDocument();
  });

  it("automatically cycles all pages of a pinned class and repeats without input", async () => {
    vi.useFakeTimers();
    const value = data();
    value.pinned_key = "lead|A";
    const { container } = render(<CompetitionLiveView data={value} season="2026" lastSuccess={new Date()} />);
    const initialSlide = container.querySelector("main");
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 9")).toBeInTheDocument();
    expect(container.querySelector("main")).not.toBe(initialSlide);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(screen.queryByText("Nächste Klasse")).not.toBeInTheDocument();
  });

  it("accounts for a long name on a later page and recalculates after resizing", async () => {
    vi.useFakeTimers();
    let height = 320;
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function () {
      return this.classList.contains("tv-table-space") ? height : 0;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      const measuredHeight = this.tagName === "THEAD" ? 40 : this.tagName === "TR" ? (this.textContent?.includes("Person 9") ? 100 : 40) : height;
      return { x: 0, y: 0, top: 0, left: 0, right: 900, bottom: measuredHeight, width: 900, height: measuredHeight, toJSON: () => ({}) };
    });
    const { container } = render(<CompetitionLiveView data={data()} season="2026" lastSuccess={new Date()} />);
    expect(container.querySelector(".competition-tv")).toHaveAttribute("data-page-size", "2");
    expect(screen.getByText("Person 2")).toBeInTheDocument();
    expect(screen.queryByText("Person 3")).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 3")).toBeInTheDocument();
    expect(screen.getByText("Person 4")).toBeInTheDocument();
    height = 450;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(container.querySelector(".competition-tv")).toHaveAttribute("data-page-size", "4");
    expect(screen.getByText("Person 5")).toBeInTheDocument();
    expect(screen.getByText("Person 8")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 9")).toBeInTheDocument();
  });

  it("updates scores without replaying the page transition or delaying rotation", async () => {
    vi.useFakeTimers();
    const value = data();
    const { container, rerender } = render(<CompetitionLiveView data={value} season="2026" lastSuccess={new Date()} />);
    const slide = container.querySelector("main");
    await act(() => vi.advanceTimersByTimeAsync(2000));
    const updated = data();
    updated.classes[0].entries[0] = { name: "Person 1", rank: 1, points: 250, completed: 5 };
    rerender(<CompetitionLiveView data={updated} season="2026" lastSuccess={new Date()} />);
    expect(screen.getByText("250 P. · 5/5")).toBeInTheDocument();
    expect(container.querySelector("main")).toBe(slide);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByText("Person 9")).toBeInTheDocument();
  });

  it("retains the last public ranking after a failed refresh without requesting a login", async () => {
    vi.useFakeTimers();
    api.live
      .mockResolvedValueOnce(data())
      .mockRejectedValue(new Error("offline"));
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
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Person 9")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("veraltet");
    expect(screen.queryByText(/anmelden/i)).not.toBeInTheDocument();
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
