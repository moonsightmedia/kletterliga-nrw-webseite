import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Flag } from "lucide-react";
import type { Stage } from "@/services/appTypes";
import { formatCompetitionDate } from "@/services/qualificationPhase";
import { QualificationTimeline } from "./QualificationTimeline";

const seenInMemory = new Set<string>();
const storageKey = (profileId: string, season: string, end: string) => `kl_qualification_complete_v1:${profileId}:${season}:${end}`;
const hasSeen = (key: string) => {
  if (seenInMemory.has(key)) return true;
  try { return localStorage.getItem(key) === "seen"; } catch { return false; }
};
const reducedMotion = () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** A presentation-only transition. Never changes qualification or eligibility. */
export default function QualificationTransition({ profileId, season, end, stages, children }: {
  profileId: string; season: string; end: string; stages: Stage[]; children: ReactNode;
}) {
  const key = storageKey(profileId, season, end);
  const [complete, setComplete] = useState(() => hasSeen(key) || reducedMotion());
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const destination = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);
  const finish = useCallback(() => {
    restoreFocus.current = document.activeElement === document.body || Boolean(panel.current?.contains(document.activeElement));
    seenInMemory.add(key);
    try { localStorage.setItem(key, "seen"); } catch { /* Navigation works even if storage is blocked. */ }
    setComplete(true);
  }, [key]);

  useEffect(() => {
    if (complete) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => { if (media.matches) finish(); };
    media.addEventListener("change", onMotionChange);
    const closingTimer = window.setTimeout(() => setClosing(true), 2200);
    const finishTimer = window.setTimeout(finish, 2600);
    return () => {
      window.clearTimeout(closingTimer);
      window.clearTimeout(finishTimer);
      media.removeEventListener("change", onMotionChange);
    };
  }, [complete, finish]);

  useEffect(() => {
    if (complete) {
      seenInMemory.add(key);
      try { localStorage.setItem(key, "seen"); } catch { /* In-memory fallback is sufficient for this session. */ }
      if (restoreFocus.current) destination.current?.querySelector<HTMLElement>("#semifinal-heading")?.focus({ preventScroll: true });
    }
  }, [complete, key]);

  if (complete) return <div ref={destination}>{children}</div>;
  return <div ref={panel} className={`qualification-finish ${closing ? "qualification-finish--closing" : ""}`} data-testid="qualification-transition">
    <div className="qualification-finish__mark" aria-hidden="true">
      <svg viewBox="0 0 120 120"><circle className="qualification-finish__ring-track" cx="60" cy="60" r="54" /><circle className="qualification-finish__ring" cx="60" cy="60" r="54" pathLength="100" /></svg>
      <Flag className="qualification-finish__flag" size={34} />
      <Check className="qualification-finish__check" size={42} strokeWidth={2.5} />
    </div>
    <p className="stitch-kicker">Saison {season} · Zeit für den nächsten Schritt</p>
    <h1 className="stitch-headline">Die Quali ist<br /><span>abgeschlossen.</span></h1>
    <p className="qualification-finish__copy">Letzte Etappe beendet am {formatCompetitionDate(end)}.<br />Danke, dass du Teil der Kletterliga bist.</p>
    <div className="qualification-finish__timeline">
      <div className="qualification-finish__caption"><span>Qualifikationszeitraum</span><span className="qualification-finish__percent" aria-hidden="true">100 %</span></div>
      <QualificationTimeline stages={stages} animated />
    </div>
    <p className="qualification-finish__next">Deine Halbfinalübersicht öffnet sich …</p>
    <button type="button" className="semifinal-text-link" onClick={finish}>Direkt zum Halbfinale <ArrowRight size={16} aria-hidden="true" /></button>
  </div>;
}
