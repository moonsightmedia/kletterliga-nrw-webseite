import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ModeratorRankings from "@/app/pages/competition/ModeratorRankings";

const api = vi.hoisted(() => ({ semi: vi.fn(), final: vi.fn() }));
vi.mock("@/services/competitionFinal", () => ({
  getPublicSemifinal: api.semi,
  getPublicFinal: api.final,
  className: (league: string, label: string) => `${league === "lead" ? "Vorstieg" : "Toprope"} · ${label}`,
  resultLabel: () => "Offen",
}));

const rows = [
  { name: "Anna", league: "lead", class_label: "Ü15-w", points: 200, rank: 1, completed_routes: 2 },
  { name: "Ben", league: "toprope", class_label: "Ü40-m", points: 150, rank: 1, completed_routes: 3 },
];

async function mount() {
  render(<MemoryRouter initialEntries={["/moderation/2026"]}><Routes>
    <Route path="/moderation/:season" element={<ModeratorRankings />} />
  </Routes></MemoryRouter>);
  await act(async () => { await Promise.resolve(); });
}

describe("moderator participant ranking view", () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

  it("loads public rankings without login or score editing and preserves manual class choice through refreshes", async () => {
    vi.useFakeTimers();
    api.semi.mockResolvedValue(rows);
    api.final.mockResolvedValue([]);
    await mount();
    expect(screen.getByText("Anna")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Toprope" }));
    expect(screen.getByText("Ben")).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Klasse" })).toBeInTheDocument();
    expect(api.semi).toHaveBeenCalledWith("2026");
    expect(api.semi).toHaveBeenCalledTimes(5);
    expect(screen.queryByText(/anmelden|ergebnis eintragen/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.querySelector('meta[content="noindex, nofollow"]')).not.toBeNull();
  });

  it("keeps the last semifinal scores when refresh fails", async () => {
    vi.useFakeTimers();
    api.semi.mockResolvedValueOnce(rows).mockRejectedValue(new Error("offline"));
    api.final.mockResolvedValue([]);
    await mount();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Der letzte Stand bleibt sichtbar");
  });

  it("offers both phases without losing semifinal data when finals are published", async () => {
    api.semi.mockResolvedValue(rows);
    api.final.mockResolvedValue([{ key: "lead|Ü15-w", league: "lead", class_label: "Ü15-w", phase: "published", entries: [{ name: "Anna im Finale", rank: null, start_position: 1, semifinal_rank: 1, status: "ready" }] }]);
    await mount();
    expect(screen.getByText("Anna im Finale")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Halbfinale" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("Anna")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Finale" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("Anna im Finale")).toBeInTheDocument();
  });
});
