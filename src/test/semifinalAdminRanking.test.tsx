import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SemifinalAdminRanking from "@/app/components/SemifinalAdminRanking";
import type { FinalAdmin } from "@/services/competitionFinal";
import type { CompetitionAdminData } from "@/services/competitionDay";

function data(): FinalAdmin {
  return {
    phase: "open",
    classes: [],
    routes: [],
    stations: [],
    display: null,
    notices: [],
    audit: [],
    semifinal_audit: [],
    semifinal: [
      {
        profile_id: "alex",
        name: "Alex Beispiel",
        league: "lead",
        class_label: "U18",
        points: 0,
        completed: 1,
        rank: 1,
        excluded: null,
        missing: [2, 3, 4, 5].map((number) => ({
          route_id: `r${number}`,
          number,
          settled: false,
        })),
      },
      {
        profile_id: "kim",
        name: "Kim Komplett",
        league: "toprope",
        class_label: "Erwachsene",
        points: 300,
        completed: 5,
        rank: 1,
        excluded: null,
        missing: [],
      },
    ],
    semifinal_results: [
      {
        id: "zero",
        profile_id: "alex",
        route_number: 1,
        zone: 0,
        points: 0,
        created_at: "2026-10-03T13:58:00Z",
      },
    ],
  };
}
const admin: CompetitionAdminData = {
  config: {
    routes: [1, 2, 3, 4, 5].map((number) => ({
      id: `r${number}`,
      number,
      name: `Route ${number}`,
      grade: "",
      color: "",
    })),
    assignments: [
      { league: "lead", class_label: "U18", route_numbers: [1, 2, 3, 4, 5] },
    ],
    zone_points: Array.from({ length: 11 }, (_, i) => i * 10),
    flash_bonus: 0,
  },
  staff: [],
  results: [],
};
const props = (value = data()) => ({
  data: value,
  admin,
  phase: "open" as const,
  busy: false,
  updated: null,
  onSave: vi.fn().mockResolvedValue(true),
});
const open = () =>
  fireEvent.click(
    screen.getByRole("button", { name: /Alex Beispiel: 0 Punkte/ }),
  );
function selectGrip(value: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: /Griff wählen/ }), {
    key: "Enter",
  });
  fireEvent.click(screen.getByRole("option", { name: value }));
}

