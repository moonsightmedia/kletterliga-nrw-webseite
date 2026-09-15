import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Finale from "@/app/pages/participant/Finale";
import type { SemifinalRegistrationState } from "@/services/semifinalApi";

const api = vi.hoisted(() => ({ state: vi.fn(), register: vi.fn(), cancel: vi.fn() }));
vi.mock("@/app/auth/AuthProvider", () => ({ useAuth: () => ({ profile: { id: "test-participant" } }) }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => ({ settings: { season_year: "2026" }, getStages: () => [] }) }));
vi.mock("@/services/useQualificationPhase", () => ({ useQualificationPhase: () => ({ hasEnded: true, qualificationEnd: "2026-09-13" }) }));
vi.mock("@/services/semifinalApi", async (original) => ({ ...await original<typeof import("@/services/semifinalApi")>(), getSemifinalRegistrationState: api.state, registerForSemifinal: api.register, cancelSemifinalRegistration: api.cancel }));

const eligible: SemifinalRegistrationState = { eligible: true, eligibility_status: "eligible", registered: false, registration_open: true, registration_deadline: "2026-09-27T22:00:00Z", finale_date: "2026-10-03", season_year: "2026", league: "lead", class_label: "U15-w" };
let client: QueryClient;
const mount = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><Finale /></MemoryRouter></QueryClientProvider>);
};
const open = async () => {
  const trigger = await screen.findByRole("button", { name: "Verbindlich zum Halbfinale anmelden" });
  fireEvent.click(trigger);
  return { trigger, dialog: await screen.findByRole("alertdialog", { name: "Bereit fürs Halbfinale?" }) };
};

describe("semifinal registration confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-15T10:00:00Z"));
    api.state.mockResolvedValue({ ...eligible });
    api.register.mockResolvedValue({ ...eligible, registered: true });
  });
  afterEach(() => { cleanup(); client?.clear(); vi.restoreAllMocks(); });

  it("shows current event and approved class without writing; cancel restores focus", async () => {
    mount();
    const { trigger, dialog } = await open();
    const modal = within(dialog);
    expect(api.register).not.toHaveBeenCalled();
    expect(modal.getByText("03.10.2026")).toBeInTheDocument();
    expect(modal.getByText("Kletterwelt Sauerland")).toBeInTheDocument();
    expect(modal.getByText("Rosmarter Allee 12 · 58762 Altena")).toBeInTheDocument();
    expect(modal.getByText("Vorstieg · U15-w")).toBeInTheDocument();
    expect(modal.getByText("27.09.2026, 23:59 Uhr")).toBeInTheDocument();
    expect(modal.getByText(/Plätze im Finale werden vor Ort ausgeklettert/)).toBeInTheDocument();
    expect(modal.getByRole("button", { name: "Zurück" })).toHaveFocus();
    fireEvent.click(modal.getByRole("button", { name: "Zurück" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(api.register).not.toHaveBeenCalled();
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it("writes once only after confirmation and waits for server success", async () => {
    let finish: (state: SemifinalRegistrationState) => void;
    api.register.mockImplementation(() => new Promise<SemifinalRegistrationState>((resolve) => { finish = resolve; }));
    mount();
    const { dialog } = await open();
    const confirm = within(dialog).getByRole("button", { name: "Jetzt verbindlich anmelden" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(api.register).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.queryByText("Du bist angemeldet")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Zurück" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Anmeldung wird gespeichert …" })).toBeDisabled();
    await act(async () => finish({ ...eligible, registered: true }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText("Du bist angemeldet")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Du bist angemeldet")).toHaveFocus());
  });

  it("keeps errors in the open dialog and supports an explicit retry", async () => {
    api.register.mockRejectedValueOnce(new Error("Network unavailable"));
    mount();
    const { dialog } = await open();
    fireEvent.click(within(dialog).getByRole("button", { name: "Jetzt verbindlich anmelden" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("nicht sicher bestätigt");
    expect(screen.queryByText("Du bist angemeldet")).not.toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Jetzt verbindlich anmelden" })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: "Jetzt verbindlich anmelden" }));
    await screen.findByText("Du bist angemeldet");
    expect(api.register).toHaveBeenCalledTimes(2);
  });

  it.each([
    { registration_open: false },
    { eligible: false, eligibility_status: "pending" as const },
    { registered: true },
    { registration_deadline: "2026-09-14T22:00:00Z" },
  ])("does not confirm after the live state changes: %j", async (change) => {
    mount();
    const { dialog } = await open();
    act(() => client.setQueryData(["semifinal-registration", "test-participant"], { ...eligible, ...change }));
    const confirm = within(dialog).getByRole("button", { name: "Jetzt verbindlich anmelden" });
    await waitFor(() => expect(confirm).toBeDisabled());
    expect(within(dialog).getByRole("alert")).toHaveTextContent("aktuell nicht möglich");
    fireEvent.click(confirm);
    expect(api.register).not.toHaveBeenCalled();
  });
});
