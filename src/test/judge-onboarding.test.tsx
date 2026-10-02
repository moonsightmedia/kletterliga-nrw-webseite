import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JudgeOnboarding } from "@/app/components/JudgeOnboarding";
import { judgeOnboardingKey } from "@/lib/judgeOnboarding";

describe("judge onboarding", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("guides a first visit, remembers completion and can be reopened", () => {
    const first = render(<JudgeOnboarding season="2026" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deine Routen auswählen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Zeit nehmen und ankündigen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(screen.getByRole("heading", { name: "Deine Routen auswählen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Ergebnis per QR bestätigen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Los geht’s" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(judgeOnboardingKey("2026"))).toBe("done");
    first.unmount();
    render(<JudgeOnboarding season="2026" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kurzanleitung" }));
    expect(screen.getByRole("heading", { name: "Deine Routen auswählen" })).toBeInTheDocument();
  });

  it("remembers dismissal and offers the guide again for a new season", () => {
    const first = render(<JudgeOnboarding season="2026" />);
    fireEvent.click(screen.getByRole("button", { name: "Anleitung schließen" }));
    expect(localStorage.getItem(judgeOnboardingKey("2026"))).toBe("done");
    first.unmount();
    render(<JudgeOnboarding season="2027" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("can be completed even when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
    render(<JudgeOnboarding season="2026" />);
    fireEvent.click(screen.getByRole("button", { name: "Anleitung schließen" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kurzanleitung" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
