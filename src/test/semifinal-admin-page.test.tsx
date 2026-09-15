import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { load, cancel, refresh, settingsMock, toast } = vi.hoisted(() => ({ load: vi.fn(), cancel: vi.fn(), refresh: vi.fn(), settingsMock: vi.fn(), toast: vi.fn() }));
vi.mock("@/services/semifinalAdminApi", () => ({ listAdminSemifinalRegistrations: load, adminCancelSemifinalRegistration: cancel }));
vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: settingsMock }));
vi.mock("@/components/ui/use-toast", () => ({ toast }));
import LeagueFinaleRegistrations from "@/app/pages/admin/LeagueFinaleRegistrations";

const registration = {
  id: "reg-current", profile_id: "participant-one", season_year: "2026", registration_status: "registered",
  created_at: "2026-09-14T12:00:00Z", profiles: { id: "participant-one", first_name: "Mika", last_name: "Testperson", email: "synthetic@test.invalid", role: "participant", archived_at: null, participation_activated_at: "2026-05-01T10:00:00Z" },
  approved_league: "lead", approved_class_label: "Freigegebene Klasse", eligibility_status: "eligible",
};

describe("admin semifinal page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    load.mockReset().mockResolvedValue([registration]);
    cancel.mockReset().mockResolvedValue(undefined);
    settingsMock.mockReturnValue({ settings: { season_year: "2026" }, loading: false, getSeasonYear: () => "2026", refreshSettings: refresh });
  });
  afterEach(cleanup);

  it("shows the approved class and league snapshot", async () => {
    render(<LeagueFinaleRegistrations />);
    expect(await screen.findByText("Freigegebene Klasse")).toBeInTheDocument();
    expect(screen.getByLabelText("Gesamt: 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Vorstieg: 1")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("2026");
  });

  it("shows a recoverable load error, not a false zero or empty state", async () => {
    load.mockRejectedValueOnce(new Error("missing schema"));
    render(<LeagueFinaleRegistrations />);
    expect(await screen.findByRole("alert")).toHaveTextContent("nicht vollständig geladen");
    expect(screen.queryByText("Noch keine aktiven Zusagen für diese Saison.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Gesamt: nicht geladen")).toHaveTextContent("–");
    fireEvent.click(screen.getByRole("button", { name: "Erneut laden" }));
    expect(await screen.findByText("Mika Testperson")).toBeInTheDocument();
  });

  it("does not trust the hook's fallback year if settings are missing", async () => {
    settingsMock.mockReturnValue({ settings: null, loading: false, getSeasonYear: () => "2026", refreshSettings: refresh });
    render(<LeagueFinaleRegistrations />);
    expect(await screen.findByRole("alert")).toHaveTextContent("aktuelle Saison");
    expect(load).not.toHaveBeenCalled();
  });

  it("retains loading feedback without prematurely reporting zero", () => {
    load.mockReturnValue(new Promise(() => {}));
    render(<LeagueFinaleRegistrations />);
    expect(screen.getByRole("status")).toHaveTextContent("Lade Anmeldungen");
    expect(screen.getByLabelText("Gesamt: nicht geladen")).toBeInTheDocument();
  });

  it("confirms and records cancellation without promising an email", async () => {
    render(<LeagueFinaleRegistrations />);
    fireEvent.click(await screen.findByRole("button", { name: "Anmeldung von Mika Testperson absagen" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("keine automatische E-Mail");
    fireEvent.click(screen.getByRole("button", { name: "Absage speichern" }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith("reg-current"));
    await waitFor(() => expect(screen.queryByTestId("registration-reg-current")).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Absage gespeichert" }));
  });

  it("keeps the registration visible if cancellation fails", async () => {
    cancel.mockRejectedValueOnce(new Error("synthetic network failure"));
    render(<LeagueFinaleRegistrations />);
    fireEvent.click(await screen.findByRole("button", { name: "Anmeldung von Mika Testperson absagen" }));
    fireEvent.click(screen.getByRole("button", { name: "Absage speichern" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("nicht sicher bestätigt");
    expect(screen.getByTestId("registration-reg-current")).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });
});
