import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, supabaseConfig } from "@/services/supabase";
import { fetchProfile, upsertProfile } from "@/services/appApi";
import type { Profile, UserRole } from "@/services/appTypes";
import { trackAuthEvent } from "@/services/authTelemetry";
import { ensureLaunchSettingsLoaded, formatAccountCreationOpenDate, isBeforeAccountCreationOpen } from "@/config/launch";
import { markArchivedAccountNotice } from "@/app/auth/archivedAccountNotice";

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
  resetPassword: (email: string) => Promise<{ error?: string }>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "");

const isObfuscatedExistingUserResponse = (data: {
  user?: { identities?: unknown[] | null } | null;
  session?: Session | null;
} | null | undefined) =>
  Boolean(data?.user) &&
  Array.isArray(data.user?.identities) &&
  data.user.identities.length === 0 &&
  !data.session;

const AUTH_EMAIL_DELIVERY_ERROR =
  "Unser E-Mail-Versand ist gerade gestört. Bitte versuche es in ein paar Minuten erneut oder melde dich unter info@kletterliga-nrw.de.";

const isLikelyEmailDeliveryFailure = (errorMessage: string) => {
  const errorLower = errorMessage.toLowerCase();
  return (
    errorLower.includes("unexpected_failure") ||
    errorLower.includes("error sending") ||
    errorLower.includes("confirmation email") ||
    errorLower.includes("recovery email") ||
    errorLower.includes("magic link email")
  );
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const buildProfileSeed = useCallback((user: User, email?: string | null) => {
    const metadata = user.user_metadata ?? {};
    return {
      id: user.id,
      email: email ?? user.email ?? null,
      first_name: typeof metadata.first_name === "string" ? metadata.first_name : null,
      last_name: typeof metadata.last_name === "string" ? metadata.last_name : null,
      birth_date: typeof metadata.birth_date === "string" ? metadata.birth_date : null,
      gender: metadata.gender === "m" || metadata.gender === "w" ? metadata.gender : null,
      home_gym_id: typeof metadata.home_gym_id === "string" ? metadata.home_gym_id : null,
      league: metadata.league === "toprope" || metadata.league === "lead" ? metadata.league : null,
    } satisfies Partial<Profile> & { id: string };
  }, []);

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

  const handleArchivedProfile = useCallback(async (archivedProfile: Profile) => {
    markArchivedAccountNotice();
    setProfile(null);
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Archived account sign-out failed", error);
    }
    return { profile: archivedProfile, archived: true as const };
  }, []);

  const loadProfile = useCallback(async (user: User, email?: string | null) => {
    try {
      const profileSeed = buildProfileSeed(user, email);
      const profileResult = await withTimeout(fetchProfile(user.id), 4000, "Profile fetch");
      if (profileResult && !profileResult.error && profileResult.data) {
        const fetchedProfile = profileResult.data;
        if (fetchedProfile.archived_at) {
          return handleArchivedProfile(fetchedProfile);
        }
        const missingSeedPatch: Partial<Profile> & { id: string } = { id: fetchedProfile.id };

        if (!fetchedProfile.email && profileSeed.email) missingSeedPatch.email = profileSeed.email;
        if (!fetchedProfile.first_name && profileSeed.first_name) missingSeedPatch.first_name = profileSeed.first_name;
        if (!fetchedProfile.last_name && profileSeed.last_name) missingSeedPatch.last_name = profileSeed.last_name;
        if (!fetchedProfile.birth_date && profileSeed.birth_date) missingSeedPatch.birth_date = profileSeed.birth_date;
        if (!fetchedProfile.gender && profileSeed.gender) missingSeedPatch.gender = profileSeed.gender;
        if (!fetchedProfile.home_gym_id && profileSeed.home_gym_id) missingSeedPatch.home_gym_id = profileSeed.home_gym_id;
        if (!fetchedProfile.league && profileSeed.league) missingSeedPatch.league = profileSeed.league;

        if (Object.keys(missingSeedPatch).length > 1) {
          const syncedProfile = await withTimeout(
            upsertProfile(missingSeedPatch),
            4000,
            "Profile metadata sync",
          );
          if (syncedProfile && !syncedProfile.error && syncedProfile.data) {
            setProfile(syncedProfile.data);
            return { profile: syncedProfile.data, archived: false as const };
          }
        }

        setProfile(fetchedProfile);
        return { profile: fetchedProfile, archived: false as const };
      }

      // Create the profile from auth metadata once a real session exists.
      const upsertResult = await withTimeout(
        upsertProfile(profileSeed),
        4000,
        "Profile upsert",
      );
      if (upsertResult && upsertResult.data) {
        setProfile(upsertResult.data);
        return { profile: upsertResult.data, archived: false as const };
      }

      const fresh = await withTimeout(fetchProfile(user.id), 4000, "Profile refetch");
      const freshProfile = fresh?.data ?? null;
      if (freshProfile?.archived_at) {
        return handleArchivedProfile(freshProfile);
      }
      setProfile(freshProfile);
      return { profile: freshProfile, archived: false as const };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Profile load failed", error);
      setProfile(null);
      return { profile: null, archived: false as const };
    }
  }, [buildProfileSeed, handleArchivedProfile]);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    const init = async () => {
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
          await loadProfile(sessionUser, sessionUser.email);
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

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void (async () => {
        if (!mounted) return;

        const shouldGateAccess = event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED";
        if (shouldGateAccess) {
          setLoading(true);
        }
        setSession(nextSession);
        const nextUser = nextSession?.user ?? null;
        setUser(nextUser);

        try {
          if (nextUser) {
            await loadProfile(nextUser, nextUser.email);
          } else {
            setProfile(null);
          }
        } finally {
          if (mounted && shouldGateAccess) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  async function withSingleRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      const msg = getErrorMessage(error).toLowerCase();
      const looksTransient =
        msg.includes("network") ||
        msg.includes("fetch") ||
        msg.includes("timeout") ||
        msg.includes("connection");
      if (!looksTransient) throw error;
      await new Promise((resolve) => setTimeout(resolve, 450));
      return await operation();
    }
  }

  // Übersetze Supabase-Fehlermeldungen ins Deutsche
  const translateAuthError = (errorMessage: string): string => {
    const errorLower = errorMessage.toLowerCase();
    
    // Login-Fehler
    if (errorLower.includes("email not confirmed")) {
      return "Deine E-Mail-Adresse wurde noch nicht bestätigt. Bitte prüfe dein Postfach oder fordere einen neuen Bestätigungslink an.";
    }

    if (errorLower.includes("invalid login credentials") || 
        errorLower.includes("invalid credentials")) {
      return "Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail-Adresse und dein Passwort.";
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
    trackAuthEvent("signin_start", { email, context: "login_form" });
    try {
      const timeout = new Promise<{ error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ error: { message: "Login timeout. Prüfe Supabase URL/Key." } }), 5000);
      });
      const result = await withSingleRetry(() => Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]));
      if ("error" in result && result.error?.message === "Login timeout. Prüfe Supabase URL/Key.") {
        // eslint-disable-next-line no-console
        console.warn("Login timeout", { url: supabaseConfig.url, anonKeySet: Boolean(supabaseConfig.anonKey) });
      }
      const error = "error" in result ? result.error : null;
      if (error) {
        const translatedError = translateAuthError(error.message);
        trackAuthEvent("signin_error", { email, error: error.message, context: "supabase_signin" });
        return { error: translatedError };
      }

      if ("data" in result && result.data?.session) {
        setSession(result.data.session);
        setUser(result.data.session.user ?? null);
        if (result.data.session.user) {
          const loadedProfile = await loadProfile(result.data.session.user, result.data.session.user.email);
          if (loadedProfile.archived) {
            trackAuthEvent("signin_error", {
              email,
              error: "archived_account",
              context: "profile_archived",
            });
            return { error: "Dieses Konto wurde archiviert. Bitte kontaktiere die Liga." };
          }
        }
      }
      trackAuthEvent("signin_success", { email, context: "login_form" });
      return {};
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.warn("Sign in failed", error);
      trackAuthEvent("signin_error", { email, error: getErrorMessage(error), context: "exception" });
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
    await ensureLaunchSettingsLoaded();
    if (isBeforeAccountCreationOpen()) {
      return { error: `Die Registrierung wird am ${formatAccountCreationOpenDate()} freigeschaltet.` };
    }
    trackAuthEvent("signup_start", { email, context: "register_form" });
    // Bestimme die Frontend-URL für redirectTo nach E-Mail-Bestätigung
    const frontendUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://kletterliga-nrw.de';
    const confirmUrl = `${frontendUrl}/app/auth/confirm`;
    
    const { data, error } = await withSingleRetry(() => supabase.auth.signUp({
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
    }));
    
    if (error) {
      if (isLikelyEmailDeliveryFailure(error.message)) {
        trackAuthEvent("signup_error", { email, error: error.message, context: "supabase_signup" });
        return { error: AUTH_EMAIL_DELIVERY_ERROR };
      }
      const translatedError = translateAuthError(error.message);
      trackAuthEvent("signup_error", { email, error: error.message, context: "supabase_signup" });
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
    
    if (isObfuscatedExistingUserResponse(data)) {
      trackAuthEvent("signup_error", {
        email,
        error: "existing_confirmed_user_obfuscated_signup",
        context: "supabase_signup",
      });
      return {
        error:
          "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich im Login an oder fordere dort einen neuen Bestätigungslink an.",
      };
    }

    if (!data.user) {
      // Kein User zurückgegeben - sollte eigentlich nicht passieren, aber sicherheitshalber prüfen
      trackAuthEvent("signup_error", { email, error: "missing_user_after_signup", context: "signup_response" });
      return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
    }

    if (data.session?.user) {
      await loadProfile(data.session.user, email);
    }
    trackAuthEvent("signup_success", { email, context: "register_form" });
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    trackAuthEvent("reset_start", { email, context: "login_reset" });
    try {
      const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kletterliga-nrw.de';
      const resetUrl = `${frontendUrl}/app/auth/reset-password`;
      const { error } = await withSingleRetry(() => supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      }));
      if (error) {
        if (isLikelyEmailDeliveryFailure(error.message)) {
          trackAuthEvent("reset_error", { email, error: error.message, context: "supabase_reset" });
          return { error: AUTH_EMAIL_DELIVERY_ERROR };
        }
        trackAuthEvent("reset_error", { email, error: error.message, context: "supabase_reset" });
        return { error: translateAuthError(error.message) };
      }
      trackAuthEvent("reset_success", { email, context: "login_reset" });
      return {};
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error) || "Fehler beim Senden des Passwort-Links";
      if (isLikelyEmailDeliveryFailure(errorMessage)) {
        trackAuthEvent("reset_error", { email, error: errorMessage, context: "exception" });
        return { error: AUTH_EMAIL_DELIVERY_ERROR };
      }
      trackAuthEvent("reset_error", { email, error: errorMessage, context: "exception" });
      return { error: translateAuthError(errorMessage) };
    }
  };

  const resendConfirmation = async (email: string) => {
    trackAuthEvent("resend_start", { email, context: "login_resend_confirmation" });
    try {
      const { error } = await withSingleRetry(() => supabase.auth.resend({
        type: "signup",
        email,
      }));
      if (error) {
        if (isLikelyEmailDeliveryFailure(error.message)) {
          trackAuthEvent("resend_error", { email, error: error.message, context: "supabase_resend" });
          return { error: AUTH_EMAIL_DELIVERY_ERROR };
        }
        trackAuthEvent("resend_error", { email, error: error.message, context: "supabase_resend" });
        return { error: translateAuthError(error.message) };
      }
      trackAuthEvent("resend_success", { email, context: "login_resend_confirmation" });
      return {};
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error) || "Fehler beim Senden der Bestätigung";
      if (isLikelyEmailDeliveryFailure(errorMessage)) {
        trackAuthEvent("resend_error", { email, error: errorMessage, context: "exception" });
        return { error: AUTH_EMAIL_DELIVERY_ERROR };
      }
      trackAuthEvent("resend_error", { email, error: errorMessage, context: "exception" });
      return { error: translateAuthError(errorMessage) };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user);
  };

  const role = profile?.role ?? (user ? "participant" : "guest");

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
      resetPassword,
      resendConfirmation,
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
