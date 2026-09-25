import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CompetitionDay from "@/app/pages/participant/CompetitionDay";
import { parseCompetitionParticipantQr, readCompetitionParticipantDraft } from "@/app/pages/participant/CompetitionDay";
import type { CompetitionDay as CompetitionDayData } from "@/services/competitionDay";

const api = vi.hoisted(() => ({ load: vi.fn(), submit: vi.fn(), scan: undefined as undefined | ((value: string) => void) }));
vi.mock("@/app/auth/AuthProvider", () => ({ useAuth: () => ({ profile: { id: "participant-1" } }) }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => ({ settings: { season_year: "2026" }, loading: false }) }));
vi.mock("@/services/competitionDay", () => ({ getCompetitionDay: api.load, submitCompetitionResult: api.submit }));
vi.mock("@/components/CodeQrScanner", () => ({ CodeQrScanner: ({ onScan }: { onScan: (value: string) => void }) => { api.scan = onScan; return <div>Scanner-Vorschau</div>; } }));

const routeSet = [1, 2, 3, 4, 5].map((number) => ({ id: `route-${number}`, number, name: `Linie ${number}`, grade: "6a", color: "#a15523" }));
const makeData = (overrides: Partial<CompetitionDayData> = {}): CompetitionDayData => ({
  event: { id: "event-1", season_year: "2026", phase: "open", zone_points: Array.from({ length: 11 }, (_, i) => i), flash_bonus: 0, opened_at: "2026-10-03T08:00:00Z" },
  eligible: true, league: "lead", class_label: "U15-w", routes: routeSet, results: [], is_staff: false, is_admin: false, ...overrides,
});
const makeAcceptedResult = (input: { routeId: string; zone: number }) => ({
  id: "result-1", route_id: input.routeId, profile_id: "participant-1", zone: input.zone,
  flash: false, points: input.zone, created_at: "2026-10-03T12:00:00Z",
});

const chooseRoute = async () => {
  const label = await screen.findByText("Linie 1");
  const button = label.closest("button");
  if (!button) throw new Error("Route button missing");
  fireEvent.click(button);
};
const clickZone = (value: number) => {
  const button = screen.getAllByRole("button").find((candidate) => candidate.textContent === String(value));
  if (!button) throw new Error(`Zone ${value} button missing`);
  fireEvent.click(button);
};
const validQr = (routeId = "route-1") => `${window.location.origin}/app/wettkampf#route=${routeId}&token=secret-token`;
const mountPage = (initialEntry = "/app/wettkampf") => render(<MemoryRouter initialEntries={[initialEntry]}><CompetitionDay /></MemoryRouter>);

