import { mkdir } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";

const outputDir = path.resolve("tmp/handout-qrs");
await mkdir(outputDir, { recursive: true });

for (const kind of ["teilnehmende", "crew"]) {
  const url = `https://www.kletterliga-nrw.de/finale-2026/${kind}`;
  const target = path.join(outputDir, `qr-finale-2026-${kind}.png`);
  await QRCode.toFile(target, url, {
    width: 600,
    margin: 2,
    color: { dark: "#003D50", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
  console.log(`${kind}: ${target} -> ${url}`);
}
