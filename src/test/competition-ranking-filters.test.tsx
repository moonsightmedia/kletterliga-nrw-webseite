import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import CompetitionRankingsView from "@/app/components/CompetitionRankingsView";
import type { CompetitionStanding } from "@/services/competitionDay";
import type { LiveClass } from "@/services/competitionFinal";

const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeAll(() => Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }));
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});
afterEach(cleanup);

const row = (id: string, league: CompetitionStanding["league"], classLabel: string): CompetitionStanding => ({
  profile_id: id, name: id, league, class_label: classLabel, rank: 1, points: 10, completed_routes: 1,
});
const finalClass = (league: CompetitionStanding["league"], classLabel: string): LiveClass => ({
  key: `${league}|${classLabel}`, league, class_label: classLabel, phase: "published",
  entries: [{ name: `Final ${classLabel}`, rank: null, has_result: false, is_top: null, grip: null, seconds: null, semifinal_rank: 1, start_position: 1, status: "ready" }],
});
const switchPhase = (name: "Halbfinale" | "Finale") => {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  expect(tab).toHaveAttribute("aria-selected", "true");
};
const chooseClass = async (name: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Klasse" }), { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name });
  fireEvent.keyDown(option, { key: "Enter" });
};

it("chooses an existing class when changing league and preserves it through phase and data updates", () => {
  const rows = [row("Alex", "lead", "U15-m"), row("Bea", "toprope", "Ü40-w")];
  const { rerender } = render(<CompetitionRankingsView semifinal={rows} finals={[]} updated={null} />);
  expect(screen.getByText("Alex")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("group", { name: "Liga" })).getByRole("button", { name: "Toprope" }));
  expect(screen.getByText("Bea")).toBeInTheDocument();
  expect(screen.queryByText("Noch keine Wertung für diese Klasse")).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Klasse" })).toHaveTextContent("Ü40-w");
  rerender(<CompetitionRankingsView semifinal={[...rows].reverse()} finals={[finalClass("toprope", "Ü40-w")]} updated={new Date()} />);
  expect(screen.getByRole("tab", { name: "Finale" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Final Ü40-w")).toBeInTheDocument();
  switchPhase("Halbfinale");
  expect(screen.getByText("Bea")).toBeInTheDocument();
});

it("makes arbitrary existing classes selectable without assuming age or gender suffixes", async () => {
  render(<CompetitionRankingsView semifinal={[
    row("Alex", "lead", "U15-m"), row("Chris", "lead", "U18-offen"), row("Dani", "lead", "offen"),
  ]} finals={[]} updated={null} />);
  await chooseClass("U18-offen");
  expect(screen.getByText("Chris")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Klasse" })).toHaveTextContent("U18-offen");
  await chooseClass("offen");
  expect(screen.getByText("Dani")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Klasse" })).toHaveTextContent("offen");
  expect(within(screen.getByRole("group", { name: "Liga" })).getByRole("button", { name: "Toprope" })).toBeDisabled();
});

it("falls back to an available class when the chosen class disappears or is not published in the other phase", async () => {
  const rows = [row("Alex", "lead", "U15-m"), row("Chris", "lead", "U18-offen")];
  const { rerender } = render(<CompetitionRankingsView semifinal={rows} finals={[]} updated={null} />);
  await chooseClass("U18-offen");
  rerender(<CompetitionRankingsView semifinal={rows} finals={[finalClass("lead", "U15-m")]} updated={null} />);
  expect(screen.getByText("Final U15-m")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Klasse" })).toHaveTextContent("U15-m");
  switchPhase("Halbfinale");
  expect(screen.getByText("Chris")).toBeInTheDocument();
  rerender(<CompetitionRankingsView semifinal={[rows[0]]} finals={[finalClass("lead", "U15-m")]} updated={null} />);
  expect(screen.getByText("Alex")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Klasse" })).toHaveTextContent("U15-m");
});

it("shows the empty state without inventing class choices when no results are available", () => {
  render(<CompetitionRankingsView semifinal={[]} finals={[]} updated={null} />);
  expect(screen.getByText("Noch keine Wertung für diese Klasse")).toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Liga" })).not.toBeInTheDocument();
  switchPhase("Finale");
  expect(screen.getByText("Finalstartlisten noch nicht freigegeben")).toBeInTheDocument();
});
