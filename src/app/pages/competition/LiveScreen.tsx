import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getLiveCompetition,
  resultLabel,
  type PublicFinalEntry,
  type LiveClass,
  type LiveData,
} from "@/services/competitionFinal";

const isFinal = (row: LiveClass["entries"][number]): row is PublicFinalEntry =>
  "has_result" in row;
export default function LiveScreen() {
  const { season } = useParams();
  const [data, setData] = useState<LiveData | null>(null);
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!season) return;
    let active = true;
    const load = () =>
      getLiveCompetition(season)
        .then((next) => {
          if (active) {
            setData(next);
            setLastSuccess(new Date());
            setOffline(false);
          }
        })
        .catch(() => {
          if (active) setOffline(true);
        });
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [season]);
  const classes = useMemo(
    () =>
      data?.classes.filter(
        (c) => !data.class_keys.length || data.class_keys.includes(c.key),
      ) ?? [],
    [data],
  );
  const intervalSeconds = data?.interval_seconds;
  const pinnedKey = data?.pinned_key;
  useEffect(() => {
    if (!intervalSeconds || pinnedKey) return;
    const id = window.setInterval(() => {
      setIndex((value) => value + 1);
      setPage(0);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [intervalSeconds, pinnedKey]);
  const selected =
    classes.find((c) => c.key === data?.pinned_key) ??
    classes[index % Math.max(1, classes.length)];
  const notices = data?.notices.filter((n) => n.show_tv) ?? [];
  const fullscreen = notices.find((n) => n.fullscreen);
  const rows = selected?.entries ?? [];
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const selectedKey = selected?.key;
  useEffect(() => {
    if (!selectedKey || rows.length <= pageSize) return;
    const id = window.setInterval(
      () => setPage((value) => (value + 1) % pageCount),
      5000,
    );
    return () => window.clearInterval(id);
  }, [selectedKey, rows.length, pageCount]);
  return (
    <div className="min-h-screen bg-[#003d55] p-[clamp(1rem,3vw,3rem)] font-sans text-[#f2dcab]">
      <header className="flex items-center justify-between gap-4 border-b border-[#f2dcab]/30 pb-4">
        <div>
          <p className="text-sm font-black tracking-[0.25em]">
            KLETTERLIGA NRW
          </p>
          <h1 className="mt-2 text-[clamp(2rem,4vw,4rem)] font-black leading-none">
            {data?.phase === "final" ? "FINALE" : "HALBFINALE"}{" "}
            <span className="text-[#d58a4c]">{season}</span>
          </h1>
        </div>
        <div className="text-right text-sm">
          <p>
            Live-Stand ·{" "}
            {lastSuccess?.toLocaleTimeString("de-DE") ??
              "Verbindung wird aufgebaut"}
          </p>
          {offline && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-amber-200 px-3 py-2 font-bold text-[#653414]"
            >
              {data
                ? "Verbindung unterbrochen · letzter Stand"
                : "Keine Verbindung · Ergebnisse nicht verfügbar"}
            </p>
          )}
        </div>
      </header>
      {fullscreen ? (
        <main className="grid min-h-[70vh] place-content-center px-8 text-center">
          <p className="mb-6 text-xl font-bold uppercase tracking-widest text-[#d58a4c]">
            Hinweis
          </p>
          <h2 className="text-[clamp(2.5rem,6vw,6rem)] font-black leading-tight">
            {fullscreen.title}
          </h2>
          <p className="mx-auto mt-8 max-w-5xl text-[clamp(1.5rem,3vw,3rem)]">
            {fullscreen.body}
          </p>
        </main>
      ) : (
        <main className="mx-auto max-w-[1600px] pt-8">
          {selected ? (
            <>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-lg uppercase tracking-widest text-[#d58a4c]">
                    {selected.league === "lead" ? "Vorstieg" : "Toprope"}
                  </p>
                  <h2 className="text-[clamp(2rem,4vw,4.5rem)] font-black leading-none">
                    {selected.class_label}
                  </h2>
                </div>
                <p className="text-lg">
                  {classes.length > 1 && !data?.pinned_key
                    ? `${(index % classes.length) + 1} / ${classes.length}`
                    : ""}{" "}
                  {pageCount > 1
                    ? `· Seite ${(page % pageCount) + 1}/${pageCount}`
                    : ""}
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#f2dcab]/25">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="bg-[#f2dcab] text-[#003d55]">
                    <tr>
                      <th className="w-[12%] p-4 text-lg">PLATZ</th>
                      <th className="p-4 text-lg">NAME</th>
                      <th className="w-[28%] p-4 text-lg">
                        {data?.phase === "final" ? "ERGEBNIS" : "PUNKTE"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .slice(
                        (page % pageCount) * pageSize,
                        (page % pageCount) * pageSize + pageSize,
                      )
                      .map((entry, i) => (
                        <tr
                          key={`${entry.name}-${i}`}
                          className="border-t border-[#f2dcab]/15 even:bg-[#f2dcab]/[0.06]"
                        >
                          <td className="p-4 text-[clamp(1.3rem,2.2vw,2.2rem)] font-black">
                            {entry.rank ?? "–"}
                          </td>
                          <td className="break-words p-4 text-[clamp(1.3rem,2.2vw,2.2rem)] font-bold">
                            {entry.name}
                          </td>
                          <td className="p-4 text-[clamp(1.2rem,2vw,2rem)]">
                            {isFinal(entry)
                              ? resultLabel(entry)
                              : `${entry.points} P. · ${entry.completed}/5`}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!rows.length && (
                <p className="mt-8 text-2xl">
                  Für diese Klasse liegen noch keine Ergebnisse vor.
                </p>
              )}
            </>
          ) : (
            <div className="grid min-h-[55vh] place-content-center text-center">
              <h2 className="text-4xl font-black">
                Wettkampfergebnisse folgen
              </h2>
              <p className="mt-4 text-xl">
                Die Anzeige wird automatisch aktualisiert.
              </p>
            </div>
          )}
        </main>
      )}
      <footer className="mx-auto mt-8 max-w-[1600px] border-t border-[#f2dcab]/30 pt-5">
        <p className="text-lg font-bold">
          {data?.phase === "final"
            ? "Vorläufiger Live-Stand. Die endgültige Wertung erfolgt nach Abschluss des Finales und Prüfung der Papierlisten."
            : "Halbfinale · aktuelle Zwischenwertung. Finalstartlisten werden gesondert bestätigt."}
        </p>
        {!fullscreen &&
          notices
            .filter((n) => !n.fullscreen)
            .map((n) => (
              <p
                key={n.id}
                className="mt-3 rounded-xl bg-[#a15523] p-4 text-lg font-bold text-white"
              >
                {n.title}: {n.body}
              </p>
            ))}
      </footer>
    </div>
  );
}
