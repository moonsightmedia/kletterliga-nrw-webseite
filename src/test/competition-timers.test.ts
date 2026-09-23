import { describe, expect, it } from "vitest";
import {
  COMPETITION_TIMER_DURATION_MS,
  COMPETITION_TIMER_WARNING_MS,
  formatCompetitionTimer,
  getCompetitionTimerElapsed,
  getCompetitionTimerStatus,
  getCompetitionTimerStorageKey,
  readCompetitionTimers,
  resetCompetitionTimer,
  startCompetitionTimer,
  stopCompetitionTimer,
  writeCompetitionTimers,
} from "@/lib/competitionTimers";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    corrupt: (key: string, value: string) => { data.set(key, value); },
  };
}

describe("competition route timers", () => {
  it("keeps each route independent and derives elapsed time from timestamps", () => {
    const first = startCompetitionTimer(resetCompetitionTimer("route-1"), 10_000);
    const second = startCompetitionTimer(resetCompetitionTimer("route-2"), 20_000);

    expect(getCompetitionTimerElapsed(first, 70_000)).toBe(60_000);
    expect(getCompetitionTimerElapsed(second, 70_000)).toBe(50_000);
    expect(getCompetitionTimerStatus(first, 70_000)).toBe("running");
  });

  it("pauses, resumes, and persists a timer across reloads", () => {
    const storage = memoryStorage();
    const running = startCompetitionTimer(resetCompetitionTimer("route-a"), 5_000);
    const paused = stopCompetitionTimer(running, 95_000);
    expect(paused).toEqual({ routeId: "route-a", elapsedMs: 90_000, startedAt: null });

    const resumed = startCompetitionTimer(paused, 200_000);
    const timers = { "route-a": resumed };
    expect(writeCompetitionTimers(storage, "profile-1", "2026", timers)).toBe(true);

    const restored = readCompetitionTimers(storage, "profile-1", "2026")["route-a"];
    expect(restored).toEqual(resumed);
    expect(getCompetitionTimerElapsed(restored, 230_000)).toBe(120_000);
  });

  it("uses profile and season scoped storage keys", () => {
    const storage = memoryStorage();
    const timer = startCompetitionTimer(resetCompetitionTimer("route-a"), 1_000);
    writeCompetitionTimers(storage, "profile-1", "2026", { "route-a": timer });
    writeCompetitionTimers(storage, "profile-2", "2026", { "route-b": startCompetitionTimer(resetCompetitionTimer("route-b"), 2_000) });
    writeCompetitionTimers(storage, "profile-1", "2027", { "route-c": startCompetitionTimer(resetCompetitionTimer("route-c"), 3_000) });

    expect(Object.keys(readCompetitionTimers(storage, "profile-1", "2026"))).toEqual(["route-a"]);
    expect(storage.getItem(getCompetitionTimerStorageKey("profile-1", "2027"))).not.toBeNull();
  });

  it("signals the last minute at four minutes and ends at five without interval counting", () => {
    const timer = startCompetitionTimer(resetCompetitionTimer("route-a"), 50_000);
    expect(getCompetitionTimerStatus(timer, 50_000 + COMPETITION_TIMER_WARNING_MS - 1)).toBe("running");
    expect(getCompetitionTimerStatus(timer, 50_000 + COMPETITION_TIMER_WARNING_MS)).toBe("last-minute");
    expect(getCompetitionTimerElapsed(timer, 50_000 + COMPETITION_TIMER_DURATION_MS + 30_000)).toBe(COMPETITION_TIMER_DURATION_MS);
    expect(getCompetitionTimerStatus(timer, 50_000 + COMPETITION_TIMER_DURATION_MS + 30_000)).toBe("finished");
  });

  it("recovers from malformed and corrupt local storage", () => {
    const storage = memoryStorage();
    const key = getCompetitionTimerStorageKey("profile-1", "2026");
    storage.corrupt(key, "{not-json");
    expect(readCompetitionTimers(storage, "profile-1", "2026")).toEqual({});
    storage.corrupt(key, JSON.stringify({
      okay: { routeId: "okay", elapsedMs: 10, startedAt: null },
      wrongKey: { routeId: "other", elapsedMs: 10, startedAt: null },
      invalid: { routeId: "invalid", elapsedMs: -1, startedAt: null },
    }));
    expect(readCompetitionTimers(storage, "profile-1", "2026")).toEqual({
      okay: { routeId: "okay", elapsedMs: 10, startedAt: null },
    });
  });

  it("formats countdown values with ceiling seconds and a five minute cap", () => {
    expect(formatCompetitionTimer(300_000)).toBe("5:00");
    expect(formatCompetitionTimer(59_001)).toBe("1:00");
    expect(formatCompetitionTimer(1)).toBe("0:01");
    expect(formatCompetitionTimer(-100)).toBe("0:00");
  });
});
