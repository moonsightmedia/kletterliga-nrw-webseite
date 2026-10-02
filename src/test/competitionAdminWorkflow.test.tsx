import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CompetitionFinalPanel,
  CompetitionRosterPanel,
} from "@/app/components/CompetitionAdminPanels";
import CompetitionDisplayPanel from "@/app/components/CompetitionDisplayPanel";
import { CompetitionPrintContent } from "@/app/pages/admin/CompetitionPrint";
import {
  downloadFinalCsv,
  type FinalAdmin,
  type FinalClass,
  type FinalEntry,
} from "@/services/competitionFinal";
import type { CompetitionCenterSource } from "@/app/pages/admin/CompetitionCenter";

const entry = (id: string, extra: Partial<FinalEntry> = {}): FinalEntry => ({
  entry_id: id,
  profile_id: id,
  name: `Person ${id}`,
  semifinal_rank: 1,
  semifinal_points: 500,
  start_position: 1,
  status: "ready",
  checked_at: null,
  attempt_id: "attempt",
  is_top: false,
  grip: 24,
  seconds: 192,
  rank: 1,
  entered_at: "2026-10-03T15:00:00Z",
  ...extra,
});
const fixture = (): FinalAdmin => ({
  phase: "closed",
  final_password_set: true,
  classes: [
    {
      id: "class-a",
      league: "lead",
      class_label: "A",
      route_id: "route",
      station_no: 1,
      phase: "running",
      version: 4,
      published_at: "2026-10-03T14:30:00Z",
      stale: false,
      entries: [
        entry("a"),
        entry("b", {
          name: "Fehlender Wert",
          attempt_id: null,
          grip: null,
          seconds: null,
          rank: null,
          start_position: 2,
        }),
      ],
    },
  ],
  routes: [{ id: "route", number: 1, name: "Finalroute", max_grip: 32 }],
  semifinal: Array.from({ length: 7 }, (_, i) => ({
    profile_id: String(i),
    name: `Starter ${i + 1}`,
    league: "lead",
    class_label: "A",
    points: i < 5 ? 500 - i * 50 : 250,
    completed: 5,
    rank: i < 5 ? i + 1 : 6,
    excluded: null,
    missing: [],
  })),
  semifinal_results: [],
  stations: [],
  display: {
    phase: "semifinal",
    class_keys: [],
    pinned_key: null,
    interval_seconds: 15,
  },
  notices: [],
  audit: [],
  semifinal_audit: [],
});
const source = {
  checkFinalEntry: vi.fn(),
  setFinalEntryStatus: vi.fn(),
  setFinalPhase: vi.fn(),
  publishFinalClass: vi.fn(),
  moveFinalEntry: vi.fn(),
  setFinalExclusion: vi.fn(),
  saveFinalRoute: vi.fn(),
  saveLiveNotice: vi.fn(),
  setLiveDisplay: vi.fn(),
} as unknown as CompetitionCenterSource;
const run = vi.fn(async (action: () => Promise<unknown>) => {
  await action();
  return true;
});
const common = (data: FinalAdmin) => ({
  data,
  source,
  run,
  season: "2026",
  busy: false,
  error: "",
  printHref: "/print",
});
const wrap = (node: React.ReactNode) => <MemoryRouter>{node}</MemoryRouter>;
const choose = async (name: string, option: string) => {
  fireEvent.keyDown(screen.getByRole("combobox", { name }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: option }));
};

