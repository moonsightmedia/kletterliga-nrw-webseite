// Imported exclusively by the development-only demo route. No real competition API is called.
import { useEffect, useState } from "react";
import type { CompetitionCenterSource } from "@/app/pages/admin/CompetitionCenter";
import type {
  FinalAdmin,
  FinalClass,
  FinalEntry,
  LiveData,
  StationClass,
} from "@/services/competitionFinal";
import type {
  CompetitionResult,
  CompetitionConfig,
  CompetitionStanding,
} from "@/services/competitionDay";
import { competitionDeadlineReached } from "@/lib/competitionDeadline";
import { validFinalPassword } from "@/lib/finalPassword";

const key = "kletterliga:guided-final-demo:v2";
export const demoStationCode = "DEMO12345678901234567890";
type Store = {
  admin: FinalAdmin;
  codes: Record<number, string>;
  passwordHash?: string;
  semifinalConfig?: CompetitionConfig;
  openedAt?: string | null;
  semifinalJudgeConfigured?: boolean;
  requests: string[];
  changed: string;
};
const now = () => new Date().toISOString();
async function demoPasswordHash(password: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function seed(): Store {
  const definitions = [
    {
      id: "u18",
      league: "lead" as const,
      label: "U18 weiblich",
      phase: "published" as const,
      names: [
        "Mara Beispiel",
        "Jana Muster",
        "Lena Probe",
        "Marie Test",
        "Sina Beispiel",
        "Nora Muster",
        "Paula Probe",
        "Emilia Test",
        "Hanna Beispiel",
      ],
    },
    {
      id: "adult",
      league: "lead" as const,
      label: "Ü18 männlich",
      phase: "running" as const,
      names: [
        "Jonas Beispiel",
        "Leon Muster",
        "Finn Probe",
        "Alexander Maximilian Testname",
        "Ben Beispiel",
        "Luis Muster",
        "Noah Probe",
        "Paul Test",
        "Moritz Beispiel",
        "Julian Muster",
        "Felix Probe",
      ],
    },
    {
      id: "toprope",
      league: "toprope" as const,
      label: "Ü18 offen",
      phase: "preparation" as const,
      names: [
        "Kim Beispiel",
        "Chris Muster",
        "Alex Probe",
        "Tim Test",
        "Max Beispiel",
        "Robin Demo",
      ],
    },
  ];
  const admin: FinalAdmin = {
    phase: "closed",
    final_password_set: true,
    submission_deadline_at: "2026-10-03T16:00:00+02:00",
    classes: [],
    routes: [
      { id: "route1", number: 1, name: "Finale Vorstieg", max_grip: 32 },
      { id: "route2", number: 2, name: "Finale Toprope", max_grip: 28 },
    ],
    semifinal: [],
    semifinal_results: [],
    stations: [
      { station_no: 1, updated_at: now() },
      { station_no: 2, updated_at: now() },
    ],
    display: {
      phase: "final",
      class_keys: [],
      pinned_key: null,
      interval_seconds: 15,
    },
    notices: [],
    audit: [],
    semifinal_audit: [],
  };
  for (const def of definitions) {
    def.names.forEach((name, index) => {
      const points = Math.max(0, 500 - index * 50 + (index === 6 ? 50 : 0));
      const rank = index === 6 ? 6 : index + 1;
      const id = `${def.id}-${index}`;
      const missing = def.id === "toprope" && index === 5;
      admin.semifinal.push({
        profile_id: id,
        name,
        league: def.league,
        class_label: def.label,
        points: missing ? 200 : points,
        completed: missing ? 4 : 5,
        rank,
        excluded: null,
        missing: missing
          ? [{ route_id: "semi5", number: 5, settled: false }]
          : [],
      });
      let remaining = missing ? 200 : points;
      for (let route = 1; route <= 5; route++) {
        if (missing && route === 5) continue;
        const value = Math.min(100, remaining);
        remaining -= value;
        admin.semifinal_results.push({
          id: `${id}:semi${route}`,
          profile_id: id,
          route_number: route,
          zone: value / 10,
          points: value,
          created_at: now(),
        });
      }
    });
    if (def.phase !== "preparation") {
      const rows = admin.semifinal
        .filter(
          (row) =>
            row.league === def.league &&
            row.class_label === def.label &&
            row.rank <= 6,
        )
        .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "de"));
      const entries: FinalEntry[] = rows.map((row, index) => ({
        entry_id: `entry:${row.profile_id}`,
        profile_id: row.profile_id,
        name: row.name,
        semifinal_rank: row.rank,
        semifinal_points: row.points,
        start_position: index + 1,
        status: "ready",
        checked_at: null,
        attempt_id: null,
        is_top: null,
        grip: null,
        seconds: null,
        rank: null,
        entered_at: null,
      }));
      if (def.phase === "running")
        entries.slice(0, 3).forEach((entry, index) =>
          Object.assign(entry, {
            attempt_id: `attempt:${entry.entry_id}`,
            is_top: index === 2,
            grip: index === 2 ? 32 : 20 + index * 4,
            seconds: 160 + index * 25,
            entered_at: now(),
          }),
        );
      admin.classes.push({
        id: def.id,
        league: def.league,
        class_label: def.label,
        route_id: "route1",
        station_no: 1,
        phase: def.phase,
        version: 1,
        published_at: now(),
        stale: false,
        entries,
      });
    }
  }
  return {
    admin,
    codes: { 1: demoStationCode, 2: demoStationCode },
    requests: [],
    changed: now(),
  };
}
const compare = (a: FinalEntry, b: FinalEntry) =>
  Number(b.is_top) - Number(a.is_top) ||
  (b.grip ?? 0) - (a.grip ?? 0) ||
  a.semifinal_rank - b.semifinal_rank ||
  (a.seconds ?? 0) - (b.seconds ?? 0);
