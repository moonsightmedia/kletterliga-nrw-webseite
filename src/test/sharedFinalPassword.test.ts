import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  demoSource,
  demoStationCode,
  resetCompetitionDemo,
} from "@/lib/competitionDemoSource";

describe("shared final password in the isolated demo", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    localStorage.clear();
    sessionStorage.clear();
    resetCompetitionDemo();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });
  it("lets both phones select every released class using the same password", async () => {
    const first = await demoSource.getFinalStation("2026", 1, demoStationCode);
    const second = await demoSource.getFinalStation("2026", 2, demoStationCode);
    expect(first.classes.map((c) => c.id)).toEqual(
      second.classes.map((c) => c.id),
    );
    expect(first.classes.length).toBe(2);
  });
  it("revokes the old password for both phones and keeps password values out of persisted data and audit", async () => {
    const replacement = "Synthetic-Replacement-Password";
    await demoSource.setFinalPassword("2026", replacement);
    for (const phone of [1, 2]) {
      await expect(
        demoSource.getFinalStation("2026", phone, demoStationCode),
      ).rejects.toThrow("ungültig");
      await expect(
        demoSource.getFinalStation("2026", phone, replacement),
      ).resolves.toHaveProperty("classes");
    }
    const admin = await demoSource.getFinalAdmin("2026");
    expect(admin.final_password_set).toBe(true);
    expect(JSON.stringify(admin)).not.toContain(replacement);
    expect(Object.values(localStorage).join(" ")).not.toContain(replacement);
  });
  it("allows phone two to enter a class planned for phone one and requires current authentication even for a retry", async () => {
    const first = (
      await demoSource.getFinalStation("2026", 2, demoStationCode)
    ).classes.find((c) => c.phase === "published")!;
    await demoSource.setFinalPhase(first.id, "running", first.version);
    const current = (
      await demoSource.getFinalStation("2026", 2, demoStationCode)
    ).classes.find((c) => c.id === first.id)!;
    const input = {
      season: "2026",
      station: 2,
      code: demoStationCode,
      entry: current.entries[0].entry_id,
      request: crypto.randomUUID(),
      grip: 20,
      top: false,
      seconds: 120,
      version: current.version,
      reason: "",
    };
    await demoSource.submitFinalAttempt(input);
    await demoSource.submitFinalAttempt(input);
    const saved = (
      await demoSource.getFinalStation("2026", 1, demoStationCode)
    ).classes.find((c) => c.id === first.id)!.entries[0];
    expect(saved.grip).toBe(20);
    expect(saved.seconds).toBe(120);
    const history = (await demoSource.getFinalAdmin("2026")).audit;
    expect(
      history.find((change) => change.entry_id === input.entry)?.station_no,
    ).toBe(2);
    await demoSource.setFinalPassword("2026", "Synthetic-Replacement-Password");
    await expect(demoSource.submitFinalAttempt(input)).rejects.toThrow(
      "ungültig",
    );
  });
});
