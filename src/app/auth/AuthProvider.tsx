import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, supabaseConfig } from "@/services/supabase";
import { fetchProfile, upsertProfile } from "@/services/appApi";
import type { Profile, UserRole } from "@/services/appTypes";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    gender: "m" | "w" | null;
    homeGymId: string | null;
    league: "toprope" | "lead" | null;
  }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T | null> => {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
    const result = await Promise.race([promise, timeout]);
    if (result === null) {
      // eslint-disable-next-line no-console
      console.warn(`${label} timeout after ${ms}ms`);
      return null;
    }
    return result as T;
  };

  const loadProfile = useCallback(async (userId: string, email?: string | null) => {
    try {
      const profileResult = await withTimeout(fetchProfile(userId), 4000, "Profile fetch");
      if (profileResult && !profileResult.error && profileResult.data) {
        setProfile(profileResult.data);
        return;
      }

      // Create a minimal profile if missing
      const upsertResult = await withTimeout(
        upsertProfile({
          id: userId,
          email: email ?? null,
          role: "participant",
        }),
        4000,
        "Profile upsert",
      );
      if (upsertResult && upsertResult.data) {
        setProfile(upsertResult.data);
        return;
      }

      const fresh = await withTimeout(fetchProfile(userId), 4000, "Profile refetch");
      setProfile(fresh?.data ?? null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Profile load failed", error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured) {
        // eslint-disable-next-line no-console
        console.warn("Supabase env vars missing. Check VITE_SUPABASE_URL/ANON_KEY.");
        setLoading(false);
        return;
      }
      try {
        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 4000);
        });
        const sessionResult = await Promise.race([supabase.auth.getSession(), timeout]);
        if (!mounted) return;

        const session = sessionResult && "data" in sessionResult ? sessionResult.data.session : null;
        setSession(session ?? null);
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          // Warte auf Profil-Laden, bevor loading auf false gesetzt wird
          await loadProfile(sessionUser.id, sessionUser.email);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Auth init failed", error);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void loadProfile(nextUser.id, nextUser.email);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Supabase nicht konfiguriert. Prüfe VITE_SUPABASE_URL/ANON_KEY." };
    }
    try {
      const timeout = new Promise<{ error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ error: { message: "Login timeout. Prüfe Supabase URL/Key." } }), 5000);
      });
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);
      if ("error" in result && result.error?.message === "Login timeout. Prüfe Supabase URL/Key.") {
        // eslint-disable-next-line no-console
        console.warn("Login timeout", { url: supabaseConfig.url, anonKeySet: Boolean(supabaseConfig.anonKey) });
      }
      const error = "error" in result ? result.error : null;
      if (error) return { error: error.message };

      if ("data" in result && result.data?.session) {
        setSession(result.data.session);
        setUser(result.data.session.user ?? null);
        if (result.data.session.user) {
          void loadProfile(result.data.session.user.id, result.data.session.user.email);
        }
      }
      return {};
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Sign in failed", error);
      return { error: "Login fehlgeschlagen. Bitte erneut versuchen." };
    }
  };

  const signUp = async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    gender: "m" | "w" | null;
    homeGymId: string | null;
    league: "toprope" | "lead" | null;
  }) => {
    const { email, password, firstName, lastName, birthDate, gender, homeGymId, league } = payload;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          gender,
          home_gym_id: homeGymId,
          league,
        },
      },
    });
    if (error) return { error: error.message };

    if (data.user) {
      await upsertProfile({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender,
        home_gym_id: homeGymId,
        league,
        role: "participant",
      });
      await loadProfile(data.user.id, email);
    }
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user.id);
  };

  // Priorisiere user_metadata.role über profile.role, da user_metadata die autoritative Quelle ist
  // (wird beim User-Erstellen gesetzt und kann nicht einfach so geändert werden)
  const role =
    (user?.user_metadata?.role as UserRole | undefined) ??
    profile?.role ??
    (user ? "participant" : "guest");

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
