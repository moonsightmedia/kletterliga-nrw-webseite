import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("competition-day camera policy", () => {
  it("allows same-origin QR scanning without enabling microphone or geolocation", () => {
    const config = JSON.parse(readFileSync(resolve("vercel.json"), "utf8")) as {
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const globalHeaders = config.headers.find((entry) => entry.source === "/(.*)")?.headers;
    const policy = globalHeaders?.find((header) => header.key.toLowerCase() === "permissions-policy")?.value;

    expect(policy).toContain("camera=(self)");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
  });
});
