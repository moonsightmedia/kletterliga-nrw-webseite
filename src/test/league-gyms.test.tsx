import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LeagueGyms from "@/app/pages/admin/LeagueGyms";

const appApiMocks = vi.hoisted(() => ({
  listGyms: vi.fn(),
  listProfiles: vi.fn(),
  listGymInvites: vi.fn(),
  listGymAdminsByGym: vi.fn(),
  updateGym: vi.fn(),
  archiveGym: vi.fn(),
  restoreGym: vi.fn(),
  createGymAdmin: vi.fn(),
  inviteGymAdmin: vi.fn(),
  updateProfile: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listGyms: appApiMocks.listGyms,
  listProfiles: appApiMocks.listProfiles,
  listGymInvites: appApiMocks.listGymInvites,
  listGymAdminsByGym: appApiMocks.listGymAdminsByGym,
  updateGym: appApiMocks.updateGym,
  archiveGym: appApiMocks.archiveGym,
  restoreGym: appApiMocks.restoreGym,
  createGymAdmin: appApiMocks.createGymAdmin,
  inviteGymAdmin: appApiMocks.inviteGymAdmin,
  updateProfile: appApiMocks.updateProfile,
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: appApiMocks.toast,
}));

vi.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("LeagueGyms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appApiMocks.listGyms.mockResolvedValue({
      data: [
        {
          id: "gym-active",
          name: "Kletterhalle Aktiv",
          city: "Köln",
          postal_code: "50667",
          address: "Musterstr. 1",
          website: null,
          logo_url: null,
          opening_hours: null,
          archived_at: null,
        },
        {
          id: "gym-invite",
          name: "Kletterhalle Einladung",
          city: "Dortmund",
          postal_code: "44135",
          address: "Inviteweg 2",
          website: null,
          logo_url: null,
          opening_hours: null,
          archived_at: null,
        },
        {
          id: "gym-no-access",
          name: "Kletterhalle Offen",
          city: "Essen",
          postal_code: "45127",
          address: "Offenstr. 3",
          website: null,
          logo_url: null,
          opening_hours: null,
          archived_at: null,
        },
        {
          id: "gym-archived",
          name: "Kletterhalle Archiv",
          city: "Bonn",
          postal_code: "53111",
          address: "Archivweg 2",
          website: null,
          logo_url: null,
          opening_hours: null,
          archived_at: "2026-03-25T12:00:00.000Z",
        },
      ],
      error: null,
    });
    appApiMocks.listProfiles.mockResolvedValue({
      data: [
        {
          id: "admin-active",
          email: "admin@example.com",
          first_name: "Alex",
          last_name: "Admin",
          avatar_url: null,
          birth_date: null,
          gender: null,
          home_gym_id: null,
          league: null,
          role: "gym_admin",
          archived_at: null,
        },
        {
          id: "admin-archived",
          email: "archiv-admin@example.com",
          first_name: "Archiv",
          last_name: "Admin",
          avatar_url: null,
          birth_date: null,
          gender: null,
          home_gym_id: null,
          league: null,
          role: "gym_admin",
          archived_at: "2026-03-25T12:00:00.000Z",
        },
      ],
      error: null,
    });
    appApiMocks.listGymInvites.mockResolvedValue({
      data: [
        {
          id: "invite-1",
          gym_id: "gym-invite",
          email: "halle@example.com",
          expires_at: "2026-04-10T12:00:00.000Z",
          created_at: "2026-04-03T10:00:00.000Z",
          used_at: null,
          revoked_at: null,
        },
      ],
      error: null,
    });
    appApiMocks.listGymAdminsByGym.mockImplementation(async (gymId: string) => ({
      data: gymId === "gym-active"
        ? [{ profile_id: "admin-active" }]
        : gymId === "gym-archived"
          ? [{ profile_id: "admin-archived" }]
          : [],
      error: null,
    }));
    appApiMocks.updateGym.mockResolvedValue({ data: null, error: null });
    appApiMocks.archiveGym.mockResolvedValue({ data: { id: "gym-active" }, error: null });
    appApiMocks.restoreGym.mockResolvedValue({ data: { id: "gym-archived" }, error: null });
    appApiMocks.createGymAdmin.mockResolvedValue({ data: null, error: null });
    appApiMocks.inviteGymAdmin.mockResolvedValue({
      data: {
        success: true,
        invite_url: "https://example.com/claim",
        email_sent: true,
        email_error: null,
      },
      error: null,
    });
    appApiMocks.updateProfile.mockResolvedValue({ data: null, error: null });
  });

  it("shows claim statuses and sends a claim link for an existing hall", async () => {
    render(<LeagueGyms />);

    expect(await screen.findByText("Zugang aktiv")).toBeInTheDocument();
    expect(screen.getByText("Einladung offen")).toBeInTheDocument();
    expect(screen.getByText("Kein Zugang")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Bestehende Halle"), {
      target: { value: "gym-no-access" },
    });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse der Halle"), {
      target: { value: "neu@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Claim-Link senden" }));

    await waitFor(() => {
      expect(appApiMocks.inviteGymAdmin).toHaveBeenCalledWith("gym-no-access", "neu@example.com", false);
    });
  });

  it("archives active gyms through the admin flow", async () => {
    render(<LeagueGyms />);

    expect(await screen.findByText("Aktive Hallen (3)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /halle kletterhalle aktiv archivieren/i }));

    expect(await screen.findByText("Halle archivieren?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archivieren" }));

    await waitFor(() => {
      expect(appApiMocks.archiveGym).toHaveBeenCalledWith("gym-active");
    });
  });

  it("restores archived gyms from the archive section", async () => {
    render(<LeagueGyms />);

    expect(await screen.findByText("Archiv (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /halle kletterhalle archiv wiederherstellen/i }));

    expect(await screen.findByText("Halle wiederherstellen?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wiederherstellen" }));

    await waitFor(() => {
      expect(appApiMocks.restoreGym).toHaveBeenCalledWith("gym-archived");
    });
  });
});
