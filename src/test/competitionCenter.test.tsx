import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompetitionCenter, {
  CompetitionCenterContent,
} from "@/app/pages/admin/CompetitionCenter";

const api = vi.hoisted(() => ({ final: vi.fn(), semifinal: vi.fn(), route: vi.fn(), close: vi.fn() }));
vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: () => ({
    settings: { season_year: "2026" },
    loading: false,
  }),
}));
vi.mock("@/services/competitionFinal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/competitionFinal")>()),
  getFinalAdmin: api.final,
  saveFinalRoute: api.route,
}));
vi.mock("@/services/competitionDay", () => ({
  getCompetitionAdmin: api.semifinal,
  setCompetitionPhase: api.close,
  correctCompetitionResult: vi.fn(),
}));
vi.mock("@/app/pages/admin/LeagueCompetition", () => ({
  default: () => <p>Halbfinalkonfiguration</p>,
}));

describe("competition center", () => {
  it("closes semifinal input directly from the start-list area only after confirmation", async () => {
    let phase = "open";
    api.close.mockReset().mockImplementation(async () => { phase = "closed"; });
    api.final.mockImplementation(async () => ({ phase, classes: [], routes: [], semifinal: [], stations: [], display: null, notices: [], audit: [], semifinal_audit: [] }));
    api.semifinal.mockResolvedValue({ config: { routes: [], assignments: [] }, staff: [], results: [] });
    render(<MemoryRouter><CompetitionCenterContent season="2026" initialTab="roster" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Halbfinaleingabe schließen" }));
    expect(api.close).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("René kann weiterhin Ergebnisse nachtragen");
    fireEvent.click(screen.getByRole("button", { name: "Eingabe schließen" }));
    await waitFor(() => expect(api.close).toHaveBeenCalledWith("2026", "closed"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Halbfinaleingabe schließen" })).not.toBeInTheDocument();
  });
  it("keeps documented absences out of the open-route workload in the overview", async () => {
    api.final.mockResolvedValue({ phase: "closed", classes: [], routes: [], semifinal: [{ profile_id: "absent-athlete", name: "Nicht vor Ort", league: "lead", class_label: "Testklasse", points: 0, completed: 0, rank: 1, excluded: "dns", missing: [{ route_id: "unclimbed", number: 1, settled: false }] }], semifinal_results: [], stations: [], display: null, notices: [], audit: [], semifinal_audit: [] });
    api.semifinal.mockResolvedValue({ config: { routes: [], assignments: [] }, staff: [], results: [] });
    render(<MemoryRouter><CompetitionCenterContent season="2026" /></MemoryRouter>);
    expect(await screen.findByText("0 offene Routeneinträge")).toBeInTheDocument();
    expect(screen.queryByText("1 offene Routeneinträge")).not.toBeInTheDocument();
  });
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
  it("loads an empty competition and exposes grouped operating views", async () => {
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
      await screen.findByRole("heading", { name: "Halbfinale & Finale" }),
    ).toBeInTheDocument();
    for (const name of [
      "Übersicht",
      "Halbfinale",
      "Einrichtung",
      "Finale",
      "TV & Hinweise",
      "Abschluss",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    expect(screen.getByText("Vorbereitung")).toBeInTheDocument();
  });
  it("creates final routes without classes and preserves the draft across navigation", async () => {
    api.final.mockResolvedValue({phase:"draft",classes:[],routes:[],semifinal:[],stations:[],display:null,notices:[],audit:[],semifinal_audit:[]});
    api.semifinal.mockResolvedValue({config:{routes:[],assignments:[]},staff:[],results:[]}); api.route.mockResolvedValue(null);
    render(<MemoryRouter><CompetitionCenterContent season="2026" /></MemoryRouter>);
    fireEvent.mouseDown(await screen.findByRole("tab",{name:"Einrichtung"}), {button:0});
    fireEvent.click(screen.getByRole("button",{name:"Finalrouten"}));
    fireEvent.change(screen.getByLabelText("Routenname"), {target:{value:"Finalroute Gelb"}});
    fireEvent.change(screen.getByLabelText("Letzter Griff"), {target:{value:"42"}});
    expect(api.route).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("tab",{name:"Halbfinale"}), {button:0});
    expect(screen.queryByRole("button",{name:"Route speichern"})).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab",{name:"Einrichtung"}), {button:0});
    expect(screen.getByLabelText("Routenname")).toHaveValue("Finalroute Gelb");
    fireEvent.click(screen.getByRole("button",{name:"Route speichern"}));
    await waitFor(()=>expect(api.route).toHaveBeenCalledWith("2026",1,"Finalroute Gelb",42));
  });
});
