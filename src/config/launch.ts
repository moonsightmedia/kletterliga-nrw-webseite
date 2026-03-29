import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { AdminSettings } from "@/services/appTypes";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

const DEFAULT_ACCOUNT_CREATION_OPENS_AT = "2026-04-01T00:00:00+02:00";
const DEFAULT_APP_UNLOCK_AT = "2026-05-01T00:00:00+02:00";
const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const envForceAccountCreationOpen = import.meta.env.VITE_FORCE_ACCOUNT_CREATION_OPEN === "true";
const envForceParticipantUnlock = import.meta.env.VITE_FORCE_PARTICIPANT_UNLOCK === "true";

type LaunchState = {
  accountCreationOpenDate: Date;
  unlockDate: Date;
  forceAccountCreationOpen: boolean;
  forceParticipantUnlock: boolean;
  initialized: boolean;
};

const listeners = new Set<() => void>();

const parseDate = (value: string | null | undefined, fallback: string) => {
  const parsed = new Date(value ?? fallback);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
};

const isLocalPreviewUnlockEnabled = () => {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return true;
  return LOCAL_PREVIEW_HOSTS.has(window.location.hostname);
};

const getDefaultState = (): LaunchState => ({
  accountCreationOpenDate: new Date(DEFAULT_ACCOUNT_CREATION_OPENS_AT),
  unlockDate: new Date(DEFAULT_APP_UNLOCK_AT),
  forceAccountCreationOpen: false,
  forceParticipantUnlock: false,
  initialized: !isSupabaseConfigured,
});

let launchState: LaunchState = getDefaultState();
let launchSettingsPromise: Promise<void> | null = null;

const emitLaunchSettingsChange = () => {
  listeners.forEach((listener) => listener());
};

const setLaunchState = (nextState: LaunchState) => {
  launchState = nextState;
  emitLaunchSettingsChange();
};

const applyAdminSettings = (settings: AdminSettings | null) => {
  setLaunchState({
    accountCreationOpenDate: parseDate(settings?.account_creation_opens_at, DEFAULT_ACCOUNT_CREATION_OPENS_AT),
    unlockDate: parseDate(settings?.app_unlock_at, DEFAULT_APP_UNLOCK_AT),
    forceAccountCreationOpen: Boolean(settings?.force_account_creation_open),
    forceParticipantUnlock: Boolean(settings?.force_participant_unlock),
    initialized: true,
  });
};

export const refreshLaunchSettings = async () => {
  if (!isSupabaseConfigured) {
    setLaunchState({ ...launchState, initialized: true });
    return;
  }

  const { data, error } = await supabase.rpc("get_public_admin_settings").maybeSingle<AdminSettings>();

  if (error) {
    setLaunchState({ ...launchState, initialized: true });
    return;
  }

  applyAdminSettings(data ?? null);
};

export const ensureLaunchSettingsLoaded = async () => {
  if (launchState.initialized) return;
  if (!launchSettingsPromise) {
    launchSettingsPromise = refreshLaunchSettings().finally(() => {
      launchSettingsPromise = null;
    });
  }
  await launchSettingsPromise;
};

export const initializeLaunchSettings = () => {
  void ensureLaunchSettingsLoaded();
};

const getLaunchStateSnapshot = () => launchState;

const getResolvedLaunchSettings = () => {
  const localPreviewUnlocked = isLocalPreviewUnlockEnabled();
  const forceAccountCreationOpen =
    envForceAccountCreationOpen || localPreviewUnlocked || launchState.forceAccountCreationOpen;
  const forceParticipantUnlock =
    envForceParticipantUnlock || localPreviewUnlocked || launchState.forceParticipantUnlock;

  return {
    accountCreationOpenDate: launchState.accountCreationOpenDate,
    unlockDate: launchState.unlockDate,
    forceAccountCreationOpen,
    forceParticipantUnlock,
    beforeAccountCreationOpen: !forceAccountCreationOpen && new Date() < launchState.accountCreationOpenDate,
    beforeAppUnlock: !forceParticipantUnlock && new Date() < launchState.unlockDate,
    initialized: launchState.initialized,
  };
};

const subscribeLaunchSettings = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLaunchSettings = () => {
  const snapshot = useSyncExternalStore(
    subscribeLaunchSettings,
    getLaunchStateSnapshot,
    getLaunchStateSnapshot,
  );

  useEffect(() => {
    initializeLaunchSettings();
  }, []);

  return useMemo(() => {
    const localPreviewUnlocked = isLocalPreviewUnlockEnabled();
    const forceAccountCreationOpen =
      envForceAccountCreationOpen || localPreviewUnlocked || snapshot.forceAccountCreationOpen;
    const forceParticipantUnlock =
      envForceParticipantUnlock || localPreviewUnlocked || snapshot.forceParticipantUnlock;
    const beforeAccountCreationOpen =
      !forceAccountCreationOpen && new Date() < snapshot.accountCreationOpenDate;
    const beforeAppUnlock = !forceParticipantUnlock && new Date() < snapshot.unlockDate;

    return {
      accountCreationOpenDate: snapshot.accountCreationOpenDate,
      unlockDate: snapshot.unlockDate,
      forceAccountCreationOpen,
      forceParticipantUnlock,
      beforeAccountCreationOpen,
      beforeAppUnlock,
      initialized: snapshot.initialized,
      participantLaunchStarted: !beforeAppUnlock,
      publicRankingsEnabled: !beforeAppUnlock,
      participantFeatureLocked: beforeAppUnlock,
    };
  }, [snapshot]);
};

export const getAccountCreationOpenDate = () => getResolvedLaunchSettings().accountCreationOpenDate;

export const formatAccountCreationOpenDate = (date = getAccountCreationOpenDate()) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const isBeforeAccountCreationOpen = () => getResolvedLaunchSettings().beforeAccountCreationOpen;

export const getUnlockDate = () => getResolvedLaunchSettings().unlockDate;

export const formatUnlockDate = (date = getUnlockDate()) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const isBeforeAppUnlock = () => getResolvedLaunchSettings().beforeAppUnlock;

export const hasParticipantLaunchStarted = () => !isBeforeAppUnlock();

export const isPublicRankingsEnabled = () => !isBeforeAppUnlock();

export const isParticipantFeatureLocked = () => isBeforeAppUnlock();
