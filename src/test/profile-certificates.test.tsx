import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfileCertificates from "@/app/pages/participant/ProfileCertificates";
import { getMyCertificates } from "@/services/certificates";
import { downloadCertificate, renderCertificate, canvasToPng } from "@/lib/certificateArtwork";

vi.mock("@/services/seasonSettings", () => ({ useSeasonSettings: () => ({ settings: { season_year: "2026" } }) }));
vi.mock("@/services/certificates", () => ({ getMyCertificates: vi.fn() }));
vi.mock("@/lib/certificateArtwork", () => ({
  renderCertificate: vi.fn(), canvasToPng: vi.fn(), certificatePdf: vi.fn(), downloadCertificate: vi.fn(),
}));

const certificate = {
  phase: "qualification" as const, season_year: "2026", display_name: "Mira Müller",
  league: "lead" as const, class_label: "U15-w", rank: 1, issued_at: "2026-09-13",
};

describe("ProfileCertificates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:certificate-preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.mocked(renderCertificate).mockResolvedValue(document.createElement("canvas"));
    vi.mocked(canvasToPng).mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  });

  it("shows only released personal certificates and the pending finale message", async () => {
    vi.mocked(getMyCertificates).mockResolvedValue({ qualification: certificate, finale: null, finale_published_at: null });
    render(<ProfileCertificates profileId="athlete-1" />);
    expect(await screen.findByText("1. Platz")).toBeInTheDocument();
    expect(screen.getByText(/nach Prüfung und Freigabe/)).toBeInTheDocument();
    expect(getMyCertificates).toHaveBeenCalledWith("2026");
  });

  it("downloads the social image when file sharing is unavailable", async () => {
    vi.mocked(getMyCertificates).mockResolvedValue({ qualification: certificate, finale: null, finale_published_at: null });
    render(<ProfileCertificates profileId="athlete-1" />);
    const saveButton = await screen.findByRole("button", { name: "Bild speichern" });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);
    await waitFor(() => expect(downloadCertificate).toHaveBeenCalledWith(expect.any(Blob), "Kletterliga-NRW-2026-qualification.png"));
    expect(screen.getByText(/Öffne es in deiner Social-Media-App/)).toBeInTheDocument();
  });

  it("opens native file sharing directly after tapping the prepared image", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    vi.mocked(getMyCertificates).mockResolvedValue({ qualification: certificate, finale: null, finale_published_at: null });

    render(<ProfileCertificates profileId="athlete-1" />);
    const shareButton = await screen.findByRole("button", { name: "Urkunde teilen" });
    await waitFor(() => expect(shareButton).toBeEnabled());
    fireEvent.click(shareButton);

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
    expect(downloadCertificate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Bild an die Teilenfunktion übergeben.")).toBeInTheDocument());
  });
});
