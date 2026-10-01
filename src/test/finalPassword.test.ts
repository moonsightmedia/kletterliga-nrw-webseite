import { describe, expect, it } from "vitest";
import { validFinalPassword } from "@/lib/finalPassword";

describe("final password limits", () => {
  it("enforces the bcrypt byte limit without silently truncating Unicode passwords", () => {
    expect(validFinalPassword("Synthetic-Demo-Password")).toBe(true);
    expect(validFinalPassword("short")).toBe(false);
    expect(validFinalPassword(" Synthetic-Demo-Password ")).toBe(false);
    expect(validFinalPassword("ä".repeat(36))).toBe(true);
    expect(validFinalPassword("ä".repeat(37))).toBe(false);
    expect(validFinalPassword("Demo-Password\0Suffix")).toBe(false);
  });
});