function rank(admin: FinalAdmin) {
  for (const row of admin.semifinal) {
    row.rank =
      1 +
      admin.semifinal.filter(
        (other) =>
          other.league === row.league &&
          other.class_label === row.class_label &&
          other.points > row.points,
      ).length;
  }
  for (const item of admin.classes) {
    const results = item.entries
      .filter((entry) => entry.attempt_id && entry.status === "ready")
      .sort(compare);
    for (const entry of item.entries)
      entry.rank =
        entry.attempt_id && entry.status === "ready"
          ? results.findIndex((other) => compare(other, entry) === 0) + 1
          : null;
    item.entries.sort(
      (a, b) =>
        (a.rank ?? 999) - (b.rank ?? 999) ||
        a.start_position - b.start_position,
    );
  }
  return admin;
}
function read(): Store {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as Store;
    if (value?.admin?.semifinal?.length) {
      value.admin = rank(value.admin);
      value.admin.final_password_set ??= true;
      if (
        value.admin.phase === "open" &&
        competitionDeadlineReached(value.admin.submission_deadline_at)
      )
        value.admin.phase = "closed";
      return value;
    }
  } catch {
    /* recoverable demo */
  }
  const value = seed();
  value.admin = rank(value.admin);
  return value;
}
function write(value: Store) {
  value.changed = now();
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("competition-demo-changed"));
}
function mutate(change: (value: Store) => void) {
  const value = read();
  change(value);
  write(value);
}
export const resetCompetitionDemo = () => {
  for (const item of Object.keys(localStorage)) {
    if (item.startsWith("kletterliga:demo:final-draft:"))
      localStorage.removeItem(item);
  }
  for (const item of Object.keys(sessionStorage)) {
    if (item.startsWith("kletterliga:demo:final-station:"))
      sessionStorage.removeItem(item);
  }
  write(seed());
};
export function startSemifinalDemo() {
  const value = seed();
  value.admin.phase = "open";
  value.admin.classes = [];
  value.admin.display = {
    phase: "semifinal",
    class_keys: [],
    pinned_key: null,
    interval_seconds: 15,
  };
  write(value);
}
export function closeSemifinalDemoDeadline() {
  mutate((value) => {
    value.admin.submission_deadline_at = new Date(
      Date.now() - 1000,
    ).toISOString();
    value.admin.phase = "closed";
  });
}
export function useCompetitionDemo() {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const refresh = () => setValue(read());
    window.addEventListener("competition-demo-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("competition-demo-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return value;
}
function checkedClass(value: Store, id: string, version: number) {
  const item = value.admin.classes.find((row) => row.id === id);
  if (!item) throw new Error("Klasse nicht gefunden.");
  if (item.version !== version)
    throw new Error(
      "Die Klasse wurde inzwischen geändert. Neu laden und den Stand prüfen.",
    );
  return item;
}
function entryClass(value: Store, id: string, version: number) {
  const item = value.admin.classes.find((row) =>
    row.entries.some((entry) => entry.entry_id === id),
  );
  if (!item) throw new Error("Eintrag nicht gefunden.");
  return {
    item: checkedClass(value, item.id, version),
    entry: item.entries.find((row) => row.entry_id === id)!,
  };
}
function audit(
  value: Store,
  action: string,
  reason = "",
  entry_id?: string,
  station_no?: number,
) {
  value.admin.audit.unshift({
    action,
    reason,
    entry_id,
    created_at: now(),
    actor: station_no ? undefined : "René · Demokonto",
    station_no,
  });
}

export const demoSource: CompetitionCenterSource & {
  getFinalStation: typeof import("@/services/competitionFinal").getFinalStation;
  submitFinalAttempt: typeof import("@/services/competitionFinal").submitFinalAttempt;
} = {
  getFinalAdmin: async () => structuredClone(read().admin),
  setCompetitionPhase: async (_season, phase) =>
    mutate((value) => {
      value.admin.phase = phase;
      audit(value, "Halbfinalstatus geändert");
    }),
  getCompetitionAdmin: async () => {
    const { admin } = read();
    return {
      config: read().semifinalConfig ?? {
        routes: Array.from({ length: 5 }, (_, index) => ({
          number: index + 1,
          name: `Halbfinalroute ${index + 1}`,
          grade: "6a",
          color: "blue",
        })),
        assignments: [
          ...new Map(
            admin.semifinal.map((row) => [
              `${row.league}|${row.class_label}`,
              {
                league: row.league,
                class_label: row.class_label,
                route_numbers: [1, 2, 3, 4, 5],
              },
            ]),
          ).values(),
        ],
        zone_points: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        flash_bonus: 0,
      },
      staff: [],
      results: admin.semifinal_results.map((result) => {
        const person = admin.semifinal.find(
          (row) => row.profile_id === result.profile_id,
        )!;
        return {
          ...result,
          route_id: `semi${result.route_number}`,
          flash: false,
          name: person.name,
          league: person.league,
          class_label: person.class_label,
        };
      }),
    };
  },
  settleSemifinal: async (_season, profile, route, reason) =>
    mutate((value) => {
      if (!reason.trim()) throw new Error("Begründung erforderlich.");
      if (value.admin.phase === "draft")
        throw new Error("Halbfinale zuerst öffnen.");
      const row = value.admin.semifinal.find(
        (row) => row.profile_id === profile,
      )!;
      row.missing.find((item) => item.route_id === route)!.settled = true;
      audit(value, "Nicht geklettert · 0 Punkte", reason);
      value.admin.audit[0].after_data = {
        profile_id: profile,
        route_id: route,
        points: 0,
      };
    }),
  enterSemifinalResult: async (_season, profile, route, zone, reason) =>
    mutate((value) => {
      if (!reason.trim()) throw new Error("Begründung erforderlich.");
      if (value.admin.phase === "draft")
        throw new Error("Halbfinale zuerst öffnen.");
      if (!Number.isInteger(zone) || zone < 0 || zone > 10)
        throw new Error("Bitte einen gültigen Griff wählen.");
      const row = value.admin.semifinal.find(
        (row) => row.profile_id === profile,
      )!;
      const missing = row.missing.find((item) => item.route_id === route)!;
      if (
        value.admin.semifinal_results.some(
          (result) =>
            result.profile_id === profile &&
            result.route_number === missing.number,
        )
      )
        throw new Error("Für diese Route ist bereits ein Ergebnis vorhanden.");
      missing.settled = true;
      row.completed++;
      row.points += zone * 10;
      const result = {
        id: crypto.randomUUID(),
        profile_id: profile,
        route_number: missing.number,
        zone,
        points: zone * 10,
        created_at: now(),
      };
      value.admin.semifinal_results.push(result);
      value.admin.semifinal_audit.unshift({
        result_id: result.id,
        action: "Halbfinalergebnis eingetragen",
        reason,
        actor: "René · Demokonto",
        created_at: now(),
        before_data: {},
        after_data: { zone, points: result.points },
      });
      for (const item of value.admin.classes) {
        if (item.league === row.league && item.class_label === row.class_label)
          item.stale = true;
      }
      audit(value, "Halbfinalergebnis nachgetragen", reason);
    }),
  correctCompetitionResult: async ({ resultId, zone, reason, expected }) => {
    let saved: CompetitionResult | undefined;
    mutate((value) => {
      if (!reason.trim() || reason.length > 500)
        throw new Error("Begründung erforderlich.");
      if (!Number.isInteger(zone) || zone < 0 || zone > 10)
        throw new Error("Bitte einen gültigen Griff wählen.");
      const result = value.admin.semifinal_results.find(
        (result) => result.id === resultId,
      );
      if (!result) throw new Error("Das Ergebnis wurde nicht gefunden.");
      if (
        expected &&
        (expected.zone !== result.zone ||
          expected.points !== result.points ||
          expected.changedAt !==
            (value.admin.semifinal_audit.find(
              (item) => item.result_id === resultId,
            )?.created_at ?? null))
      )
        throw new Error(
          "Dieses Ergebnis wurde inzwischen geändert. Bitte den aktuellen Wert laden und die Korrektur erneut prüfen.",
        );
      const row = value.admin.semifinal.find(
        (row) => row.profile_id === result.profile_id,
      )!;
      const before = { zone: result.zone, points: result.points };
      row.points += zone * 10 - result.points;
      result.zone = zone;
      result.points = zone * 10;
      value.admin.semifinal_audit.unshift({
        result_id: resultId,
        action: "Halbfinalergebnis geändert",
        reason,
        actor: "René · Demokonto",
        created_at: now(),
        before_data: before,
        after_data: { zone, points: result.points },
      });
      for (const item of value.admin.classes)
        if (item.league === row.league && item.class_label === row.class_label)
          item.stale = true;
      saved = {
        ...result,
        route_id: `semi${result.route_number}`,
        flash: false,
      };
    });
    return saved!;
  },
  setFinalExclusion: async (_season, profile, status, reason) =>
    mutate((value) => {
      const row = value.admin.semifinal.find(
        (row) => row.profile_id === profile,
      )!;
      row.excluded = status;
      for (const item of value.admin.classes) {
        if (item.league === row.league && item.class_label === row.class_label)
          item.stale = true;
      }
      audit(value, "Ausfallstatus", reason);
    }),
  saveFinalRoute: async (_season, number, name, maxGrip) =>
    mutate((value) => {
      if (
        value.admin.classes.some(
          (item) =>
            value.admin.routes.find((route) => route.id === item.route_id)
              ?.number === number,
        )
      )
        throw new Error("Route bereits für eine freigegebene Klasse gesperrt.");
      const route = value.admin.routes.find((row) => row.number === number);
      if (route) Object.assign(route, { name, max_grip: maxGrip });
      else
        value.admin.routes.push({
          id: crypto.randomUUID(),
          number,
          name,
          max_grip: maxGrip,
        });
    }),
  publishFinalClass: async (_season, league, label, route, station, version) =>
    mutate((value) => {
      if (value.admin.phase !== "closed")
        throw new Error("Halbfinaleingabe zuerst schließen.");
      const previous = value.admin.classes.find(
        (row) => row.league === league && row.class_label === label,
      );
      if (previous && !["preparation", "published"].includes(previous.phase))
        throw new Error("Klasse bereits gestartet.");
      if ((previous?.version ?? 0) !== version)
        throw new Error("Veraltete Listenfassung.");
      const rows = value.admin.semifinal.filter(
        (row) => row.league === league && row.class_label === label,
      );
      if (rows.some((row) => !row.excluded && row.missing.some((item) => !item.settled)))
        throw new Error("Halbfinalergebnisse fehlen.");
      const eligible = rows
        .filter((row) => !row.excluded)
        .sort((a, b) => b.points - a.points);
      const cut = eligible[5]?.points;
      const field = eligible
        .filter((row) => cut === undefined || row.points >= cut)
        .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "de"));
      const item: FinalClass = {
        id: previous?.id ?? crypto.randomUUID(),
        league,
        class_label: label,
        route_id: route,
        station_no: station as 1 | 2 | null,
        phase: "published",
        version: version + 1,
        published_at: now(),
        stale: false,
        entries: field.map((row, index) => ({
          entry_id: `entry:${row.profile_id}`,
          profile_id: row.profile_id,
          name: row.name,
          semifinal_rank: row.rank,
          semifinal_points: row.points,
          start_position: index + 1,
          status: "ready",
          checked_at: null,
          attempt_id: null,
          is_top: null,
          grip: null,
          seconds: null,
          rank: null,
          entered_at: null,
        })),
      };
      value.admin.classes = value.admin.classes
        .filter((row) => row.id !== item.id)
        .concat(item);
      audit(value, "Startliste bestätigt");
    }),
  moveFinalEntry: async (id, position, version) =>
    mutate((value) => {
      const { item, entry } = entryClass(value, id, version);
      if (entry.attempt_id || item.phase === "final")
        throw new Error("Gestartete Person kann nicht verschoben werden.");
      const other = item.entries.find((row) => row.start_position === position);
      if (!other || other.attempt_id)
        throw new Error("Startposition nicht verfügbar.");
      other.start_position = entry.start_position;
      entry.start_position = position;
      item.version++;
      audit(value, "Startreihenfolge geändert", "", id);
    }),
  setFinalPhase: async (id, phase, version, reason) =>
    mutate((value) => {
      const item = checkedClass(value, id, version);
      if (
        phase === "final" &&
        item.entries.some(
          (entry) =>
            entry.status === "incident" ||
            (entry.status === "ready" &&
              (!entry.attempt_id || !entry.checked_at)),
        )
      )
        throw new Error("Papierabgleich unvollständig.");
      if (item.phase === "final" && !reason.trim())
        throw new Error("Begründung erforderlich.");
      item.phase = phase;
      item.version++;
      audit(value, `Klassenstatus: ${phase}`, reason);
    }),
  setFinalEntryStatus: async (id, status, reason, version) =>
    mutate((value) => {
      const { item, entry } = entryClass(value, id, version);
      if (!reason.trim()) throw new Error("Begründung erforderlich.");
      entry.status = status;
      entry.checked_at = null;
      item.version++;
      audit(value, "Statusänderung", reason, id);
    }),
  checkFinalEntry: async (id, version) =>
    mutate((value) => {
      const { item, entry } = entryClass(value, id, version);
      entry.checked_at = now();
      item.version++;
      audit(value, "Papierabgleich", "", id);
    }),
  setFinalPassword: async (_season, password) => {
    if (!validFinalPassword(password))
      throw new Error("Bitte ein gültiges Finalpasswort wählen.");
    const hash = await demoPasswordHash(password);
    mutate((value) => {
      value.passwordHash = hash;
      value.codes = {};
      value.admin.final_password_set = true;
      audit(value, "Gemeinsames Finalpasswort geändert");
    });
  },
  setLiveDisplay: async (_season, display) =>
    mutate((value) => {
      value.admin.display = display;
      audit(value, "TV-Einstellungen gespeichert");
    }),
  saveLiveNotice: async (_season, notice) => {
    const id = notice.id ?? crypto.randomUUID();
    mutate((value) => {
      value.admin.notices = value.admin.notices.filter(
        (item) => item.id !== id,
      );
      value.admin.notices.unshift({
        ...notice,
        id,
        withdrawn_at: notice.withdrawn ? now() : null,
      });
      audit(
        value,
        notice.withdrawn ? "Hinweis zurückgezogen" : "Hinweis veröffentlicht",
      );
    });
    return id;
  },
  getFinalStation: async (_season, station, code) => {
    const value = read();
    const accepted = value.passwordHash
      ? (await demoPasswordHash(code)) === value.passwordHash
      : code === value.codes[1];
    if (![1, 2].includes(station) || !accepted)
      throw new Error("Das Finalpasswort ist ungültig oder wurde geändert.");
    return {
      classes: value.admin.classes
        .filter((item) =>
          ["published", "running", "review"].includes(item.phase) &&
          value.admin.routes.some((route) => route.id === item.route_id),
        )
        .map((item) => ({
          ...item,
          route: value.admin.routes.find(
            (route) => route.id === item.route_id,
          )!,
        })) as StationClass[],
    };
  },
  submitFinalAttempt: async (input) => {
    const hash = await demoPasswordHash(input.code);
    return mutate((value) => {
      const accepted = value.passwordHash
        ? hash === value.passwordHash
        : input.code === value.codes[1];
      if (![1, 2].includes(input.station) || !accepted)
        throw new Error("Finalpasswort ungültig.");
      if (value.requests.includes(input.request)) return;
      const { item, entry } = entryClass(value, input.entry, input.version);
      if (item.phase !== "running")
        throw new Error("Eingabe für diese Klasse geschlossen.");
      if (!item.route_id || !item.station_no)
        throw new Error("Diese Starterliste wird auf Papier geführt.");
      if (entry.attempt_id && !input.reason.trim())
        throw new Error("Begründung für die Korrektur fehlt.");
      Object.assign(entry, {
        attempt_id: crypto.randomUUID(),
        is_top: input.top,
        grip: input.grip,
        seconds: input.seconds,
        checked_at: null,
        entered_at: now(),
      });
      item.version++;
      value.requests.push(input.request);
      audit(
        value,
        "Finalergebnis eingetragen",
        input.reason,
        input.entry,
        input.station,
      );
    });
  },
};

