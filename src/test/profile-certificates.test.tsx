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
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
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
    const saveButton = await screen.findByRole("button", { name: "Beitrag-Bild speichern" });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);
    await waitFor(() => expect(downloadCertificate).toHaveBeenCalledWith(expect.any(Blob), "Kletterliga-NRW-2026-qualification-post.png"));
    expect(screen.getByText(/Öffne es in Instagram/)).toBeInTheDocument();
  });

  it("opens native file sharing directly after tapping the prepared image", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    vi.mocked(getMyCertificates).mockResolvedValue({ qualification: certificate, finale: null, finale_published_at: null });

    render(<ProfileCertificates profileId="athlete-1" />);
    const shareButton = await screen.findByRole("button", { name: "Beitrag teilen" });
    await waitFor(() => expect(shareButton).toBeEnabled());
    fireEvent.click(shareButton);

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
    expect(downloadCertificate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/Bild an die Teilenfunktion übergeben/)).toBeInTheDocument());
  });

  it("prepares a separate Story image and shares that file", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    vi.mocked(getMyCertificates).mockResolvedValue({ qualification: certificate, finale: null, finale_published_at: null });

    render(<ProfileCertificates profileId="athlete-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Story · 9:16" }));
    expect(screen.getByRole("button", { name: "Story · 9:16" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(renderCertificate).toHaveBeenCalledWith(certificate, "story"));
    const shareButton = screen.getByRole("button", { name: "Story teilen" });
    await waitFor(() => expect(shareButton).toBeEnabled());
    fireEvent.click(shareButton);
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].files[0].name).toBe("Kletterliga-NRW-2026-qualification-story.png");
  });
});
