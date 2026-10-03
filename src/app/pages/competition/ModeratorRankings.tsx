import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import CompetitionRankingsView from "@/app/components/CompetitionRankingsView";
import type { CompetitionStanding } from "@/services/competitionDay";
import { getPublicFinal, getPublicSemifinal, type LiveClass } from "@/services/competitionFinal";

/** The participant ranking UI, backed only by public read-only results. */
export default function ModeratorRankings() {
  const { season } = useParams();
  const [rows, setRows] = useState<CompetitionStanding[]>([]);
  const [finals, setFinals] = useState<LiveClass[]>([]);
  const [semiError, setSemiError] = useState("");
  const [finalError, setFinalError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    setRows([]);
    setFinals([]);
    setUpdated(null);
    setSemiError("");
    setFinalError("");
    setLoading(true);
  }, [season]);

  useEffect(() => {
    if (!season) return;
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      const [semi, final] = await Promise.allSettled([
        getPublicSemifinal(season), getPublicFinal(season),
      ]);
      if (active) {
        if (semi.status === "fulfilled") {
          // Stable display keys only; no private profile IDs are requested.
          setRows(semi.value.map((row, index) => ({ ...row, profile_id: `${row.league}|${row.class_label}|${index}` })));
          setSemiError("");
        } else setSemiError("Halbfinale konnte nicht aktualisiert werden. Der letzte Stand bleibt sichtbar.");
        if (final.status === "fulfilled") {
          setFinals(final.value);
          setFinalError("");
        } else setFinalError("Finale konnte nicht aktualisiert werden. Der letzte Stand bleibt sichtbar.");
        if (semi.status === "fulfilled" && final.status === "fulfilled") setUpdated(new Date());
        setLoading(false);
      }
      pending = false;
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    const resume = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [season, revision]);

  return (
    <main className="min-h-screen bg-[#f7f3e9] px-4 py-6 font-sans text-[#003d55] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl space-y-5 pb-12">
        <header className="flex items-center justify-between gap-4 border-b border-[#003d55]/15 pb-4">
          <div>
            <p className="text-xs text-[#003d55]/70">Kletterliga NRW · Wettkampftag {season} · Nur Ansicht</p>
            <h1 className="[font-family:inherit] text-2xl font-bold tracking-normal">Ranglisten</h1>
          </div>
          <button type="button" aria-label="Ranglisten aktualisieren" title="Ranglisten aktualisieren"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#003d55] transition-colors hover:bg-[#003d55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] focus-visible:ring-offset-2 disabled:opacity-40"
            disabled={loading} onClick={() => setRevision((value) => value + 1)}>
            <RefreshCw size={20} aria-hidden="true" />
          </button>
        </header>
        <CompetitionRankingsView key={season} semifinal={rows} finals={finals} updated={updated}
          loading={loading} semifinalError={semiError} finalError={finalError} />
      </div>
    </main>
  );
}
