import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
import {
  classKey,
  className,
  getFinalAdmin,
  resultLabel,
  type FinalAdmin,
} from "@/services/competitionFinal";

export default function CompetitionPrint() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  return (
    <CompetitionPrintContent
      season={season}
      settingsLoading={settingsLoading}
    />
  );
}
export function CompetitionPrintContent({
  season,
  settingsLoading = false,
  load = getFinalAdmin,
  backHref = "/app/admin/league/wettkampf",
  demo = false,
}: {
  season?: string;
  settingsLoading?: boolean;
  load?: typeof getFinalAdmin;
  backHref?: string;
  demo?: boolean;
}) {
  const [params] = useSearchParams();
  const [data, setData] = useState<FinalAdmin | null>(null);
  const [error, setError] = useState("");
  const selected = params.get("klasse");
  const results = params.get("art") === "ergebnis";
  useEffect(() => {
    if (!season) return;
    let active = true;
    load(season)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Druckdaten fehlen.");
      });
    return () => {
      active = false;
    };
  }, [season, load]);
  const classes =
    data?.classes.filter(
      (c) =>
        c.phase !== "preparation" &&
        (!selected || classKey(c.league, c.class_label) === selected),
    ) ?? [];
  return (
    <div className="min-h-screen bg-white text-[#003d55]">
      <div className="print:hidden mx-auto flex max-w-5xl flex-wrap items-center gap-3 p-5">
        <StitchButton
          className="normal-case tracking-normal shadow-none"
          variant="outline"
          asChild
        >
          <Link to={backHref}>Zurück zur Wettkampfzentrale</Link>
        </StitchButton>
        <StitchButton
          className="normal-case tracking-normal shadow-none"
          disabled={!classes.length}
          onClick={() => window.print()}
        >
          Drucken / als PDF speichern
        </StitchButton>
      </div>
      {error && (
        <p role="alert" className="mx-auto max-w-5xl p-5 text-red-800">
          {error}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="p-5">
          {settingsLoading ? "Saison" : "Druckdaten"} wird geladen …
        </p>
      )}
      {data && !classes.length && (
        <p className="p-5">Keine bestätigte Finalklasse für diese Auswahl.</p>
      )}
      {classes.map((c, index) => (
        <section
          key={c.id}
          className={`mx-auto max-w-[190mm] px-4 py-6 print:px-0 print:py-0 ${index ? "break-before-page" : "break-before-auto"}`}
        >
          <header className="mb-6 border-b-2 border-[#003d55] pb-3">
            <p className="text-xs font-bold uppercase tracking-widest">
              Kletterliga NRW · Finale {season}
              {demo && " · TESTDRUCK · ERFUNDENE DATEN"}
            </p>
            <div className="flex items-end justify-between gap-4">
              <h1 className="mt-2 text-2xl font-black">
                {results ? "Ergebnisliste" : "Finalstartliste"} ·{" "}
                {className(c.league, c.class_label)}
              </h1>
              <span className="text-sm font-bold">Version {c.version}</span>
            </div>
            <p className="mt-2 text-sm">
              Finalroute{" "}
              {data.routes.find((r) => r.id === c.route_id)?.number ?? "–"} · Stand{" "}
              {c.published_at
                ? new Date(c.published_at).toLocaleString("de-DE")
                : "–"}
            </p>
            {results && (
              <p className="mt-2 text-sm font-bold">
                {c.phase === "final"
                  ? "Endgültige Wertung · Papierlisten geprüft"
                  : "VORLÄUFIG · Papierprüfung ausstehend"}
              </p>
            )}
            {c.stale && (
              <p className="mt-2 border border-black p-2 font-bold">
                Achtung: Halbfinalwertung seit Listenfreigabe geändert. Liste
                prüfen.
              </p>
            )}
          </header>
          <table className="w-full border-collapse text-sm">
            <thead className="[display:table-header-group]">
              <tr className="border-y-2 border-[#003d55] bg-[#f2dcab]">
                <th className="w-10 p-2 text-left">
                  {results ? "Platz" : "Start"}
                </th>
                <th className="p-2 text-left">Name</th>
                <th className="w-16 p-2 text-left">HF-Platz</th>
                <th className="w-24 p-2 text-left">Griff / TOP</th>
                <th className="w-20 p-2 text-left">Dauer</th>
                <th className="w-24 p-2 text-left">Bemerkung</th>
              </tr>
            </thead>
            <tbody>
              {[...c.entries]
                .sort((a, b) =>
                  results
                    ? (a.rank ?? 999) - (b.rank ?? 999) ||
                      a.start_position - b.start_position
                    : a.start_position - b.start_position,
                )
                .map((e) => (
                  <tr
                    key={e.entry_id}
                    className="break-inside-avoid border-b border-[#003d55]/40"
                  >
                    <td className="p-2 align-top font-bold">
                      {results ? (e.rank ?? "–") : e.start_position}
                    </td>
                    <td className="break-words p-2 align-top font-bold">
                      {e.name}
                    </td>
                    <td className="p-2 align-top">{e.semifinal_rank}</td>
                    <td className="h-16 p-2 align-top">
                      {results && e.status === "ready" && e.attempt_id
                        ? e.is_top
                          ? "TOP"
                          : e.grip
                        : ""}
                    </td>
                    <td className="p-2 align-top">
                      {results && e.status === "ready" && e.attempt_id
                        ? `${Math.floor((e.seconds ?? 0) / 60)}:${String((e.seconds ?? 0) % 60).padStart(2, "0")}`
                        : ""}
                    </td>
                    <td className="p-2 align-top">
                      {results && e.status !== "ready" ? resultLabel(e) : ""}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="mt-10 grid grid-cols-2 gap-8 text-sm">
            <p className="border-t border-[#003d55] pt-2">
              Schiedsrichter · Name / Unterschrift
            </p>
            <p className="border-t border-[#003d55] pt-2">
              Zeitnahme · Name / Unterschrift
            </p>
          </div>
        </section>
      ))}
      <style>{`@page { size: A4 portrait; margin: 12mm; } @media print { body { background: #fff !important; } .break-before-page { break-before: page; } table { width: 100%; } thead { display: table-header-group; } tr { break-inside: avoid; } }`}</style>
    </div>
  );
}
