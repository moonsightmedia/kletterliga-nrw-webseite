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
      // Verwende try-catch, um 409 Fehler abzufangen (Race Conditions)
      try {
        const upsertResult = await withTimeout(
          upsertProfile({
            id: userId,
            email: email ?? null,
            role: "participant",
          }),
          4000,
          "Profile upsert",
        );
        
        // Wenn das Profil erfolgreich erstellt wurde
        if (upsertResult && upsertResult.data) {
          setProfile(upsertResult.data);
          return;
        }

        // Wenn es einen Fehler gab, prüfe ob es ein Conflict-Fehler ist (409)
        // Das bedeutet, dass das Profil bereits existiert (z.B. durch Race Condition)
        if (upsertResult?.error) {
          const errorMsg = upsertResult.error.message?.toLowerCase() || "";
          const statusCode = upsertResult.error.status || upsertResult.error.code;
          
          // 409 Conflict bedeutet, dass das Profil bereits existiert
          // In diesem Fall versuchen wir es nochmal zu laden
          if (statusCode === 409 || statusCode === '409' || 
              errorMsg.includes('conflict') || 
              errorMsg.includes('already exists') ||
              errorMsg.includes('duplicate') ||
              errorMsg.includes('unique constraint')) {
            // Profil existiert bereits, versuche es nochmal zu laden
            const fresh = await withTimeout(fetchProfile(userId), 4000, "Profile refetch after conflict");
            if (fresh && !fresh.error && fresh.data) {
              setProfile(fresh.data);
              return;
            }
          }
        }
      } catch (error: any) {
        // Ignoriere 409 Conflict Fehler (Race Conditions sind normal)
        const errorMsg = error?.message?.toLowerCase() || "";
        const statusCode = error?.status || error?.code || error?.statusCode;
        
        if (statusCode === 409 || statusCode === '409' || errorMsg.includes('conflict')) {
          // Profil existiert bereits - versuche es zu laden
          const fresh = await withTimeout(fetchProfile(userId), 4000, "Profile refetch after conflict");
          if (fresh && !fresh.error && fresh.data) {
            setProfile(fresh.data);
            return;
          }
        } else {
          // Andere Fehler loggen
          // eslint-disable-next-line no-console
          console.warn("Profile upsert error:", error);
        }
      }

      // Finaler Versuch, das Profil zu laden
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

  // Übersetze Supabase-Fehlermeldungen ins Deutsche
  const translateAuthError = (errorMessage: string): string => {
    const errorLower = errorMessage.toLowerCase();
    
    // Login-Fehler
    if (errorLower.includes("invalid login credentials") || 
        errorLower.includes("invalid credentials") ||
        errorLower.includes("email not confirmed")) {
      return "Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail-Adresse und dein Passwort.";
    }
    
    if (errorLower.includes("email not confirmed")) {
      return "Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte prüfe dein Postfach.";
    }
    
    if (errorLower.includes("user not found")) {
      return "Kein Account mit dieser E-Mail-Adresse gefunden.";
    }
    
    if (errorLower.includes("wrong password") || errorLower.includes("incorrect password")) {
      return "Falsches Passwort. Bitte versuche es erneut.";
    }
    
    // Registrierungs-Fehler
    if (errorLower.includes("user already registered") || 
        errorLower.includes("already registered") ||
        errorLower.includes("email already exists") ||
        errorLower.includes("user already exists")) {
      return "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder verwende eine andere E-Mail-Adresse.";
    }
    
    if (errorLower.includes("password")) {
      if (errorLower.includes("too short") || errorLower.includes("minimum")) {
        return "Das Passwort ist zu kurz. Es muss mindestens 6 Zeichen lang sein.";
      }
      if (errorLower.includes("weak") || errorLower.includes("strength")) {
        return "Das Passwort ist zu schwach. Bitte wähle ein stärkeres Passwort.";
      }
    }
    
    // E-Mail-Fehler
    if (errorLower.includes("invalid email") || errorLower.includes("email format")) {
      return "Ungültige E-Mail-Adresse. Bitte überprüfe die Eingabe.";
    }
    
    // Token-Fehler
    if (errorLower.includes("token") || errorLower.includes("expired") || errorLower.includes("invalid")) {
      if (errorLower.includes("expired")) {
        return "Der Link ist abgelaufen. Bitte fordere einen neuen Link an.";
      }
      return "Ungültiger Link. Bitte fordere einen neuen Link an.";
    }
    
    // Netzwerk-Fehler
    if (errorLower.includes("network") || errorLower.includes("fetch") || errorLower.includes("connection")) {
      return "Verbindungsfehler. Bitte überprüfe deine Internetverbindung und versuche es erneut.";
    }
    
    // Rate Limiting
    if (errorLower.includes("too many requests") || errorLower.includes("rate limit")) {
      return "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.";
    }
    
    // Generische Fehlermeldung für unbekannte Fehler
    return "Ein Fehler ist aufgetreten. Bitte versuche es erneut.";
  };

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
      if (error) {
        const translatedError = translateAuthError(error.message);
        return { error: translatedError };
      }

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
    // Bestimme die Frontend-URL für redirectTo nach E-Mail-Bestätigung
    const frontendUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://kletterliga-nrw.de';
    const confirmUrl = `${frontendUrl}/app/auth/confirm`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: confirmUrl,
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
    
    if (error) {
      const translatedError = translateAuthError(error.message);
      return { error: translatedError };
    }

    // WICHTIG: Supabase gibt KEINEN Fehler zurück, wenn die E-Mail bereits existiert
    // (aus Sicherheitsgründen - um nicht zu verraten, welche E-Mails registriert sind).
    // Stattdessen gibt es einen "erfolgreichen" Response zurück, sendet aber KEINE E-Mail.
    // 
    // Wir müssen prüfen, ob wirklich ein NEUER User erstellt wurde:
    // - Wenn die E-Mail bereits existiert, gibt Supabase den bestehenden User zurück
    // - Der bestehende User hat ein älteres `created_at` Datum
    // - Wir prüfen, ob der User gerade erst erstellt wurde (< 2 Sekunden alt)
    
    if (!data.user) {
      // Kein User zurückgegeben - sollte eigentlich nicht passieren, aber sicherheitshalber prüfen
      return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
    }

    // Prüfe, ob der User wirklich neu erstellt wurde
    const userCreatedAt = data.user.created_at ? new Date(data.user.created_at).getTime() : 0;
    const now = Date.now();
    const userAge = now - userCreatedAt;
    const isNewUser = userAge < 2000; // Weniger als 2 Sekunden alt = neuer User
    
    // Wenn der User nicht neu ist (älter als 2 Sekunden), existiert er bereits
    if (!isNewUser) {
      return { error: "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder verwende eine andere E-Mail-Adresse." };
    }

    // Wenn der User bereits bestätigt ist UND nicht gerade erst erstellt wurde, existiert er bereits
    // (Dies ist ein zusätzlicher Check für den Fall, dass der User sehr schnell bestätigt wurde)
    if (data.user.email_confirmed_at && userAge > 1000) {
      return { error: "Diese E-Mail-Adresse ist bereits registriert und bestätigt. Bitte melde dich an." };
    }

    // Versuche, das Profil zu erstellen
    const profileResult = await upsertProfile({
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

    // Wenn das Profil erfolgreich erstellt wurde, lade es
    if (profileResult.data) {
      setProfile(profileResult.data);
      await loadProfile(data.user.id, email);
      return {};
    }

    // Wenn es einen Fehler gab, prüfe die Art des Fehlers
    if (profileResult.error) {
      const errorMsg = profileResult.error.message?.toLowerCase() || "";
      const statusCode = profileResult.error.status || profileResult.error.code;
      
      // 409 Conflict bedeutet, dass das Profil bereits existiert (Race Condition)
      // Das ist OK - das Profil wurde wahrscheinlich bereits erstellt
      if (statusCode === 409 || statusCode === '409' || 
          errorMsg.includes('conflict') ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("bereits vorhanden") ||
          errorMsg.includes("duplicate") ||
          errorMsg.includes("unique") ||
          errorMsg.includes("violates unique constraint")) {
        // Profil existiert bereits - versuche es zu laden
        await loadProfile(data.user.id, email);
        return {};
      }
      
      // Andere Fehler beim Profil-Erstellen
      console.warn("Profil-Erstellung fehlgeschlagen:", profileResult.error);
    }

    // Finaler Versuch, das Profil zu laden
    await loadProfile(data.user.id, email);
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
