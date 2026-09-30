import { useEffect, useState } from "react";
import { Download, LockKeyhole, Share2, ZoomIn } from "lucide-react";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { canvasToPng, certificatePdf, downloadCertificate, renderCertificate } from "@/lib/certificateArtwork";
import { getMyCertificates, type Certificate, type MyCertificates } from "@/services/certificates";
import { useSeasonSettings } from "@/services/seasonSettings";

type ShareFormat = "post" | "story";

const fileName = (certificate: Certificate, extension: string, format?: ShareFormat) =>
  `Kletterliga-NRW-${certificate.season_year}-${certificate.phase}${format ? `-${format}` : ""}.${extension}`;

const className = (label: string) => {
  const match = /^(U15|Ü15|Ü40)-([mw])$/i.exec(label);
  return match ? `${match[1]} · ${match[2].toLowerCase() === "w" ? "weiblich" : "männlich"}` : label;
};

const supportsFileShare = () => {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([""], "urkunde.png", { type: "image/png" })] });
  } catch {
    return false;
  }
};

export function CertificateCard({ certificate, title }: { certificate: Certificate; title: string }) {
  const [shareFormat, setShareFormat] = useState<ShareFormat>("post");
  const [busy, setBusy] = useState<"pdf" | "share" | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const canShare = supportsFileShare();

  useEffect(() => {
    let active = true;
    let previewUrl: string | null = null;
    setPreview(null);
    setPreviewBlob(null);
    setPreviewError(false);
    renderCertificate(certificate, shareFormat).then(canvasToPng).then((blob) => {
      previewUrl = URL.createObjectURL(blob);
      if (active) {
        setPreview(previewUrl);
        setPreviewBlob(blob);
      }
      else URL.revokeObjectURL(previewUrl);
    }).catch(() => { if (active) setPreviewError(true); });
    return () => { active = false; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [certificate, shareFormat]);

  const run = async (action: "pdf" | "share") => {
    if (action === "share" && !previewBlob) return;
    setBusy(action);
    setMessage("");
    try {
      if (action === "pdf") {
        downloadCertificate(await certificatePdf(certificate), fileName(certificate, "pdf"));
        setMessage("PDF wurde heruntergeladen.");
      } else {
        const file = new File([previewBlob!], fileName(certificate, "png", shareFormat), { type: "image/png" });
        if (canShare) {
          try {
            await navigator.share({ files: [file], title: `Meine Kletterliga-Urkunde ${certificate.season_year}` });
            setMessage("Bild an die Teilenfunktion übergeben. Wähle in Instagram die gewünschte Veröffentlichungsart.");
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            downloadCertificate(previewBlob!, file.name);
            setMessage(`Teilen war nicht verfügbar. ${shareFormat === "story" ? "Story" : "Beitrag"}-Bild gespeichert – öffne es in Instagram.`);
          }
        } else {
          downloadCertificate(previewBlob!, file.name);
          setMessage(`${shareFormat === "story" ? "Story" : "Beitrag"}-Bild gespeichert. Öffne es in Instagram.`);
        }
      }
    } catch {
      setMessage(action === "pdf" ? "PDF konnte nicht erstellt werden. Bitte erneut versuchen." : "Teilen war nicht möglich. Bitte erneut versuchen.");
    } finally {
      setBusy(null);
    }
  };

  return <StitchCard tone="surface" className="overflow-hidden rounded-2xl border border-[#003d55]/10 shadow-[0_10px_28px_rgba(0,61,85,0.08)]">
    <div className="flex min-w-0 items-center gap-4 p-4 sm:gap-5 sm:p-5">
      <div className="w-[6.75rem] shrink-0 sm:w-32">
        {preview ? <a href={preview} target="_blank" rel="noopener noreferrer" aria-label={`${title}-Urkunde als ${shareFormat === "story" ? "Story" : "Beitrag"} in voller Größe ansehen`} className="group relative block overflow-hidden rounded-md shadow-[0_7px_18px_rgba(0,38,55,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] focus-visible:ring-offset-2">
          <img src={preview} alt={`Vorschau der ${title}-Urkunde als ${shareFormat === "story" ? "Story" : "Beitrag"} für ${certificate.display_name}`} className={`${shareFormat === "story" ? "aspect-[9/16]" : "aspect-[4/5]"} w-full object-cover`} />
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-tl-md bg-[#003d55]/90 text-[#f4e1b3] transition-colors group-hover:bg-[#a15523]"><ZoomIn size={16} aria-hidden="true" /></span>
        </a> : <div className={`flex ${shareFormat === "story" ? "aspect-[9/16]" : "aspect-[4/5]"} items-center justify-center rounded-md bg-[#f4e1b3] px-2 text-center text-[0.65rem] font-semibold text-[#003d55]`} role="status">
          {previewError ? "Vorschau nicht verfügbar" : "Urkunde wird geladen …"}
        </div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.13em] text-[#a15523]">{title} · {certificate.season_year}</p>
        <p className="mt-2 font-['Space_Grotesk'] text-[1.8rem] font-bold leading-none text-[#003d55] sm:text-[2rem]">{certificate.rank}. Platz</p>
        <p className="mt-3 break-words text-sm font-bold leading-5 text-[#003d55]">{certificate.display_name}</p>
        <p className="mt-1 text-xs leading-5 text-[#526b72]">{certificate.league === "lead" ? "Vorstieg" : "Toprope"} · {className(certificate.class_label)}</p>
      </div>
    </div>
    <div className="space-y-2 border-t border-[#003d55]/10 bg-[#fbfcfa] px-4 pb-3 pt-4 sm:px-5">
      <div role="group" aria-label="Bildformat für Instagram" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e9efee] p-1">
        {(["post", "story"] as const).map((format) => <button key={format} type="button" aria-pressed={shareFormat === format} disabled={busy !== null}
          onClick={() => { if (format !== shareFormat) { setPreview(null); setPreviewBlob(null); setShareFormat(format); } setMessage(""); }}
          className={`min-h-11 rounded-lg px-2 text-center font-['Manrope'] text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] focus-visible:ring-offset-2 ${shareFormat === format ? "bg-white text-[#003d55] shadow-sm" : "text-[#526b72] hover:text-[#003d55]"}`}>
          {format === "post" ? "Beitrag · 4:5" : "Story · 9:16"}
        </button>)}
      </div>
      <StitchButton type="button" className="min-h-12 w-full rounded-xl font-['Manrope'] text-sm font-bold normal-case tracking-normal" disabled={busy !== null || !previewBlob} onClick={() => void run("share")}>
        {canShare ? <Share2 size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}{busy === "share" ? "Bild wird vorbereitet …" : canShare ? `${shareFormat === "story" ? "Story" : "Beitrag"} teilen` : `${shareFormat === "story" ? "Story" : "Beitrag"}-Bild speichern`}
      </StitchButton>
      <StitchButton type="button" variant="outline" className="min-h-11 w-full rounded-xl border-[#003d55]/15 bg-white font-['Manrope'] text-sm font-bold normal-case tracking-normal shadow-none" disabled={busy !== null} onClick={() => void run("pdf")}>
        <Download size={17} aria-hidden="true" />{busy === "pdf" ? "PDF wird erstellt …" : "PDF herunterladen"}
      </StitchButton>
      <p className="min-h-5 text-center text-[0.7rem] leading-5 text-[#526b72]" role="status" aria-live="polite">{message || (canShare ? "Wähle anschließend Instagram und dort Beitrag oder Story." : "Bild speichern und in Instagram als Beitrag oder Story auswählen.")}</p>
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
    <div className="px-1">
      <h3 id="my-certificates-title" className="font-['Space_Grotesk'] text-xl font-bold text-[#003d55]">Meine Urkunden</h3>
      <p className="mt-1 text-xs leading-5 text-[#526b72]">Deine Ergebnisse zum Anschauen, Teilen und Ausdrucken.</p>
    </div>
    {!season ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-[#526b72]">Die Saison ist noch nicht verfügbar. Bitte lade die Seite erneut.</p> :
      loading ? <p role="status" className="rounded-xl bg-white p-4 text-sm text-[#526b72]">Urkunden werden geladen …</p> :
      error ? <div className="rounded-xl bg-white p-4 text-sm text-[#003d55]"><p>Urkunden konnten nicht geladen werden.</p><button type="button" className="mt-2 font-bold text-[#a15523] underline" onClick={() => setRetry((value) => value + 1)}>Erneut versuchen</button></div> :
      <div className="grid gap-3">
        {data?.qualification ? <CertificateCard certificate={data.qualification} title="Qualifikation" /> :
          <StitchCard tone="surface" className="rounded-2xl p-4"><h4 className="font-bold text-[#003d55]">Qualifikation</h4><p className="mt-1 text-sm text-[#526b72]">Für eine Urkunde ist mindestens ein gewertetes Quali-Routenergebnis nötig.</p></StitchCard>}
        {data?.finale ? <CertificateCard certificate={data.finale} title="Finalevent" /> :
          <StitchCard tone="surface" className="flex gap-3 rounded-2xl border border-[#003d55]/10 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4e1b3] text-[#003d55]"><LockKeyhole size={18} aria-hidden="true" /></span><div><h4 className="font-bold text-[#003d55]">Finalevent</h4><p className="mt-1 text-sm leading-5 text-[#526b72]">{data?.finale_published_at ? "Für dein Profil liegt kein Finalevent-Routenergebnis vor." : "Die Finalevent-Urkunden erscheinen nach Prüfung und Freigabe der Ergebnisse vom 3. Oktober."}</p></div></StitchCard>}
      </div>}
  </section>;
}
