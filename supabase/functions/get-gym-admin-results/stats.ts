export type GymAdminRouteInput = {
  id: string;
  gym_id: string;
};

export type GymAdminParticipantInput = {
  id: string;
  role: string | null;
  archived_at: string | null;
};

export type GymAdminResultInput = {
  id: string;
  profile_id: string;
  route_id: string;
  points: number;
  flash: boolean;
  status: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string | null;
};

export type GymAdminResult = {
  route_id: string;
  points: number;
  flash: boolean;
  status: string | null;
  rating: number | null;
  submitted_on: string;
  edited: boolean;
};

export type GymAdminRouteStats = {
  route_id: string;
  result_count: number;
  flash_count: number;
  average_score: number | null;
};

export type GymAdminDailyResults = {
  date: string;
  count: number;
};

export type GymAdminResultsPayload = {
  gym_id: string;
  result_count: number;
  participant_count: number;
  flash_count: number;
  average_score: number | null;
  route_stats: GymAdminRouteStats[];
  daily_results: GymAdminDailyResults[];
  results: GymAdminResult[];
  next_cursor: string | null;
};

type MutableRouteStats = {
  resultCount: number;
  flashCount: number;
  scoreTotal: number;
};

export class InvalidGymAdminResultsCursorError extends Error {
  constructor() {
    super("Die Ergebnisliste hat sich geändert. Bitte lade die Seite neu.");
    this.name = "InvalidGymAdminResultsCursorError";
  }
}

const scoreResult = (result: GymAdminResultInput) =>
  (Number.isFinite(result.points) ? result.points : 0) + (result.flash ? 1 : 0);

type ResultCursorKey = {
  created_at: string;
  result_id: string;
};

type GymAdminResultsCursor = {
  version: 1;
  gym_id: string;
  subject: string;
  expires_at: number;
  snapshot_digest: string;
  snapshot: ResultCursorKey;
  after: ResultCursorKey;
};

const CURSOR_VERSION = "v1";
const CURSOR_TTL_MS = 60 * 60 * 1000;
const CURSOR_CRYPTO_CONTEXT = "get-gym-admin-results-cursor:v1";

const parseTimestamp = (value: string | null | undefined) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const compareResultOrder = (left: GymAdminResultInput, right: GymAdminResultInput) => {
  const createdDifference = parseTimestamp(right.created_at) - parseTimestamp(left.created_at);
  if (createdDifference !== 0) return createdDifference;

  return left.id.localeCompare(right.id);
};

const cursorKeyMatchesResult = (key: ResultCursorKey, result: GymAdminResultInput) =>
  key.result_id === result.id && key.created_at === result.created_at;

const encodeBase64Url = (bytes: Uint8Array) => {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const toCursorKey = (result: GymAdminResultInput): ResultCursorKey => ({
  created_at: result.created_at,
  result_id: result.id,
});

const getSnapshotDigest = async (results: GymAdminResultInput[]) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(results.map(toCursorKey))),
  );
  return encodeBase64Url(new Uint8Array(digest));
};

const deriveCursorEncryptionKey = async (keyMaterial: string) => {
  const encoder = new TextEncoder();
  const sourceKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyMaterial),
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(CURSOR_CRYPTO_CONTEXT),
      info: encoder.encode("AES-GCM-256"),
    },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const getCursorAdditionalData = (gymId: string, subject: string) =>
  new TextEncoder().encode(`${CURSOR_CRYPTO_CONTEXT}\0${gymId}\0${subject}`);

