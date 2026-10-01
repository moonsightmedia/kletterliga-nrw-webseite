import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { StitchButton } from "@/app/components/StitchPrimitives";
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
      <header className="rounded-xl bg-[#003d55] p-6 text-[#f2dcab]">
        <p className="stitch-kicker text-[#d58a4c]">
          Wettkampftag · {season ?? "–"}
        </p>
        <h1 className="stitch-headline mt-2 text-3xl">Ranglisten</h1>
        <p className="mt-3 text-sm">
          Halbfinale und Finale nach Klasse. Neue Ergebnisse erscheinen
          automatisch alle fünf Sekunden.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <StitchButton variant="outline" asChild>
          <Link to="/app/wettkampf">Meine Routen</Link>
        </StitchButton>
        <StitchButton
          variant="outline"
          disabled={loading || settingsLoading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={16} />
          Aktualisieren
        </StitchButton>
      </div>
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