describe("participant-first semifinal administration", () => {
  it("keeps absent participants visible but excludes them from open-result work", () => {
    const value = data();
    value.semifinal[0].excluded = "dns";
    render(<SemifinalAdminRanking {...props(value)} />);
    const person = screen.getByRole("button", { name: /Alex Beispiel: 0 Punkte/ });
    expect(person).toHaveTextContent("Nicht erschienen");
    expect(person).not.toHaveTextContent("4 offen");
    open();
    expect(screen.getByRole("button", { name: "Route 2: Eintragen" })).toBeDisabled();
    expect(screen.getAllByText("Nicht erschienen · kein Ergebnis erforderlich")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
    fireEvent.click(screen.getByRole("button", { name: "Offene Ergebnisse" }));
    expect(screen.queryByRole("button", { name: /Alex Beispiel/ })).not.toBeInTheDocument();
  });
  afterEach(cleanup);
  it("keeps first entry and later correction timestamps distinct", () => {
    const input = props();
    input.data.semifinal_audit = [
      {
        result_id: "zero",
        action: "Nachtrag",
        reason: "Papierliste",
        created_at: "2026-10-03T14:01:00Z",
        before_data: {},
        after_data: { zone: 0 },
      },
    ];
    const { rerender } = render(<SemifinalAdminRanking {...input} />);
    open();
    expect(screen.queryByText(/Korrigiert/)).not.toBeInTheDocument();
    const changed = structuredClone(input.data);
    changed.semifinal_audit.unshift({
      result_id: "zero",
      action: "Korrektur",
      reason: "Falscher Griff",
      created_at: "2026-10-03T14:02:00Z",
      before_data: { zone: 2 },
      after_data: { zone: 0 },
    });
    rerender(<SemifinalAdminRanking {...input} data={changed} />);
    expect(screen.getByText(/Eingetragen.*Korrigiert/)).toBeInTheDocument();
  });
  it("finds participants across classes and filters only genuinely open entries", () => {
    render(<SemifinalAdminRanking {...props()} />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Teilnehmer suchen" }),
      { target: { value: "kim" } },
    );
    expect(
      screen.getByRole("button", { name: /Kim Komplett/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Alex Beispiel/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Teilnehmer suchen" }),
      { target: { value: "" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Offene Ergebnisse" }));
    expect(
      screen.getByRole("button", { name: /Alex Beispiel/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Kim Komplett/ }),
    ).not.toBeInTheDocument();
  });
  it("shows an entered zero separately from four missing routes and keeps controls in participant detail", () => {
    render(<SemifinalAdminRanking {...props()} />);
    expect(
      screen.queryByRole("button", { name: /Route 1: Ändern/ }),
    ).not.toBeInTheDocument();
    open();
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Kein Griff · 0 Punkte"),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText("Offen")).toHaveLength(4);
    expect(
      within(dialog).getByRole("button", { name: "Route 1: Ändern" }),
    ).toBeEnabled();
    expect(
      within(dialog).getByRole("button", { name: "Route 2: Eintragen" }),
    ).toBeEnabled();
  });
  it("corrects an existing result during open entry with its own reason", async () => {
    const input = props();
    input.data.semifinal_audit = [
      {
        result_id: "zero",
        action: "Nachtrag",
        reason: "Papierliste",
        created_at: "2026-10-03T14:01:00Z",
        before_data: {},
        after_data: { zone: 0 },
      },
    ];
    render(<SemifinalAdminRanking {...input} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Route 1: Ändern" }));
    selectGrip("Griff 30");
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Begründung" }), {
      target: { value: "Papierliste geprüft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(input.onSave).toHaveBeenCalledWith({
      kind: "result",
      profileId: "alex",
      routeId: "",
      resultId: "zero",
      expected: { zone: 0, points: 0, changedAt: "2026-10-03T14:01:00Z" },
      zone: 3,
      reason: "Papierliste geprüft",
    });
    expect(await screen.findByText("Route 1 gespeichert.")).toBeInTheDocument();
  });
  it("enters a missing zero after the deadline without treating it as absent", async () => {
    const input = props();
    render(<SemifinalAdminRanking {...input} phase="closed" />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Route 2: Eintragen" }));
    selectGrip("Kein Griff · 0 Punkte");
    fireEvent.change(screen.getByRole("textbox", { name: "Begründung" }), {
      target: { value: "Nachtrag" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(input.onSave).toHaveBeenCalledWith({
      kind: "result",
      profileId: "alex",
      routeId: "r2",
      resultId: undefined,
      expected: undefined,
      zone: 0,
      reason: "Nachtrag",
    });
    expect(await screen.findByText("Route 2 gespeichert.")).toBeInTheDocument();
  });
  it("preserves a draft on refresh and prevents overwriting a changed result", () => {
    const input = props();
    const { rerender } = render(<SemifinalAdminRanking {...input} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Route 1: Ändern" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Begründung" }), {
      target: { value: "Meine Korrektur" },
    });
    rerender(
      <SemifinalAdminRanking {...input} data={structuredClone(input.data)} />,
    );
    expect(screen.getByRole("textbox", { name: "Begründung" })).toHaveValue(
      "Meine Korrektur",
    );
    const changed = structuredClone(input.data);
    changed.semifinal_results[0].zone = 2;
    changed.semifinal_results[0].points = 20;
    rerender(<SemifinalAdminRanking {...input} data={changed} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ergebnis wurde inzwischen geändert",
    );
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Aktuellen Wert laden" }),
    );
    expect(
      screen.getByRole("combobox", { name: /Griff wählen/ }),
    ).toHaveTextContent("Griff 20");
    expect(screen.getByRole("textbox", { name: "Begründung" })).toHaveValue(
      "Meine Korrektur",
    );
  });
  it("shows a failed write in the editor and preserves the input", async () => {
    const input = props();
    input.onSave.mockResolvedValue(false);
    render(
      <SemifinalAdminRanking
        {...input}
        errorMessage="Verbindung unterbrochen"
      />,
    );
    open();
    fireEvent.click(screen.getByRole("button", { name: "Route 1: Ändern" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Begründung" }), {
      target: { value: "Papier geprüft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verbindung unterbrochen",
    );
    expect(screen.getByRole("textbox", { name: "Begründung" })).toHaveValue(
      "Papier geprüft",
    );
    expect(screen.queryByText("Route 1 gespeichert.")).not.toBeInTheDocument();
  });
  it("detects a concurrent correction even when the resulting score stayed the same", () => {
    const input = props();
    const { rerender } = render(<SemifinalAdminRanking {...input} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Route 1: Ändern" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Begründung" }), {
      target: { value: "Mein Entwurf" },
    });
    const changed = structuredClone(input.data);
    changed.semifinal_audit = [
      {
        result_id: "zero",
        action: "Korrektur",
        reason: "Ergebnis bestätigt",
        created_at: "2026-10-03T14:01:00Z",
        before_data: { zone: 0 },
        after_data: { zone: 0 },
      },
    ];
    rerender(<SemifinalAdminRanking {...input} data={changed} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ergebnis wurde inzwischen geändert",
    );
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Begründung" })).toHaveValue(
      "Mein Entwurf",
    );
    expect(input.onSave).not.toHaveBeenCalled();
  });
  it("requires a reason for not-climbed and disables writes in preparation", async () => {
    const input = props();
    const { rerender } = render(<SemifinalAdminRanking {...input} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Route 2: Eintragen" }));
    expect(
      screen.getByRole("button", { name: "Nicht geklettert" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Begründung" }), {
      target: { value: "Verletzung" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Nicht geklettert" }));
    expect(input.onSave).toHaveBeenCalledWith({
      kind: "not-climbed",
      profileId: "alex",
      routeId: "r2",
      resultId: undefined,
      expected: undefined,
      zone: 0,
      reason: "Verletzung",
    });
    await screen.findByText("Route 2 gespeichert.");
    rerender(<SemifinalAdminRanking {...input} phase="draft" />);
    expect(
      screen.getByRole("button", { name: "Route 1: Ändern" }),
    ).toBeDisabled();
  });
});