beforeEach(() => {
  vi.clearAllMocks();
  run.mockImplementation(async (action) => {
    await action();
    return true;
  });
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("focused final administration", () => {
  it("proposes all seven at the tied cutoff, confirms explicitly and keeps frozen published order", async () => {
    const data = fixture();
    data.classes = [];
    const group = { league: "lead" as const, label: "A", rows: data.semifinal };
    const view = render(
      wrap(
        <CompetitionRosterPanel
          {...common(data)}
          group={group}
          phase="closed"
          onSemifinal={vi.fn()}
        />,
      ),
    );
    expect(screen.getByText(/7 Starter/)).toBeInTheDocument();
    const proposedNames = within(
      screen.getByRole("region", { name: "Finalstartliste" }),
    )
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(proposedNames[0]).toContain("Starter 6");
    expect(proposedNames[6]).toContain("Starter 1");
    await choose("Finalroute", "Route 1 · Finalroute · Griff 32");
    fireEvent.click(
      screen.getByRole("button", { name: "Finalfeld bestätigen" }),
    );
    expect(source.publishFinalClass).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    await waitFor(() =>
      expect(source.publishFinalClass).toHaveBeenCalledWith(
        "2026",
        "lead",
        "A",
        "route",
        1,
        0,
      ),
    );
    const published = fixture();
    published.classes[0].phase = "published";
    view.rerender(
      wrap(
        <CompetitionRosterPanel
          {...common(published)}
          group={group}
          phase="closed"
          onSemifinal={vi.fn()}
        />,
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Startreihenfolge" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Startliste drucken" }),
    ).toHaveAttribute("href", "/print?klasse=lead%7CA");
    expect(screen.getAllByText("Person a")).toHaveLength(1);
  });
  it("sends unresolved routes back to the semifinal and rejects out-of-range route settings", () => {
    const data = fixture();
    data.classes = [];
    data.semifinal[0].missing = [
      { route_id: "semi-route", number: 5, settled: false },
    ];
    const onSemifinal = vi.fn();
    render(
      wrap(
        <CompetitionRosterPanel
          {...common(data)}
          group={{ league: "lead", label: "A", rows: data.semifinal }}
          phase="closed"
          onSemifinal={onSemifinal}
        />,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Finalfeld bestätigen" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "1 fehlende Routeneinträge klären" }),
    );
    expect(onSemifinal).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText("Routenname"), {
      target: { value: "Route" },
    });
    fireEvent.change(screen.getByLabelText("Letzter Griff"), {
      target: { value: "1000" },
    });
    expect(
      screen.getByRole("button", { name: "Route speichern" }),
    ).toBeDisabled();
  });
  it("opens a person's paper check and refuses a changed class version until explicit review", async () => {
    const data = fixture();
    const view = render(
      wrap(
        <CompetitionFinalPanel
          {...common(data)}
          finalClass={data.classes[0]}
          stationHref="/entry"
          onRoster={vi.fn()}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Person a/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Griff 24 · 3:12");
    const newer = fixture();
    newer.classes[0].version = 5;
    newer.classes[0].entries[0].grip = 25;
    view.rerender(
      wrap(
        <CompetitionFinalPanel
          {...common(newer)}
          finalClass={newer.classes[0]}
          stationHref="/entry"
          onRoster={vi.fn()}
        />,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Mit Papier abgeglichen" }),
    ).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Griff 25");
    fireEvent.click(
      screen.getByRole("button", { name: "Aktuellen Stand übernehmen" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Mit Papier abgeglichen" }),
    );
    await waitFor(() =>
      expect(source.checkFinalEntry).toHaveBeenCalledWith("a", 5),
    );
  });
  it("requires a reason for non-start and preserves it on a rejected write", async () => {
    const data = fixture();
    run.mockResolvedValue(false);
    render(
      wrap(
        <CompetitionFinalPanel
          {...common(data)}
          error="Version stimmt nicht"
          finalClass={data.classes[0]}
          stationHref="/entry"
          onRoster={vi.fn()}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Fehlender Wert/ }));
    fireEvent.click(screen.getByText("Ausfall oder Zwischenfall"));
    await choose("Teilnehmerstatus", "Nicht gestartet");
    expect(
      screen.getByRole("button", { name: "Status speichern" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Begründung"), {
      target: { value: "Teilnehmer ist nicht erschienen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Status speichern" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Version stimmt nicht",
      ),
    );
    expect(screen.getByLabelText("Begründung")).toHaveValue(
      "Teilnehmer ist nicht erschienen",
    );
    expect(screen.queryByText("DNS")).not.toBeInTheDocument();
  });
  it("blocks official release with open values, accepts clarified non-start, and freezes phase confirmation", async () => {
    const data = fixture();
    data.classes[0].phase = "review";
    const view = render(
      wrap(
        <CompetitionFinalPanel
          {...common(data)}
          finalClass={data.classes[0]}
          stationHref="/entry"
          onRoster={vi.fn()}
        />,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Offiziell freigeben" }),
    ).toBeDisabled();
    data.classes[0].entries[0].checked_at = "2026-10-03T16:00:00Z";
    data.classes[0].entries[1].status = "dns";
    view.rerender(
      wrap(
        <CompetitionFinalPanel
          {...common(data)}
          finalClass={data.classes[0]}
          stationHref="/entry"
          onRoster={vi.fn()}
        />,
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Offiziell freigeben" }),
    );
    expect(source.setFinalPhase).not.toHaveBeenCalled();
    const updated = { ...data, classes: [{ ...data.classes[0], version: 5 }] };
    view.rerender(
      wrap(
        <CompetitionFinalPanel
          {...common(updated)}
          finalClass={updated.classes[0]}
          stationHref="/entry"
          onRoster={vi.fn()}
        />,
      ),
    );
    expect(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Offiziell freigeben",
      }),
    ).toBeDisabled();
  });
});

describe("display and notices", () => {
  it("retains edited settings during polling, detects a changed saved configuration and lets it be adopted", async () => {
    const data = fixture();
    const view = render(
      wrap(
        <CompetitionDisplayPanel
          {...common(data)}
          tvHref="/live/2026"
          clock={Date.now()}
        />,
      ),
    );
    fireEvent.change(screen.getByLabelText("Seitenwechsel (Sekunden)"), {
      target: { value: "20" },
    });
    view.rerender(
      wrap(
        <CompetitionDisplayPanel
          {...common(fixture())}
          tvHref="/live/2026"
          clock={Date.now()}
        />,
      ),
    );
    expect(screen.getByLabelText("Seitenwechsel (Sekunden)")).toHaveValue(20);
    const changed = fixture();
    changed.display!.interval_seconds = 30;
    view.rerender(
      wrap(
        <CompetitionDisplayPanel
          {...common(changed)}
          tvHref="/live/2026"
          clock={Date.now()}
        />,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Anzeige speichern" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Aktuellen Stand übernehmen" }),
    );
    expect(screen.getByLabelText("Seitenwechsel (Sekunden)")).toHaveValue(30);
    fireEvent.change(screen.getByLabelText("Seitenwechsel (Sekunden)"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anzeige speichern" }));
    await waitFor(() =>
      expect(source.setLiveDisplay).toHaveBeenCalledWith(
        "2026",
        expect.objectContaining({ interval_seconds: 25 }),
      ),
    );
    expect(screen.getByLabelText("Seitenwechsel (Sekunden)")).toHaveValue(25);
  });
  it("uses a ten-minute expiry, removes fullscreen when TV is unticked and protects an unsaved notice", async () => {
    const now = Date.now();
    render(
      wrap(
        <CompetitionDisplayPanel
          {...common(fixture())}
          tvHref="/live/2026"
          clock={now}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Neuer Hinweis" }));
    fireEvent.change(screen.getByLabelText("Titel"), {
      target: { value: "Start verschoben" },
    });
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "Bitte am Start warten" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "TV bildschirmfüllend" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "TV" }));
    expect(
      screen.queryByRole("checkbox", { name: "TV bildschirmfüllend" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(
      screen.getByText("Ungespeicherten Hinweis verwerfen?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter bearbeiten" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Hinweis veröffentlichen" }),
    );
    await waitFor(() => expect(source.saveLiveNotice).toHaveBeenCalledOnce());
    const saved = vi.mocked(source.saveLiveNotice).mock.calls[0][1];
    expect(saved).toMatchObject({
      show_app: true,
      show_tv: false,
      fullscreen: false,
    });
    expect(Date.parse(saved.expires_at!) - now).toBeGreaterThanOrEqual(600000);
    expect(Date.parse(saved.expires_at!) - now).toBeLessThan(605000);
  });
  it("does not republish an expired notice without selecting a new expiry", async () => {
    const data = fixture();
    data.notices = [
      {
        id: "expired",
        title: "Alter Hinweis",
        body: "Warten",
        show_app: true,
        show_tv: true,
        fullscreen: true,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
    ];
    render(
      wrap(
        <CompetitionDisplayPanel
          {...common(data)}
          tvHref="/live/2026"
          clock={Date.now()}
        />,
      ),
    );
    expect(screen.getByText("Kein aktiver Hinweis.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Abgelaufene Hinweise (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    expect(
      screen.getByRole("button", { name: "Änderung speichern" }),
    ).toBeDisabled();
    await choose("Hinweis automatisch ausblenden", "Nach 5 Minuten");
    expect(
      screen.getByRole("button", { name: "Änderung speichern" }),
    ).toBeEnabled();
  });
});

describe("status in customer exports", () => {
  it("exports readable status and suppresses a retained attempt that is not counted", async () => {
    const data = fixture();
    const c: FinalClass = data.classes[0];
    c.entries = [
      entry("dns", { status: "dns", rank: null }),
      entry("incident", { status: "incident", rank: null }),
      entry("regular"),
    ];
    let csv = "";
    vi.stubGlobal(
      "Blob",
      class {
        constructor(parts: BlobPart[]) {
          csv = parts.map(String).join("");
        }
      },
    );
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL() {
          return "blob:test";
        }
        static revokeObjectURL() {}
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    downloadFinalCsv(c, "2026");
    expect(csv).toContain('"Nicht gestartet"');
    expect(csv).toContain('"Zwischenfall ungeklärt"');
    expect(csv.split("\r\n")[1]).not.toContain('"24"');
    expect(csv.split("\r\n")[2]).not.toContain('"192"');
    expect(csv.split("\r\n")[3]).toContain('"24"');
    render(
      <MemoryRouter initialEntries={["/print?art=ergebnis"]}>
        <CompetitionPrintContent
          season="2026"
          load={vi.fn().mockResolvedValue(data)}
        />
      </MemoryRouter>,
    );
    const first = await screen.findByText("Person dns");
    const dnsRow = first.closest("tr")!;
    expect(dnsRow).toHaveTextContent("Nicht gestartet");
    expect(dnsRow).not.toHaveTextContent("3:12");
    expect(screen.getByText("Person regular").closest("tr")).toHaveTextContent(
      "3:12",
    );
  });
});
