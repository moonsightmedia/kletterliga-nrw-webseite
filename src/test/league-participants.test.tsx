import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LeagueParticipants from "@/app/pages/admin/LeagueParticipants";

const appApiMocks = vi.hoisted(() => ({
  listProfiles: vi.fn(),
  listGyms: vi.fn(),
  listGymAdmins: vi.fn(),
  listGymAdminsByGym: vi.fn(),
  getParticipantActivityStats: vi.fn(),
  listMasterCodesRedeemedForProfiles: vi.fn(),
  listAvailableLeagueMasterCodes: vi.fn(),
  assignLeagueMasterCodeToParticipant: vi.fn(),
  updateProfile: vi.fn(),
  archiveProfile: vi.fn(),
  restoreProfile: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listProfiles: appApiMocks.listProfiles,
  listGyms: appApiMocks.listGyms,
  listGymAdmins: appApiMocks.listGymAdmins,
  listGymAdminsByGym: appApiMocks.listGymAdminsByGym,
  getParticipantActivityStats: appApiMocks.getParticipantActivityStats,
  listMasterCodesRedeemedForProfiles: appApiMocks.listMasterCodesRedeemedForProfiles,
  listAvailableLeagueMasterCodes: appApiMocks.listAvailableLeagueMasterCodes,
  assignLeagueMasterCodeToParticipant: appApiMocks.assignLeagueMasterCodeToParticipant,
  updateProfile: appApiMocks.updateProfile,
  archiveProfile: appApiMocks.archiveProfile,
  restoreProfile: appApiMocks.restoreProfile,
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: appApiMocks.toast,
}));

describe("LeagueParticipants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appApiMocks.listProfiles.mockResolvedValue({
      data: [
        {
          id: "active-profile",
          first_name: "Aktiv",
          last_name: "Teilnehmer",
          email: "aktiv@example.com",
          role: "participant",
          home_gym_id: "gym-1",
          birth_date: "2000-01-01",
          gender: "m",
          league: "toprope",
          participation_activated_at: null,
          archived_at: null,
        },
        {
          id: "archived-profile",
          first_name: "Archiv",
          last_name: "Teilnehmer",
          email: "archiv@example.com",
          role: "participant",
          home_gym_id: "gym-1",
          birth_date: "1999-01-01",
          gender: "w",
          league: "lead",
          participation_activated_at: null,
          archived_at: "2026-03-20T10:00:00.000Z",
          archive_reason: "Testlauf",
        },
      ],
      error: null,
    });
    appApiMocks.listGyms.mockResolvedValue({
      data: [{ id: "gym-1", name: "Kletterhalle Mitte", archived_at: null }],
      error: null,
    });
    appApiMocks.listGymAdmins.mockResolvedValue({ data: [], error: null });
    appApiMocks.listGymAdminsByGym.mockResolvedValue({ data: [], error: null });
    appApiMocks.getParticipantActivityStats.mockResolvedValue({ data: [], error: null });
    appApiMocks.listMasterCodesRedeemedForProfiles.mockResolvedValue({ data: [], error: null });
    appApiMocks.listAvailableLeagueMasterCodes.mockResolvedValue({ data: [], error: null });
    appApiMocks.assignLeagueMasterCodeToParticipant.mockResolvedValue({ data: null, error: null });
    appApiMocks.updateProfile.mockResolvedValue({ data: null, error: null });
    appApiMocks.archiveProfile.mockResolvedValue({
      data: {
        id: "active-profile",
        first_name: "Aktiv",
        last_name: "Teilnehmer",
        email: "aktiv@example.com",
        role: "participant",
        home_gym_id: "gym-1",
        birth_date: "2000-01-01",
        gender: "m",
        league: "toprope",
        archived_at: "2026-03-28T10:00:00.000Z",
      },
      error: null,
    });
    appApiMocks.restoreProfile.mockResolvedValue({
      data: {
        id: "archived-profile",
        first_name: "Archiv",
        last_name: "Teilnehmer",
        email: "archiv@example.com",
        role: "participant",
        home_gym_id: "gym-1",
        birth_date: "1999-01-01",
        gender: "w",
        league: "lead",
        archived_at: null,
        archive_reason: null,
      },
      error: null,
    });
  });

  it("archives active participants through the admin flow", async () => {
    render(<LeagueParticipants />);

    expect(await screen.findByText("Aktive Personen (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /aktiv@example.com archivieren/i }));

    expect(await screen.findByText("Profil archivieren?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archivieren" }));

    await waitFor(() => {
      expect(appApiMocks.archiveProfile).toHaveBeenCalledWith("active-profile");
    });
  });

  it("restores archived participants from the archive section", async () => {
    render(<LeagueParticipants />);

    expect(await screen.findByText("Archiv (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /archiv@example.com wiederherstellen/i }));

    expect(await screen.findByText("Profil wiederherstellen?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wiederherstellen" }));

    await waitFor(() => {
      expect(appApiMocks.restoreProfile).toHaveBeenCalledWith("archived-profile");
    });
  });

  it("assigns a league master code to an inactive participant", async () => {
    appApiMocks.listAvailableLeagueMasterCodes.mockResolvedValue({
      data: [
        {
          id: "mc-1",
          code: "KL-MASTER-TESTCODE-ABCD",
          gym_id: null,
          created_at: "2026-05-01T10:00:00.000Z",
          redeemed_by: null,
          redeemed_at: null,
          expires_at: null,
          status: "available",
        },
      ],
      error: null,
    });

    appApiMocks.assignLeagueMasterCodeToParticipant.mockResolvedValue({
      data: {
        masterCode: {
          id: "mc-1",
          code: "KL-MASTER-TESTCODE-ABCD",
          gym_id: null,
          created_at: "2026-05-01T10:00:00.000Z",
          redeemed_by: "active-profile",
          redeemed_at: "2026-05-03T10:00:00.000Z",
          expires_at: null,
          status: "redeemed",
        },
        profile: {
          id: "active-profile",
          first_name: "Aktiv",
          last_name: "Teilnehmer",
          email: "aktiv@example.com",
          role: "participant",
          home_gym_id: "gym-1",
          birth_date: "2000-01-01",
          gender: "m",
          league: "toprope",
          participation_activated_at: "2026-05-03T10:00:00.000Z",
          archived_at: null,
        },
      },
      error: null,
    });

    render(<LeagueParticipants />);

    expect(await screen.findByText("Aktive Personen (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mastercode für aktiv@example.com zuweisen/i }));

    expect(await screen.findByText("Mastercode zuweisen")).toBeInTheDocument();
    expect(await screen.findByText("KL-MASTER-TESTCODE-ABCD")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zuweisen" }));

    await waitFor(() => {
      expect(appApiMocks.assignLeagueMasterCodeToParticipant).toHaveBeenCalledWith({
        profileId: "active-profile",
        masterCodeId: "mc-1",
      });
    });

    expect(await screen.findByText("Teilnahme aktiv")).toBeInTheDocument();
  });
});
