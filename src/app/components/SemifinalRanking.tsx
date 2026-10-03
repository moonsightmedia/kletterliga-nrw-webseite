import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FinalAdmin, SemifinalRow } from "@/services/competitionFinal";
import type { CompetitionAssignment } from "@/services/competitionDay";
import { className } from "@/services/competitionFinal";
import { isOutOfCompetition, semifinalRankLabel } from "@/lib/competitionPresentation";

export default function SemifinalRanking({
  rows,
  results,
  assignments,
  audit = [],
}: {
  rows: SemifinalRow[];
  results: FinalAdmin["semifinal_results"];
  assignments: CompetitionAssignment[];
  audit?: FinalAdmin["semifinal_audit"];
}) {
  const first = rows[0];
  if (!first)
    return (
      <p className="p-5 text-sm">
        Noch keine Halbfinalteilnehmer in dieser Klasse.
      </p>
    );
  return (
    <section
      aria-label={`Halbfinalrangliste ${className(first.league, first.class_label)}`}
      className="overflow-hidden rounded-xl border border-[#003d55]/15 bg-white"
    >
      <header className="flex flex-wrap justify-between gap-2 bg-[#003d55] p-4 text-[#f2dcab]">
        <h3 className="font-bold">
          {className(first.league, first.class_label)}
        </h3>
        <span className="text-sm">
          {rows.filter((row) => row.completed === 5).length}/{rows.length}{" "}
          vollständig
        </span>
      </header>
      <Accordion type="multiple">
        {[...rows]
          .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "de"))
          .map((row) => {
            const numbers =
              assignments.find(
                (item) =>
                  item.league === row.league &&
                  item.class_label === row.class_label,
              )?.route_numbers ?? [];
            return (
              <AccordionItem
                key={row.profile_id}
                value={row.profile_id}
                className={`border-[#003d55]/10 ${isOutOfCompetition(row) ? "bg-[#f7f3e9] text-[#003d55]/65" : ""}`}
              >
                <AccordionTrigger
                  className="gap-3 px-4 py-4 text-left hover:bg-[#f7f3e9] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a15523]"
                  aria-label={`${row.name}: ${row.points} Punkte, ${row.completed} von 5 Routen – Ergebnisse ansehen`}
                >
                  <span className="grid flex-1 grid-cols-[2rem_1fr_auto] items-center gap-3">
                    <span className="stitch-headline text-2xl">
                      {semifinalRankLabel(row)}{!isOutOfCompetition(row) && row.rank !== null && "."}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-bold">
                        {row.name}
                      </span>
                      {isOutOfCompetition(row) && <span className="block text-xs">Außer Wertung</span>}
                      <span className="mt-1 block text-xs font-normal text-[#003d55]/70">
                        {row.completed}/5 Routen eingetragen
                        {row.completed < 5 && " · Einträge fehlen"}
                      </span>
                    </span>
                    <strong className="whitespace-nowrap">
                      {row.points} P.
                    </strong>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="bg-[#f7f3e9] px-4 pb-4">
                  <p className="mb-3 text-xs text-[#003d55]/70">
                    Gespeicherte Ergebnisse zählen automatisch. Keine weitere
                    Bestätigung erforderlich.
                  </p>
                  <div className="space-y-2">
                    {numbers.map((number) => {
                      const result = results.find(
                        (item) =>
                          item.profile_id === row.profile_id &&
                          item.route_number === number,
                      );
                      const settled = row.missing.some(
                        (item) => item.number === number && item.settled,
                      );
                      const correction = [...audit]
                        .filter(
                          (item) => result && item.result_id === result.id,
                        )
                        .sort((a, b) =>
                          b.created_at.localeCompare(a.created_at),
                        )[0];
                      return (
                        <div
                          key={number}
                          className="flex flex-wrap justify-between gap-2 rounded-lg border border-[#003d55]/10 bg-white p-3 text-sm"
                        >
                          <div>
                            <strong>Route {number}</strong>
                            <p className="mt-1">
                              {result
                                ? `${result.points} Punkte · ${result.zone === 0 ? "Kein Griff" : `Griff ${result.zone * 10}`}`
                                : settled
                                  ? "Nicht geklettert · 0 Punkte"
                                  : "Noch nicht eingetragen"}
                            </p>
                          </div>
                          {result && (
                            <div className="text-xs text-[#003d55]/70">
                              <p>
                                Eingetragen:{" "}
                                {new Date(result.created_at).toLocaleString(
                                  "de-DE",
                                )}
                              </p>
                              {correction && (
                                <p>
                                  Zuletzt korrigiert:{" "}
                                  {new Date(
                                    correction.created_at,
                                  ).toLocaleString("de-DE")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!numbers.length && (
                      <p className="text-sm">
                        Die Routenzuordnung ist noch nicht verfügbar.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
      </Accordion>
    </section>
  );
}
