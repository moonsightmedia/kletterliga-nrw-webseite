import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "@/app/auth/AuthProvider";
import GymMastercodes from "@/app/pages/admin/GymMastercodes";
import { printCodeSheet } from "@/lib/printableCodeSheet";

const appApiMocks = vi.hoisted(() => ({
  listMasterCodes: vi.fn(),
  createMasterCodes: vi.fn(),
  listGymAdminsByProfile: vi.fn(),
  fetchProfile: vi.fn(),
  listProfiles: vi.fn(),
}));

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listMasterCodes: appApiMocks.listMasterCodes,
  createMasterCodes: appApiMocks.createMasterCodes,
  listGymAdminsByProfile: appApiMocks.listGymAdminsByProfile,
  fetchProfile: appApiMocks.fetchProfile,
  listProfiles: appApiMocks.listProfiles,
}));

vi.mock("@/lib/printableCodeSheet", () => ({
  printCodeSheet: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/components/CodeQrDisplay", () => ({
  CodeQrDisplay: ({ value }: { value: string }) => <div>QR {value}</div>,
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedPrintCodeSheet = vi.mocked(printCodeSheet);

describe("GymMastercodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      profile: { id: "gym-admin-profile" },
    } as ReturnType<typeof useAuth>);

    appApiMocks.listGymAdminsByProfile.mockResolvedValue({
      data: [{ gym_id: "gym-1" }],
      error: null,
    });
    appApiMocks.listMasterCodes.mockResolvedValue({
      data: [
        {
          id: "master-1",
          code: "KL-MASTER-ABC1",
          gym_id: "gym-1",
          created_at: "2026-04-03T11:00:00.000Z",
          redeemed_by: null,
          redeemed_at: null,
          expires_at: null,
          status: "available",
        },
        {
          id: "master-2",
          code: "KL-MASTER-XYZ9",
          gym_id: "gym-1",
          created_at: "2026-04-03T11:00:00.000Z",
          redeemed_by: "participant-1",
          redeemed_at: "2026-04-03T12:00:00.000Z",
          expires_at: null,
          status: "redeemed",
        },
      ],
      error: null,
    });
    appApiMocks.listProfiles.mockResolvedValue({ data: [], error: null });
    appApiMocks.fetchProfile.mockResolvedValue({
      data: {
        id: "participant-1",
        email: "climber@example.com",
        first_name: "Clara",
        last_name: "Kletter",
        avatar_url: null,
        birth_date: null,
        gender: null,
        home_gym_id: null,
        league: null,
        role: "participant",
        archived_at: null,
      },
      error: null,
    });
    appApiMocks.createMasterCodes.mockResolvedValue({ data: [], error: null });
    mockedPrintCodeSheet.mockResolvedValue(undefined);
  });

  it("explains mastercodes correctly and exports a compact QR sheet", async () => {
    render(<GymMastercodes />);

    expect(await screen.findAllByRole("button", { name: /pdf export/i })).toHaveLength(2);
    expect(
      screen.getByText(/gilt für die ganze Liga, schaltet das komplette Profil frei/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/schaltet nur die jeweilige Halle frei/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /pdf export/i })[0]);

    await waitFor(() => {
      expect(mockedPrintCodeSheet).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: "compact-qr",
          columns: 4,
          pageMarginCm: 0.45,
          gridGapCm: 0.18,
          qrImageSizeCm: 2.55,
          compactCodeFontSizePx: 9,
          compactDetailFontSizePx: 7.5,
          cards: [
            expect.objectContaining({
              code: "KL-MASTER-ABC1",
              qrLabel: "KL-MASTER-ABC1",
              detailLines: ["Erstellt: 03.04.2026"],
            }),
          ],
        }),
      );
    });
  });
});
