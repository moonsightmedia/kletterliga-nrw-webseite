import type { Certificate } from "@/services/certificates";

export type CertificateFormat = "pdf" | "social";

const navy = "#003d55";
const cream = "#f2dcab";
const rust = "#a15523";
const ink = "#002637";

const phaseTitle = (phase: Certificate["phase"]) => phase === "qualification" ? "QUALIFIKATION" : "FINALEVENT";
const leagueTitle = (league: Certificate["league"]) => league === "lead" ? "VORSTIEG" : "TOPROPE";

const fitText = (context: CanvasRenderingContext2D, value: string, maxWidth: number, startSize: number, weight = 700) => {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px "Space Grotesk", Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  } while (size > 20);
  return size;
};

const getLogo = async (): Promise<HTMLImageElement> => {
  const logo = new Image();
  logo.src = "/logo.png";
  await logo.decode();
  return logo;
};

export async function renderCertificate(certificate: Certificate, format: CertificateFormat): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('700 72px "Space Grotesk"'),
    document.fonts.load('600 32px "Manrope"'),
  ]).catch(() => undefined);
  const logo = await getLogo();
  const canvas = document.createElement("canvas");
  canvas.width = format === "pdf" ? 2480 : 1080;
  canvas.height = format === "pdf" ? 3508 : 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Die Urkunde konnte auf diesem Gerät nicht gezeichnet werden.");
  const height = format === "pdf" ? 1414 : 1250;
  context.scale(canvas.width / 1000, canvas.height / height);

  context.fillStyle = cream;
  context.fillRect(0, 0, 1000, height);
  context.fillStyle = navy;
  context.fillRect(0, 0, 1000, format === "pdf" ? 495 : 415);
  context.fillStyle = rust;
  context.beginPath();
  context.moveTo(0, format === "pdf" ? 495 : 415);
  context.lineTo(1000, format === "pdf" ? 430 : 355);
  context.lineTo(1000, format === "pdf" ? 492 : 417);
  context.lineTo(0, format === "pdf" ? 557 : 477);
  context.fill();

  const logoSize = format === "pdf" ? 132 : 112;
  context.drawImage(logo, 76, 66, logoSize, logoSize);
  context.fillStyle = cream;
  context.font = '700 31px "Space Grotesk", Arial, sans-serif';
  context.fillText("KLETTERLIGA NRW", 230, 112);
  context.font = '600 17px "Manrope", Arial, sans-serif';
  context.fillText(`SAISON ${certificate.season_year}`, 232, 150);
  context.font = '700 92px "Space Grotesk", Arial, sans-serif';
  context.fillText("URKUNDE", 76, format === "pdf" ? 340 : 310);
  context.fillStyle = "#e6c588";
  context.font = '700 29px "Space Grotesk", Arial, sans-serif';
  context.fillText(phaseTitle(certificate.phase), 80, format === "pdf" ? 405 : 370);

  const nameY = format === "pdf" ? 700 : 620;
  context.fillStyle = rust;
  context.font = '700 20px "Space Grotesk", Arial, sans-serif';
  context.fillText("DIESE URKUNDE GEHT AN", 82, nameY - 102);
  context.fillStyle = ink;
  fitText(context, certificate.display_name, 840, 72);
  context.fillText(certificate.display_name, 78, nameY);
  context.fillStyle = rust;
  context.fillRect(80, nameY + 40, 120, 8);

  const descY = nameY + 130;
  context.fillStyle = navy;
  context.font = '600 25px "Manrope", Arial, sans-serif';
  context.fillText("für die Teilnahme an der Kletterliga NRW", 82, descY);
  context.fillText(`${phaseTitle(certificate.phase).toLowerCase()} ${certificate.season_year}.`, 82, descY + 39);

  const rankTop = format === "pdf" ? 965 : 875;
  context.fillStyle = navy;
  context.fillRect(78, rankTop, 844, 190);
  context.fillStyle = cream;
  context.font = '700 23px "Space Grotesk", Arial, sans-serif';
  context.fillText(`${leagueTitle(certificate.league)}  ·  ${certificate.class_label.toUpperCase()}`, 110, rankTop + 53);
  context.font = '700 88px "Space Grotesk", Arial, sans-serif';
  context.fillText(`${certificate.rank}. PLATZ`, 108, rankTop + 150);

  context.fillStyle = rust;
  context.font = '700 17px "Space Grotesk", Arial, sans-serif';
  context.fillText("KLETTERLIGA-NRW.DE", 82, height - 88);
  context.fillStyle = navy;
  context.font = '600 16px "Manrope", Arial, sans-serif';
  context.textAlign = "right";
  context.fillText(`NRW · ${certificate.season_year}`, 917, height - 88);
  context.textAlign = "left";
  return canvas;
}

export const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Das Bild konnte nicht erzeugt werden.")), "image/png");
});

export async function certificatePdf(certificate: Certificate): Promise<Blob> {
  const [{ PDFDocument }, canvas] = await Promise.all([import("pdf-lib"), renderCertificate(certificate, "pdf")]);
  const png = await canvasToPng(canvas);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(await png.arrayBuffer());
  const page = pdf.addPage([595.28, 841.89]);
  page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  pdf.setTitle(`Kletterliga NRW – ${phaseTitle(certificate.phase)} ${certificate.season_year}`);
  pdf.setAuthor("Kletterliga NRW");
  return new Blob([Uint8Array.from(await pdf.save())], { type: "application/pdf" });
}

export function downloadCertificate(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
