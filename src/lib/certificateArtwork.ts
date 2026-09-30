import type { Certificate } from "@/services/certificates";

export type CertificateFormat = "pdf" | "social";

const navy = "#003d55";
const cream = "#f8f0de";
const sand = "#efd8aa";
const rust = "#a55322";
const ink = "#002e41";

const phaseTitle = (phase: Certificate["phase"]) => phase === "qualification" ? "QUALIFIKATION" : "FINALEVENT";
const leagueTitle = (league: Certificate["league"]) => league === "lead" ? "VORSTIEG" : "TOPROPE";

const fitText = (context: CanvasRenderingContext2D, value: string, maxWidth: number, startSize: number, minimum = 32) => {
  let size = startSize;
  do {
    context.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  } while (size > minimum);
  return size;
};

const getLogo = async (): Promise<HTMLImageElement> => {
  const logo = new Image();
  logo.src = "/logo.png";
  await logo.decode();
  return logo;
};

function polygon(context: CanvasRenderingContext2D, fill: string, points: number[][]) {
  context.fillStyle = fill;
  context.beginPath();
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
  context.closePath();
  context.fill();
}

function drawRoute(context: CanvasRenderingContext2D, heroTop: number, heroBottom: number) {
  // A route drawn from holds and a rope gives the certificate its climbing identity.
  context.save();
  context.beginPath();
  context.rect(0, heroTop, 1000, heroBottom - heroTop + 55);
  context.clip();
  context.strokeStyle = "#e9c789";
  context.lineWidth = 6;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(755, heroBottom + 30);
  context.bezierCurveTo(838, heroBottom - 84, 677, heroBottom - 148, 759, heroBottom - 231);
  context.bezierCurveTo(857, heroBottom - 330, 715, heroTop + 36, 850, heroTop - 15);
  context.stroke();

  polygon(context, rust, [[730, heroBottom - 54], [790, heroBottom - 93], [831, heroBottom - 70], [806, heroBottom - 12], [754, heroBottom + 6]]);
  polygon(context, sand, [[666, heroBottom - 178], [722, heroBottom - 215], [770, heroBottom - 182], [749, heroBottom - 132], [698, heroBottom - 125]]);
  polygon(context, rust, [[808, heroTop + 83], [867, heroTop + 48], [913, heroTop + 82], [892, heroTop + 136], [836, heroTop + 142]]);
  context.strokeStyle = "#f8f0de";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(827, heroTop + 100);
  context.lineTo(875, heroTop + 69);
  context.moveTo(690, heroBottom - 166);
  context.lineTo(745, heroBottom - 174);
  context.moveTo(752, heroBottom - 52);
  context.lineTo(807, heroBottom - 63);
  context.stroke();
  context.restore();
}

function drawName(context: CanvasRenderingContext2D, name: string, top: number) {
  context.fillStyle = rust;
  context.font = '700 18px "Manrope", Arial, sans-serif';
  context.fillText("DIESE URKUNDE GEHT AN", 74, top);

  const words = name.trim().split(/\s+/);
  const singleLineSize = fitText(context, name, 850, 69, 47);
  if (singleLineSize >= 58 || words.length < 3) {
    context.fillStyle = ink;
    context.fillText(name, 70, top + 91);
    return;
  }
  let split = 1;
  let balance = Infinity;
  for (let index = 1; index < words.length; index++) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const difference = Math.abs(context.measureText(left).width - context.measureText(right).width);
    if (difference < balance) { balance = difference; split = index; }
  }
  const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
  const size = Math.min(...lines.map((line) => fitText(context, line, 850, 65, 38)));
  context.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
  context.fillStyle = ink;
  context.fillText(lines[0], 70, top + 74);
  context.fillText(lines[1], 70, top + 74 + size * 1.15);
}

