import { useEffect } from "react";

export const APP_STARTUP_SPLASH_KEY = "kl_app_sponsor_splash_seen";
export const APP_STARTUP_SPLASH_VALUE = "v2";
export const APP_STARTUP_SPLASH_MIN_DURATION_MS = 900;

export const isAppPathname = (pathname: string) => /^\/app(?:\/|$)/.test(pathname);

export const hasSeenAppStartupSplash = () => {
  if (typeof sessionStorage === "undefined") return false;

  try {
    return sessionStorage.getItem(APP_STARTUP_SPLASH_KEY) === APP_STARTUP_SPLASH_VALUE;
  } catch {
    return false;
  }
};

export const shouldShowAppStartupSplash = (pathname: string) =>
  isAppPathname(pathname) && !hasSeenAppStartupSplash();

export const markAppStartupSplashSeen = () => {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(APP_STARTUP_SPLASH_KEY, APP_STARTUP_SPLASH_VALUE);
  } catch {
    // Ignore storage failures and keep the app usable.
  }
};

export const useMarkAppStartupSplashSeen = () => {
  useEffect(() => {
    markAppStartupSplashSeen();
  }, []);
};
