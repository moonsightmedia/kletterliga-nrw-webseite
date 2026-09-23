export const COMPETITION_TIMER_DURATION_MS = 5 * 60 * 1000;
export const COMPETITION_TIMER_WARNING_MS = 4 * 60 * 1000;

export interface CompetitionTimer {
  routeId: string;
  elapsedMs: number;
  startedAt: number | null;
}

export type CompetitionTimerStatus = "ready" | "running" | "last-minute" | "finished";

const clampElapsed = (elapsedMs: number) =>
  Math.min(COMPETITION_TIMER_DURATION_MS, Math.max(0, elapsedMs));

export const getCompetitionTimerElapsed = (timer: CompetitionTimer, now: number) =>
  clampElapsed(timer.elapsedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt)));

export const getCompetitionTimerStatus = (timer: CompetitionTimer, now: number): CompetitionTimerStatus => {
  const elapsed = getCompetitionTimerElapsed(timer, now);
  if (elapsed >= COMPETITION_TIMER_DURATION_MS) return "finished";
  if (timer.startedAt !== null && elapsed >= COMPETITION_TIMER_WARNING_MS) return "last-minute";
  return timer.startedAt === null && elapsed > 0 ? "ready" : timer.startedAt === null ? "ready" : "running";
};
export const startCompetitionTimer = (timer: CompetitionTimer, now: number): CompetitionTimer => {
  if (timer.startedAt !== null || getCompetitionTimerElapsed(timer, now) >= COMPETITION_TIMER_DURATION_MS) return timer;
  return { ...timer, startedAt: now };
};

export const stopCompetitionTimer = (timer: CompetitionTimer, now: number): CompetitionTimer => {
  if (timer.startedAt === null) return timer;
  return { routeId: timer.routeId, elapsedMs: getCompetitionTimerElapsed(timer, now), startedAt: null };
};

export const resetCompetitionTimer = (routeId: string): CompetitionTimer => ({ routeId, elapsedMs: 0, startedAt: null });

export const formatCompetitionTimer = (elapsedMs: number) => {
  const seconds = Math.ceil(clampElapsed(elapsedMs) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export const getCompetitionTimerStorageKey = (profileId: string, season: string) =>
  `kletterliga:competition-timers:${encodeURIComponent(profileId)}:${encodeURIComponent(season)}`;

const isTimer = (value: unknown): value is CompetitionTimer => {
  if (!value || typeof value !== "object") return false;
  const timer = value as Partial<CompetitionTimer>;
  return typeof timer.routeId === "string" && timer.routeId.length > 0 &&
    typeof timer.elapsedMs === "number" && Number.isFinite(timer.elapsedMs) && timer.elapsedMs >= 0 &&
    (timer.startedAt === null || (typeof timer.startedAt === "number" && Number.isFinite(timer.startedAt)));
};

export const readCompetitionTimers = (
  storage: Pick<Storage, "getItem">,
  profileId: string,
  season: string,
): Record<string, CompetitionTimer> => {
  try {
    const raw = storage.getItem(getCompetitionTimerStorageKey(profileId, season));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, CompetitionTimer] =>
      isTimer(entry[1]) && entry[0] === (entry[1] as CompetitionTimer).routeId,
    ));
  } catch {
    return {};
  }
};

export const writeCompetitionTimers = (
  storage: Pick<Storage, "setItem">,
  profileId: string,
  season: string,
  timers: Record<string, CompetitionTimer>,
) => {
  try {
    storage.setItem(getCompetitionTimerStorageKey(profileId, season), JSON.stringify(timers));
    return true;
  } catch {
    return false;
  }
};
