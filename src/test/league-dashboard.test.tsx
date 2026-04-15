import { render, screen, waitFor } from "@testing-library/react";
import LeagueDashboard from "@/app/pages/admin/LeagueDashboard";

const appApiMocks = vi.hoisted(() => ({
  listProfiles: vi.fn(),
  listGyms: vi.fn(),
  listResults: vi.fn(),
  listRoutes: vi.fn(),
  listAdminSettings: vi.fn(),
  listPartnerVoucherRedemptions: vi.fn(),
}));

vi.mock("@/services/appApi", () => ({
  listProfiles: appApiMocks.listProfiles,
  listGyms: appApiMocks.listGyms,
  listResults: appApiMocks.listResults,
  listRoutes: appApiMocks.listRoutes,
  listAdminSettings: appApiMocks.listAdminSettings,
  listPartnerVoucherRedemptions: appApiMocks.listPartnerVoucherRedemptions,
}));

describe("LeagueDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appApiMocks.listProfiles.mockResolvedValue({
      data: [{ id: "p-1", role: "participant" }, { id: "p-2", role: "participant" }],
      error: null,
    });
    appApiMocks.listGyms.mockResolvedValue({ data: [{ id: "g-1" }], error: null });
    appApiMocks.listResults.mockResolvedValue({ data: [{ id: "r-1" }], error: null });
    appApiMocks.listRoutes.mockResolvedValue({ data: [{ id: "route-1", active: true }], error: null });
    appApiMocks.listAdminSettings.mockResolvedValue({
      data: [{ id: "settings-1", season_year: "2026" }],
      error: null,
    });
    appApiMocks.listPartnerVoucherRedemptions.mockResolvedValue({
      data: [{ id: "voucher-1" }, { id: "voucher-2" }, { id: "voucher-3" }],
      error: null,
    });
  });

  it("renders seasonal partner voucher KPI", async () => {
    render(<LeagueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Partnergutscheine")).toBeInTheDocument();
    });

    expect(screen.getByText("Kletterladen NRW (Saison)")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(appApiMocks.listPartnerVoucherRedemptions).toHaveBeenCalledWith({
      partnerSlug: "kletterladen_nrw",
      seasonYear: "2026",
    });
  });
});
