import { useEffect, useMemo, useState } from "react";
import { Medal, Clock3, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  className,
  resultLabel,
  type LiveClass,
  type PublicFinalEntry,
} from "@/services/competitionFinal";
import type { CompetitionStanding } from "@/services/competitionDay";
import { finalPhaseLabels } from "@/lib/competitionPresentation";

export default function CompetitionRankingsView({
  semifinal,
  finals,
  updated,
  finalError = "",
  semifinalError = "",
  loading = false,
}: {
  semifinal: CompetitionStanding[];
  finals: LiveClass[];
  updated: Date | null;
  finalError?: string;
  semifinalError?: string;
  loading?: boolean;
}) {
  const [phase, setPhase] = useState(finals.length ? "final" : "semifinal");
  const [chosen, setChosen] = useState<string | null>(null);
  const [manuallyChosen, setManuallyChosen] = useState(false);
  useEffect(() => {
    if (finals.length && !manuallyChosen) setPhase("final");
  }, [finals.length, manuallyChosen]);
  const semifinals = useMemo(() => {
    const groups = new Map<string, CompetitionStanding[]>();
    for (const row of semifinal) {
      const key = `${row.league}|${row.class_label}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups].map(([key, entries]) => ({
      key,
      league: entries[0].league,
      class_label: entries[0].class_label,
      entries: [...entries].sort(
        (a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "de"),
      ),
    }));
  }, [semifinal]);
  const groups = phase === "final" ? finals : semifinals;
  const activeKey = chosen ?? groups[0]?.key ?? "lead|U15-m";
  const [league, classLabel] = activeKey.split("|");
  const separator = classLabel.lastIndexOf("-");
  const age = separator < 0 ? classLabel : classLabel.slice(0, separator);
  const gender = separator < 0 ? "m" : classLabel.slice(separator + 1);
  const selected = groups.find((item) => item.key === activeKey);
  const chooseClass = (next: { league?: string; age?: string; gender?: string }) =>
    setChosen(`${next.league ?? league}|${next.age ?? age}-${next.gender ?? gender}`);
  const filterGroups = [
    { label: "Liga", value: league, options: [{ value: "lead", label: "Vorstieg" }, { value: "toprope", label: "Toprope" }], change: (value: string) => chooseClass({ league: value }) },
    { label: "Geschlecht", value: gender, options: [{ value: "m", label: "M" }, { value: "w", label: "W" }], change: (value: string) => chooseClass({ gender: value }) },
    { label: "Altersklasse", value: age, options: [{ value: "U15", label: "U15" }, { value: "Ü15", label: "Ü15" }, { value: "Ü40", label: "Ü40" }], change: (value: string) => chooseClass({ age: value }) },
  ];
  const finalClass = finals.find((item) => item.key === selected?.key);
  const official = phase === "final" && finalClass?.phase === "final";
  const error = phase === "final" ? finalError : semifinalError;
  return (
    <div className="space-y-5">
      <Tabs
        value={phase}
        onValueChange={(value) => {
          setPhase(value);
          setManuallyChosen(true);
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-[#003d55]/10 p-1">
          <TabsTrigger
            value="semifinal"
            className="min-h-12 rounded-lg data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab]"
          >
            Halbfinale
          </TabsTrigger>
          <TabsTrigger
            value="final"
            className="min-h-12 rounded-lg data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab]"
          >
            Finale
          </TabsTrigger>
        </TabsList>
        {["semifinal", "final"].map((value) => (
          <TabsContent key={value} value={value} className="space-y-5 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="[font-family:inherit] text-lg font-bold tracking-normal">
                  {phase === "final" ? "Finalwertung" : "Halbfinalwertung"}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm">
                  {official ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{" "}
                  {official ? "Offiziell freigegeben" : "Vorläufiger Stand"}{" "}
                  {updated && `· ${updated.toLocaleTimeString("de-DE")}`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[1.5fr_0.8fr_1.2fr] gap-1.5" aria-label="Wertungsklasse">
              {filterGroups.map((group) => (
                <div key={group.label} role="group" aria-label={group.label} className="flex min-w-0 gap-0.5 rounded-sm bg-[#003d55]/5 p-0.5">
                  {group.options.map((option) => (
                    <button key={option.value} type="button" aria-pressed={group.value === option.value}
                      onClick={() => group.change(option.value)}
                      className={`min-h-11 min-w-0 flex-1 rounded-sm px-1 py-2 font-['Space_Grotesk'] text-[9px] font-bold uppercase tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] focus-visible:ring-offset-2 sm:text-xs ${group.value === option.value ? "bg-[#a15523] text-[#f2dcab] shadow-sm" : "text-[#003d55]/60 hover:text-[#003d55]"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-amber-100 p-4 text-sm font-semibold text-amber-950"
              >
                {error}
              </p>
            )}
            {loading && <p role="status">Wertung wird geladen …</p>}
            {phase === "final" ? (
              <p className="border-l-4 border-[#a15523] pl-4 text-sm leading-6">
                {official
                  ? "Die Ergebnisse dieser Klasse wurden nach dem Papierabgleich endgültig freigegeben."
                  : "Vorläufiger Live-Stand. Die endgültige Wertung erfolgt nach Abschluss des Finales und Prüfung der Papierlisten."}
              </p>
            ) : (
              <details className="text-sm leading-6">
                <summary className="cursor-pointer py-2 font-semibold">
                  Halbfinalwertung & Finaleinzug
                </summary>
                <p className="pt-2">
                  Summe der fünf Halbfinalrouten mit jeweils 0–100 Punkten
                  (maximal 500). Sechs Finalplätze plus alle Punktgleichen an
                  der Grenze. Die Finalstartliste wird gesondert bestätigt.
                </p>
              </details>
            )}
            {!loading && !selected && (
              <div className="rounded-xl border border-dashed border-[#003d55]/25 p-8 text-center">
                <Medal className="mx-auto mb-3 text-[#a15523]" />
                <h3 className="font-bold">
                  {phase === "final"
                    ? "Finalstartlisten noch nicht freigegeben"
                    : "Noch keine Wertung für diese Klasse"}
                </h3>
                <p className="mt-2 text-sm">
                  Neue Ergebnisse erscheinen hier automatisch.
                </p>
              </div>
            )}
            {selected && (
              <section
                aria-label={className(selected.league, selected.class_label)}
                className="overflow-hidden rounded-xl border border-[#003d55]/15 bg-white"
              >
                <header className="flex flex-wrap justify-between gap-2 bg-[#003d55] p-4 text-[#f2dcab]">
                  <h3 className="font-bold">
                    {className(selected.league, selected.class_label)}
                  </h3>
                  <span className="text-sm">
                    {phase === "final"
                      ? finalPhaseLabels[finalClass?.phase ?? "published"]
                      : `${selected.entries.length} Teilnehmer`}
                  </span>
                </header>
                <ol className="divide-y divide-[#003d55]/10">
                  {phase === "final"
                    ? finalClass?.entries.map((row, index) => {
                        const entry = row as PublicFinalEntry;
                        return (
                          <li
                            key={`${selected.key}-${index}`}
                            className="grid grid-cols-[2rem_1fr] items-start gap-3 p-4 sm:grid-cols-[2.5rem_1fr_auto]"
                          >
                            <span
                              aria-label={
                                entry.rank
                                  ? `Platz ${entry.rank}`
                                  : "Ohne Ergebnisrang"
                              }
                              className={`text-xl font-bold ${entry.rank === 1 ? "text-[#a15523]" : "text-[#003d55]"}`}
                            >
                              {entry.rank ?? "–"}
                            </span>
                            <div className="min-w-0">
                              <p className="break-words font-bold">
                                {entry.name}
                              </p>
                              <p className="mt-1 text-xs text-[#003d55]/70">
                                Start {entry.start_position} · Halbfinalplatz{" "}
                                {entry.semifinal_rank}
                              </p>
                              <p className="mt-2 text-sm font-semibold sm:hidden">
                                {resultLabel(entry)}
                              </p>
                            </div>
                            <strong className="hidden text-right text-sm sm:block">
                              {resultLabel(entry)}
                            </strong>
                          </li>
                        );
                      })
                    : (selected.entries as CompetitionStanding[]).map((row) => (
                        <li
                          key={row.profile_id}
                          className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 p-4"
                        >
                          <span
                            aria-label={`Platz ${row.rank}`}
                            className="text-xl font-bold"
                          >
                            {row.rank}
                          </span>
                          <div className="min-w-0">
                            <p className="break-words font-bold">{row.name}</p>
                            <p className="mt-1 text-xs text-[#003d55]/70">
                              {row.completed_routes}/5 Routen eingetragen{" "}
                              {row.completed_routes < 5 && "· unvollständig"}
                            </p>
                          </div>
                          <strong>{row.points} P.</strong>
                        </li>
                      ))}
                </ol>
                {phase === "final" && (
                  <details className="border-t bg-[#f7f3e9] p-4 text-xs leading-5">
                    <summary className="cursor-pointer py-1 font-semibold">
                      So wird gewertet
                    </summary>
                    <p className="pt-2">
                      Wertung: TOP vor Griffnummer → besserer Halbfinalplatz →
                      kürzere Zeit → geteilter Platz. Offene Ergebnisse und
                      nicht gestartete Personen erhalten keinen regulären Rang.
                    </p>
                  </details>
                )}
              </section>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