const encodeCursor = async ({
  snapshot,
  after,
  gymId,
  subject,
  keyMaterial,
  snapshotDigest,
  now,
}: {
  snapshot: GymAdminResultInput;
  after: GymAdminResultInput;
  gymId: string;
  subject: string;
  keyMaterial: string;
  snapshotDigest: string;
  now: Date;
}) => {
  const cursor: GymAdminResultsCursor = {
    version: 1,
    gym_id: gymId,
    subject,
    expires_at: now.getTime() + CURSOR_TTL_MS,
    snapshot_digest: snapshotDigest,
    snapshot: toCursorKey(snapshot),
    after: toCursorKey(after),
  };
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: initializationVector,
      additionalData: getCursorAdditionalData(gymId, subject),
    },
    await deriveCursorEncryptionKey(keyMaterial),
    new TextEncoder().encode(JSON.stringify(cursor)),
  );

  return `${CURSOR_VERSION}.${encodeBase64Url(initializationVector)}.${encodeBase64Url(
    new Uint8Array(encrypted),
  )}`;
};

const isCursorKey = (value: unknown): value is ResultCursorKey => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ResultCursorKey>;
  return (
    typeof candidate.created_at === "string" &&
    Number.isFinite(Date.parse(candidate.created_at)) &&
    typeof candidate.result_id === "string" &&
    candidate.result_id.length >= 1 &&
    candidate.result_id.length <= 200
  );
};

const decodeCursor = async ({
  cursor,
  gymId,
  subject,
  keyMaterial,
  now,
}: {
  cursor: string;
  gymId: string;
  subject: string;
  keyMaterial: string;
  now: Date;
}): Promise<GymAdminResultsCursor> => {
  if (cursor.length > 1024 || !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cursor)) {
    throw new InvalidGymAdminResultsCursorError();
  }

  try {
    const [, encodedInitializationVector, encodedCiphertext] = cursor.split(".");
    const initializationVector = decodeBase64Url(encodedInitializationVector);
    if (initializationVector.length !== 12) throw new InvalidGymAdminResultsCursorError();

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: initializationVector,
        additionalData: getCursorAdditionalData(gymId, subject),
      },
      await deriveCursorEncryptionKey(keyMaterial),
      decodeBase64Url(encodedCiphertext),
    );
    const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as Partial<GymAdminResultsCursor>;
    if (
      parsed.version !== 1 ||
      parsed.gym_id !== gymId ||
      parsed.subject !== subject ||
      typeof parsed.expires_at !== "number" ||
      !Number.isSafeInteger(parsed.expires_at) ||
      parsed.expires_at < now.getTime() ||
      typeof parsed.snapshot_digest !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(parsed.snapshot_digest) ||
      !isCursorKey(parsed.snapshot) ||
      !isCursorKey(parsed.after)
    ) {
      throw new InvalidGymAdminResultsCursorError();
    }

    return parsed as GymAdminResultsCursor;
  } catch (error) {
    if (error instanceof InvalidGymAdminResultsCursorError) throw error;
    throw new InvalidGymAdminResultsCursorError();
  }
};

const toUtcDateKey = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
};

