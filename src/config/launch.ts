const APP_UNLOCK_AT = "2026-05-01T00:00:00+02:00";

const unlockDate = new Date(APP_UNLOCK_AT);

export const getUnlockDate = () => unlockDate;

export const isBeforeAppUnlock = () => new Date() < unlockDate;

export const isPublicRankingsEnabled = () => !isBeforeAppUnlock();

export const isParticipantFeatureLocked = () => isBeforeAppUnlock();
