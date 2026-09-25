export const JUDGE_ACCESS_STORAGE_KEY = "kletterliga:judge-access:v1";
export const JUDGE_ACCESS_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type SavedJudgeAccess = { season: string; code: string; expiresAt: number };

export function clearJudgeAccess(storage: Storage): void {
  try { storage.removeItem(JUDGE_ACCESS_STORAGE_KEY); }
  catch { /* Private browsing can block storage. */ }
}

export function readJudgeAccess(storage: Storage, season: string, now = Date.now()): string | null {
  try {
    const raw = storage.getItem(JUDGE_ACCESS_STORAGE_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object") { clearJudgeAccess(storage); return null; }
    const candidate = saved as Partial<SavedJudgeAccess>;
    if (candidate.season !== season || !/^[A-Za-z0-9]{24}$/.test(candidate.code ?? "") ||
      typeof candidate.expiresAt !== "number" || !Number.isFinite(candidate.expiresAt) ||
      candidate.expiresAt <= now || candidate.expiresAt > now + JUDGE_ACCESS_MAX_AGE_MS) {
      clearJudgeAccess(storage);
      return null;
    }
    return candidate.code;
  } catch {
    clearJudgeAccess(storage);
    return null;
  }
}

export function saveJudgeAccess(storage: Storage, season: string, code: string, now = Date.now()): boolean {
  if (!/^[A-Za-z0-9]{24}$/.test(code)) return false;
  try {
    storage.setItem(JUDGE_ACCESS_STORAGE_KEY, JSON.stringify({ season, code, expiresAt: now + JUDGE_ACCESS_MAX_AGE_MS } satisfies SavedJudgeAccess));
    return true;
  } catch { return false; }
}
