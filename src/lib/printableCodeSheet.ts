import QRCode from "qrcode";

type PrintableCodeCard = {
  code: string;
  qrLabel: string;
  badge?: string;
  detailLines?: string[];
  footerLabel?: string;
};

type PrintableCodeSheetOptions = {
  windowTitle: string;
  heading: string;
  description?: string;
  calloutTitle?: string;
  calloutLines?: string[];
  cards: PrintableCodeCard[];
  columns?: number;
  codeFontSize?: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export async function printCodeSheet({
  windowTitle,
  heading,
  description,
  calloutTitle,
  calloutLines = [],
  cards,
  columns = 2,
  codeFontSize = 22,
}: PrintableCodeSheetOptions) {
  const qrDataUrls = await Promise.all(
    cards.map((card) => QRCode.toDataURL(card.code, { width: 120, margin: 1 })),
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
          @page { size: A4; margin: 1cm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #10212b;
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
            grid-template-columns: repeat(${columns}, minmax(0, 1fr));
            gap: 15px;
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
        </style>
      </head>
      <body>
        <div class="sheet-header">
          <h1>${escapeHtml(heading)}</h1>
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
              <div class="code-label">${escapeHtml(card.qrLabel)}</div>
              <div class="qr-wrap"><img src="${qrDataUrls[index]}" alt="${escapeHtml(card.qrLabel)}" /></div>
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
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}
