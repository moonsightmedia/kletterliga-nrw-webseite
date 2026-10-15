import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { IdeasSurveyDashboard } from "@/app/pages/admin/LeagueIdeasSurvey";
import { ideasPreviewEntries, makeIdeasPreviewReport } from "@/app/pages/admin/ideasSurveyPreviewData";
import { emptyIdeasReportFilters, ideasReportSchema, type IdeasReportFilters } from "@/services/ideasSurveyAdminApi";
import { entryAnswer, ideasPercent, ideasReportDate, ideasReportSections, reportOptionRows } from "@/lib/ideasSurveyReport";

afterEach(cleanup);
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
const report = makeIdeasPreviewReport(emptyIdeasReportFilters);
describe("2027 ideas admin dashboard", () => {
  it("shows all-response counts, question denominators and conditional team size", async () => {
    render(<IdeasSurveyDashboard source={async () => report} />);
    await screen.findByText("4 Einsendungen in der Auswertung.");
    const digital = screen.getByRole("region", { name: ideasReportSections[0].questions[0].title });
    expect(digital).toHaveTextContent("4 beantwortet · 0 unbeantwortet");
    expect(digital).toHaveTextContent("50 %");
    const size = screen.getByRole("region", { name: "Wie groß sollte ein Team sein?" });
    expect(size).toHaveTextContent("2 beantwortet · 0 unbeantwortet · nur bei gewünschter Teamwertung");
    const pro = screen.getByRole("region", { name: "Eine eigene Profi-Liga?" });
    expect(pro).toHaveTextContent("2 beantwortet · 2 unbeantwortet");
    expect(screen.getByText(/Mehrfachauswahl: Anteile/)).toBeInTheDocument();
  });
  it("paginates only details; preserves chart totals and aborts earlier requests", async () => {
    const source = vi.fn().mockImplementation(async (filters: IdeasReportFilters) => ({ ...report, total: 21, partial: 19, scoped_total: 21, matched: 21, entries: filters.offset ? [ideasPreviewEntries[3]] : [ideasPreviewEntries[0]] }));
    render(<IdeasSurveyDashboard source={source} />);
    await screen.findByText("1–20 von 21");
    const signal = source.mock.calls[0][1];
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByText("21–21 von 21");
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
    expect(screen.getByRole("region", { name: ideasReportSections[0].questions[0].title })).toHaveTextContent("4 beantwortet");
    fireEvent.click(screen.getByRole("checkbox", { name: "Nur mit Freitextideen" }));
    await waitFor(() => expect(source).toHaveBeenLastCalledWith({ status: "all", offset: 0, textOnly: true }, expect.any(AbortSignal)));
  });
  it("filters all charts by status and restores All", async () => {
    // Native change is not used for the accessible Radix select. Trigger and
    // options also get a real-browser keyboard check in the rendered review.
    const source = vi.fn().mockImplementation(async filters => makeIdeasPreviewReport(filters));
    render(<IdeasSurveyDashboard source={source} />);
    await screen.findByText("4 Einsendungen in der Auswertung.");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Grundlage der Auswertung" }), { key: "ArrowDown" });
    await screen.findByRole("option", { name: "Nur teilweise beantwortet" });
    fireEvent.click(screen.getByRole("option", { name: "Nur teilweise beantwortet" }));
    await screen.findByText("2 Einsendungen in der Auswertung.");
    expect(source).toHaveBeenLastCalledWith({ status: "partial", offset: 0, textOnly: false }, expect.any(AbortSignal));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Grundlage der Auswertung" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Alle Einsendungen" }));
    await screen.findByText("4 Einsendungen in der Auswertung.");
  });
  it("opens original labeled notes safely without interpreting HTML", async () => {
    const injected = makeIdeasPreviewReport(emptyIdeasReportFilters, [{ ...ideasPreviewEntries[3], answers: { weighting_idea: '<img src=x onerror="alert(1)">' } }]);
    render(<IdeasSurveyDashboard source={async () => injected} />);
    const trigger = (await screen.findByText("Alle Angaben lesen")).closest("summary")!;
    fireEvent.click(trigger);
    expect(trigger.parentElement).toHaveAttribute("open");
    expect(within(trigger.parentElement!).getAllByText('<img src=x onerror="alert(1)">')).toHaveLength(2);
    expect(screen.getByText("Deine Idee für eine weitere Wertungsregel")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
  it("clears stale numbers during refresh, reports failures, retries and shows real empty state", async () => {
    const source = vi.fn().mockResolvedValueOnce(report).mockRejectedValueOnce(new Error("Kein Zugriff")).mockResolvedValueOnce(makeIdeasPreviewReport(emptyIdeasReportFilters, []));
    render(<IdeasSurveyDashboard source={source} />);
    await screen.findByText("4 Einsendungen in der Auswertung.");
    fireEvent.click(screen.getByRole("button", { name: "Aktualisieren" }));
    expect(screen.queryByText("4 Einsendungen in der Auswertung.")).not.toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Kein Zugriff");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await screen.findByText("Noch keine Einsendungen");
  });
  it("returns to the first page when the last page disappears after withdrawal", async () => {
    const source = vi.fn().mockImplementation(async (filters: IdeasReportFilters) => filters.offset ? { ...report, matched: 0, entries: [] } : { ...report, matched: 21 });
    render(<IdeasSurveyDashboard source={source} />);
    await screen.findByText("1–20 von 21");
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await waitFor(() => expect(source).toHaveBeenLastCalledWith({ ...emptyIdeasReportFilters }, expect.any(AbortSignal)));
  });
});
describe("report value semantics", () => {
  it("validates consistent totals, required question coverage, dates and safe answers", () => {
    expect(ideasReportSchema.safeParse(report).success).toBe(true);
    for (const invalid of [{ ...report, total: 8 }, { ...report, questions: {} }, { ...report, fetched_at: "wrong" }, { ...report, entries: [{ ...report.entries[0], answers: { email: "private" } }] }, { ...report, questions: { ...report.questions, digitalization: { eligible: 4, answered: 1, counts: { yes: 2 } } } }]) expect(ideasReportSchema.safeParse(invalid).success).toBe(false);
  });
  it("combines parent/child choices and retains missing/older answers honestly", () => {
    const q = ideasReportSections[1].questions[0];
    expect(entryAnswer(ideasPreviewEntries[0], q)).toBe("Ja, Team- und Einzelwertung");
    expect(entryAnswer(ideasPreviewEntries[1], ideasReportSections[1].questions[1])).toBeNull();
    expect(entryAnswer({ ...ideasPreviewEntries[3], answers: { team_mode: "yes" } }, q)).toBe("Ja – Wertungsart noch offen");
    expect(reportOptionRows(q, { eligible: 3, answered: 0, counts: {} })[0].percent).toBeNull();
    expect(reportOptionRows(q, { eligible: 3, answered: 2, counts: { unsure: 1, future: 1 } }).map(r => r.label)).toContain("Unbekannte Option (future)");
  });
  it("formats shares and dates for Berlin without fabricating a 0% when unmeasured", () => {
    expect(ideasPercent(null)).toBe("–"); expect(ideasPercent(100 / 3)).toBe("33,3 %");
    expect(ideasReportDate("2026-10-15T08:00:00Z")).toBe("15.10.26, 10:00");
  });
});
