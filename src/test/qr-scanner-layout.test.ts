import { describe, expect, it } from "vitest";
import { qrScannerBox } from "@/lib/qrScannerLayout";
describe("responsive QR viewfinder", () => {
  it("fits a narrow mobile card without rejecting camera startup", () => expect(qrScannerBox(216, 280)).toEqual({ width: 183, height: 183 }));
  it("keeps the existing desktop maximum and adapts landscape height", () => {
    expect(qrScannerBox(500, 500)).toEqual({ width: 250, height: 250 });
    expect(qrScannerBox(500, 180)).toEqual({ width: 153, height: 153 });
  });
});
