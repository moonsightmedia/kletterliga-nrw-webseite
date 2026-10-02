import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import CompetitionRankingsView from "@/app/components/CompetitionRankingsView";
afterEach(cleanup);
it("filters each class dimension, keeps empty selections and preserves the class across phases and updates", () => {
  const rows = [
    { profile_id: "a", name: "Alex", league: "lead" as const, class_label: "U15-m", rank: 1, points: 10, completed_routes: 1 },
    { profile_id: "b", name: "Bea", league: "toprope" as const, class_label: "Ü40-w", rank: 1, points: 30, completed_routes: 3 },
  ];
  const { rerender } = render(<CompetitionRankingsView semifinal={rows} finals={[]} updated={null} />);
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.getByText("Alex")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("group", { name: "Liga" })).getByRole("button", { name: "Toprope" }));
  expect(screen.queryByText("Alex")).not.toBeInTheDocument();
  expect(screen.getByText("Noch keine Wertung für diese Klasse")).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("group", { name: "Geschlecht" })).getByRole("button", { name: "W" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Altersklasse" })).getByRole("button", { name: "Ü40" }));
  expect(screen.getByText("Bea")).toBeInTheDocument();
  rerender(<CompetitionRankingsView semifinal={[...rows].reverse()} finals={[]} updated={new Date()} />);
  expect(screen.getByText("Bea")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Finale", exact: true }));
  expect(within(screen.getByRole("group", { name: "Altersklasse" })).getByRole("button", { name: "Ü40" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("tab", { name: "Halbfinale", exact: true }));
  expect(screen.getByText("Bea")).toBeInTheDocument();
});
