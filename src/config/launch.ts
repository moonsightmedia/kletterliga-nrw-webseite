const ACCOUNT_CREATION_OPENS_AT = "2026-04-01T00:00:00+02:00";
const APP_UNLOCK_AT = "2026-05-01T00:00:00+02:00";
const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const forceParticipantUnlock = import.meta.env.VITE_FORCE_PARTICIPANT_UNLOCK === "true";

const accountCreationOpenDate = new Date(ACCOUNT_CREATION_OPENS_AT);
const unlockDate = new Date(APP_UNLOCK_AT);

const isLocalPreviewUnlockEnabled = () => {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return true;
  return LOCAL_PREVIEW_HOSTS.has(window.location.hostname);
};

export const getAccountCreationOpenDate = () => accountCreationOpenDate;

export const formatAccountCreationOpenDate = (date = accountCreationOpenDate) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const isBeforeAccountCreationOpen = () => new Date() < accountCreationOpenDate;

export const getUnlockDate = () => unlockDate;

export const formatUnlockDate = (date = unlockDate) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const isBeforeAppUnlock = () => {
  if (forceParticipantUnlock) return false;
  if (isLocalPreviewUnlockEnabled()) return false;
  return new Date() < unlockDate;
};

export const isPublicRankingsEnabled = () => !isBeforeAppUnlock();

export const isParticipantFeatureLocked = () => isBeforeAppUnlock();
