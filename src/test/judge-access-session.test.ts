import { beforeEach, describe, expect, it } from "vitest";
import { clearJudgeAccess, JUDGE_ACCESS_MAX_AGE_MS, JUDGE_ACCESS_STORAGE_KEY, readJudgeAccess, saveJudgeAccess } from "@/lib/judgeAccessSession";

const code = "AbCdEfGhJkMnPqRsTuVwXyZ2";

describe("remembered judge access", () => {
  beforeEach(() => localStorage.clear());

  it("keeps a verified code for up to twelve hours on this device", () => {
    expect(saveJudgeAccess(localStorage, "2026", code, 1000)).toBe(true);
    expect(readJudgeAccess(localStorage, "2026", 1000 + JUDGE_ACCESS_MAX_AGE_MS - 1)).toBe(code);
    expect(readJudgeAccess(localStorage, "2026", 1000 + JUDGE_ACCESS_MAX_AGE_MS)).toBeNull();
    expect(localStorage.getItem(JUDGE_ACCESS_STORAGE_KEY)).toBeNull();
  });

  it("discards another season or malformed browser data", () => {
    saveJudgeAccess(localStorage, "2026", code, 1000);
    expect(readJudgeAccess(localStorage, "2027", 1001)).toBeNull();
    localStorage.setItem(JUDGE_ACCESS_STORAGE_KEY, "not-json");
    expect(readJudgeAccess(localStorage, "2026", 1001)).toBeNull();
  });

  it("allows explicit sign-out to remove the stored code", () => {
    saveJudgeAccess(localStorage, "2026", code, 1000);
    clearJudgeAccess(localStorage);
    expect(readJudgeAccess(localStorage, "2026", 1001)).toBeNull();
  });
});
