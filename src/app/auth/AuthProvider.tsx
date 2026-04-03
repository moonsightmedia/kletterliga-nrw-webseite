import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase, supabaseConfig } from "@/services/supabase";
import {
  fetchProfile,
  fetchProfileConsent,
  initializeParticipantConsent,
  requestConfirmationResendEmail,
  requestPasswordRecoveryEmail,
  requestSignupEmail,
  resendMarketingOptInEmail,
  upsertProfile,
  upsertProfileConsent,
} from "@/services/appApi";
import type { Profile, ProfileConsent, UserRole } from "@/services/appTypes";
import { trackAuthEvent } from "@/services/authTelemetry";
import { ensureLaunchSettingsLoaded, formatAccountCreationOpenDate, isBeforeAccountCreationOpen } from "@/config/launch";
import { markArchivedAccountNotice } from "@/app/auth/archivedAccountNotice";
import {
  MARKETING_EMAIL_SCOPE,
  PARTICIPATION_TERMS_VERSION,
  PRIVACY_NOTICE_VERSION,
  hasAcceptedRequiredParticipationConsent,
} from "@/data/participationConsent";

type SignUpResult = {
  error?: string;
  marketingOptInRequested?: boolean;
  marketingOptInEmailSent?: boolean;
  marketingOptInEmailError?: string;
};

