import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QualificationTransition from "@/app/pages/participant/QualificationTransition";

const stages = [{ key: "may", label: "Etappe 1 (Mai)", start: "2026-05-01", end: "2026-05-31" }];
let profileNumber = 0;
const mount = (profileId = `transition-test-${++profileNumber}`, season = "2026") => ({
  profileId,
  ...render(<QualificationTransition key={`${profileId}:${season}`} profileId={profileId} season={season} end="2026-09-13" stages={stages}><h1 id="semifinal-heading" tabIndex={-1}>Halbfinale</h1><button>Anmeldung</button></QualificationTransition>),
});

describe("qualification completion transition", () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("shows the completed period, then replaces it with semifinal content after 2.6 seconds", () => {
    mount();
    expect(screen.getByTestId("qualification-transition")).toBeInTheDocument();
    expect(screen.getByLabelText("Abgeschlossene Qualifikationsetappen")).toHaveTextContent("Etappe 1 (Mai) abgeschlossen");
    expect(screen.queryByRole("button", { name: "Anmeldung" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2199));
    expect(screen.getByTestId("qualification-transition")).not.toHaveClass("qualification-finish--closing");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("qualification-transition")).toHaveClass("qualification-finish--closing");
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByTestId("qualification-transition")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anmeldung" })).toBeInTheDocument();
  });

  it("skips immediately, keeps keyboard focus and does not replay for the same profile/season", () => {
    const first = mount();
    const skip = screen.getByRole("button", { name: "Direkt zum Halbfinale" });
    skip.focus();
    fireEvent.click(skip);
    expect(screen.getByRole("heading", { name: "Halbfinale" })).toHaveFocus();
    first.unmount();
    mount(first.profileId);
    expect(screen.queryByTestId("qualification-transition")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(0)); // Flush jsdom's queued storage events, not the intro timers.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("respects reduced motion without delaying or hiding the registration", () => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
    mount();
    expect(screen.queryByTestId("qualification-transition")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anmeldung" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(0));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not confuse another participant or a new season with a seen intro", () => {
    const first = mount();
    fireEvent.click(screen.getByRole("button", { name: "Direkt zum Halbfinale" }));
    first.unmount();
    const next = mount();
    expect(screen.getByTestId("qualification-transition")).toBeInTheDocument();
    next.unmount();
    mount(first.profileId, "2027");
    expect(screen.getByTestId("qualification-transition")).toBeInTheDocument();
  });

  it("continues safely when browser storage is unavailable and clears timers on unmount", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const first = mount();
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.getByRole("button", { name: "Anmeldung" })).toBeInTheDocument();
    first.unmount();
    const second = mount(first.profileId);
    expect(screen.queryByTestId("qualification-transition")).not.toBeInTheDocument();
    second.unmount();
    mount().unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
