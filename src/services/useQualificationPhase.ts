import { useEffect, useState } from "react";
import { getQualificationPhase, type QualificationPhase } from "./qualificationPhase";
import { useSeasonSettings } from "./seasonSettings";

export function useQualificationPhase() {
  const { settings, loading } = useSeasonSettings();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const phase: QualificationPhase | "loading" = loading ? "loading" : getQualificationPhase(settings?.qualification_start, settings?.qualification_end, now);
  return {
    phase,
    canEditResults: phase === "active",
    hasEnded: phase === "closed",
    qualificationEnd: settings?.qualification_end ?? null,
  };
}
