import type { Certificate } from "@/services/certificates";

export type CertificateFormat = "pdf" | "post" | "story";

const navy = "#003d50";
const cream = "#f4e1b3";
const rust = "#a45525";
const imageCache = new Map<string, Promise<HTMLImageElement>>();

const phaseTitle = (phase: Certificate["phase"]) => phase === "qualification" ? "QUALIFIKATION" : "FINALE";
const classTitle = (label: string) => {
  const match = /^(U15|Ü15|Ü40)-([mw])$/i.exec(label);
  if (!match) return label;
  return `${match[1]} · ${match[2].toLowerCase() === "w" ? "weiblich" : "männlich"}`;
};

function getArtwork(name: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(name);
  if (cached) return cached;
  const image = new Image();
  image.src = `/certificates/${name}.${name === "logo" ? "svg" : "png"}`;
  const pending = image.decode().then(() => image).catch((error) => {
    imageCache.delete(name);
    throw error;
  });
  imageCache.set(name, pending);
  return pending;
}

function drawCenteredText(context: CanvasRenderingContext2D, value: string, y: number, size: number, color: string, weight = 700) {
  context.fillStyle = color;
  context.textAlign = "center";
  context.font = `${weight} ${size}px "Space Grotesk", Arial, sans-serif`;
  context.fillText(value, 500, y);
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number, startSize: number, minSize: number) {
  let size = startSize;
  while (size > minSize) {
    context.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    if (context.measureText(value).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawName(context: CanvasRenderingContext2D, value: string, baseline: number) {
  const name = value.trim();
  const size = fitText(context, name, 810, 59, 36);
  if (size >= 45 || !name.includes(" ")) {
    drawCenteredText(context, name, baseline, size, navy);
    return;
  }
  const words = name.split(/\s+/);
  let split = 1;
  let balance = Infinity;
  for (let index = 1; index < words.length; index++) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const difference = Math.abs(context.measureText(left).width - context.measureText(right).width);
    if (difference < balance) { balance = difference; split = index; }
  }
  const rows = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
  const rowSize = Math.min(...rows.map((row) => fitText(context, row, 810, 54, 30)));
  drawCenteredText(context, rows[0], baseline - rowSize * 0.62, rowSize, navy);
  drawCenteredText(context, rows[1], baseline + rowSize * 0.38, rowSize, navy);
}

export async function renderCertificate(certificate: Certificate, format: CertificateFormat): Promise<HTMLCanvasElement> {
  await Promise.all([
    document.fonts.load('700 180px "Space Grotesk"'),
    document.fonts.load('600 30px "Manrope"'),
  ]).catch(() => undefined);

  if (format === "story") {
    const post = await renderCertificate(certificate, "post");
    const story = document.createElement("canvas");
    story.width = 1080;
    story.height = 1920;
    const storyContext = story.getContext("2d");
    if (!storyContext) throw new Error("Die Story konnte auf diesem Gerät nicht gezeichnet werden.");
    storyContext.fillStyle = navy;
    storyContext.fillRect(0, 0, story.width, story.height);
    storyContext.fillStyle = cream;
    storyContext.fillRect(64, 318, 952, 1194);
    storyContext.drawImage(post, 72, 326, 936, 1170);
    storyContext.textAlign = "center";
    storyContext.fillStyle = cream;
    storyContext.font = '700 52px "Space Grotesk", Arial, sans-serif';
    storyContext.fillText("MEINE KLETTERLIGA-URKUNDE", 540, 248);
    storyContext.font = '600 27px "Manrope", Arial, sans-serif';
    storyContext.fillText(`KLETTERLIGA NRW · ${certificate.season_year}`, 540, 1600);
    return story;
  }

  const isPdf = format === "pdf";
  const height = isPdf ? 1414 : 1250;
  const artworkNames = [
    "background", "logo", "wordmark", "title",
    certificate.phase === "finale" ? "phase-finale" : "phase-qualification",
    "place",
    certificate.league === "lead" ? "league-vorsteig" : "league-toprope",
    "signature-rene", "signature-janosch",
    ...(certificate.rank >= 1 && certificate.rank <= 6 ? [`rank-${certificate.rank}`] : []),
  ];
  const artwork = new Map(await Promise.all(artworkNames.map(async (name) => [name, await getArtwork(name)] as const)));

  const canvas = document.createElement("canvas");
  canvas.width = isPdf ? 2480 : 1080;
  canvas.height = isPdf ? 3508 : 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Die Urkunde konnte auf diesem Gerät nicht gezeichnet werden.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.scale(canvas.width / 1000, canvas.height / height);
  const draw = (name: string, x: number, y: number, width: number, height: number) => {
    const source = artwork.get(name);
    if (!source) throw new Error("Ein Urkundenmotiv fehlt.");
    context.drawImage(source, x, y, width, height);
  };

  // These are the original image layers from the approved 97-page print PDF.
  draw("background", 0, 0, 1000, height);
  draw("logo", 386, isPdf ? 41 : 22, 228, 228);
  draw("wordmark", 344, isPdf ? 292 : 260, 312, 25);
  const phaseImage = certificate.phase === "finale" ? "phase-finale" : "phase-qualification";
  const phaseWidth = certificate.phase === "finale" ? 242 : 315;
  draw(phaseImage, (1000 - phaseWidth) / 2, isPdf ? 330 : 297, phaseWidth, 29);
  draw("title", 113, isPdf ? 405 : 365, 774, 112);

  const nameLine = isPdf ? 670 : 580;
  context.fillStyle = navy;
  context.fillRect(113, nameLine, 774, 2);
  drawCenteredText(context, "N A M E", nameLine + 31, 17, navy, 500);
  drawName(context, certificate.display_name, isPdf ? 630 : 542);

  const rankY = isPdf ? 883 : 758;
  if (certificate.rank >= 1 && certificate.rank <= 6) {
    draw(`rank-${certificate.rank}`, 122, rankY, 129, 136);
    draw("place", 274, rankY, 613, 136);
  } else {
    const rank = `${certificate.rank}.`;
    const size = fitText(context, rank, 310, 177, 114);
    context.font = `700 ${size}px "Space Grotesk", Arial, sans-serif`;
    const rankWidth = context.measureText(rank).width;
    const placeWidth = 530;
    const start = (1000 - rankWidth - placeWidth - 25) / 2;
    context.textAlign = "left";
    context.fillStyle = rust;
    context.lineWidth = 4;
    context.strokeStyle = rust;
    context.strokeText(rank, start, rankY + 135);
    context.fillText(rank, start, rankY + 135);
    draw("place", start + rankWidth + 25, rankY + 10, placeWidth, 117);
  }

  const leagueImage = certificate.league === "lead" ? "league-vorsteig" : "league-toprope";
  const leagueWidth = certificate.league === "lead" ? 355 : 328;
  draw(leagueImage, (1000 - leagueWidth) / 2, isPdf ? 1054 : 926, leagueWidth, 46);
  drawCenteredText(context, classTitle(certificate.class_label), isPdf ? 1140 : 1010, 37, cream, 700);

  draw("signature-rene", 186, isPdf ? 1166 : 1054, 167, 62);
  draw("signature-janosch", 638, isPdf ? 1176 : 1064, 163, 68);
  context.fillStyle = cream;
  const signatureLineY = isPdf ? 1235 : 1123;
  context.fillRect(186, signatureLineY, 167, 2);
  context.fillRect(638, signatureLineY, 163, 2);
  context.fillStyle = cream;
  context.textAlign = "center";
  context.font = '500 20px "Manrope", Arial, sans-serif';
  context.fillText("René Brehm", 270, isPdf ? 1266 : 1152);
  context.fillText("Janosch Althoff", 719, isPdf ? 1266 : 1152);
  const footerTop = isPdf ? 1330 : 1193;
  if (certificate.phase === "finale") {
    drawCenteredText(context, `03. Oktober ${certificate.season_year}`, footerTop, 20, cream, 500);
    drawCenteredText(context, "Kletterwelt Sauerland · Altena", footerTop + 27, 20, cream, 500);
  } else {
    drawCenteredText(context, `Qualifikation ${certificate.season_year}`, footerTop, 20, cream, 500);
    drawCenteredText(context, "Kletterliga NRW", footerTop + 27, 20, cream, 500);
  }
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
