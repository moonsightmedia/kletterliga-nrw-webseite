import { useEffect, useMemo, useState } from "react";
import {
  activeNotices,
  isFinalEntry,
  liveFrames,
} from "@/lib/competitionPresentation";
import { resultLabel, type LiveData } from "@/services/competitionFinal";

export default function CompetitionLiveView({
  data,
  season,
  lastSuccess,
  offline = false,
  demo = false,
}: {
  data: LiveData | null;
  season: string;
  lastSuccess: Date | null;
  offline?: boolean;
  demo?: boolean;
}) {
  const [tick, setTick] = useState(Date.now());
  const [frameKey, setFrameKey] = useState<string | null>(null);
  const [changedAt, setChangedAt] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const frames = useMemo(
    () =>
      liveFrames(
        data?.classes ?? [],
        data?.class_keys ?? [],
        data?.pinned_key ?? null,
      ),
    [data?.classes, data?.class_keys, data?.pinned_key],
  );
  const sequence = frames.map((frame) => frame.key).join("\n");
  const phase = data?.phase;
  const seconds = Math.min(120, Math.max(5, data?.interval_seconds ?? 15));
  const notices = activeNotices(data?.notices ?? [], "tv", tick);
  const fullscreen = notices.find((notice) => notice.fullscreen);
  const fullscreenId = fullscreen?.id;
  useEffect(() => {
    setFrameKey((current) =>
      frames.some((frame) => frame.key === current)
        ? current
        : (frames[0]?.key ?? null),
    );
    setChangedAt(Date.now());
    // Only a changed rotation structure restarts the timer; five-second data refreshes do not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, phase]);
  useEffect(() => {
    if (frames.length < 2 || fullscreenId) return;
    setChangedAt(Date.now());
    const timer = window.setInterval(() => {
      setFrameKey(
        (current) =>
          frames[
            (frames.findIndex((frame) => frame.key === current) + 1) %
              frames.length
          ].key,
      );
      setChangedAt(Date.now());
    }, seconds * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, seconds, fullscreenId, phase]);
  const frame = frames.find((item) => item.key === frameKey) ?? frames[0];
  const selected = data?.classes.find((item) => item.key === frame?.classKey);
  const classes = (data?.classes ?? []).filter((item) =>
    frames.some((frame) => frame.classKey === item.key),
  );
  const pageCount = Math.max(1, Math.ceil((selected?.entries.length ?? 0) / 8));
  const remaining = Math.min(
    seconds,
    Math.max(0, seconds - Math.floor((tick - changedAt) / 1000)),
  );
  const stale =
    offline || (!!lastSuccess && tick - lastSuccess.getTime() > 15000);
  const official = selected?.phase === "final";
  return (
    <div className="competition-tv flex min-h-screen flex-col bg-[#002637] px-[clamp(1rem,3vw,3.5rem)] py-[clamp(1rem,2vh,2rem)] text-[#f2dcab]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f2dcab]/20 pb-5">
        <div>
          <p className="stitch-kicker text-[#d58a4c]">
            KLETTERLIGA NRW {demo && "· TESTDATEN"}
          </p>
          <h1 className="stitch-headline mt-2 text-[clamp(2rem,3.5vw,4rem)]">
            {phase === "final" ? "Finale" : "Halbfinale"}{" "}
            <span className="text-[#d58a4c]">{season}</span>
          </h1>
        </div>
        <div className="text-right text-[clamp(.9rem,1.1vw,1.4rem)]">
          <p className="font-bold">
            {stale
              ? "Letzter Stand · Verbindung unterbrochen"
              : "LIVE · automatische Aktualisierung"}
          </p>
          <p className="mt-1 opacity-80">
            {lastSuccess
              ? `Abruf ${lastSuccess.toLocaleTimeString("de-DE")}`
              : "Verbindung wird aufgebaut"}
          </p>
          {stale && (
            <p role="alert" className="mt-2 text-amber-300">
              {data
                ? "Daten sind möglicherweise veraltet"
                : "Ergebnisse nicht verfügbar"}
            </p>
          )}
        </div>
      </header>
      {fullscreen ? (
        <main className="grid flex-1 place-content-center gap-8 py-12 text-center">
          <p className="stitch-kicker text-[#d58a4c]">Aktueller Hinweis</p>
          <h2 className="stitch-headline break-words text-[clamp(2rem,4vw,5rem)] leading-tight">
            {fullscreen.title}
          </h2>
          <p
            className={`mx-auto max-w-6xl break-words ${fullscreen.body.length > 280 ? "text-[clamp(1.2rem,2.1vw,2.5rem)]" : "text-[clamp(1.5rem,3vw,3.5rem)]"}`}
          >
            {fullscreen.body}
          </p>
        </main>
      ) : (
        <main className="flex-1 pt-5">
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[clamp(.9rem,1.3vw,1.5rem)] font-bold text-[#d58a4c]">
                    {selected.league === "lead" ? "Vorstieg" : "Toprope"} ·{" "}
                    {official
                      ? "Offizielle Wertung"
                      : phase === "final"
                        ? "Vorläufige Wertung"
                        : "Zwischenstand"}
                  </p>
                  <h2 className="stitch-headline mt-1 text-[clamp(2rem,3vw,3.8rem)]">
                    {selected.class_label}
                  </h2>
                </div>
                <p className="text-[clamp(.9rem,1.2vw,1.4rem)]">
                  {pageCount > 1 &&
                    `Seite ${(frame?.page ?? 0) + 1} von ${pageCount} · `}
                  {frames.length > 1
                    ? `Wechsel in ${remaining} s`
                    : data?.pinned_key
                      ? "Klasse fixiert"
                      : ""}
                </p>
              </div>
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-[#f2dcab] text-[#002637]">
                  <tr>
                    <th className="w-[10%] px-4 py-3 text-[clamp(.9rem,1.2vw,1.4rem)]">
                      PLATZ
                    </th>
                    <th className="px-4 py-3 text-[clamp(.9rem,1.2vw,1.4rem)]">
                      NAME
                    </th>
                    <th className="w-[30%] px-4 py-3 text-[clamp(.9rem,1.2vw,1.4rem)]">
                      {phase === "final"
                        ? "GRIFF / TOP · ZEIT"
                        : "PUNKTE · ROUTEN"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.entries
                    .slice((frame?.page ?? 0) * 8, ((frame?.page ?? 0) + 1) * 8)
                    .map((row, index) => (
                      <tr
                        key={`${frame?.key}-${index}`}
                        className="border-b border-[#f2dcab]/15 even:bg-[#f2dcab]/5"
                      >
                        <td className="px-4 py-[clamp(.5rem,1.1vh,.9rem)] text-[clamp(1.1rem,1.8vw,2.1rem)] font-black">
                          {row.rank ?? "–"}
                        </td>
                        <td className="break-words px-4 py-[clamp(.5rem,1.1vh,.9rem)] text-[clamp(1.1rem,1.8vw,2.1rem)] font-bold leading-tight">
                          {row.name}
                        </td>
                        <td className="px-4 py-[clamp(.5rem,1.1vh,.9rem)] text-[clamp(1rem,1.65vw,2rem)]">
                          {isFinalEntry(row)
                            ? resultLabel(row)
                            : `${row.points} P. · ${row.completed}/5`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!selected.entries.length && (
                <p className="py-12 text-center text-2xl">
                  Ergebnisse folgen nach dem ersten Start.
                </p>
              )}
            </>
          ) : (
            <div className="grid min-h-[50vh] place-content-center text-center">
              <h2 className="stitch-headline text-4xl">
                Wettkampfergebnisse folgen
              </h2>
              <p className="mt-4 text-xl">
                Die Anzeige aktualisiert sich automatisch.
              </p>
            </div>
          )}
        </main>
      )}
      <footer className="mt-5 space-y-3 border-t border-[#f2dcab]/20 pt-4">
        {!fullscreen && classes.length > 1 && (
          <div
            aria-label="Klassen der Anzeige"
            className="flex flex-wrap gap-x-5 gap-y-2 text-[clamp(.85rem,1vw,1.2rem)]"
          >
            {classes.map((item) => (
              <span
                key={item.key}
                className={
                  item.key === selected?.key
                    ? "font-black text-[#f2dcab]"
                    : "text-[#f2dcab]/60"
                }
              >
                {item.key === selected?.key && "● "}
                {item.league === "lead" ? "Vorstieg" : "Toprope"} ·{" "}
                {item.class_label}
              </span>
            ))}
          </div>
        )}
        {phase === "final" && !official && (
          <p className="text-[clamp(.8rem,1vw,1.15rem)] font-bold">
            Vorläufiger Live-Stand. Die endgültige Wertung erfolgt nach
            Abschluss des Finales und Prüfung der Papierlisten.
          </p>
        )}
        {!fullscreen &&
          notices
            .filter((item) => !item.fullscreen)
            .slice(0, 1)
            .map((item) => (
              <p
                key={item.id}
                className="rounded-lg bg-[#a15523] px-4 py-3 text-[clamp(1rem,1.4vw,1.7rem)] font-bold text-white"
              >
                {item.title}: {item.body}
              </p>
            ))}
      </footer>
    </div>
  );
}
