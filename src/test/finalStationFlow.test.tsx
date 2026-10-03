import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinalStationContent } from "@/app/pages/competition/FinalStation";
import type { FinalEntry, StationClass } from "@/services/competitionFinal";

const entry = (
  id: string,
  position: number,
  extra: Partial<FinalEntry> = {},
): FinalEntry => ({
  entry_id: id,
  profile_id: id,
  name: id === "a" ? "Anna Beispiel" : "Ben Muster",
  semifinal_rank: 7 - position,
  semifinal_points: 100,
  start_position: position,
  status: "ready",
  checked_at: null,
  attempt_id: null,
  is_top: null,
  grip: null,
  seconds: null,
  rank: null,
  entered_at: null,
  ...extra,
});
const fixture = (): StationClass[] => [
  {
    id: "class-a",
    league: "lead",
    class_label: "U18",
    phase: "running",
    version: 4,
    route: { id: "route-a", number: 1, name: "Finale Vorstieg", max_grip: 32 },
    entries: [
      entry("a", 1),
      entry("b", 2, {
        attempt_id: "previous",
        grip: 20,
        is_top: false,
        seconds: 72,
      }),
    ],
  },
  {
    id: "class-b",
    league: "toprope",
    class_label: "Ü18",
    phase: "published",
    version: 2,
    route: { id: "route-b", number: 2, name: "Finale Toprope", max_grip: 28 },
    entries: [entry("c", 1)],
  },
];
const draftKey = "kletterliga:final-draft:2026:1";

