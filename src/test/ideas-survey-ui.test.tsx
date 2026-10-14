import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Ideen2027 from "@/pages/Ideen2027";
import { changeIdeasAnswer, emptyIdeasAnswers, ideasSurveySteps, visibleQuestions } from "@/lib/ideasSurvey2027";
import { submitIdeasSurvey } from "@/services/ideasSurveyApi";
vi.mock("@/services/ideasSurveyApi", () => ({ submitIdeasSurvey: vi.fn() }));
const submitMock = vi.mocked(submitIdeasSurvey);
const start = (preview = true) => {
  const rendered = render(<MemoryRouter><Ideen2027 preview={preview} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Umfrage starten" }));
  fireEvent.click(screen.getByRole("button", { name: "Einverstanden – Umfrage starten" }));
  return rendered;
};
const choose = (name: string | RegExp) => fireEvent.click(screen.getByRole("radio", { name }));
const back = () => fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
const next = () => fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
function reachClasses(team = "Nein, keine Teamwertung", shirt = "Nein, kein Shirt", pro = "Nein, keine Profi-Liga") {
  choose("Ja, das finde ich gut"); choose("Nein, die digitale Eingabe reicht mir");
  choose(team); if (team !== "Nein, keine Teamwertung") choose("Zwei Personen");
  choose(shirt); choose(pro);
}
function completeCore() {
  reachClasses(); fireEvent.click(screen.getByRole("checkbox", { name: "So beibehalten" })); next();
  choose("Nein, Kontrolle ist wichtiger"); choose(/^Alle Hallen der Liga besuchen/); choose("6 Hallen");
  choose("Beides: Kick-off und Saison-Treffen"); choose(/^Keine Zusatzregeln/);
}
beforeEach(() => {
  vi.stubGlobal("IntersectionObserver",class { observe() {} disconnect() {} });
  submitMock.mockReset(); submitMock.mockResolvedValue(undefined);
  Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:vi.fn()});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("combined 2027 choices", () => {
  it("maps combined choices to strict stored fields and clears hidden children", () => {
    let a = changeIdeasAnswer(emptyIdeasAnswers,"team_mode","both");
    expect(a).toMatchObject({team_mode:"yes",team_scoring:"both"});
    a = changeIdeasAnswer(a,"team_size","four");
    a = changeIdeasAnswer(a,"team_mode","no");
    expect(a).not.toHaveProperty("team_size"); expect(a).not.toHaveProperty("team_scoring");
    expect(visibleQuestions(ideasSurveySteps[1],a)).toHaveLength(1);
    a = changeIdeasAnswer(a,"shirt_interest","mandatory");
    a = changeIdeasAnswer(a,"pro_league","squad_required");
    expect(a).toMatchObject({shirt_interest:"yes",shirt_policy:"mandatory",pro_league:"yes",pro_rule:"squad_required"});
    a = changeIdeasAnswer(a,"shirt_interest","no"); a = changeIdeasAnswer(a,"pro_league","no");
    expect(a).not.toHaveProperty("shirt_policy"); expect(a).not.toHaveProperty("pro_rule");
  });
  it("keeps unchanged exclusive but allows several concrete class ideas", () => {
    let a = changeIdeasAnswer(emptyIdeasAnswers,"league_changes","keep");
    a = changeIdeasAnswer(a,"league_changes","age_classes");
    a = changeIdeasAnswer(a,"league_changes","skill_classes");
    expect(a.league_changes).toEqual(["age_classes","skill_classes"]);
    a = changeIdeasAnswer(a,"league_changes","keep");
    expect(a.league_changes).toEqual(["keep"]);
  });
});

describe("automatic question-by-question survey", () => {
  it("puts compact consent context and details in a dismissible popup above the first question", () => {
    render(<MemoryRouter><Ideen2027 preview={false} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", {name:"Umfrage starten"}));
    const dialog = screen.getByRole("dialog",{name:"Kurz bevor du startest"});
    const summary = screen.getByText(/Die Kletterliga GbR speichert und nutzt deine Antworten/);
    expect(summary).toHaveTextContent("ab der ersten Auswahl, auch bei Abbruch");
    expect(summary).toHaveTextContent("Freiwillig und jederzeit widerruflich");
    expect(screen.getByText(/Mit dem Start bestätigst du, dass du mindestens 16/)).toBeInTheDocument();
    const action = screen.getByRole("button",{name:"Einverstanden – Umfrage starten"});
    const details = dialog.querySelector(".ideas-consent-below details")!;
    expect(summary.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(action.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("freiwilligen Ideentexte");
    expect(screen.getAllByRole("radio",{hidden:true})).toHaveLength(3);
    for (const radio of screen.getAllByRole("radio",{hidden:true})) expect(radio).toBeDisabled();
    expect(screen.getByRole("button",{name:"Einwilligungsfenster schließen"})).toBeEnabled();
    expect(submitMock).not.toHaveBeenCalled();
  });
  it("can close the popup without consenting and reopen it, with no stored answers", async () => {
    render(<MemoryRouter><Ideen2027 preview={false} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button",{name:"Umfrage starten"}));
    fireEvent.click(screen.getByRole("button",{name:"Einwilligungsfenster schließen"}));
    await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("radio",{name:"Ja, das finde ich gut"})).toBeDisabled();
    expect(submitMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Umfrage starten"}));
    fireEvent.keyDown(screen.getByRole("dialog"),{key:"Escape"});
    await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(submitMock).not.toHaveBeenCalled();
  });
  it("opens when the survey reaches the viewport, not before and not repeatedly after dismissal", async () => {
    let observe: IntersectionObserverCallback = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver",class {
      constructor(callback: IntersectionObserverCallback) { observe = callback; }
      observe() {} disconnect() { disconnect(); }
    });
    render(<MemoryRouter><Ideen2027 preview={false} /></MemoryRouter>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(()=>observe([{isIntersecting:true} as IntersectionObserverEntry],{} as IntersectionObserver));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Einwilligungsfenster schließen"}));
    await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(disconnect).toHaveBeenCalled();
    expect(submitMock).not.toHaveBeenCalled();
  });
  it("previews the first question but keeps all answers and writes locked until consent", async () => {
    const {container} = render(<MemoryRouter><Ideen2027 preview={false} /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Nicht teilnehmen" })).not.toBeInTheDocument();
    const firstAnswer = screen.getByRole("radio", {name:"Ja, das finde ich gut"});
    expect(firstAnswer).toBeDisabled();
    expect(container.querySelectorAll("input:checked")).toHaveLength(0);
    expect(submitMock).not.toHaveBeenCalled();
    fireEvent.click(firstAnswer);
    fireEvent.keyDown(firstAnswer,{key:" ",code:"Space"});
    fireEvent.submit(container.querySelector("form")!);
    expect(submitMock).not.toHaveBeenCalled();
    expect(firstAnswer).not.toBeChecked();
    expect(screen.getByRole("radio", {name:"Ja, das finde ich gut"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Umfrage starten" }));
    fireEvent.click(screen.getByRole("button", { name: "Einverstanden – Umfrage starten" }));
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(submitMock).not.toHaveBeenCalled();
    choose("Ja, das finde ich gut");
    await waitFor(()=>expect(screen.getByText("Aktuelle Auswahl gespeichert")).toBeInTheDocument());
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio",{name:"Ja, Papierkarten behalten"})).toBeInTheDocument();
  });
  it("has no preselected answer or Next button and advances immediately after selection", () => {
    const {container} = start();
    expect(container.querySelectorAll(".ideas-question")).toHaveLength(1);
    expect(container.querySelectorAll("input:checked")).toHaveLength(0);
    expect(screen.queryByRole("button",{name:"Weiter"})).not.toBeInTheDocument();
    choose("Ja, das finde ich gut");
    expect(screen.getByRole("radio",{name:"Ja, Papierkarten behalten"})).toBeInTheDocument();
    expect(document.activeElement?.tagName).toBe("LEGEND");
    expect(submitMock).not.toHaveBeenCalled();
  });
  it("goes back, preserves the selection and can advance by clicking the already selected option", () => {
    start(); choose("Ja, das finde ich gut"); back();
    expect(screen.getByRole("radio",{name:"Ja, das finde ich gut"})).toBeChecked();
    choose("Ja, das finde ich gut");
    expect(screen.getByRole("radio",{name:"Ja, Papierkarten behalten"})).toBeInTheDocument();
    back(); choose("Nein, das finde ich nicht gut"); back();
    expect(screen.getByRole("radio",{name:"Nein, das finde ich nicht gut"})).toBeChecked();
  });
  it("asks only the two-person/four-person followup for a desired team", () => {
    start(); choose("Ja, das finde ich gut"); choose("Ja, Papierkarten behalten"); choose("Ja, Team- und Einzelwertung");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    choose("Vier Personen");
    expect(screen.getByRole("radio",{name:"Ja, ein Shirt verpflichtend"})).toBeInTheDocument();
    back(); back(); choose("Nein, keine Teamwertung");
    expect(screen.getByRole("radio",{name:"Nein, kein Shirt"})).toBeInTheDocument();
  });
  it("combines shirt/pro questions and explains the separate performance ranking", () => {
    start(); reachClasses("Ja, nur Teamwertung","Ja, ein Shirt freiwillig","Ja, eine freiwillige Profi-Liga");
    back();
    expect(screen.getByText(/separate Wertung für Kaderathleten/)).toBeInTheDocument();
    expect(screen.getByRole("radio",{name:"Ja, eine freiwillige Profi-Liga"})).toBeChecked();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });
  it("does not skip multiple class choices or optional text and includes notes in review", () => {
    start(); reachClasses();
    fireEvent.click(screen.getByRole("checkbox",{name:"Mehr Altersunterteilungen"}));
    fireEvent.click(screen.getByRole("checkbox",{name:"Mehr Leistungsunterteilungen"}));
    fireEvent.change(screen.getByRole("textbox",{name:/Deine Idee für eine andere Aufteilung/}),{target:{value:"Zwei Erwachsenenklassen ab 40."}});
    expect(screen.getByRole("checkbox",{name:"Eine andere Aufteilung"})).toBeInTheDocument();
    next(); choose("Ja, trotzdem stärker gewichten"); choose(/^Alle Hallen der Liga besuchen/); choose("4 Hallen");
    choose("Keine zusätzlichen Events");
    fireEvent.click(screen.getByRole("button",{name:"Eigene Idee ergänzen (optional)"}));
    choose(/^Eine Hallenwertung streichen dürfen/);
    expect(screen.getByRole("radio",{name:/Keine Zusatzregeln/})).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox",{name:/Deine Idee für eine weitere Wertungsregel/}),{target:{value:"Die beste Halle darf nicht doppelt zählen."}});
    fireEvent.click(screen.getByRole("button",{name:"Antworten prüfen"}));
    expect(screen.getByText("Zwei Erwachsenenklassen ab 40.",{selector:"dd"})).toBeInTheDocument();
    expect(screen.getByText("Die beste Halle darf nicht doppelt zählen.",{selector:"dd"})).toBeInTheDocument();
  });
  it("validates unanswered multiple choices without inventing a vote", () => {
    start(); reachClasses(); next();
    expect(screen.getByRole("alert")).toHaveTextContent("Antwortmöglichkeiten");
    expect(screen.getByRole("checkbox",{name:"So beibehalten"})).not.toBeChecked();
  });
  it("keeps hall examples available before choosing the regional model", () => {
    start(); reachClasses(); fireEvent.click(screen.getByRole("checkbox",{name:"So beibehalten"})); next(); choose("Nein, Kontrolle ist wichtiger");
    fireEvent.click(screen.getByText("Beispiele für regionale Hallengruppen",{selector:"summary"}));
    expect(screen.getByText("Beispiel: Raum Köln")).toBeVisible();
    choose(/^Regionale Hallengruppen/);
    expect(screen.getByRole("radio",{name:"8 Hallen"})).toBeInTheDocument();
    back(); expect(screen.getByRole("radio",{name:/Regionale Hallengruppen/})).toBeChecked();
  });
  it("reaches review automatically but never submits a completed response without confirmation", () => {
    start(); completeCore();
    expect(screen.getByRole("heading",{name:"ALLES SO RICHTIG?"})).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Testantwort prüfen"}));
    expect(screen.getByRole("status")).toHaveTextContent("keine Stimme gespeichert");
    expect(submitMock).not.toHaveBeenCalled();
  });
  it("edits team choices from review and returns after the remaining visible followup", () => {
    start(); completeCore();
    fireEvent.click(screen.getByRole("button",{name:"Antworten zu Teammodus ändern"}));
    choose("Ja, nur Teamwertung"); choose("Vier Personen");
    expect(screen.getByRole("heading",{name:"ALLES SO RICHTIG?"})).toBeInTheDocument();
    expect(screen.getByText("Ja, nur Teamwertung",{selector:"dd"})).toBeInTheDocument();
    expect(screen.getByText("Vier Personen",{selector:"dd"})).toBeInTheDocument();
  });
  it("saves the first selection immediately without account identity", async () => {
    start(false); choose("Ja, das finde ich gut");
    await waitFor(()=>expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][0]).toMatchObject({mode:"draft",revision:1,answers:{digitalization:"yes"},consent:{accepted:true,version:2}});
    expect(submitMock.mock.calls[0][0].answers).not.toHaveProperty("profile_id");
  });
  it("offers a confidential local receipt only after answering", async () => {
    const createUrl = vi.fn((blob: Blob)=>{ void blob; return "blob:test-receipt"; });
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createUrl; URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>undefined);
    try {
      start(false);
      expect(screen.queryByRole("button",{name:"Widerrufscode herunterladen"})).not.toBeInTheDocument();
      choose("Ja, das finde ich gut");
      await waitFor(()=>expect(screen.getByText("Aktuelle Auswahl gespeichert")).toBeInTheDocument());
      fireEvent.click(screen.getByText("Später widerrufen",{selector:"summary"}));
      fireEvent.click(screen.getByRole("button",{name:"Widerrufscode herunterladen"}));
      expect(createUrl).toHaveBeenCalledTimes(1);
      expect(createUrl.mock.calls[0][0]).toBeInstanceOf(Blob);
      expect(click).toHaveBeenCalledTimes(1);
      expect(click.mock.instances[0]).toHaveAttribute("download","Kletterliga-2027-Widerrufscode.txt");
    } finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; }
  });
  it("confirms only server success and retries an unknown completion with the same capability/revision", async () => {
    let failed = false;
    submitMock.mockImplementation(async p=>{if("mode" in p&&p.mode==="complete"&&!failed){failed=true;throw new Error("Test-Verbindung fehlgeschlagen");}});
    start(false); completeCore();
    fireEvent.click(screen.getByRole("button",{name:"Abstimmung abschließen"}));
    await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Test-Verbindung"));
    expect(screen.getByRole("button",{name:"Antworten zu Hallen & Wege ändern"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:"Abstimmung abschließen"}));
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("DANKE"));
    const attempts = submitMock.mock.calls.map(c=>c[0]).filter(p=>"mode" in p&&p.mode==="complete");
    expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]);
  });
  it("can erase partial or completed answers with the same capability", async () => {
    start(false); completeCore();
    fireEvent.click(screen.getByRole("button",{name:"Abstimmung abschließen"}));
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("DANKE"));
    fireEvent.click(screen.getByRole("button",{name:"Einwilligung widerrufen & Antworten entfernen"}));
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("ANTWORTEN ENTFERNT"));
    expect(submitMock.mock.lastCall?.[0]).toMatchObject({mode:"delete",revision:10000,answers:{}});
    expect(submitMock.mock.lastCall?.[0]).not.toHaveProperty("consent");
  });
  it("saves voluntary text after a pause and keeps it out of account/identity fields", async () => {
    start(false); reachClasses();
    fireEvent.click(screen.getByRole("checkbox",{name:"Eine andere Aufteilung"}));
    await waitFor(()=>expect(submitMock).toHaveBeenCalled());
    submitMock.mockClear();
    fireEvent.change(screen.getByRole("textbox",{name:/Deine Idee für eine andere Aufteilung/}),{target:{value:"Zwei Altersklassen"}});
    expect(submitMock).not.toHaveBeenCalled();
    await waitFor(()=>expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.lastCall?.[0]).toMatchObject({mode:"draft",answers:{league_idea:"Zwei Altersklassen",league_changes:["other"]}});
  });
  it("renders submitted-looking markup as plain review text and bounds text safely", () => {
    start(); reachClasses();
    fireEvent.click(screen.getByRole("checkbox",{name:"Eine andere Aufteilung"}));
    const textbox = screen.getByRole("textbox",{name:/Deine Idee für eine andere Aufteilung/});
    expect(textbox).toHaveAttribute("maxlength","500");
    fireEvent.change(textbox,{target:{value:"x".repeat(499)+"😀"}});
    expect(textbox).toHaveValue("x".repeat(499));
    fireEvent.change(textbox,{target:{value:"<img src=x onerror=alert(1)>"}});
    next(); choose("Nein, Kontrolle ist wichtiger"); choose(/^Alle Hallen der Liga besuchen/); choose("6 Hallen"); choose("Keine zusätzlichen Events"); choose(/^Keine Zusatzregeln/);
    expect(screen.getByText("<img src=x onerror=alert(1)>",{selector:"dd"})).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("disables review edits and duplicate completion while the final receipt is pending", async () => {
    let release: () => void = () => undefined;
    submitMock.mockImplementation(p=>"mode" in p&&p.mode==="complete" ? new Promise<void>(resolve=>{release=resolve;}) : Promise.resolve());
    start(false); completeCore();
    fireEvent.click(screen.getByRole("button",{name:"Abstimmung abschließen"}));
    expect(screen.getByRole("button",{name:"Wird gespeichert …"})).toBeDisabled();
    expect(screen.getByRole("button",{name:"Antworten zu Teammodus ändern"})).toBeDisabled();
    await act(async()=>{release();});
    await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("DANKE"));
  });
});
