import { ReactNode } from "react";
import { ComingSoonPage } from "@/app/ComingSoonPage";

const PREVIEW_UNLOCK_KEY = "kl_preview_unlocked";
const SITE_LAUNCH_AT = new Date("2026-03-22T00:00:00+01:00").getTime();

function isSiteLive(): boolean {
  const env = import.meta.env.VITE_SITE_LIVE as string | undefined;
  if (env === "true" || env === "1") return true;

  if (typeof window !== "undefined") {
    const now = Date.now();
    if (now >= SITE_LAUNCH_AT) {
      return true;
    }
  }

  return false;
}

function isPreviewUnlocked(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PREVIEW_UNLOCK_KEY) === "1";
}

export const ClosedGate = ({ children }: { children: ReactNode }) => {
  if (isSiteLive() || isPreviewUnlocked()) {
    return <>{children}</>;
  }
  return <ComingSoonPage />;
};
