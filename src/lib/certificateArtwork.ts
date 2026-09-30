import type { Certificate } from "@/services/certificates";

export type CertificateFormat = "pdf" | "social";

// Colors and composition follow the existing Kletterliga print certificates.
const navy = "#003d50";
const cream = "#fbf5e7";
const rust = "#a45524";
const sand = "#cdbd99";
const signature = "#83918d";

const phaseTitle = (phase: Certificate["phase"]) => phase === "qualification" ? "QUALIFIKATION" : "FINALE";
const leagueTitle = (league: Certificate["league"]) => league === "lead" ? "VORSTIEG" : "TOPROPE";
const classTitle = (label: string) => {
  const match = /^(U15|Ü15|Ü40)-([mw])$/i.exec(label);
  if (!match) return label;
  return `${match[1]} · ${match[2].toLowerCase() === "w" ? "weiblich" : "männlich"}`;
};

const getLogo = async (): Promise<HTMLImageElement> => {
  const logo = new Image();
  logo.src = "/logo.png";
  await logo.decode();
  return logo;
};

function polygon(context: CanvasRenderingContext2D, color: string, points: number[][]) {
  context.fillStyle = color;
  context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath();
  context.fill();
}

function centeredText(context: CanvasRenderingContext2D, value: string, y: number, size: number, color: string, font = "Space Grotesk", weight = 700) {
  context.fillStyle = color;
  context.textAlign = "center";
  context.font = `${weight} ${size}px "${font}", Arial, sans-serif`;
  context.fillText(value, 500, y);
}

function line(context: CanvasRenderingContext2D, x: number, y: number, width: number, color: string, height = 2) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function fitCenteredText(context: CanvasRenderingContext2D, value: string, maxWidth: number, start: number, minimum: number, font = "Space Grotesk") {
  let size = start;
  while (size > minimum) {
    context.font = `700 ${size}px "${font}", Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawName(context: CanvasRenderingContext2D, name: string, baseline: number) {
  const cleanName = name.trim();
  const singleSize = fitCenteredText(context, cleanName, 860, 59, 40);
  if (singleSize >= 46 || !cleanName.includes(" ")) {
    centeredText(context, cleanName, baseline, singleSize, navy);
    return;
  }

  const words = cleanName.split(/\s+/);
  let split = 1;
  let bestBalance = Infinity;
  for (let index = 1; index < words.length; index++) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const difference = Math.abs(context.measureText(first).width - context.measureText(second).width);
    if (difference < bestBalance) { bestBalance = difference; split = index; }
  }
  const rows = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
  const size = Math.min(...rows.map((row) => fitCenteredText(context, row, 860, 58, 38)));
  centeredText(context, rows[0], baseline - size * 0.42, size, navy);
  centeredText(context, rows[1], baseline + size * 0.68, size, navy);
}

export async function renderCertificate(certificate: Certificate, format: CertificateFormat): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('700 92px "Space Grotesk"'),
    document.fonts.load('700 25px "Manrope"'),
  ]).catch(() => undefined);
  const logo = await getLogo();
  const canvas = document.createElement("canvas");
  canvas.width = format === "pdf" ? 2480 : 1080;
  canvas.height = format === "pdf" ? 3508 : 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Die Urkunde konnte auf diesem Gerät nicht gezeichnet werden.");
  const isPdf = format === "pdf";
  const height = isPdf ? 1414 : 1250;
  context.scale(canvas.width / 1000, canvas.height / height);

  context.fillStyle = cream;
  context.fillRect(0, 0, 1000, height);
  line(context, 0, 0, 26, rust, height);
  polygon(context, navy, [[830, 0], [1000, 0], [1000, isPdf ? 379 : 325], [936, isPdf ? 410 : 356]]);
  polygon(context, rust, [[936, isPdf ? 410 : 356], [1000, isPdf ? 379 : 325], [1000, isPdf ? 407 : 353], [945, isPdf ? 438 : 384]]);

  const logoY = isPdf ? 72 : 47;
  const logoSize = isPdf ? 156 : 146;
  context.drawImage(logo, 500 - logoSize / 2, logoY, logoSize, logoSize);
  centeredText(context, "KLETTERLIGA NRW", isPdf ? 271 : 219, 27, navy, "Manrope");
  context.fillStyle = rust;
  context.textAlign = "center";
  context.font = '700 20px "Manrope", Arial, sans-serif';
  context.fillText(`${phaseTitle(certificate.phase)} ${certificate.season_year}`, 500, isPdf ? 306 : 253);
  centeredText(context, "URKUNDE", isPdf ? 430 : 367, 89, navy, "Space Grotesk", 700);

  const nameLineY = isPdf ? 590 : 510;
  line(context, 129, nameLineY, 742, navy);
  centeredText(context, "NAME", nameLineY + 30, 18, rust, "Manrope");
  drawName(context, certificate.display_name, isPdf ? 708 : 624);

  const rankBaseline = isPdf ? 900 : 824;
  const rank = `${certificate.rank}.`;
  const rankSize = fitCenteredText(context, rank, 400, 202, 126);
  context.font = `700 ${rankSize}px "Space Grotesk", Arial, sans-serif`;
  const rankWidth = context.measureText(rank).width;
  context.font = '700 86px "Space Grotesk", Arial, sans-serif';
  const placeWidth = context.measureText("PLATZ").width;
  const gap = 25;
  const startX = (1000 - rankWidth - placeWidth - gap) / 2;
  context.textAlign = "left";
  context.fillStyle = rust;
  context.font = `700 ${rankSize}px "Space Grotesk", Arial, sans-serif`;
  context.fillText(rank, startX, rankBaseline);
  context.fillStyle = navy;
  context.font = '700 86px "Space Grotesk", Arial, sans-serif';
  context.fillText("PLATZ", startX + rankWidth + gap, rankBaseline - 5);

  line(context, 348, isPdf ? 951 : 864, 304, sand);
  centeredText(context, leagueTitle(certificate.league), isPdf ? 1026 : 933, 47, navy);
  centeredText(context, classTitle(certificate.class_label), isPdf ? 1084 : 988, 31, navy, "Manrope", 600);

  const detail = certificate.phase === "finale"
    ? `03. Oktober ${certificate.season_year} · Kletterwelt Sauerland, Altena`
    : `Kletterliga NRW · Qualifikation ${certificate.season_year}`;
  centeredText(context, detail, isPdf ? 1179 : 1059, 23, navy, "Manrope", 400);

  const signatureY = isPdf ? 1264 : 1133;
  line(context, 118, signatureY, 315, signature);
  line(context, 567, signatureY, 315, signature);
  context.fillStyle = navy;
  context.font = '400 20px "Manrope", Arial, sans-serif';
  context.textAlign = "center";
  context.fillText("René Brehm", 275, signatureY + 32);
  context.fillText("Janosch Althoff", 725, signatureY + 32);
  context.textAlign = "left";
  line(context, 0, height - 32, 1000, navy, 32);
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