export function demoFinalClasses(admin: FinalAdmin): LiveData["classes"] {
  return admin.classes
    .filter((item) => item.phase !== "preparation")
    .map((item) => ({
      key: `${item.league}|${item.class_label}`,
      league: item.league,
      class_label: item.class_label,
      phase: item.phase,
      entries: item.entries.map((entry) => ({
        name: entry.name,
        semifinal_rank: entry.semifinal_rank,
        start_position: entry.start_position,
        status: entry.status,
        has_result: !!entry.attempt_id,
        is_top: entry.is_top,
        grip: entry.grip,
        seconds: entry.seconds,
        rank: entry.rank,
      })),
    }));
}
export function demoSemifinalRows(admin: FinalAdmin): CompetitionStanding[] {
  return admin.semifinal.map((row) => ({
    profile_id: row.profile_id,
    name: row.name,
    league: row.league,
    class_label: row.class_label,
    points: row.points,
    rank: row.rank,
    completed_routes: row.completed,
  }));
}
export function demoLiveData(value: Store): LiveData {
  const { admin } = value;
  const settings = admin.display!;
  const classes =
    settings.phase === "final"
      ? demoFinalClasses(admin)
      : [
          ...new Set(
            admin.semifinal.map((row) => `${row.league}|${row.class_label}`),
          ),
        ].map((key) => {
          const rows = admin.semifinal.filter(
            (row) => `${row.league}|${row.class_label}` === key,
          );
          return {
            key,
            league: rows[0].league,
            class_label: rows[0].class_label,
            entries: rows
              .map((row) => ({
                name: row.name,
                points: row.points,
                completed: row.completed,
                rank: row.rank,
              }))
              .sort((a, b) => a.rank - b.rank),
          };
        });
  return {
    season: "2026",
    ...settings,
    semifinal_open: false,
    updated_at: value.changed,
    classes,
    notices: admin.notices,
  };
}

