import { ReactNode } from "react";
import { ComingSoonPage } from "@/app/ComingSoonPage";

const PREVIEW_UNLOCK_KEY = "kl_preview_unlocked";

function isSiteLive(): boolean {
  const env = import.meta.env.VITE_SITE_LIVE as string | undefined;
  return env === "true" || env === "1";
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
