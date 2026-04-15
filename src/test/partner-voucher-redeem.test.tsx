import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerVoucherRedeem from "@/app/pages/participant/PartnerVoucherRedeem";
import { useAuth } from "@/app/auth/AuthProvider";
import { getMyPartnerVoucherRedemption, redeemPartnerVoucher } from "@/services/appApi";

vi.mock("@/app/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/CodeQrScanner", () => ({
  CodeQrScanner: () => <div>Scanner-Vorschau</div>,
}));

vi.mock("@/services/appApi", () => ({
  getMyPartnerVoucherRedemption: vi.fn(),
  redeemPartnerVoucher: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedGetMyPartnerVoucherRedemption = vi.mocked(getMyPartnerVoucherRedemption);
const mockedRedeemPartnerVoucher = vi.mocked(redeemPartnerVoucher);

describe("PartnerVoucherRedeem", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: "2026-03-27T09:00:00+01:00",
      },
    } as ReturnType<typeof useAuth>);
    mockedGetMyPartnerVoucherRedemption.mockResolvedValue({
      data: null,
      error: null,
    } as Awaited<ReturnType<typeof getMyPartnerVoucherRedemption>>);
    mockedRedeemPartnerVoucher.mockResolvedValue({
      data: null,
      error: null,
    } as Awaited<ReturnType<typeof redeemPartnerVoucher>>);
  });

  it("blocks redemption when participation is not activated", () => {
    mockedUseAuth.mockReturnValue({
      profile: {
        id: "profile-1",
        participation_activated_at: null,
      },
    } as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PartnerVoucherRedeem />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mastercode zuerst einlösen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zum Mastercode" })).toBeEnabled();
  });

  it("shows scan flow when eligible and not redeemed", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PartnerVoucherRedeem />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockedGetMyPartnerVoucherRedemption).toHaveBeenCalled();
    });
    expect(screen.getByText("QR-Code im Kletterladen scannen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gutschein bestätigen" })).toBeDisabled();
  });

  it("shows redeemed summary when voucher already redeemed", async () => {
    mockedGetMyPartnerVoucherRedemption.mockResolvedValue({
      data: {
        id: "voucher-1",
        profile_id: "profile-1",
        partner_slug: "kletterladen_nrw",
        season_year: "2026",
        redeemed_at: "2026-04-12T10:00:00Z",
        scan_source: "participant_app",
        created_at: "2026-04-12T10:00:00Z",
      },
      error: null,
    } as Awaited<ReturnType<typeof getMyPartnerVoucherRedemption>>);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PartnerVoucherRedeem />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("15 % sind in deinem Profil gespeichert")).toBeInTheDocument();
    });
    expect(screen.queryByText("QR-Code im Kletterladen scannen")).not.toBeInTheDocument();
  });
});