const buildLastThirtyUtcDates = (now: Date) => {
  const endOfRange = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return Array.from({ length: 30 }, (_, index) => {
    const daysBeforeToday = 29 - index;
    return new Date(endOfRange - daysBeforeToday * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  });
};

const sanitizeResult = (result: GymAdminResultInput): GymAdminResult => ({
  route_id: result.route_id,
  points: result.points,
  flash: result.flash,
  status: result.status,
  rating: result.rating,
  submitted_on: toUtcDateKey(result.created_at) ?? "1970-01-01",
  edited: Boolean(result.updated_at && result.updated_at !== result.created_at),
});

export const buildGymAdminResults = async ({
  gymId,
  cursorSubject,
  cursorEncryptionKeyMaterial,
  routes,
  participants,
  results,
  pageSize = 100,
  cursor = null,
  now = new Date(),
}: {
  gymId: string;
  cursorSubject: string;
  cursorEncryptionKeyMaterial: string;
  routes: GymAdminRouteInput[];
  participants: GymAdminParticipantInput[];
  results: GymAdminResultInput[];
  pageSize?: number;
  cursor?: string | null;
  now?: Date;
}): Promise<GymAdminResultsPayload> => {
  const normalizedPageSize = Math.min(Math.max(Math.trunc(pageSize), 1), 100);
  const hallRouteIds = new Set(
    routes.filter((route) => route.gym_id === gymId).map((route) => route.id),
  );
  const activeParticipantIds = new Set(
    participants
      .filter((profile) => profile.role === "participant" && !profile.archived_at)
      .map((profile) => profile.id),
  );

  const filteredResults = results
    .filter(
      (result) =>
        hallRouteIds.has(result.route_id) && activeParticipantIds.has(result.profile_id),
    )
    .sort(compareResultOrder);

  const routeStats = new Map<string, MutableRouteStats>();
  hallRouteIds.forEach((routeId) => {
    routeStats.set(routeId, { resultCount: 0, flashCount: 0, scoreTotal: 0 });
  });

  const distinctParticipantIds = new Set<string>();
  let flashCount = 0;
  let scoreTotal = 0;

  filteredResults.forEach((result) => {
    distinctParticipantIds.add(result.profile_id);
    if (result.flash) flashCount += 1;

    const score = scoreResult(result);
    scoreTotal += score;

    const stats = routeStats.get(result.route_id);
    if (!stats) return;
    stats.resultCount += 1;
    stats.scoreTotal += score;
    if (result.flash) stats.flashCount += 1;
  });

  const dailyCounts = new Map(buildLastThirtyUtcDates(now).map((date) => [date, 0]));
  filteredResults.forEach((result) => {
    const date = toUtcDateKey(result.created_at);
    if (date && dailyCounts.has(date)) {
      dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
    }
  });

  let pageStart = 0;
  let snapshotResult = filteredResults[0] ?? null;
  let snapshotResults = filteredResults;
  let snapshotDigest = await getSnapshotDigest(snapshotResults);
  if (cursor) {
    const decodedCursor = await decodeCursor({
      cursor,
      gymId,
      subject: cursorSubject,
      keyMaterial: cursorEncryptionKeyMaterial,
      now,
    });
    snapshotResult = filteredResults.find((result) =>
      cursorKeyMatchesResult(decodedCursor.snapshot, result),
    ) ?? null;
    const afterResult = filteredResults.find((result) =>
      cursorKeyMatchesResult(decodedCursor.after, result),
    );
    if (!snapshotResult || !afterResult) {
      throw new InvalidGymAdminResultsCursorError();
    }

    snapshotResults = filteredResults.filter(
      (result) => compareResultOrder(result, snapshotResult as GymAdminResultInput) >= 0,
    );
    snapshotDigest = await getSnapshotDigest(snapshotResults);
    if (snapshotDigest !== decodedCursor.snapshot_digest) {
      throw new InvalidGymAdminResultsCursorError();
    }
    const afterIndex = snapshotResults.findIndex((result) => result.id === afterResult.id);
    if (afterIndex < 0) throw new InvalidGymAdminResultsCursorError();
    pageStart = afterIndex + 1;
  }

  const page = snapshotResults.slice(pageStart, pageStart + normalizedPageSize);
  const hasNextPage = pageStart + page.length < snapshotResults.length;
  const nextCursor =
    hasNextPage && page.length > 0 && snapshotResult
      ? await encodeCursor({
          snapshot: snapshotResult,
          after: page[page.length - 1],
          gymId,
          subject: cursorSubject,
          keyMaterial: cursorEncryptionKeyMaterial,
          snapshotDigest,
          now,
        })
      : null;

  return {
    gym_id: gymId,
    result_count: filteredResults.length,
    participant_count: distinctParticipantIds.size,
    flash_count: flashCount,
    average_score: filteredResults.length > 0 ? scoreTotal / filteredResults.length : null,
    route_stats: Array.from(routeStats.entries())
      .map<GymAdminRouteStats>(([routeId, stats]) => ({
        route_id: routeId,
        result_count: stats.resultCount,
        flash_count: stats.flashCount,
        average_score: stats.resultCount > 0 ? stats.scoreTotal / stats.resultCount : null,
      }))
      .sort((left, right) => left.route_id.localeCompare(right.route_id)),
    daily_results: Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count })),
    results: page.map(sanitizeResult),
    next_cursor: nextCursor,
  };
};