type SaveParticipationConsentResult = {
  error?: string;
  marketingOptInEmailSent?: boolean;
  marketingOptInEmailError?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileConsent: ProfileConsent | null;
  hasAcceptedRequiredConsents: boolean;
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
    requiredConsentAccepted: boolean;
    marketingOptInRequested: boolean;
  }) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  refreshProfileConsent: () => Promise<void>;
  acceptParticipationConsents: (options: {
    marketingOptInRequested: boolean;
  }) => Promise<SaveParticipationConsentResult>;
  requestMarketingOptInEmail: () => Promise<{ error?: string; emailSent?: boolean }>;
  unsubscribeMarketingEmails: () => Promise<{ error?: string }>;
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
  const [profileConsent, setProfileConsent] = useState<ProfileConsent | null>(null);
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

  const buildConsentSeed = useCallback((user: User) => {
    const metadata = user.user_metadata ?? {};
    const marketingRequested = metadata.marketing_opt_in_requested === true;
    const acceptedAt =
      typeof metadata.participation_terms_accepted_at === "string"
        ? metadata.participation_terms_accepted_at
        : null;
    const privacyAcknowledgedAt =
      typeof metadata.privacy_notice_acknowledged_at === "string"
        ? metadata.privacy_notice_acknowledged_at
        : acceptedAt;
    const marketingRequestedAt =
      typeof metadata.marketing_opt_in_requested_at === "string"
        ? metadata.marketing_opt_in_requested_at
        : acceptedAt;

    return {
      profile_id: user.id,
      participation_terms_version:
        typeof metadata.participation_terms_version === "string"
          ? metadata.participation_terms_version
          : null,
      participation_terms_accepted_at: acceptedAt,
      privacy_notice_version:
        typeof metadata.privacy_notice_version === "string"
          ? metadata.privacy_notice_version
          : null,
      privacy_notice_acknowledged_at: privacyAcknowledgedAt,
      marketing_email_scope: marketingRequested
        ? typeof metadata.marketing_email_scope === "string"
          ? metadata.marketing_email_scope
          : MARKETING_EMAIL_SCOPE
        : null,
      marketing_email_status: marketingRequested ? "pending" : "not_subscribed",
      marketing_email_requested_at: marketingRequested ? marketingRequestedAt : null,
      marketing_email_confirmed_at: null,
      marketing_email_revoked_at: null,
    } satisfies Partial<ProfileConsent> & { profile_id: string };
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
    setProfileConsent(null);
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

  const loadProfileConsent = useCallback(async (user: User) => {
    try {
      const consentSeed = buildConsentSeed(user);
      const consentResult = await withTimeout(fetchProfileConsent(user.id), 4000, "Profile consent fetch");

      if (consentResult && !consentResult.error && consentResult.data) {
        const fetchedConsent = consentResult.data;
        const missingSeedPatch: Partial<ProfileConsent> & { profile_id: string } = {
          profile_id: fetchedConsent.profile_id,
        };

        if (!fetchedConsent.participation_terms_accepted_at && consentSeed.participation_terms_accepted_at) {
          missingSeedPatch.participation_terms_accepted_at = consentSeed.participation_terms_accepted_at;
        }
        if (!fetchedConsent.participation_terms_version && consentSeed.participation_terms_version) {
          missingSeedPatch.participation_terms_version = consentSeed.participation_terms_version;
        }
        if (!fetchedConsent.privacy_notice_acknowledged_at && consentSeed.privacy_notice_acknowledged_at) {
          missingSeedPatch.privacy_notice_acknowledged_at = consentSeed.privacy_notice_acknowledged_at;
        }
        if (!fetchedConsent.privacy_notice_version && consentSeed.privacy_notice_version) {
          missingSeedPatch.privacy_notice_version = consentSeed.privacy_notice_version;
        }
        if (
          (!fetchedConsent.marketing_email_status || fetchedConsent.marketing_email_status === "not_subscribed") &&
          consentSeed.marketing_email_status === "pending"
        ) {
          missingSeedPatch.marketing_email_status = consentSeed.marketing_email_status;
        }
        if (!fetchedConsent.marketing_email_requested_at && consentSeed.marketing_email_requested_at) {
          missingSeedPatch.marketing_email_requested_at = consentSeed.marketing_email_requested_at;
        }
        if (!fetchedConsent.marketing_email_scope && consentSeed.marketing_email_scope) {
          missingSeedPatch.marketing_email_scope = consentSeed.marketing_email_scope;
        }

        if (Object.keys(missingSeedPatch).length > 1) {
          const syncedConsent = await withTimeout(
            upsertProfileConsent(missingSeedPatch),
            4000,
            "Profile consent metadata sync",
          );
          if (syncedConsent && !syncedConsent.error && syncedConsent.data) {
            setProfileConsent(syncedConsent.data);
            return syncedConsent.data;
          }
        }

        setProfileConsent(fetchedConsent);
        return fetchedConsent;
      }

      if (consentSeed.participation_terms_accepted_at || consentSeed.marketing_email_requested_at) {
        const upsertResult = await withTimeout(
          upsertProfileConsent(consentSeed),
          4000,
          "Profile consent upsert",
        );
        if (upsertResult && !upsertResult.error && upsertResult.data) {
          setProfileConsent(upsertResult.data);
          return upsertResult.data;
        }
      }

      setProfileConsent(null);
      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Profile consent load failed", error);
      setProfileConsent(null);
      return null;
    }
  }, [buildConsentSeed]);

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
          await loadProfile(sessionUser, sessionUser.email);
          await loadProfileConsent(sessionUser);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Auth init failed", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileConsent(null);
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
            await loadProfileConsent(nextUser);
          } else {
            setProfile(null);
            setProfileConsent(null);
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
  }, [loadProfile, loadProfileConsent]);

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
          await loadProfileConsent(result.data.session.user);
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
    requiredConsentAccepted: boolean;
    marketingOptInRequested: boolean;
  }): Promise<SignUpResult> => {
    if (!isSupabaseConfigured) {
      return { error: "Supabase nicht konfiguriert. Prüfe VITE_SUPABASE_URL/ANON_KEY." };
    }

    const {
      email,
      password,
      firstName,
      lastName,
      birthDate,
      gender,
      homeGymId,
      league,
      requiredConsentAccepted,
      marketingOptInRequested,
    } = payload;
    await ensureLaunchSettingsLoaded();
    if (isBeforeAccountCreationOpen()) {
      return { error: `Die Registrierung wird am ${formatAccountCreationOpenDate()} freigeschaltet.` };
    }
    if (!requiredConsentAccepted) {
      return {
        error: "Bitte akzeptiere zuerst die Teilnahmebedingungen und Datenschutzhinweise.",
      };
    }
    trackAuthEvent("signup_start", { email, context: "register_form" });
    // Bestimme die Frontend-URL für redirectTo nach E-Mail-Bestätigung
    const frontendUrl =
      typeof window !== "undefined" ? window.location.origin : "https://kletterliga-nrw.de";
    const confirmUrl = `${frontendUrl}/app/auth/confirm`;
    const consentAcceptedAt = new Date().toISOString();
    
    const { data, error } = await withSingleRetry(() =>
      requestSignupEmail({
        email,
        password,
        redirectTo: confirmUrl,
        metadata: {
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          gender,
          home_gym_id: homeGymId,
          league,
          participation_terms_version: PARTICIPATION_TERMS_VERSION,
          participation_terms_accepted_at: consentAcceptedAt,
          privacy_notice_version: PRIVACY_NOTICE_VERSION,
          privacy_notice_acknowledged_at: consentAcceptedAt,
          marketing_opt_in_requested: marketingOptInRequested,
          marketing_opt_in_requested_at: marketingOptInRequested ? consentAcceptedAt : null,
          marketing_email_scope: marketingOptInRequested ? MARKETING_EMAIL_SCOPE : null,
        },
      }),
    );
    
    if (error) {
      trackAuthEvent("signup_error", { email, error: error.message, context: "auth_email_signup" });
      return { error: error.message || "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
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

    if (!data?.user_id) {
      // Kein User zurückgegeben - sollte eigentlich nicht passieren, aber sicherheitshalber prüfen
      trackAuthEvent("signup_error", { email, error: "missing_user_after_signup", context: "auth_email_signup" });
      return { error: "Registrierung fehlgeschlagen. Bitte versuche es erneut." };
    }

    let marketingOptInEmailSent = !marketingOptInRequested;
    let marketingOptInEmailError: string | undefined;

    const consentInit = await initializeParticipantConsent({
      profileId: data.user_id,
      email,
      name: `${firstName} ${lastName}`.trim(),
      participationTermsVersion: PARTICIPATION_TERMS_VERSION,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      marketingOptInRequested,
    });

    if (consentInit.error) {
      // eslint-disable-next-line no-console
      console.warn("Participant consent initialization failed", consentInit.error);
      if (marketingOptInRequested) {
        marketingOptInEmailSent = false;
        marketingOptInEmailError = consentInit.error.message;
      }
    } else if (marketingOptInRequested) {
      marketingOptInEmailSent = Boolean(consentInit.data?.email_sent);
      if (!marketingOptInEmailSent) {
        marketingOptInEmailError =
          consentInit.data?.message ??
          "Die Bestätigungs-E-Mail für freiwillige Informationen konnte noch nicht gesendet werden.";
      }
    }

    trackAuthEvent("signup_success", { email, context: "register_form" });
    return {
      marketingOptInRequested,
      marketingOptInEmailSent,
      marketingOptInEmailError,
    };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileConsent(null);
    }
  };

  const resetPassword = async (email: string) => {
    trackAuthEvent("reset_start", { email, context: "login_reset" });
    try {
      const frontendUrl = typeof window !== "undefined" ? window.location.origin : "https://kletterliga-nrw.de";
      const resetUrl = `${frontendUrl}/app/auth/reset-password`;
      const { error } = await withSingleRetry(() => requestPasswordRecoveryEmail(email, resetUrl));
      if (error) {
        trackAuthEvent("reset_error", { email, error: error.message, context: "auth_email_reset" });
        return { error: error.message || "Der Reset-Link konnte gerade nicht gesendet werden." };
      }
      trackAuthEvent("reset_success", { email, context: "login_reset" });
      return {};
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error) || "Fehler beim Senden des Passwort-Links";
      trackAuthEvent("reset_error", { email, error: errorMessage, context: "exception" });
      return { error: errorMessage };
    }
  };

  const resendConfirmation = async (email: string) => {
    trackAuthEvent("resend_start", { email, context: "login_resend_confirmation" });
    try {
      const frontendUrl = typeof window !== "undefined" ? window.location.origin : "https://kletterliga-nrw.de";
      const confirmUrl = `${frontendUrl}/app/auth/confirm`;
      const { error } = await withSingleRetry(() => requestConfirmationResendEmail(email, confirmUrl));
      if (error) {
        trackAuthEvent("resend_error", { email, error: error.message, context: "auth_email_resend" });
        return { error: error.message || "Der BestÃ¤tigungslink konnte gerade nicht gesendet werden." };
      }
      trackAuthEvent("resend_success", { email, context: "login_resend_confirmation" });
      return {};
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error) || "Fehler beim Senden der Bestätigung";
      trackAuthEvent("resend_error", { email, error: errorMessage, context: "exception" });
      return { error: errorMessage };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user);
  };

  const refreshProfileConsent = async () => {
    if (!user) return;
    await loadProfileConsent(user);
  };

  const acceptParticipationConsents = async ({
    marketingOptInRequested,
  }: {
    marketingOptInRequested: boolean;
  }): Promise<SaveParticipationConsentResult> => {
    if (!user || !profile) {
      return { error: "Bitte melde dich erneut an, um deine Teilnahme zu bestätigen." };
    }

    const acceptedAt = new Date().toISOString();
    const consentPatch: Partial<ProfileConsent> & { profile_id: string } = {
      profile_id: user.id,
      participation_terms_version: PARTICIPATION_TERMS_VERSION,
      participation_terms_accepted_at: acceptedAt,
      privacy_notice_version: PRIVACY_NOTICE_VERSION,
      privacy_notice_acknowledged_at: acceptedAt,
    };

    if (marketingOptInRequested) {
      consentPatch.marketing_email_scope = MARKETING_EMAIL_SCOPE;
      consentPatch.marketing_email_status =
        profileConsent?.marketing_email_status === "subscribed" ? "subscribed" : "pending";
      consentPatch.marketing_email_requested_at =
        profileConsent?.marketing_email_requested_at ?? acceptedAt;
      consentPatch.marketing_email_confirmed_at =
        profileConsent?.marketing_email_status === "subscribed"
          ? profileConsent?.marketing_email_confirmed_at
          : null;
      consentPatch.marketing_email_revoked_at = null;
    }

    const consentResult = await upsertProfileConsent(consentPatch);
    if (consentResult.error) {
      return {
        error:
          consentResult.error.message ??
          "Die Teilnahmebedingungen konnten gerade nicht gespeichert werden.",
      };
    }

    if (consentResult.data) {
      setProfileConsent(consentResult.data);
    }

    if (!marketingOptInRequested || profileConsent?.marketing_email_status === "subscribed") {
      return { marketingOptInEmailSent: !marketingOptInRequested };
    }

    const email = user.email ?? profile.email ?? null;
    if (!email) {
      return {
        marketingOptInEmailSent: false,
        marketingOptInEmailError:
          "Deine freiwillige E-Mail-Anmeldung konnte noch nicht gestartet werden, weil keine E-Mail-Adresse vorliegt.",
      };
    }

    const resendResult = await resendMarketingOptInEmail({
      profileId: user.id,
      email,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null,
    });

    if (resendResult.error) {
      return {
        marketingOptInEmailSent: false,
        marketingOptInEmailError: resendResult.error.message,
      };
    }

    if (resendResult.data?.consent) {
      setProfileConsent(resendResult.data.consent);
    } else {
      await loadProfileConsent(user);
    }

    return {
      marketingOptInEmailSent: Boolean(resendResult.data?.email_sent),
      marketingOptInEmailError: resendResult.data?.email_sent
        ? undefined
        : resendResult.data?.message ??
          "Die Bestätigungs-E-Mail für freiwillige Informationen konnte noch nicht gesendet werden.",
    };
  };

  const requestMarketingOptInEmail = async () => {
    if (!user || !profile) {
      return { error: "Bitte melde dich erneut an, um deine E-Mail-Einstellungen zu ändern." };
    }

    const email = user.email ?? profile.email ?? null;
    if (!email) {
      return { error: "Für dein Profil ist keine E-Mail-Adresse hinterlegt." };
    }

    const requestedAt = new Date().toISOString();
    const seedResult = await upsertProfileConsent({
      profile_id: user.id,
      participation_terms_version:
        profileConsent?.participation_terms_version ?? PARTICIPATION_TERMS_VERSION,
      participation_terms_accepted_at:
        profileConsent?.participation_terms_accepted_at ?? requestedAt,
      privacy_notice_version:
        profileConsent?.privacy_notice_version ?? PRIVACY_NOTICE_VERSION,
      privacy_notice_acknowledged_at:
        profileConsent?.privacy_notice_acknowledged_at ?? requestedAt,
      marketing_email_scope: MARKETING_EMAIL_SCOPE,
      marketing_email_status:
        profileConsent?.marketing_email_status === "subscribed" ? "subscribed" : "pending",
      marketing_email_requested_at: requestedAt,
      marketing_email_confirmed_at:
        profileConsent?.marketing_email_status === "subscribed"
          ? profileConsent?.marketing_email_confirmed_at
          : null,
      marketing_email_revoked_at: null,
    });

    if (seedResult.error) {
      return {
        error:
          seedResult.error.message ??
          "Die E-Mail-Einstellungen konnten gerade nicht aktualisiert werden.",
      };
    }

    const resendResult = await resendMarketingOptInEmail({
      profileId: user.id,
      email,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null,
    });

    if (resendResult.error) {
      return { error: resendResult.error.message, emailSent: false };
    }

    if (resendResult.data?.consent) {
      setProfileConsent(resendResult.data.consent);
    } else if (seedResult.data) {
      setProfileConsent(seedResult.data);
    } else {
      await loadProfileConsent(user);
    }

    if (!resendResult.data?.email_sent) {
      return {
        error:
          resendResult.data?.message ??
          "Die Bestätigungs-E-Mail konnte gerade nicht gesendet werden.",
        emailSent: false,
      };
    }

    return { emailSent: true };
  };

  const unsubscribeMarketingEmails = async () => {
    if (!user) {
      return { error: "Bitte melde dich erneut an, um deine E-Mail-Einstellungen zu ändern." };
    }

    const unsubscribeResult = await upsertProfileConsent({
      profile_id: user.id,
      marketing_email_status: "unsubscribed",
      marketing_email_revoked_at: new Date().toISOString(),
    });

    if (unsubscribeResult.error) {
      return {
        error:
          unsubscribeResult.error.message ??
          "Die freiwilligen E-Mails konnten gerade nicht abbestellt werden.",
      };
    }

    if (unsubscribeResult.data) {
      setProfileConsent(unsubscribeResult.data);
    } else {
      await loadProfileConsent(user);
    }

    return {};
  };

  const role = profile?.role ?? (user ? "participant" : "guest");
  const hasAcceptedRequiredConsents = Boolean(user) && Boolean(profile) && hasAcceptedRequiredParticipationConsent(profileConsent);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      profileConsent,
      hasAcceptedRequiredConsents,
      role,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      resendConfirmation,
      refreshProfile,
      refreshProfileConsent,
      acceptParticipationConsents,
      requestMarketingOptInEmail,
      unsubscribeMarketingEmails,
    }),
    [
      session,
      user,
      profile,
      profileConsent,
      hasAcceptedRequiredConsents,
      role,
      loading,
      acceptParticipationConsents,
    ],
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
