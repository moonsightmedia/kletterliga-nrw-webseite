const ARCHIVED_ACCOUNT_NOTICE_KEY = "kl_archived_account_notice";

export const markArchivedAccountNotice = () => {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(ARCHIVED_ACCOUNT_NOTICE_KEY, "1");
  } catch {
    // Ignore storage issues and keep auth usable.
  }
};

export const consumeArchivedAccountNotice = () => {
  if (typeof sessionStorage === "undefined") return false;

  try {
    const shouldShow = sessionStorage.getItem(ARCHIVED_ACCOUNT_NOTICE_KEY) === "1";
    if (shouldShow) {
      sessionStorage.removeItem(ARCHIVED_ACCOUNT_NOTICE_KEY);
    }
    return shouldShow;
  } catch {
    return false;
  }
};