export const demoConfigurationSource: import("@/app/pages/admin/LeagueCompetition").LeagueConfigurationSource = {
  getCompetitionAdmin: demoSource.getCompetitionAdmin,
  correctCompetitionResult: demoSource.correctCompetitionResult,
  setCompetitionPhase: async (season, phase) => { mutate((value) => { if (phase === "open") value.openedAt ??= now(); }); await demoSource.setCompetitionPhase(season, phase); },
  getCompetitionDay: async (season) => { const value=read(), config=(await demoSource.getCompetitionAdmin(season)).config; return { event: { id: "demo-event", season_year: season, phase: value.admin.phase, opened_at: value.openedAt ?? (value.admin.phase === "draft" ? null : "2026-10-03T08:00:00Z"), zone_points: config.zone_points, flash_bonus: 0, submission_deadline_at: value.admin.submission_deadline_at }, eligible: false, league: null, class_label: null, routes: config.routes.map(route=>({...route,id:`semi${route.number}`})), results: [], is_staff: false, is_admin: true }; },
  listAdminSemifinalRegistrations: async (season) => read().admin.semifinal.map(row=>({ id: row.profile_id, profile_id: row.profile_id, season_year: season, registration_status: "registered", created_at: now(), profiles: { id: row.profile_id, first_name: row.name, last_name: null, email: null, role: "participant", archived_at: null, participation_activated_at: now() }, approved_league: row.league, approved_class_label: row.class_label, eligibility_status: "eligible" })),
  getCompetitionJudgeAccessStatus: async () => read().semifinalJudgeConfigured ?? true,
  setCompetitionJudgePassword: async () => { mutate(value=>{ value.semifinalJudgeConfigured=true; }); },
  saveCompetitionConfig: async (_season, config) => { mutate(value=> { if(value.admin.phase !== "draft" || value.openedAt) throw Error("Zuordnung bereits gesperrt."); value.semifinalConfig=structuredClone(config); }); },
  saveCompetitionRouteDraft: async (_season, routes) => { mutate(value=> { if(value.admin.phase !== "draft" || value.openedAt) throw Error("Zuordnung bereits gesperrt."); value.semifinalConfig={routes:structuredClone(routes),assignments:[],zone_points:Array.from({length:11},(_,i)=>i*10),flash_bonus:0}; }); },
  getCertificatePublication: async () => ({published_at:null,revision:null,certificate_count:0,needs_refresh:false}),
  publishFinaleCertificates: async () => { throw Error("Urkundenfreigabe nur im echten Adminbereich."); },
};
export function prepareCompetitionDemo() {
  const value = seed();
  value.admin.phase = "draft";
  value.openedAt = null;
  value.admin.classes = [];
  value.admin.routes = [];
  value.admin.final_password_set = false;
  value.admin.semifinal_results = [];
  value.admin.semifinal = value.admin.semifinal.map((row) => ({
    ...row,
    points: 0,
    completed: 0,
    rank: 1,
    missing: Array.from({ length: 5 }, (_, index) => ({
      route_id: `semi${index + 1}`,
      number: index + 1,
      settled: false,
    })),
  }));
  if (value.admin.display) value.admin.display.phase = "semifinal";
  write(value);
}
