import { describe, expect, it } from "vitest";
import {
  buildGymAdminResults,
  InvalidGymAdminResultsCursorError,
  type GymAdminParticipantInput,
  type GymAdminResultInput,
  type GymAdminRouteInput,
} from "../../supabase/functions/get-gym-admin-results/stats";

const routes: GymAdminRouteInput[] = [
  { id: "route-1", gym_id: "gym-1" },
  { id: "route-2", gym_id: "gym-1" },
  { id: "route-foreign", gym_id: "gym-2" },
];

const participants: GymAdminParticipantInput[] = [
  { id: "participant-1", role: "participant", archived_at: null },
  { id: "participant-2", role: "participant", archived_at: null },
  { id: "participant-archived", role: "participant", archived_at: "2026-08-01T00:00:00.000Z" },
  { id: "gym-admin", role: "gym_admin", archived_at: null },
];

const makeResult = (
  patch: Partial<GymAdminResultInput> & Pick<GymAdminResultInput, "id" | "profile_id" | "route_id">,
): GymAdminResultInput => ({
  points: 5,
  flash: false,
  status: "sent",
  rating: 4,
  created_at: "2026-08-10T10:00:00.000Z",
  updated_at: null,
  ...patch,
});

const buildResults = (
  input: Omit<
    Parameters<typeof buildGymAdminResults>[0],
    "cursorSubject" | "cursorEncryptionKeyMaterial"
  >,
) =>
  buildGymAdminResults({
    ...input,
    cursorSubject: "gym-admin-1",
    cursorEncryptionKeyMaterial: "gym-admin-results-unit-test-key-material",
  });

