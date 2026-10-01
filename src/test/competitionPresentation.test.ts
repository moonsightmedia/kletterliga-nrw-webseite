import { describe, expect, it } from "vitest";
import {
  activeNotices,
  classNextStep,
  liveFrames,
} from "@/lib/competitionPresentation";
import type {
  LiveClass,
  FinalClass,
  LiveNotice,
} from "@/services/competitionFinal";

const classes: LiveClass[] = [
  {
    key: "lead|A",
    league: "lead",
    class_label: "A",
    entries: Array.from({ length: 17 }, (_, index) => ({
      name: `Person ${index}`,
      rank: index + 1,
      points: 100,
      completed: 5,
    })),
  },
  { key: "lead|B", league: "lead", class_label: "B", entries: [] },
];
describe("competition guidance", () => {
  it("shows every page before the next class, including when a class is pinned", () => {
    expect(liveFrames(classes, [], null).map((frame) => frame.key)).toEqual([
      "lead|A:0",
      "lead|A:1",
      "lead|A:2",
      "lead|B:0",
    ]);
    expect(liveFrames(classes, [], "lead|A").length).toBe(3);
    expect(
      liveFrames(classes, ["lead|B"], "lead|A").map((frame) => frame.key),
    ).toEqual(["lead|B:0"]);
  });
  it("expires and withdraws notices without waiting for a network request", () => {
    const notice: LiveNotice = {
      id: "n",
      title: "Pause",
      body: "Zehn Minuten",
      show_app: true,
      show_tv: true,
      fullscreen: true,
      expires_at: "2026-10-01T10:00:00Z",
    };
    expect(
      activeNotices([notice], "tv", Date.parse("2026-10-01T09:59:59Z")),
    ).toHaveLength(1);
    expect(
      activeNotices([notice], "app", Date.parse(notice.expires_at!)),
    ).toHaveLength(0);
    expect(
      activeNotices(
        [{ ...notice, expires_at: null, withdrawn_at: "now" }],
        "tv",
      ),
    ).toHaveLength(0);
  });
  it("keeps a started class in the final workflow after a semifinal correction", () => {
    const item = { phase: "running", stale: true, entries: [] } satisfies Pick<
      FinalClass,
      "phase" | "stale" | "entries"
    >;
    expect(classNextStep(item, 1, "open").tab).toBe("final");
    expect(classNextStep(item, 1, "open").detail).toContain(
      "Halbfinalkorrektur",
    );
    expect(
      classNextStep({ ...item, phase: "published" }, 0, "closed").title,
    ).toBe("Startliste erneut prüfen");
    expect(classNextStep(undefined, 1, "closed").title).toBe(
      "1 Routeneintrag klären",
    );
  });
});
