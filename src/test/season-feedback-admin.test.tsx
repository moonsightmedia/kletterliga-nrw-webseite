import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SeasonFeedbackDashboard } from "@/app/pages/admin/LeagueSeasonFeedback";
import { feedbackDate, feedbackSections } from "@/lib/seasonFeedback";
import type { SeasonFeedbackEntry, SeasonFeedbackPage } from "@/services/seasonFeedbackApi";

const entry: SeasonFeedbackEntry = { id: "test", created_at: "2026-10-06T13:10:00Z", survey_version: 4, participation: "active", next_year: "yes", overall_rating: null, best_aspect: null, improve_aspect: null, comment: null, topics: ["halls"], details: { top_wish: "Mehr Auswahl", keep_aspect: "Gemeinschaft", main_barrier: "travel", barrier_detail: "Zu weit", registration_detail: "Ein Fehler", awareness_source: "Freunde", spectator_note: "Gute Stimmung", finale_eligibility: "yes", finale_attendance: "no", finale_reason: "date", finale_detail: "Urlaub", route_quantity: "same", route_ideas: "Technik", hall_pool: "more", hall_visits: "choose", hall_ideas: "Regionen", season_distribution: "more", distribution_ideas: "Ferien", dropped_score: "one", scoring_ideas: "Krankheit" } };
const page: SeasonFeedbackPage = { total: 1, matched: 1, latest_at: entry.created_at, summary: { perspectives: { active: 1 }, next_year: { yes: 1 }, topics: { halls: 1 } }, entries: [entry] };
afterEach(cleanup);

describe("season feedback dashboard", () => {
  it("shows metrics and original labeled answers rather than unique-person counts", async () => {
    const source = vi.fn().mockResolvedValue(page);
    render(<SeasonFeedbackDashboard source={source} />);
    expect(await screen.findByText("1 Einsendungen insgesamt.")).toBeInTheDocument();
    expect(screen.getByText(/Gezählt werden Einsendungen/)).toBeInTheDocument();
    const summary = screen.getByText("Vollständige Rückmeldung lesen").closest("summary");
    fireEvent.click(summary!);
    expect(summary?.parentElement).toHaveAttribute("open");
    expect(screen.getByText("Hallen, Regionen & Auswahlregeln")).toBeInTheDocument();
    expect(screen.getByText("Regionen")).toBeInTheDocument();
  });
  it("submits literal search, resets pagination and can clear all filters", async () => {
    const source = vi.fn().mockResolvedValue(page);
    render(<SeasonFeedbackDashboard source={source} />);
    await screen.findByText("1 Einsendungen insgesamt.");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  %_Routen  " } });
    fireEvent.click(screen.getByRole("button", { name: "Suchen" }));
    await waitFor(() => expect(source).toHaveBeenLastCalledWith(expect.objectContaining({ search: "%_Routen", offset: 0 }), expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    await waitFor(() => expect(source).toHaveBeenLastCalledWith(expect.objectContaining({ search: "", offset: 0 }), expect.any(AbortSignal)));
  });
  it("paginates and aborts old requests", async () => {
    const source = vi.fn().mockImplementation(async filters => ({ ...page, total: 21, matched: 21, entries: filters.offset ? [{ ...entry, id: "last" }] : [entry] }));
    render(<SeasonFeedbackDashboard source={source} />);
    await screen.findByText("21 Einsendungen insgesamt.");
    expect(screen.getByRole("button", { name: "Zurück" })).toBeDisabled();
    const firstSignal = source.mock.calls[0][1];
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByText("21–21 von 21");
    expect(firstSignal.aborted).toBe(true);
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
  });
  it("recovers from failure and handles empty results", async () => {
    const source = vi.fn().mockRejectedValueOnce(new Error("Kein Zugriff")).mockResolvedValueOnce({ ...page, total: 0, matched: 0, entries: [], latest_at: null });
    render(<SeasonFeedbackDashboard source={source} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Kein Zugriff");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText("Noch kein Saisonfeedback")).toBeInTheDocument();
  });
  it("does not render respondent text as HTML", async () => {
    render(<SeasonFeedbackDashboard source={async () => ({ ...page, entries: [{ ...entry, details: { top_wish: '<img src=x onerror="alert(1)">' } }] })} />);
    expect(await screen.findAllByText('<img src=x onerror="alert(1)">')).toHaveLength(2);
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("feedback question context", () => {
  it("keeps all 20 answered V4 fields with question labels", () => {
    const sections = feedbackSections(entry);
    expect(sections.flatMap(section => section.answers)).toHaveLength(20);
    expect(sections.flatMap(section => section.answers).map(answer => answer.value)).toContain("Feste Anzahl aus größerem Hallenpool wählen");
  });
  it("supports original and legacy survey versions", () => {
    const v1 = feedbackSections({ ...entry, survey_version: 1, details: null, overall_rating: 4, best_aspect: "community", improve_aspect: "communication", comment: "Original" });
    expect(v1.flatMap(s => s.answers).map(a => a.value)).toEqual(["4 von 5", "Gemeinschaft", "Kommunikation", "Original"]);
    const v3 = feedbackSections({ ...entry, survey_version: 3, details: { non_participation_reasons: ["time", "travel"], non_participation_detail: "Details", season_positive: "Gut", season_difficult: "Schwierig", hall_quantity: "fewer", hall_choice: "fixed_halls", drop_stations: "yes", drop_stations_ideas: "Idee", finale_reasons: ["cancelled"], finale_detail: "Absage" } });
    expect(v3.flatMap(s => s.answers)).toHaveLength(10);
    expect(v3.flatMap(s => s.answers).map(a => a.value)).toContain("Zu wenig Zeit · Anreise / Entfernung");
  });
  it("formats dates using Berlin rather than the browser timezone", () => {
    expect(feedbackDate("2026-10-06T13:10:00Z")).toBe("06.10.2026, 15:10");
  });
});
