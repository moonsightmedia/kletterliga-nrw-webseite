import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import CompetitionRankingsView from "@/app/components/CompetitionRankingsView";
import { useSeasonSettings } from "@/services/seasonSettings";
import {
  listCompetitionStandings,
  type CompetitionStanding,
} from "@/services/competitionDay";
import { getPublicFinal, type LiveClass } from "@/services/competitionFinal";

export default function CompetitionStandings() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  const [rows, setRows] = useState<CompetitionStanding[]>([]);
  const [finals, setFinals] = useState<LiveClass[]>([]);
  const [semiError, setSemiError] = useState("");
  const [finalError, setFinalError] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setRows([]);
    setFinals([]);
    setUpdated(null);
    setLoading(true);
  }, [season]);
  useEffect(() => {
    if (settingsLoading) return;
    if (!season) {
      setLoading(false);
      setSemiError("Die aktuelle Saison ist nicht verfügbar.");
      setFinalError("Die aktuelle Saison ist nicht verfügbar.");
      return;
    }
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      const [semi, final] = await Promise.allSettled([
        listCompetitionStandings(season),
        getPublicFinal(season),
      ]);
      if (active) {
        if (semi.status === "fulfilled") {
          setRows(semi.value);
          setSemiError("");
        } else
          setSemiError(
            "Halbfinale konnte nicht aktualisiert werden. Der letzte Stand bleibt sichtbar.",
          );
        if (final.status === "fulfilled") {
          setFinals(final.value);
          setFinalError("");
        } else
          setFinalError(
            "Finale konnte nicht aktualisiert werden. Der letzte Stand bleibt sichtbar.",
          );
        if (semi.status === "fulfilled" && final.status === "fulfilled")
          setUpdated(new Date());
        setLoading(false);
      }
      pending = false;
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [season, settingsLoading, revision]);
  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12 text-[#003d55]">
      <header className="flex items-center justify-between gap-4 border-b border-[#003d55]/15 pb-4">
        <div>
        <p className="text-xs text-[#003d55]/70">
          Wettkampftag · {season ?? "–"}
        </p>
        <h1 className="[font-family:inherit] text-2xl font-bold tracking-normal">
          Ranglisten
        </h1>
        </div>
        <button
          type="button"
          aria-label="Ranglisten aktualisieren"
          title="Ranglisten aktualisieren"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#003d55] transition-colors hover:bg-[#003d55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] focus-visible:ring-offset-2 disabled:opacity-40"
          disabled={loading || settingsLoading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={20} aria-hidden="true" />
        </button>
      </header>
      <CompetitionRankingsView
        semifinal={rows}
        finals={finals}
        updated={updated}
        loading={loading || settingsLoading}
        semifinalError={semiError}
        finalError={finalError}
      />
    </div>
  );
}
