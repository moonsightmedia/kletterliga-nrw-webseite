const ACCOUNT_CREATION_OPENS_AT = "2026-04-01T00:00:00+02:00";
const APP_UNLOCK_AT = "2026-05-01T00:00:00+02:00";

const accountCreationOpenDate = new Date(ACCOUNT_CREATION_OPENS_AT);
const unlockDate = new Date(APP_UNLOCK_AT);

export const getAccountCreationOpenDate = () => accountCreationOpenDate;

export const formatAccountCreationOpenDate = (date = accountCreationOpenDate) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const isBeforeAccountCreationOpen = () => new Date() < accountCreationOpenDate;

export const getUnlockDate = () => unlockDate;

export const formatUnlockDate = (date = unlockDate) =>
  date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export const isBeforeAppUnlock = () => new Date() < unlockDate;

export const isPublicRankingsEnabled = () => !isBeforeAppUnlock();

export const isParticipantFeatureLocked = () => isBeforeAppUnlock();
