import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const fallbackSupabaseUrl = "https://example.invalid";
const fallbackSupabaseAnonKey = "sb_publishable_placeholder";

export const supabaseConfig = {
  url: supabaseUrl ?? fallbackSupabaseUrl,
  anonKey: supabaseAnonKey ?? fallbackSupabaseAnonKey,
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseAuthStorageKey = `sb-${new URL(supabaseConfig.url).hostname.split(".")[0]}-auth-token`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const isLikelyJwt = (value: unknown): value is string =>
  typeof value === "string" && value.split(".").length === 3 && value.split(".").every(Boolean);

const parseStoredSession = (value: string | null): { access_token?: unknown } | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as { access_token?: unknown })
      : null;
  } catch {
    return null;
  }
};

export const shouldDiscardStoredSupabaseSession = (value: string | null) => {
  if (!value) return false;

  const parsed = parseStoredSession(value);
  if (!parsed) return true;

  return !isLikelyJwt(parsed.access_token);
};

const getBrowserStorage = (): StorageLike | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const createSafeSupabaseStorage = (storageKey: string): StorageLike | undefined => {
  const storage = getBrowserStorage();
  if (!storage) return undefined;

  const purgeSession = () => {
    storage.removeItem(storageKey);
    storage.removeItem(`${storageKey}-user`);
    storage.removeItem(`${storageKey}-code-verifier`);
  };

  return {
    getItem(key) {
      const value = storage.getItem(key);
      if (key !== storageKey || !shouldDiscardStoredSupabaseSession(value)) {
        return value;
      }

      purgeSession();
      // eslint-disable-next-line no-console
      console.warn("Discarded malformed Supabase session from browser storage");
      return null;
    },
    setItem(key, value) {
      storage.setItem(key, value);
    },
    removeItem(key) {
      storage.removeItem(key);
    },
  };
};

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: {
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
    storage: createSafeSupabaseStorage(supabaseAuthStorageKey),
  },
});