export async function renderCertificate(certificate: Certificate, format: CertificateFormat): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('700 100px "Space Grotesk"'),
    document.fonts.load('700 20px "Manrope"'),
  ]).catch(() => undefined);
  const logo = await getLogo();
  const canvas = document.createElement("canvas");
  canvas.width = format === "pdf" ? 2480 : 1080;
  canvas.height = format === "pdf" ? 3508 : 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Die Urkunde konnte auf diesem Gerät nicht gezeichnet werden.");

  const isPdf = format === "pdf";
  const height = isPdf ? 1414 : 1250;
  const heroTop = isPdf ? 255 : 230;
  const heroBottom = isPdf ? 645 : 575;
  const nameTop = isPdf ? 745 : 657;
  const rankTop = isPdf ? 1030 : 917;
  context.scale(canvas.width / 1000, canvas.height / height);

  context.fillStyle = cream;
  context.fillRect(0, 0, 1000, height);
  context.fillStyle = rust;
  context.fillRect(0, 0, 16, height);
  context.drawImage(logo, 72, 54, isPdf ? 158 : 140, isPdf ? 158 : 140);
  context.fillStyle = navy;
  context.font = '700 36px "Space Grotesk", Arial, sans-serif';
  context.fillText("KLETTERLIGA", 254, 116);
  context.fillText("NRW", 254, 154);
  context.fillStyle = rust;
  context.font = '700 23px "Manrope", Arial, sans-serif';
  context.fillText(`SAISON ${certificate.season_year}`, 257, 193);
  context.textAlign = "right";
  context.fillStyle = sand;
  context.font = '700 134px "Space Grotesk", Arial, sans-serif';
  context.fillText(certificate.season_year.slice(-2), 940, 176);
  context.textAlign = "left";

  polygon(context, navy, [[16, heroTop + 28], [1000, heroTop - 10], [1000, heroBottom - 5], [16, heroBottom + 48]]);
  polygon(context, rust, [[16, heroTop + 28], [1000, heroTop - 10], [1000, heroTop + 20], [16, heroTop + 58]]);
  drawRoute(context, heroTop, heroBottom);
  context.fillStyle = cream;
  context.font = '700 91px "Space Grotesk", Arial, sans-serif';
  context.fillText("URKUNDE", 68, heroTop + 168);
  context.fillStyle = sand;
  context.font = '700 34px "Space Grotesk", Arial, sans-serif';
  context.fillText(phaseTitle(certificate.phase), 73, heroTop + 227);
  context.strokeStyle = sand;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(73, heroTop + 256);
  context.lineTo(425, heroTop + 256);
  context.stroke();
  context.fillStyle = cream;
  context.font = '600 19px "Manrope", Arial, sans-serif';
  context.fillText(`KLETTERLIGA NRW · ${certificate.season_year}`, 74, heroBottom - 9);

  drawName(context, certificate.display_name, nameTop);
  context.fillStyle = rust;
  context.fillRect(73, isPdf ? 910 : 816, 122, 7);

  context.fillStyle = navy;
  context.font = '700 31px "Manrope", Arial, sans-serif';
  context.fillText(`${leagueTitle(certificate.league)}  ·  ${certificate.class_label.toUpperCase()}`, 75, rankTop - 43);
  context.fillStyle = rust;
  const rank = `${certificate.rank}.`;
  fitText(context, rank, 435, 220, 136);
  context.fillText(rank, 65, rankTop + 170);
  const rankWidth = context.measureText(rank).width;
  context.fillStyle = navy;
  context.font = '700 66px "Space Grotesk", Arial, sans-serif';
  context.fillText("PLATZ", Math.max(280, 105 + rankWidth), rankTop + 158);
  context.fillStyle = rust;
  context.fillRect(74, rankTop + 208, 850, 3);

  context.fillStyle = navy;
  context.font = '600 18px "Manrope", Arial, sans-serif';
  context.fillText("KLETTERLIGA-NRW.DE", 75, height - 53);
  context.textAlign = "right";
  context.fillText("NRW · KLETTERN VERBINDET", 924, height - 53);
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
