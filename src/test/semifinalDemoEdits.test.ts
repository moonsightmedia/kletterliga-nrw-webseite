import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { demoSource, startSemifinalDemo } from "@/lib/competitionDemoSource";

describe("semifinal demo admin edits", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    localStorage.clear();
    sessionStorage.clear();
    startSemifinalDemo();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });
  it("corrects an entered result, updates ranking, preserves first-entry time and records before/after", async () => {
    const before = await demoSource.getFinalAdmin("2026");
    const person = before.semifinal.find((row) => row.missing.length)!;
    const missing = person.missing[0];
    await demoSource.enterSemifinalResult(
      "2026",
      person.profile_id,
      missing.route_id,
      3,
      "Nachtrag",
    );
    const entered = await demoSource.getFinalAdmin("2026");
    const result = entered.semifinal_results.find(
      (result) =>
        result.profile_id === person.profile_id &&
        result.route_number === missing.number,
    )!;
    await demoSource.correctCompetitionResult({
      resultId: result.id,
      zone: 10,
      reason: "Papierliste geprüft",
      expected: {
        zone: result.zone,
        points: result.points,
        changedAt:
          entered.semifinal_audit.find(
            (change) => change.result_id === result.id,
          )?.created_at ?? null,
      },
    });
    const corrected = await demoSource.getFinalAdmin("2026");
    const updatedPerson = corrected.semifinal.find(
      (row) => row.profile_id === person.profile_id,
    )!;
    expect(updatedPerson.points).toBe(person.points + 100);
    expect(updatedPerson.completed).toBe(person.completed + 1);
    expect(updatedPerson.rank).toBe(
      1 +
        corrected.semifinal.filter(
          (other) =>
            other.league === person.league &&
            other.class_label === person.class_label &&
            other.points > updatedPerson.points,
        ).length,
    );
    const saved = corrected.semifinal_results.find(
      (item) => item.id === result.id,
    )!;
    expect(saved.created_at).toBe(result.created_at);
    const history = corrected.semifinal_audit.filter(
      (change) => change.result_id === result.id,
    );
    expect(history).toHaveLength(2);
    expect(history[0].before_data).toEqual({ zone: 3, points: 30 });
    expect(history[0].after_data).toEqual({ zone: 10, points: 100 });
    await expect(
      demoSource.enterSemifinalResult(
        "2026",
        person.profile_id,
        missing.route_id,
        0,
        "Doppelt",
      ),
    ).rejects.toThrow("bereits");
  });
  it("records not-climbed independently and permits a later documented entry", async () => {
    const before = await demoSource.getFinalAdmin("2026");
    const person = before.semifinal.find((row) => row.missing.length)!;
    const missing = person.missing[0];
    await demoSource.settleSemifinal(
      "2026",
      person.profile_id,
      missing.route_id,
      "Nicht angetreten",
    );
    const settled = await demoSource.getFinalAdmin("2026");
    expect(
      settled.semifinal
        .find((row) => row.profile_id === person.profile_id)!
        .missing.find((route) => route.route_id === missing.route_id)!.settled,
    ).toBe(true);
    expect(
      settled.semifinal_results.some(
        (result) =>
          result.profile_id === person.profile_id &&
          result.route_number === missing.number,
      ),
    ).toBe(false);
    expect(settled.audit[0].after_data).toMatchObject({
      profile_id: person.profile_id,
      route_id: missing.route_id,
      points: 0,
    });
    await demoSource.enterSemifinalResult(
      "2026",
      person.profile_id,
      missing.route_id,
      0,
      "Doch gestartet, kein Griff",
    );
    const entered = await demoSource.getFinalAdmin("2026");
    expect(
      entered.semifinal_results.find(
        (result) =>
          result.profile_id === person.profile_id &&
          result.route_number === missing.number,
      )?.zone,
    ).toBe(0);
  });
  it("rejects a stale correction without changing the result or audit", async () => {
    const original = await demoSource.getFinalAdmin("2026");
    const result = original.semifinal_results[0];
    const expected = {
      zone: result.zone,
      points: result.points,
      changedAt:
        original.semifinal_audit.find(
          (change) => change.result_id === result.id,
        )?.created_at ?? null,
    };
    await demoSource.correctCompetitionResult({
      resultId: result.id,
      zone: result.zone === 1 ? 2 : 1,
      reason: "Erste Änderung",
      expected,
    });
    const beforeRetry = await demoSource.getFinalAdmin("2026");
    await expect(
      demoSource.correctCompetitionResult({
        resultId: result.id,
        zone: 9,
        reason: "Veraltete Eingabe",
        expected,
      }),
    ).rejects.toThrow("inzwischen geändert");
    const afterRetry = await demoSource.getFinalAdmin("2026");
    expect(afterRetry.semifinal_results).toEqual(beforeRetry.semifinal_results);
    expect(afterRetry.semifinal_audit).toEqual(beforeRetry.semifinal_audit);
    expect(afterRetry.semifinal).toEqual(beforeRetry.semifinal);
  });
});
