import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SemifinalRanking from "@/app/components/SemifinalRanking";
describe("semifinal monitoring without a second approval", () => {
  afterEach(cleanup);
  it("distinguishes an entered zero from an absent result and expands the five assigned routes", () => {
    render(
      <SemifinalRanking
        rows={[
          {
            profile_id: "one",
            name: "Alex Beispiel",
            league: "lead",
            class_label: "U18",
            points: 0,
            completed: 1,
            rank: 1,
            excluded: null,
            missing: [{ route_id: "r2", number: 2, settled: false }],
          },
        ]}
        results={[
          {
            id: "result",
            profile_id: "one",
            route_number: 1,
            zone: 0,
            points: 0,
            created_at: "2026-10-03T13:58:00Z",
          },
        ]}
        assignments={[
          {
            league: "lead",
            class_label: "U18",
            route_numbers: [1, 2, 3, 4, 5],
          },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Alex Beispiel: 0 Punkte/ }),
    );
    expect(screen.getByText("0 Punkte · Kein Griff")).toBeInTheDocument();
    expect(screen.getAllByText("Noch nicht eingetragen")).toHaveLength(4);
    expect(screen.getByText(/Eingetragen:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Keine weitere Bestätigung erforderlich/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /bestätigen|freigeben/i }),
    ).not.toBeInTheDocument();
  });
});
