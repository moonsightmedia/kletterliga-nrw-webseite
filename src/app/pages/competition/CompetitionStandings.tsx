import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
import { getCompetitionDay, listCompetitionStandings, type CompetitionDay, type CompetitionStanding } from "@/services/competitionDay";
import { getPublicFinal, resultLabel, type LiveClass, type PublicFinalEntry } from "@/services/competitionFinal";

export default function CompetitionStandings() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  const [rows, setRows] = useState<CompetitionStanding[]>([]);
  const [finalClasses, setFinalClasses] = useState<LiveClass[]>([]);
  const [day, setDay] = useState<CompetitionDay | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [updated, setUpdated] = useState<Date | null>(null);
  const loadedOnce = useRef(false);
  useEffect(() => { const id = window.setInterval(() => { if (document.visibilityState === "visible") setRevision((v) => v + 1); }, 5000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    if (settingsLoading) return;
    if (!season) { setLoading(false); setError("Die aktuelle Saison ist nicht verfügbar."); return; }
    let cancelled = false;
    if (!loadedOnce.current) setLoading(true); setError("");
    Promise.all([getCompetitionDay(season), listCompetitionStandings(season), getPublicFinal(season).catch(() => [])]).then(([event, data, final]) => {
      if (!cancelled) { setRows(data); setDay(event); setFinalClasses(final); setUpdated(new Date()); loadedOnce.current = true; }
    }).catch(() => { if (!cancelled) setError("Die Live-Wertung konnte nicht aktualisiert werden. Der letzte Stand bleibt sichtbar."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [season, settingsLoading, revision]);
  const groups = new Map<string, CompetitionStanding[]>();
  for (const row of rows) {
    const label = `${row.league === "lead" ? "Vorstieg" : "Toprope"} · ${row.class_label}`;
    groups.set(label, [...(groups.get(label) ?? []), row]);
  }
  return <div className="mx-auto max-w-4xl space-y-6 text-[#003d55]">
    <StitchCard tone="navy" className="space-y-3 p-6"><StitchBadge tone="cream">Halbfinale</StitchBadge><h1 className="stitch-headline text-3xl text-[#f2dcab]">Offene Wertung</h1><p className="text-sm leading-6 text-[#f2dcab]">Summe der fünf Halbfinalrouten mit jeweils 0–100 Punkten (maximal 500). Während des Wettkampfs ist dies ein Zwischenstand, keine bestätigte Finalstartliste. Bei Gleichstand am Einzugsplatz ziehen alle Punktgleichen ins Finale ein.</p></StitchCard>
    <div className="flex flex-wrap gap-3"><StitchButton variant="outline" asChild><Link to="/app/wettkampf">Meine Routen</Link></StitchButton><StitchButton disabled={loading || settingsLoading} onClick={() => setRevision((v) => v + 1)}>Aktualisieren</StitchButton></div>
    {loading && <p role="status">Wertung wird geladen …</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {!loading && <>
      <p className="text-sm">{day?.event?.phase === "open" ? "Eingabe läuft" : "Eingabe nicht geöffnet"} · Stand {updated?.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</p>
      {!rows.length && <StitchCard className="p-5">Noch keine Wertung vorhanden.</StitchCard>}
      {[...groups].sort(([a], [b]) => a.localeCompare(b, "de")).map(([label, entries]) => <section key={label} aria-label={label} className="space-y-3"><h2 className="stitch-headline text-xl">{label}</h2>{entries.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "de")).map((row) => <StitchCard key={row.profile_id} className="flex items-center gap-4 p-4"><span className="stitch-headline min-w-8 text-2xl" aria-label={`Platz ${row.rank}`}>{row.rank}</span><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{row.name}</h3><p className="text-xs">{row.completed_routes}/5 Routen eingetragen</p></div><strong className="shrink-0">{row.points} P.</strong></StitchCard>)}</section>)}
      {finalClasses.length > 0 && <section id="finale" className="space-y-4 border-t border-[#003d55]/20 pt-8"><StitchCard tone="navy" className="p-5 text-[#f2dcab]"><h2 className="stitch-headline text-2xl">Finale · Live-Wertung</h2><p className="mt-2 text-sm">Vorläufiger Live-Stand. Die endgültige Wertung erfolgt nach Abschluss des Finales und Prüfung der Papierlisten.</p></StitchCard>{finalClasses.map((c) => <div key={c.key} className="space-y-2"><h3 className="stitch-headline text-xl">{c.league === "lead" ? "Vorstieg" : "Toprope"} · {c.class_label} {c.phase === "final" && <span className="text-sm font-bold">· endgültig</span>}</h3>{c.entries.map((row, index) => { const e = row as PublicFinalEntry; return <StitchCard key={`${c.key}-${index}`} className="flex items-center gap-3 p-4"><strong className="stitch-headline min-w-8 text-2xl">{e.rank ?? "–"}</strong><span className="min-w-0 flex-1 font-bold">{e.name}</span><span className="text-sm">{resultLabel(e)}</span></StitchCard>; })}</div>)}</section>}
    </>}
  </div>;
}
