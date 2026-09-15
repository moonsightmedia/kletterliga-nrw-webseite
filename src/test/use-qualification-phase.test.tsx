import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQualificationPhase } from "@/services/useQualificationPhase";

vi.mock("@/services/seasonSettings", () => ({
  useSeasonSettings: () => ({
    loading: false,
    settings: { qualification_start: "2026-05-01", qualification_end: "2026-09-13" },
  }),
}));

describe("live qualification phase", () => {
  afterEach(() => vi.useRealTimers());

  it("locks an already mounted view when the final Berlin day ends", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T21:59:50Z"));
    const { result, unmount } = renderHook(useQualificationPhase);
    expect(result.current.canEditResults).toBe(true);
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.phase).toBe("closed");
    expect(result.current.canEditResults).toBe(false);
    expect(result.current.hasEnded).toBe(true);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("refreshes immediately when a suspended tab regains focus", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T21:59:50Z"));
    const { result, unmount } = renderHook(useQualificationPhase);
    vi.setSystemTime(new Date("2026-09-14T08:00:00Z"));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(result.current.phase).toBe("closed");
    unmount();
  });
});