describe("buildGymAdminResults", () => {
  it("filters foreign routes and inactive profiles while exposing no participant identity or feedback", async () => {
    const inputWithPrivateFields = [
      {
        ...makeResult({ id: "result-1", profile_id: "participant-1", route_id: "route-1" }),
        email: "private@example.com",
        feedback: "private feedback",
      },
      makeResult({ id: "result-foreign", profile_id: "participant-1", route_id: "route-foreign" }),
      makeResult({ id: "result-archived", profile_id: "participant-archived", route_id: "route-1" }),
      makeResult({ id: "result-admin", profile_id: "gym-admin", route_id: "route-1" }),
    ];

    const payload = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: inputWithPrivateFields,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(payload.result_count).toBe(1);
    expect(payload.participant_count).toBe(1);
    expect(payload.results).toEqual([
      {
        route_id: "route-1",
        points: 5,
        flash: false,
        status: "sent",
        rating: 4,
        submitted_on: "2026-08-10",
        edited: false,
      },
    ]);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("profile_id");
    expect(serialized).not.toContain("participant_name");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("feedback");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("result-1");
    expect(serialized).not.toContain("T10:00:00");
    expect(serialized).not.toContain("created_at");
    expect(serialized).not.toContain("updated_at");
  });

  it("builds complete distinct aggregates and a 30-day UTC timeline", async () => {
    const payload = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: [
        makeResult({
          id: "result-1",
          profile_id: "participant-1",
          route_id: "route-1",
          points: 5,
          flash: true,
          created_at: "2026-08-11T23:30:00.000Z",
        }),
        makeResult({
          id: "result-2",
          profile_id: "participant-1",
          route_id: "route-2",
          points: 2,
          created_at: "2026-08-10T23:30:00-02:00",
        }),
        makeResult({
          id: "result-3",
          profile_id: "participant-2",
          route_id: "route-1",
          points: 3,
          created_at: "2026-07-01T10:00:00.000Z",
        }),
      ],
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(payload).toMatchObject({
      result_count: 3,
      participant_count: 2,
      flash_count: 1,
      average_score: 11 / 3,
      route_stats: [
        { route_id: "route-1", result_count: 2, flash_count: 1, average_score: 4.5 },
        { route_id: "route-2", result_count: 1, flash_count: 0, average_score: 2 },
      ],
    });
    expect(payload.daily_results).toHaveLength(30);
    expect(payload.daily_results[0]).toEqual({ date: "2026-07-13", count: 0 });
    expect(payload.daily_results.at(-1)).toEqual({ date: "2026-08-11", count: 2 });
  });

  it("sorts newest results first and paginates with an opaque cursor capped at 100", async () => {
    const results = [
      makeResult({
        id: "result-old",
        profile_id: "participant-1",
        route_id: "route-1",
        created_at: "2026-08-08T10:00:00.000Z",
      }),
      makeResult({
        id: "result-updated",
        profile_id: "participant-1",
        route_id: "route-1",
        created_at: "2026-08-07T10:00:00.000Z",
        updated_at: "2026-08-11T10:00:00.000Z",
      }),
      makeResult({
        id: "result-middle",
        profile_id: "participant-2",
        route_id: "route-2",
        created_at: "2026-08-09T10:00:00.000Z",
      }),
    ];

    const firstPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results,
      pageSize: 2,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(firstPage.results).toEqual([
      expect.objectContaining({ submitted_on: "2026-08-09", edited: false }),
      expect.objectContaining({ submitted_on: "2026-08-08", edited: false }),
    ]);
    expect(firstPage.next_cursor).toEqual(expect.any(String));
    expect(firstPage.next_cursor).not.toMatch(/^\d+$/);
    expect(firstPage.result_count).toBe(3);

    const secondPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results,
      pageSize: 500,
      cursor: firstPage.next_cursor,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(secondPage.results).toEqual([
      expect.objectContaining({ submitted_on: "2026-08-07", edited: true }),
    ]);
    expect(secondPage.next_cursor).toBeNull();
  });

  it("keeps the original snapshot boundary when a newer result arrives between pages", async () => {
    const snapshotResults = [
      makeResult({
        id: "result-newest",
        profile_id: "participant-1",
        route_id: "route-1",
        points: 40,
        created_at: "2026-08-11T10:00:00.000Z",
      }),
      makeResult({
        id: "result-second",
        profile_id: "participant-1",
        route_id: "route-1",
        points: 30,
        created_at: "2026-08-10T10:00:00.000Z",
      }),
      makeResult({
        id: "result-third",
        profile_id: "participant-2",
        route_id: "route-2",
        points: 20,
        created_at: "2026-08-09T10:00:00.000Z",
      }),
      makeResult({
        id: "result-oldest",
        profile_id: "participant-2",
        route_id: "route-2",
        points: 10,
        created_at: "2026-08-08T10:00:00.000Z",
      }),
    ];

    const firstPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: snapshotResults,
      pageSize: 2,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });
    expect(firstPage.results.map((result) => result.points)).toEqual([40, 30]);
    expect(firstPage.next_cursor).not.toBeNull();

    const secondPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: [
        makeResult({
          id: "result-after-snapshot",
          profile_id: "participant-1",
          route_id: "route-1",
          points: 99,
          created_at: "2026-08-11T11:00:00.000Z",
        }),
        ...snapshotResults,
      ],
      pageSize: 2,
      cursor: firstPage.next_cursor,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(secondPage.results.map((result) => result.points)).toEqual([20, 10]);
    expect(secondPage.results.map((result) => result.points)).not.toContain(30);
    expect(secondPage.results.map((result) => result.points)).not.toContain(99);
  });

  it("does not skip an unseen snapshot result when that result is edited between pages", async () => {
    const snapshotResults = [
      makeResult({
        id: "result-newest",
        profile_id: "participant-1",
        route_id: "route-1",
        points: 40,
        created_at: "2026-08-11T10:00:00.000Z",
      }),
      makeResult({
        id: "result-second",
        profile_id: "participant-1",
        route_id: "route-1",
        points: 30,
        created_at: "2026-08-10T10:00:00.000Z",
      }),
      makeResult({
        id: "result-third",
        profile_id: "participant-2",
        route_id: "route-2",
        points: 20,
        created_at: "2026-08-09T10:00:00.000Z",
      }),
      makeResult({
        id: "result-oldest",
        profile_id: "participant-2",
        route_id: "route-2",
        points: 10,
        created_at: "2026-08-08T10:00:00.000Z",
      }),
    ];

    const firstPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: snapshotResults,
      pageSize: 2,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });
    expect(firstPage.results.map((result) => result.points)).toEqual([40, 30]);
    expect(firstPage.next_cursor).not.toBeNull();

    const editedSnapshotResults = snapshotResults.map((result) =>
      result.id === "result-third"
        ? { ...result, updated_at: "2026-08-11T11:30:00.000Z" }
        : result,
    );
    const secondPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: editedSnapshotResults,
      pageSize: 2,
      cursor: firstPage.next_cursor,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(secondPage.results.map((result) => result.points)).toEqual([20, 10]);
    expect(secondPage.results[0]).toMatchObject({ points: 20, edited: true });
    expect(secondPage.results.map((result) => result.points)).not.toContain(30);
  });

  it("rejects the snapshot instead of skipping when an immutable paging key changes", async () => {
    const snapshotResults = [
      makeResult({
        id: "result-newest",
        profile_id: "participant-1",
        route_id: "route-1",
        points: 30,
        created_at: "2026-08-11T10:00:00.000Z",
      }),
      makeResult({
        id: "result-second",
        profile_id: "participant-1",
        route_id: "route-1",
        points: 20,
        created_at: "2026-08-10T10:00:00.000Z",
      }),
      makeResult({
        id: "result-third",
        profile_id: "participant-2",
        route_id: "route-2",
        points: 10,
        created_at: "2026-08-09T10:00:00.000Z",
      }),
    ];
    const firstPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: snapshotResults,
      pageSize: 1,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    const changedPagingKey = snapshotResults.map((result) =>
      result.id === "result-third"
        ? { ...result, created_at: "2026-08-10T12:00:00.000Z" }
        : result,
    );

    await expect(
      buildResults({
        gymId: "gym-1",
        routes,
        participants,
        results: changedPagingKey,
        pageSize: 1,
        cursor: firstPage.next_cursor,
        now: new Date("2026-08-11T12:00:00.000Z"),
      }),
    ).rejects.toThrow(InvalidGymAdminResultsCursorError);
  });

  it("encrypts and authenticates cursors for the assigned hall admin", async () => {
    const results = [
      makeResult({
        id: "result-private-new",
        profile_id: "participant-1",
        route_id: "route-1",
        created_at: "2026-08-11T10:00:00.000Z",
      }),
      makeResult({
        id: "result-private-old",
        profile_id: "participant-2",
        route_id: "route-2",
        created_at: "2026-08-10T10:00:00.000Z",
      }),
    ];
    const firstPage = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results,
      pageSize: 1,
      now: new Date("2026-08-11T12:00:00.000Z"),
    });
    const cursor = firstPage.next_cursor as string;

    expect(cursor).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(cursor).not.toContain("result-private");
    expect(cursor).not.toContain("2026-08");

    const cursorParts = cursor.split(".");
    const ciphertext = cursorParts[2].split("");
    const changedIndex = Math.floor(ciphertext.length / 2);
    ciphertext[changedIndex] = ciphertext[changedIndex] === "A" ? "B" : "A";
    const tamperedCursor = `${cursorParts[0]}.${cursorParts[1]}.${ciphertext.join("")}`;

    await expect(
      buildResults({
        gymId: "gym-1",
        routes,
        participants,
        results,
        pageSize: 1,
        cursor: tamperedCursor,
        now: new Date("2026-08-11T12:00:00.000Z"),
      }),
    ).rejects.toThrow(InvalidGymAdminResultsCursorError);

    await expect(
      buildGymAdminResults({
        gymId: "gym-1",
        cursorSubject: "another-gym-admin",
        cursorEncryptionKeyMaterial: "gym-admin-results-unit-test-key-material",
        routes,
        participants,
        results,
        pageSize: 1,
        cursor,
        now: new Date("2026-08-11T12:00:00.000Z"),
      }),
    ).rejects.toThrow(InvalidGymAdminResultsCursorError);
  });

  it("rejects a cursor outside the authorized filtered result set", async () => {
    await expect(
      buildResults({
        gymId: "gym-1",
        routes,
        participants,
        results: [makeResult({ id: "result-1", profile_id: "participant-1", route_id: "route-1" })],
        cursor: "9",
      }),
    ).rejects.toThrow(InvalidGymAdminResultsCursorError);
  });

  it("returns stable zero aggregates for a hall without results", async () => {
    const payload = await buildResults({
      gymId: "gym-1",
      routes,
      participants,
      results: [],
      now: new Date("2026-08-11T12:00:00.000Z"),
    });

    expect(payload).toMatchObject({
      result_count: 0,
      participant_count: 0,
      flash_count: 0,
      average_score: null,
      route_stats: [
        { route_id: "route-1", result_count: 0, flash_count: 0, average_score: null },
        { route_id: "route-2", result_count: 0, flash_count: 0, average_score: null },
      ],
      results: [],
      next_cursor: null,
    });
  });
});