describe("competition participant day page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    api.scan = undefined;
    api.load.mockResolvedValue(makeData());
    api.submit.mockImplementation((input: { routeId: string; zone: number }) => Promise.resolve(makeAcceptedResult(input)));
  });
  afterEach(() => cleanup());

  it("shows only the five assigned routes and offers no results for an unprepared or ineligible event", async () => {
    api.load.mockResolvedValueOnce(makeData());
    const view = mountPage();
    expect(await screen.findByRole("button", { name: /Route 5 Linie 5/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Route 6/ })).not.toBeInTheDocument();
    view.unmount();
    api.load.mockResolvedValueOnce(makeData({ routes: [...routeSet, { ...routeSet[0], id: "extra", number: 6 }] }));
    const malformed = mountPage();
    expect(await screen.findByRole("heading", { name: "Routenzuordnung prüfen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Route 1 Linie 1/ })).not.toBeInTheDocument();
    malformed.unmount();
    api.load.mockResolvedValueOnce(makeData({ event: null }));
    mountPage();
    expect(await screen.findByText("Die Wettkampfeingabe wurde noch nicht vorbereitet.")).toBeInTheDocument();
  });

  it("shows an accessible preparation state for a route-only draft", async () => {
    api.load.mockResolvedValueOnce(makeData({ event: { ...makeData().event!, phase: "draft", opened_at: null }, routes: [] }));
    mountPage();
    expect(await screen.findByRole("heading", { name: "Routen in Vorbereitung" })).toBeInTheDocument();
    expect(screen.getByText("Die Ergebniseingabe ist noch geschlossen. Deine Qualifikation und Anmeldung bleiben unverändert.")).toHaveClass("text-[#003d55]");
    expect(screen.queryByRole("button", { name: /Route 1 Linie 1/ })).not.toBeInTheDocument();
  });

  it("opens the entry panel directly inside the selected route card", async () => {
    mountPage("/app/wettkampf?probelauf=1");
    const firstRoute = await screen.findByRole("button", { name: /Route 1 Linie 1/ });
    fireEvent.click(firstRoute);
    expect(firstRoute).toHaveAttribute("aria-expanded", "true");
    expect(firstRoute.nextElementSibling).toHaveAttribute("id", "competition-route-entry-route-1");
    expect(within(firstRoute.closest("article")!).getByRole("heading", { name: "Wertung eintragen" })).toBeInTheDocument();
    clickZone(8);
    fireEvent.click(firstRoute);
    expect(firstRoute).toHaveAttribute("aria-expanded", "false");
    expect(firstRoute.nextElementSibling).toBeNull();
    fireEvent.click(firstRoute);
    expect(firstRoute).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "8" })).toHaveAttribute("aria-pressed", "true");
    const secondRoute = screen.getByRole("button", { name: /Route 2 Linie 2/ });
    fireEvent.click(secondRoute);
    expect(firstRoute).toHaveAttribute("aria-expanded", "false");
    expect(firstRoute.nextElementSibling).toBeNull();
    expect(secondRoute.nextElementSibling).toHaveAttribute("id", "competition-route-entry-route-2");
    expect(screen.queryByText(/im ersten Versuch/i)).not.toBeInTheDocument();
  });

  it("numbers each participant's five routes independently of the physical station numbers", async () => {
    api.load.mockResolvedValueOnce(makeData({ routes: routeSet.map((route, index) => ({
      ...route, number: index + 10, name: `Test · Route ${index + 10}`,
    })) }));
    mountPage("/app/wettkampf?probelauf=1");
    const firstRoute = await screen.findByRole("button", { name: /Route 1 Vor Ort: Route 10/ });
    expect(screen.getByRole("button", { name: /Route 5 Vor Ort: Route 14/ })).toBeInTheDocument();
    expect(within(firstRoute).queryByText("Test · Route 10")).not.toBeInTheDocument();
    fireEvent.click(firstRoute);
    expect(within(firstRoute.closest("article")!).getByRole("heading", { name: "Wertung eintragen" })).toBeInTheDocument();
    expect(within(firstRoute.closest("article")!).getAllByText(/Route 10/)).toHaveLength(1);
  });

  it("shows named route colors and lets a zero-zone attempt be submitted separately", async () => {
    api.load.mockResolvedValueOnce(makeData({ routes: routeSet.map((route) => ({ ...route, color: "#327bc1" })) }));
    mountPage();
    await chooseRoute();
    expect(screen.getAllByText("Farbe: Blau")).toHaveLength(5);
    expect(screen.getByText(/Zone 1–10 bringt 1–10 Punkte/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keine Zone erreicht · 0 Punkte" }));
    fireEvent.click(screen.getByRole("button", { name: "QR-Code am Routenposten scannen" }));
    act(() => api.scan?.(validQr()));
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis absenden" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(expect.objectContaining({ zone: 0 })));
    expect(screen.queryByText(/Flash/)).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Eingetragenes Ergebnis")).toHaveTextContent("Punkte0");
  });

  it("automatically saves a scoped draft on input, restores it, and rejects invalid saved values", async () => {
    const view = mountPage();
    await chooseRoute();
    fireEvent.click(screen.getByRole("button", { name: "10" }));
    expect(await screen.findByText("Entwurf auf diesem Gerät gespeichert.")).toBeInTheDocument();
    expect(window.localStorage.getItem("competition-day:draft:participant-1:2026:route-1")).toBe(JSON.stringify({ zone: 10 }));
    expect(api.submit).not.toHaveBeenCalled();
    view.unmount();
    mountPage();
    await chooseRoute();
    expect(screen.getByRole("button", { name: "10" })).toHaveAttribute("aria-pressed", "true");
    window.localStorage.setItem("competition-day:draft:participant-1:2026:route-2", JSON.stringify({ zone: 10, flash: true }));
    expect(readCompetitionParticipantDraft("competition-day:draft:participant-1:2026:route-2")).toEqual({ zone: 10 });
    window.localStorage.setItem("bad-draft", JSON.stringify({ zone: 4, flash: true }));
    expect(readCompetitionParticipantDraft("bad-draft")).toEqual({ zone: 4 });
    window.localStorage.setItem("invalid-draft", JSON.stringify({ zone: 11 }));
    expect(readCompetitionParticipantDraft("invalid-draft")).toBeNull();
  });

  it("requires the current route QR and explicit submission, then locks an accepted result", async () => {
    api.load.mockResolvedValueOnce(makeData());
    mountPage();
    await chooseRoute();
    clickZone(8);
    expect(screen.getByText("Punkte").parentElement).toHaveTextContent("8");
    const submit = screen.getByRole("button", { name: "Ergebnis absenden" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /QR-Code am Routenposten scannen/ }));
    expect(await screen.findByText("Scanner-Vorschau")).toBeInTheDocument();
    act(() => api.scan?.(validQr("route-2")));
    expect(await screen.findByRole("alert")).toHaveTextContent("passt nicht zu dieser Route");
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /QR-Code am Routenposten scannen/ }));
    act(() => api.scan?.(validQr()));
    expect(await screen.findByText(/QR-Code erkannt/)).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis absenden" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith({ season: "2026", routeId: "route-1", zone: 8, qrToken: "secret-token" }));
    await waitFor(() => expect(screen.getByText(/Ergebnis eingetragen · 8 Punkte/)).toBeInTheDocument());
    expect(api.load).toHaveBeenCalledTimes(1);
    await chooseRoute();
    expect(screen.queryByText("ERGEBNIS EINGETRAGEN")).not.toBeInTheDocument();
    await chooseRoute();
    expect(screen.getByText("ERGEBNIS EINGETRAGEN")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ergebnis absenden" })).not.toBeInTheDocument();
  });

  it("keeps the draft and scanned credential private when submission fails and allows retry", async () => {
    api.submit.mockRejectedValueOnce(new Error("network"));
    mountPage();
    await chooseRoute();
    clickZone(9);
    fireEvent.click(screen.getByRole("button", { name: "Entwurf speichern" }));
    fireEvent.click(screen.getByRole("button", { name: /QR-Code am Routenposten scannen/ }));
    act(() => api.scan?.(validQr()));
    expect(await screen.findByText(/QR-Code erkannt/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis absenden" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("wurde nicht bestätigt");
    expect(window.localStorage.getItem("competition-day:draft:participant-1:2026:route-1")).toBe(JSON.stringify({ zone: 9 }));
    expect(window.localStorage.getItem("competition-day:draft:participant-1:2026:route-1")).not.toContain("secret-token");
    expect(within(screen.getByRole("alert")).queryByText("secret-token")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ergebnis absenden" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis absenden" }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(2));
  });

  it("validates canonical QR origin, path and route without navigating to scanned contents", () => {
    const route = routeSet[0];
    expect(parseCompetitionParticipantQr(validQr(), route)).toBe("secret-token");
    expect(parseCompetitionParticipantQr("https://attacker.example/app/wettkampf#route=route-1&token=x", route)).toBeNull();
    expect(parseCompetitionParticipantQr(`${window.location.origin}/app/other#route=route-1&token=x`, route)).toBeNull();
    expect(parseCompetitionParticipantQr(validQr("route-2"), route)).toBeNull();
  });

  it.each(["draft", "closed"] as const)("keeps %s rounds read-only without opening the scanner", async (phase) => {
    api.load.mockResolvedValueOnce(makeData({ event: { ...makeData().event!, phase } }));
    mountPage();
    await chooseRoute();
    expect(screen.queryByRole("button", { name: "Entwurf speichern" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /QR-Code/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ergebnis absenden" })).not.toBeInTheDocument();
    expect(screen.getByText(phase === "draft" ? "Die Routen sind sichtbar. Die Ergebniseingabe ist noch nicht geöffnet." : "Für diese Route wurde kein Ergebnis eingetragen. Die Eingabe ist geschlossen.")).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
  });

  it("allows a local draft-phase probe without sending a result to the server", async () => {
    api.load.mockResolvedValueOnce(makeData({ event: { ...makeData().event!, phase: "draft", opened_at: null } }));
    const view = mountPage("/app/wettkampf?probelauf=1");
    await chooseRoute();
    expect(screen.getByText("PROBELAUF")).toBeInTheDocument();
    clickZone(10);
    expect(screen.getByRole("button", { name: "Testwert speichern" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Test-QR bestätigen" }));
    fireEvent.click(screen.getByRole("button", { name: "Testwert speichern" }));
    expect(await screen.findByText(/Testwert · 10 Punkte/)).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.getItem("competition-day:probe:results:participant-1:2026:event-1")).toContain('"points":10');
    view.unmount();
    api.load.mockResolvedValueOnce(makeData({ event: { ...makeData().event!, phase: "draft", opened_at: null } }));
    mountPage("/app/wettkampf?probelauf=1");
    expect(await screen.findByText(/Testwert · 10 Punkte/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Testwerte löschen" }));
    expect(screen.queryByText(/Testwert · 10 Punkte/)).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("competition-day:probe:results:participant-1:2026:event-1")).toBeNull();
  });

  it("keeps local probe values separate from the real read-only view", async () => {
    const closedData = makeData({ event: { ...makeData().event!, phase: "draft", opened_at: null } });
    api.load.mockResolvedValue(closedData);
    const view = mountPage("/app/wettkampf?probelauf=1");
    await chooseRoute();
    clickZone(7);
    fireEvent.click(screen.getByRole("button", { name: "Test-QR bestätigen" }));
    fireEvent.click(screen.getByRole("button", { name: "Testwert speichern" }));
    expect(await screen.findByText(/Testwert · 7 Punkte/)).toBeInTheDocument();
    view.unmount();
    mountPage();
    await chooseRoute();
    expect(screen.queryByText(/Testwert · 7 Punkte/)).not.toBeInTheDocument();
    expect(screen.getByText("Die Routen sind sichtbar. Die Ergebniseingabe ist noch nicht geöffnet.")).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
  });

  it("locks the result from the server acknowledgement even if local draft cleanup fails", async () => {
    mountPage();
    await chooseRoute();
    clickZone(7);
    fireEvent.click(screen.getByRole("button", { name: /QR-Code am Routenposten scannen/ }));
    act(() => api.scan?.(validQr()));
    expect(await screen.findByText(/QR-Code erkannt/)).toBeInTheDocument();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("storage unavailable"); });
    fireEvent.click(screen.getByRole("button", { name: "Ergebnis absenden" }));
    expect(await screen.findByText(/Ergebnis eingetragen · 7 Punkte/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ergebnis absenden" })).not.toBeInTheDocument();
  });

  it("prevents a duplicate submission and locks route/form changes while the request is pending", async () => {
    let resolveSubmit: ((value: ReturnType<typeof makeAcceptedResult>) => void) | undefined;
    api.submit.mockImplementationOnce((_input: { routeId: string; zone: number }) => new Promise((resolve) => {
      resolveSubmit = resolve;
    }));
    mountPage();
    await chooseRoute();
    clickZone(6);
    fireEvent.click(screen.getByRole("button", { name: /QR-Code am Routenposten scannen/ }));
    act(() => api.scan?.(validQr()));
    expect(await screen.findByText(/QR-Code erkannt/)).toBeInTheDocument();
    const submitButton = screen.getByRole("button", { name: "Ergebnis absenden" });
    fireEvent.click(submitButton);
    expect(await screen.findByRole("button", { name: "Wird eingetragen …" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Route 2 Linie 2/ }));
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Wird eingetragen …" })).toBeDisabled();
    await act(async () => { resolveSubmit?.(makeAcceptedResult({ routeId: "route-1", zone: 6 })); });
    expect(await screen.findByText(/Ergebnis eingetragen · 6 Punkte/)).toBeInTheDocument();
  });

  it("accepts decimal server points with floating point precision and validates the acknowledgement", async () => {
    const event = { ...makeData().event!, zone_points: Array.from({ length: 11 }, () => 0) };
    event.zone_points[10] = 0.2;
    api.load.mockResolvedValueOnce(makeData({ event }));
    api.submit.mockResolvedValueOnce({ ...makeAcceptedResult({ routeId: "route-1", zone: 10 }), points: 0.2 });
    mountPage();
    await chooseRoute();
    clickZone(10);
    fireEvent.click(screen.getByRole("button", { name: /QR-Code am Routenposten scannen/ }));
    act(() => api.scan?.(validQr()));
    fireEvent.click(await screen.findByRole("button", { name: "Ergebnis absenden" }));
    expect(await screen.findByText(/Ergebnis eingetragen · 0.2 Punkte/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
