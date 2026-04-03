import QRCode from "qrcode";

type PrintableCodeCard = {
  code: string;
  qrLabel?: string;
  badge?: string;
  detailLines?: string[];
  footerLabel?: string;
};

type PrintableCodeSheetOptions = {
  windowTitle: string;
  cards: PrintableCodeCard[];
  heading?: string;
  description?: string;
  calloutTitle?: string;
  calloutLines?: string[];
  columns?: number;
  codeFontSize?: number;
  layout?: "cards" | "compact-qr";
  pageMarginCm?: number;
  gridGapCm?: number;
  qrImageSizeCm?: number;
  compactCodeFontSizePx?: number;
  compactDetailFontSizePx?: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export async function printCodeSheet({
  windowTitle,
  cards,
  heading,
  description,
  calloutTitle,
  calloutLines = [],
  columns = 2,
  codeFontSize = 22,
  layout = "cards",
  pageMarginCm,
  gridGapCm,
  qrImageSizeCm,
  compactCodeFontSizePx,
  compactDetailFontSizePx,
}: PrintableCodeSheetOptions) {
  const isCompactLayout = layout === "compact-qr";
  const safeColumns = Math.max(1, Math.min(columns, isCompactLayout ? 6 : 4));
  const safePageMarginCm = pageMarginCm ?? (isCompactLayout ? 0.45 : 1);
  const safeGridGapCm = gridGapCm ?? (isCompactLayout ? 0.18 : 0.4);
  const safeQrImageSizeCm = qrImageSizeCm ?? (isCompactLayout ? 2.55 : 2.65);
  const safeCompactCodeFontSizePx = compactCodeFontSizePx ?? 9;
  const safeCompactDetailFontSizePx = compactDetailFontSizePx ?? 7.5;

  const qrDataUrls = await Promise.all(
    cards.map((card) =>
      QRCode.toDataURL(card.code, {
        width: isCompactLayout ? 256 : 140,
        margin: 1,
      }),
    ),
  );

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Bitte erlaube Pop-ups, damit der PDF-Export geoeffnet werden kann.");
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(windowTitle)}</title>
        <style>
          @page { size: A4; margin: ${safePageMarginCm}cm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            color: #10212b;
          }
          body.card-sheet {
            padding: 20px;
          }
          body.compact-sheet {
            padding: 0;
          }
          .sheet-header {
            margin-bottom: 24px;
          }
          .sheet-header h1 {
            margin: 0 0 10px;
            font-size: 28px;
            line-height: 1.2;
            text-align: center;
          }
          .sheet-header p {
            margin: 0;
            text-align: center;
            color: #55626b;
            font-size: 13px;
            line-height: 1.6;
          }
          .callout {
            margin: 18px 0 28px;
            padding: 16px 18px;
            border: 1px solid #cfd8dc;
            border-left: 6px solid #0f5a6f;
            background: #f5f8f9;
            page-break-inside: avoid;
          }
          .callout-title {
            margin: 0 0 8px;
            font-size: 14px;
            font-weight: 700;
          }
          .callout-line {
            margin: 0;
            font-size: 12px;
            line-height: 1.6;
            color: #31424d;
          }
          .callout-line + .callout-line {
            margin-top: 4px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(${safeColumns}, minmax(0, 1fr));
            gap: ${safeGridGapCm}cm;
          }
          .code-card {
            width: 100%;
            padding: 16px;
            border: 2px dashed #1f2933;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            page-break-inside: avoid;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 24px;
            padding: 4px 10px;
            background: #e7f2f5;
            color: #0f5a6f;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            text-align: center;
          }
          .code-label {
            font-size: 12px;
            color: #5f6c75;
            text-align: center;
          }
          .qr-wrap img {
            width: 100px;
            height: 100px;
          }
          .code-text {
            font-size: ${codeFontSize}px;
            line-height: 1.2;
            font-weight: 700;
            letter-spacing: 2px;
            text-align: center;
            word-break: break-all;
          }
          .detail-lines {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .detail-line {
            font-size: 11px;
            color: #4a5963;
            text-align: center;
            line-height: 1.5;
          }
          .footer-label {
            margin-top: 2px;
            font-size: 11px;
            color: #6b7280;
            text-align: center;
          }
          .compact-grid {
            display: grid;
            grid-template-columns: repeat(${safeColumns}, minmax(0, 1fr));
            gap: ${safeGridGapCm}cm;
            align-content: start;
          }
          .compact-code {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            width: 100%;
            padding: 0.14cm 0.1cm;
            gap: 0.08cm;
            border: 1px solid rgba(16, 33, 43, 0.14);
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .compact-code img {
            display: block;
            width: ${safeQrImageSizeCm}cm;
            height: ${safeQrImageSizeCm}cm;
          }
          .compact-code-text {
            width: 100%;
            font-size: ${safeCompactCodeFontSizePx}px;
            line-height: 1.2;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-align: center;
            word-break: break-all;
          }
          .compact-detail-lines {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .compact-detail-line {
            font-size: ${safeCompactDetailFontSizePx}px;
            color: #4a5963;
            text-align: center;
            line-height: 1.3;
          }
        </style>
      </head>
      <body class="${isCompactLayout ? "compact-sheet" : "card-sheet"}">
        ${
          isCompactLayout
            ? `
          <div class="compact-grid">
            ${cards
              .map(
                (card, index) => `
              <div class="compact-code">
                <img src="${qrDataUrls[index]}" alt="${escapeHtml(card.qrLabel || card.code)}" />
                <div class="compact-code-text">${escapeHtml(card.code)}</div>
                ${
                  card.detailLines && card.detailLines.length > 0
                    ? `
                  <div class="compact-detail-lines">
                    ${card.detailLines.map((line) => `<div class="compact-detail-line">${escapeHtml(line)}</div>`).join("")}
                  </div>
                `
                    : ""
                }
              </div>
            `,
              )
              .join("")}
          </div>
        `
            : `
          <div class="sheet-header">
            ${heading ? `<h1>${escapeHtml(heading)}</h1>` : ""}
            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
          </div>
          ${
            calloutTitle || calloutLines.length > 0
              ? `
            <div class="callout">
              ${calloutTitle ? `<p class="callout-title">${escapeHtml(calloutTitle)}</p>` : ""}
              ${calloutLines.map((line) => `<p class="callout-line">${escapeHtml(line)}</p>`).join("")}
            </div>
          `
              : ""
          }
          <div class="grid">
            ${cards
              .map(
                (card, index) => `
              <div class="code-card">
                ${card.badge ? `<div class="badge">${escapeHtml(card.badge)}</div>` : ""}
                <div class="code-label">${escapeHtml(card.qrLabel || card.code)}</div>
                <div class="qr-wrap"><img src="${qrDataUrls[index]}" alt="${escapeHtml(card.qrLabel || card.code)}" /></div>
                <div class="code-text">${escapeHtml(card.code)}</div>
                ${
                  card.detailLines && card.detailLines.length > 0
                    ? `
                  <div class="detail-lines">
                    ${card.detailLines.map((line) => `<div class="detail-line">${escapeHtml(line)}</div>`).join("")}
                  </div>
                `
                    : ""
                }
                ${card.footerLabel ? `<div class="footer-label">${escapeHtml(card.footerLabel)}</div>` : ""}
              </div>
            `,
              )
              .join("")}
          </div>
        `
        }
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}