describe("mobile final result flow", () => {
  let data: StationClass[];
  let source: {
    getFinalStation: ReturnType<typeof vi.fn>;
    submitFinalAttempt: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    data = fixture();
    source = {
      getFinalStation: vi
        .fn()
        .mockImplementation(async () => ({ classes: structuredClone(data) })),
      submitFinalAttempt: vi.fn().mockImplementation(async (input) => {
        const c = data.find((c) =>
          c.entries.some((e) => e.entry_id === input.entry),
        )!;
        Object.assign(
          c.entries.find((e) => e.entry_id === input.entry)!,
          {
            attempt_id: "new-attempt",
            grip: input.grip,
            is_top: input.top,
            seconds: input.seconds,
          },
        );
        c.version++;
      }),
    };
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  const mount = () =>
    render(
      <MemoryRouter>
        <FinalStationContent season="2026" source={source} />
      </MemoryRouter>,
    );
  async function login(handset = 1) {
    fireEvent.click(
      screen.getByRole("button", { name: `Handy ${handset}` }),
    );
    fireEvent.change(screen.getByLabelText("Finalpasswort"), {
      target: { value: "Synthetic-Password" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Anmelden" }),
    );
    await screen.findByRole("heading", { name: "Klasse wählen" });
  }
  async function choose(id = "a") {
    fireEvent.click(
      screen.getByRole("button", { name: /Vorstieg · U18 Route 1/ }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: id === "a" ? /1\. Anna Beispiel/ : /2\. Ben Muster/,
      }),
    );
    await screen.findByLabelText("Minuten");
  }
  function fill(grip = "24", minutes = "3", seconds = "12") {
    fireEvent.change(screen.getByLabelText("Erreichter Griff"), {
      target: { value: grip },
    });
    fireEvent.change(screen.getByLabelText("Minuten"), {
      target: { value: minutes },
    });
    fireEvent.change(screen.getByLabelText("Sekunden"), {
      target: { value: seconds },
    });
  }
  function review() {
    fireEvent.click(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    );
  }

  it("shows a preparation class without inventing starters or a route", async () => {
    data = [{ ...fixture()[0], phase: "preparation", route: null, entries: [] }];
    mount();
    await login();
    fireEvent.click(screen.getByRole("button", { name: /Vorstieg · U18 Starterliste folgt/ }));
    expect(await screen.findByRole("heading", { name: "Vorstieg · U18" })).toBeInTheDocument();
    expect(screen.getByText("René erstellt die Starterliste nach Abschluss des Halbfinales.")).toBeInTheDocument();
    expect(screen.queryByText("Anna Beispiel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Erreichter Griff")).not.toBeInTheDocument();
  });
  it.each(["published", "running"] as const)("shows paper starters in reverse list order but prevents scoring in phase %s", async (phase) => {
    data = [{ ...fixture()[0], phase, route: null }];
    mount();
    await login();
    fireEvent.click(screen.getByRole("button", { name: /Vorstieg · U18 2 Starter · Papierliste/ }));
    const anna = await screen.findByRole("button", { name: /1\. Anna Beispiel/ });
    expect(anna).toBeDisabled();
    expect(screen.getByRole("button", { name: /2\. Ben Muster/ })).toBeDisabled();
    expect(screen.getByText("Halbfinalplatz 6")).toBeInTheDocument();
    fireEvent.click(anna);
    expect(screen.queryByLabelText("Erreichter Griff")).not.toBeInTheDocument();
    expect(source.submitFinalAttempt).not.toHaveBeenCalled();
  });
  it("uses class and participant rows, confirms identity, and returns to the same class after saving", async () => {
    mount();
    await login(2);
    expect(source.getFinalStation).toHaveBeenCalledWith(
      "2026",
      2,
      "Synthetic-Password",
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    await choose();
    fill();
    review();
    expect(
      screen.getByRole("heading", { name: "Anna Beispiel" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Griff 24")).toBeInTheDocument();
    expect(screen.getByText("3:12")).toBeInTheDocument();
    expect(screen.queryByLabelText("Erreichter Griff")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await screen.findByRole("heading", { name: "Vorstieg · U18" });
    expect(source.submitFinalAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        entry: "a",
        grip: 24,
        seconds: 192,
        top: false,
        station: 2,
        version: 4,
      }),
    );
    expect(
      screen.getByRole("button", {
        name: /1\. Anna Beispiel, Griff 24 · 3:12/,
      }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("kletterliga:final-draft:2026:2")).toBeNull();
  });
  it("requires explicit grip and both time fields, accepts zero and 5:00, rejects invalid limits", async () => {
    mount();
    await login();
    await choose();
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    fill("0", "5", "0");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeEnabled();
    fill("33", "5", "0");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    fill("24", "5", "1");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    fill("24", "0", "60");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    fill("24.5", "0", "30");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    fill("24", "0", "");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
  });
  it("saves TOP with the route maximum and manually entered time", async () => {
    mount();
    await login();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "TOP" }));
    expect(screen.queryByLabelText("Erreichter Griff")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Minuten"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Sekunden"), {
      target: { value: "59" },
    });
    review();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await waitFor(() =>
      expect(source.submitFinalAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ top: true, grip: 32, seconds: 59 }),
      ),
    );
  });
  it("prefills a correction and requires its own nonblank reason", async () => {
    mount();
    await login();
    await choose("b");
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("20");
    expect(screen.getByLabelText("Minuten")).toHaveValue("1");
    expect(screen.getByLabelText("Sekunden")).toHaveValue("12");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    fill("21", "1", "13");
    fireEvent.change(screen.getByLabelText("Grund für die Korrektur"), {
      target: { value: " Papierwert geprüft " },
    });
    review();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await waitFor(() =>
      expect(source.submitFinalAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ entry: "b", reason: "Papierwert geprüft" }),
      ),
    );
  });
  it("keeps a draft when navigating back and explicitly discards it before changing person", async () => {
    mount();
    await login();
    await choose();
    fill();
    fireEvent.click(
      screen.getByRole("button", { name: "Zur Teilnehmerliste" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /2\. Ben Muster/ }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "Entwurf verwerfen?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Entwurf behalten" }));
    fireEvent.click(screen.getByRole("button", { name: /1\. Anna Beispiel/ }));
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
    fireEvent.click(
      screen.getByRole("button", { name: "Zur Teilnehmerliste" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /2\. Ben Muster/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Verwerfen und wechseln" }),
    );
    expect(
      screen.getByRole("heading", { name: "Ben Muster" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("20");
  });
  it("restores the local draft without putting a password into its storage", async () => {
    const page = mount();
    await login();
    await choose();
    fill();
    expect(localStorage.getItem(draftKey)).not.toContain("Synthetic-Password");
    page.unmount();
    mount();
    await screen.findByRole("heading", { name: "Anna Beispiel" });
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
    expect(screen.getByLabelText("Sekunden")).toHaveValue("12");
    expect(screen.getByRole("status")).toHaveTextContent("nicht übertragen");
    expect(source.submitFinalAttempt).not.toHaveBeenCalled();
  });
  it("retains an unconfirmed submission and uses the same request ID on deliberate retry", async () => {
    source.submitFinalAttempt.mockRejectedValueOnce(new Error("Netzfehler"));
    mount();
    await login();
    await choose();
    fill();
    review();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Speicherung nicht bestätigt",
    );
    const request = source.submitFinalAttempt.mock.calls[0][0].request;
    review();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await screen.findByRole("heading", { name: "Vorstieg · U18" });
    expect(source.submitFinalAttempt.mock.calls[1][0].request).toBe(request);
  });
  it("does not silently rebase a draft after another phone changes a result", async () => {
    mount();
    await login();
    await choose();
    fill();
    data[0].version = 5;
    Object.assign(data[0].entries[0], {
      attempt_id: "other-phone",
      grip: 26,
      is_top: false,
      seconds: 200,
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Liste aktualisieren" }),
    );
    await screen.findByText("Stand geändert · bitte vergleichen");
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(draftKey)!).version).toBe(4);
    expect(source.submitFinalAttempt).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Aktuellen Stand übernehmen" }),
    );
    fireEvent.change(screen.getByLabelText("Grund für die Korrektur"), {
      target: { value: "Wert mit Papier geprüft" },
    });
    review();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await waitFor(() =>
      expect(source.submitFinalAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 5,
          grip: 24,
          reason: "Wert mit Papier geprüft",
        }),
      ),
    );
  });
  it("blocks stale confirmation after a change during the review screen", async () => {
    mount();
    await login();
    await choose();
    fill();
    review();
    data[0].version++;
    fireEvent.click(
      screen.getByRole("button", { name: "Liste aktualisieren" }),
    );
    await screen.findByText("Stand geändert · bitte vergleichen");
    expect(
      screen.getByRole("button", { name: "Ergebnis speichern" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Aktuellen Stand übernehmen" }),
    );
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
    expect(
      screen.queryByRole("button", { name: "Ergebnis speichern" }),
    ).not.toBeInTheDocument();
  });
  it("blocks double clicks and edits while saving", async () => {
    let complete!: () => void;
    source.submitFinalAttempt.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    mount();
    await login();
    await choose();
    fill();
    review();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    fireEvent.click(screen.getByRole("button", { name: "Wird gespeichert …" }));
    expect(source.submitFinalAttempt).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Zur Eingabe" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeDisabled();
    await act(async () => complete());
  });
  it("keeps a confirmed write successful even if the following refresh fails", async () => {
    mount();
    await login();
    await choose();
    fill();
    review();
    source.getFinalStation.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis speichern" }));
    await screen.findByRole("heading", { name: "Vorstieg · U18" });
    expect(screen.getByRole("status")).toHaveTextContent("gespeichert");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ergebnis gespeichert. Liste konnte nicht aktualisiert werden.",
    );
    expect(
      screen.getByRole("button", { name: /1\. Anna Beispiel, Griff 24/ }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(draftKey)).toBeNull();
    expect(
      screen.queryByText(/Speicherung nicht bestätigt/),
    ).not.toBeInTheDocument();
  });
  it("makes a closed class readable without allowing entry", async () => {
    data[0].phase = "review";
    mount();
    await login();
    fireEvent.click(
      screen.getByRole("button", { name: /Vorstieg · U18 Route 1/ }),
    );
    expect(
      screen.getByRole("button", { name: /1\. Anna Beispiel/ }),
    ).toBeDisabled();
    expect(screen.getByText("Eingabe geschlossen")).toBeInTheDocument();
    expect(source.submitFinalAttempt).not.toHaveBeenCalled();
  });
  it("retains a draft but removes access when the password is revoked", async () => {
    mount();
    await login();
    await choose();
    fill();
    source.getFinalStation.mockRejectedValueOnce(
      new Error("Das Finalpasswort ist ungültig oder wurde geändert."),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Liste aktualisieren" }),
    );
    await screen.findByLabelText("Finalpasswort");
    expect(sessionStorage.getItem("kletterliga:final-station:2026")).toBeNull();
    expect(JSON.parse(localStorage.getItem(draftKey)!).grip).toBe("24");
    expect(
      screen.queryByRole("button", { name: "Eintrag prüfen" }),
    ).not.toBeInTheDocument();
  });
  it("keeps local inputs and requires deliberate submission after reconnection", async () => {
    mount();
    await login();
    await choose();
    fill();
    const network = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Offline · Entwurf nicht übertragen",
    );
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
    network.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("online")));
    expect(
      screen.getByRole("button", { name: "Eintrag prüfen" }),
    ).toBeEnabled();
    expect(source.submitFinalAttempt).not.toHaveBeenCalled();
  });
  it("ignores an older failed fetch after a newer response has updated the list", async () => {
    mount();
    await login();
    await choose();
    fill();
    let fail!: (error: Error) => void;
    source.getFinalStation.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Liste aktualisieren" }),
    );
    data[0].version++;
    fireEvent.click(
      screen.getByRole("button", { name: "Liste aktualisieren" }),
    );
    await screen.findByText("Stand geändert · bitte vergleichen");
    await act(async () => fail(new Error("Altes Finalpasswort ungültig")));
    expect(
      screen.getByRole("heading", { name: "Anna Beispiel" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Finalpasswort")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Erreichter Griff")).toHaveValue("24");
  });
});
