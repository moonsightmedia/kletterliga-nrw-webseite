import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendanceDesk } from "@/app/components/AttendanceDesk";
import type { AttendanceData, AttendanceRow } from "@/services/competitionAttendance";

vi.mock("@/services/supabase", () => ({ supabase: { rpc: vi.fn() } }));
const person: AttendanceRow = {
  profile_id: "synthetic-registered", name: "Mika Testperson", league: "lead", class_label: "U18 männlich",
  registered: true, eligible: true, status: "expected", version: 0, checked_in_at: null, route_count: 5, can_late_register: false,
};
const candidate: AttendanceRow = { ...person, profile_id: "synthetic-late", name: "Alex Nachmeldung", registered: false, can_late_register: true };
const data: AttendanceData = { season: "2026", phase: "open", deadline: "2099-10-03T14:00:00Z", rows: [person, candidate] };
const source = { get: vi.fn(), set: vi.fn() };
beforeEach(() => {
  source.get.mockReset().mockResolvedValue(data);
  source.set.mockReset().mockImplementation(async (_season, profile) => ({ profile_id: profile, status: "arrived", registered: true, version: 1, checked_in_at: "2026-10-03T08:00:00Z" }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("event attendance desk", () => {
  it("can load under StrictMode without the cancelled first read blocking the second mount", async () => {
    render(<StrictMode><AttendanceDesk season="2026" source={source} /></StrictMode>);
    expect(await screen.findByText("Mika Testperson")).toBeInTheDocument();
    expect(screen.queryByText("Lade Einlassliste …")).not.toBeInTheDocument();
  });
  it("refreshes in the background without hiding the list or dropping a pending reason", async () => {
    render(<AttendanceDesk season="2026" source={source} />);
    await screen.findByText("Mika Testperson");
    source.get.mockResolvedValueOnce({ ...data, rows: [{ ...person, status: "arrived", version: 1 }, candidate] });
    fireEvent(window, new Event("focus"));
    expect(await screen.findByLabelText("Angekommen: 1 von 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Angekommen (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Anwesenheit von Mika Testperson zurücknehmen" }));
    fireEvent.change(screen.getByLabelText("Begründung"), { target: { value: "Versehentlich eingecheckt" } });
    fireEvent(window, new Event("online"));
    expect(source.get).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Begründung")).toHaveValue("Versehentlich eingecheckt");
  });

  it("does not let an older background response overwrite a confirmed check-in", async () => {
    let resolveRead!: (value: AttendanceData) => void;
    render(<AttendanceDesk season="2026" source={source} />);
    const checkin = await screen.findByRole("button", { name: "Anwesenheit von Mika Testperson bestätigen" });
    source.get.mockReturnValueOnce(new Promise((done) => { resolveRead = done; }));
    fireEvent(window, new Event("focus"));
    fireEvent.click(checkin);
    expect(await screen.findByLabelText("Angekommen: 1 von 1")).toBeInTheDocument();
    await act(async () => resolveRead(data));
    expect(screen.getByLabelText("Angekommen: 1 von 1")).toBeInTheDocument();
  });
  it("checks in once and updates confirmed counts only after the server responds", async () => {
    let resolve!: (value: unknown) => void;
    source.set.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<AttendanceDesk season="2026" source={source} />);
    const checkin = await screen.findByRole("button", { name: "Anwesenheit von Mika Testperson bestätigen" });
    expect(screen.getByLabelText("Angekommen: 0 von 1")).toBeInTheDocument();
    fireEvent.click(checkin); fireEvent.click(checkin);
    expect(source.set).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Angekommen: 0 von 1")).toBeInTheDocument();
    resolve({ profile_id: person.profile_id, status: "arrived", registered: true, version: 1, checked_in_at: "2026-10-03T08:00:00Z" });
    expect(await screen.findByLabelText("Angekommen: 1 von 1")).toBeInTheDocument();
  });

  it("requires explicit review of the late entrant's name and approved class", async () => {
    render(<AttendanceDesk season="2026" source={source} mode="crew" />);
    fireEvent.click(await screen.findByRole("button", { name: "Nachmelden (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Alex Nachmeldung nachmelden" }));
    expect(source.set).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Alex Nachmeldung · Vorstieg · U18 männlich");
    fireEvent.click(within(dialog).getByRole("button", { name: "Nachmelden & einchecken" }));
    await waitFor(() => expect(source.set).toHaveBeenCalledWith("2026", candidate.profile_id, "late-register", 0, expect.any(String), null, null));
    expect(await screen.findByLabelText("Angekommen: 1 von 2")).toBeInTheDocument();
  });

  it("retains the same request on network failure and consciously retries without false success", async () => {
    source.set.mockRejectedValueOnce(new Error("Verbindung unterbrochen"));
    render(<AttendanceDesk season="2026" source={source} />);
    fireEvent.click(await screen.findByRole("button", { name: "Anwesenheit von Mika Testperson bestätigen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nicht bestätigt");
    expect(screen.getByLabelText("Angekommen: 0 von 1")).toBeInTheDocument();
    const request = source.set.mock.calls[0][4];
    fireEvent.click(screen.getByRole("button", { name: "Erneut senden" }));
    await waitFor(() => expect(source.set).toHaveBeenCalledTimes(2));
    expect(source.set.mock.calls[1][4]).toBe(request);
    expect(await screen.findByLabelText("Angekommen: 1 von 1")).toBeInTheDocument();
  });

  it("shows an explicit conflict and reloads instead of silently overwriting", async () => {
    source.set.mockRejectedValueOnce(new Error("Der Eintrag wurde inzwischen geändert. Bitte aktualisieren."));
    render(<AttendanceDesk season="2026" source={source} />);
    fireEvent.click(await screen.findByRole("button", { name: "Anwesenheit von Mika Testperson bestätigen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("inzwischen geändert");
    expect(screen.queryByRole("button", { name: "Erneut senden" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aktuellen Stand laden" }));
    await waitFor(() => expect(source.get).toHaveBeenCalledTimes(2));
    expect(source.set).toHaveBeenCalledTimes(1);
  });

  it("allows a registered arrival with a route warning but blocks incomplete late registrations", async () => {
    source.get.mockResolvedValue({ ...data, rows: [{ ...person, route_count: 0 }, { ...candidate, route_count: 4, can_late_register: false }] });
    render(<AttendanceDesk season="2026" source={source} />);
    expect(await screen.findByText("0/5 Halbfinalrouten · René informieren")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anwesenheit von Mika Testperson bestätigen" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Nachmelden (1)" }));
    expect(screen.getByRole("button", { name: "Alex Nachmeldung nachmelden" })).toBeDisabled();
  });

  it("honors a server-side final-field lock even before the deadline", async () => {
    source.get.mockResolvedValue({ ...data, rows: [person, { ...candidate, can_late_register: false }] });
    render(<AttendanceDesk season="2026" source={source} />);
    fireEvent.click(await screen.findByRole("button", { name: "Nachmelden (1)" }));
    expect(screen.getByRole("button", { name: "Alex Nachmeldung nachmelden" })).toBeDisabled();
  });

  it("requires an admin reason for absence and keeps crew recovery controls hidden", async () => {
    const view = render(<AttendanceDesk season="2026" source={source} />);
    fireEvent.click(await screen.findByRole("button", { name: "Mika Testperson als nicht erschienen markieren" }));
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Begründung"), { target: { value: "Crew hat die Abmeldung erhalten" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(source.set).toHaveBeenCalledWith("2026", person.profile_id, "absent", 0, expect.any(String), "Crew hat die Abmeldung erhalten", null));
    view.unmount();
    render(<AttendanceDesk season="2026" source={source} mode="crew" password="synthetic-fixture-only" />);
    await screen.findByText("Mika Testperson");
    expect(screen.queryByRole("button", { name: /nicht erschienen markieren/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /zurücknehmen/ })).not.toBeInTheDocument();
  });

  it("does not offer any mutations for a participant lacking eligibility", async () => {
    source.get.mockResolvedValue({ ...data, rows: [{ ...person, eligible: false }] });
    render(<AttendanceDesk season="2026" source={source} />);
    expect(await screen.findByText("Startberechtigung fehlt · René fragen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anwesenheit von Mika Testperson bestätigen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /als nicht erschienen markieren/ })).toBeDisabled();
  });

  it("shows a load failure without implying zero participants", async () => {
    source.get.mockRejectedValueOnce(new Error("Netzwerk nicht erreichbar"));
    render(<AttendanceDesk season="2026" source={source} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Netzwerk nicht erreichbar");
    expect(screen.getByLabelText("Teilnehmerzahl noch nicht geladen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut laden" }));
    expect(await screen.findByText("Mika Testperson")).toBeInTheDocument();
  });
});
