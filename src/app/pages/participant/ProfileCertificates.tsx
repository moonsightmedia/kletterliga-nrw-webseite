import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { canvasToPng, certificatePdf, downloadCertificate, renderCertificate } from "@/lib/certificateArtwork";
import { getMyCertificates, type Certificate, type MyCertificates } from "@/services/certificates";
import { useSeasonSettings } from "@/services/seasonSettings";

const fileName = (certificate: Certificate, extension: string) =>
  `Kletterliga-NRW-${certificate.season_year}-${certificate.phase}.${extension}`;

function CertificateCard({ certificate, title }: { certificate: Certificate; title: string }) {
  const [busy, setBusy] = useState<"pdf" | "share" | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let previewUrl: string | null = null;
    renderCertificate(certificate, "social").then(canvasToPng).then((blob) => {
      previewUrl = URL.createObjectURL(blob);
      if (active) setPreview(previewUrl);
      else URL.revokeObjectURL(previewUrl);
    }).catch(() => { if (active) setPreview(null); });
    return () => { active = false; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [certificate]);

  const run = async (action: "pdf" | "share") => {
    setBusy(action);
    setMessage("");
    try {
      if (action === "pdf") {
        downloadCertificate(await certificatePdf(certificate), fileName(certificate, "pdf"));
        setMessage("PDF wurde heruntergeladen.");
      } else {
        const blob = await canvasToPng(await renderCertificate(certificate, "social"));
        const file = new File([blob], fileName(certificate, "png"), { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `Meine Kletterliga-Urkunde ${certificate.season_year}` });
            setMessage("Bild an die Teilenfunktion übergeben.");
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            downloadCertificate(blob, file.name);
            setMessage("Teilen war nicht verfügbar. Bild gespeichert – öffne es in deiner Social-Media-App.");
          }
        } else {
          downloadCertificate(blob, file.name);
          setMessage("Bild gespeichert. Öffne es in deiner Social-Media-App, um es zu posten.");
        }
      }
    } catch {
      setMessage(action === "pdf" ? "PDF konnte nicht erstellt werden. Bitte erneut versuchen." : "Teilen war nicht möglich. Bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  };

  return <StitchCard tone="surface" className="overflow-hidden rounded-xl border border-[#003d55]/10">
    {preview ? <img src={preview} alt={`Vorschau der ${title}-Urkunde für ${certificate.display_name}`} className="aspect-[4/5] w-full object-cover" /> : <div className="relative aspect-[4/5] overflow-hidden border-b-4 border-l-[10px] border-b-[#003d50] border-l-[#a45524] bg-[#fbf5e7]" role="status" aria-label="Urkundenvorschau wird erstellt">
      <div className="absolute -right-8 top-0 h-[33%] w-[27%] -skew-x-[17deg] bg-[#003d50]" aria-hidden="true" />
      <div className="relative flex flex-col items-center pt-[8%] text-[#003d50]">
        <img src="/logo.png" alt="" className="w-[15%]" />
        <span className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.12em]">Kletterliga NRW</span>
        <span className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[#a45524]">{title} {certificate.season_year}</span>
        <span className="mt-4 font-['Space_Grotesk'] text-[clamp(1.5rem,6vw,3.5rem)] font-bold uppercase">Urkunde</span>
      </div>
    </div>}
    <div className="space-y-3 p-4">
      <div>
        <p className="font-['Space_Grotesk'] text-base font-bold text-[#003d55]">{title} {certificate.season_year}</p>
        <p className="text-sm font-semibold text-[#a15523]">{certificate.rank}. Platz</p>
        <p className="mt-1 text-sm text-[#526b72]">Für {certificate.display_name} · {certificate.league === "lead" ? "Vorstieg" : "Toprope"} · {certificate.class_label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <StitchButton type="button" size="sm" disabled={busy !== null} onClick={() => void run("pdf")}><Download size={16} />{busy === "pdf" ? "Erstelle PDF …" : "PDF herunterladen"}</StitchButton>
        <StitchButton type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run("share")}><Share2 size={16} />{busy === "share" ? "Bereite Bild vor …" : "Bild teilen"}</StitchButton>
      </div>
      {message && <p role="status" className="text-xs leading-5 text-[#526b72]">{message}</p>}
    </div>
  </StitchCard>;
}

export default function ProfileCertificates({ profileId }: { profileId: string }) {
  const { settings } = useSeasonSettings();
  const season = settings?.season_year ? String(settings.season_year) : null;
  const [data, setData] = useState<MyCertificates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!season || !profileId) return;
    let active = true;
    setLoading(true);
    setError(false);
    getMyCertificates(season).then((result) => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [season, profileId, retry]);

  return <section className="space-y-3" aria-labelledby="my-certificates-title">
    <h3 id="my-certificates-title" className="px-1 font-['Space_Grotesk'] text-lg font-bold uppercase tracking-[0.08em] text-[#003d55]">Meine Urkunden</h3>
    {!season ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-[#526b72]">Die Saison ist noch nicht verfügbar. Bitte lade die Seite erneut.</p> :
      loading ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-[#526b72]">Urkunden werden geladen …</p> :
      error ? <div className="rounded-xl bg-white p-4 text-sm text-[#003d55]"><p>Urkunden konnten nicht geladen werden.</p><button type="button" className="mt-2 font-bold text-[#a15523] underline" onClick={() => setRetry((value) => value + 1)}>Erneut versuchen</button></div> :
      <div className="grid gap-3">
        {data?.qualification ? <CertificateCard certificate={data.qualification} title="Qualifikation" /> :
          <StitchCard tone="surface" className="rounded-xl p-4"><h4 className="font-bold text-[#003d55]">Qualifikation</h4><p className="mt-1 text-sm text-[#526b72]">Für eine Urkunde ist mindestens ein gewertetes Quali-Routenergebnis nötig.</p></StitchCard>}
        {data?.finale ? <CertificateCard certificate={data.finale} title="Finalevent" /> :
          <StitchCard tone="surface" className="rounded-xl p-4"><h4 className="font-bold text-[#003d55]">Finalevent</h4><p className="mt-1 text-sm text-[#526b72]">{data?.finale_published_at ? "Für dein Profil liegt kein Finalevent-Routenergebnis vor." : "Die Finalevent-Urkunden erscheinen nach Prüfung und Freigabe der Ergebnisse vom 3. Oktober."}</p></StitchCard>}
      </div>}
  </section>;
}
