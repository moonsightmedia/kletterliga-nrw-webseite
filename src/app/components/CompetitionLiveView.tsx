import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  activeNotices,
  isFinalEntry,
  liveFrames,
  livePageSize,
} from "@/lib/competitionPresentation";
import { resultLabel, type LiveData } from "@/services/competitionFinal";
import "./CompetitionLiveView.css";

const scoreLabel = (row: NonNullable<LiveData>["classes"][number]["entries"][number]) =>
  isFinalEntry(row) ? resultLabel(row) : `${row.points} P. · ${row.completed}/5`;

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
  const [pageSize, setPageSize] = useState(8);
  const tableRef = useRef<HTMLTableElement>(null);
  const tableSpaceRef = useRef<HTMLDivElement>(null);
  const classes = useMemo(() => {
    const selected = (data?.classes ?? []).filter(
      (item) => !data?.class_keys.length || data.class_keys.includes(item.key),
    );
    return selected.some((item) => item.key === data?.pinned_key)
      ? selected.filter((item) => item.key === data?.pinned_key)
      : selected;
  }, [data?.classes, data?.class_keys, data?.pinned_key]);
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
        pageSize,
      ),
    [data?.classes, data?.class_keys, data?.pinned_key, pageSize],
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
  const classIndex = classes.findIndex((item) => item.key === selected?.key);
  const nextClass = classes[(classIndex + 1) % classes.length];
  const pageCount = Math.max(1, Math.ceil((selected?.entries.length ?? 0) / pageSize));
  useLayoutEffect(() => {
    if (fullscreenId) return;
    let active = true;
    const measure = () => {
      const table = tableRef.current;
      const space = tableSpaceRef.current;
      const template = table?.tBodies[0]?.rows[0];
      if (!active || !table || !space || !template || !space.clientHeight) return;
      // Measure every selected class, not just this page. A long name on a later
      // page must not overflow, and polling/page changes must not change capacity.
      const probe = table.cloneNode(false) as HTMLTableElement;
      probe.setAttribute("aria-hidden", "true");
      Object.assign(probe.style, {
        position: "absolute", visibility: "hidden", pointerEvents: "none",
        width: `${table.getBoundingClientRect().width}px`, top: "0", left: "0",
      });
      const body = probe.createTBody();
      for (const item of classes) for (const entry of item.entries) {
        const row = template.cloneNode(true) as HTMLTableRowElement;
        [String(entry.rank ?? "–"), entry.name, scoreLabel(entry)].forEach(
          (value, index) => { row.cells[index].textContent = value; },
        );
        body.append(row);
      }
      space.append(probe);
      try {
        const rowHeight = Math.max(...Array.from(body.rows, (row) => row.getBoundingClientRect().height));
        setPageSize(livePageSize(space.clientHeight, table.tHead?.getBoundingClientRect().height ?? 0, rowHeight));
      } finally { probe.remove(); }
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (tableSpaceRef.current) observer?.observe(tableSpaceRef.current);
    document.fonts?.addEventListener("loadingdone", measure);
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      active = false;
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
      window.removeEventListener("resize", measure);
    };
  }, [classes, frame?.key, fullscreenId]);
  const remaining = Math.min(
    seconds,
    Math.max(0, seconds - Math.floor((tick - changedAt) / 1000)),
  );
  const stale =
    offline || (!!lastSuccess && tick - lastSuccess.getTime() > 15000);
  const official = selected?.phase === "final";
  return (
    <div className="competition-tv" data-page-size={pageSize}>
      <header className="tv-header">
        <div>
          <p className="stitch-kicker text-[#d58a4c]">
            KLETTERLIGA NRW {demo && "· TESTDATEN"}
          </p>
          <h1 className="stitch-headline tv-title">
            {phase === "final" ? "Finale" : "Halbfinale"}{" "}
            <span className="text-[#d58a4c]">{season}</span>
          </h1>
        </div>
        <div className="tv-connection">
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
        <main key={fullscreenId} className="tv-notice tv-enter">
          <p className="stitch-kicker text-[#d58a4c]">Aktueller Hinweis</p>
          <h2 className="stitch-headline tv-notice-title">
            {fullscreen.title}
          </h2>
          <p
            className={`tv-notice-body ${fullscreen.body.length > 280 ? "tv-notice-long" : ""}`}
          >
            {fullscreen.body}
          </p>
        </main>
      ) : (
        <main key={`${phase}:${frame?.key}`} className="tv-ranking tv-enter">
          {selected ? (
            <>
              <div className="tv-class-header">
                <div>
                  <p className="tv-class-status">
                    {selected.league === "lead" ? "Vorstieg" : "Toprope"} ·{" "}
                    {official
                      ? "Offizielle Wertung"
                      : phase === "final"
                        ? "Vorläufige Wertung"
                        : "Zwischenstand"}
                  </p>
                  <h2 className="stitch-headline tv-class-title">
                    {selected.class_label}
                  </h2>
                </div>
                <p className="tv-page-status">
                  {pageCount > 1 &&
                    `Seite ${(frame?.page ?? 0) + 1} von ${pageCount} · `}
                  {frames.length > 1
                    ? `Wechsel in ${remaining} s`
                    : data?.pinned_key
                      ? "Klasse fixiert"
                      : ""}
                </p>
              </div>
              <div ref={tableSpaceRef} className="tv-table-space">
              <table ref={tableRef} className="tv-table">
                <thead>
                  <tr>
                    <th className="tv-rank">
                      PLATZ
                    </th>
                    <th>
                      NAME
                    </th>
                    <th className="tv-score">
                      {phase === "final"
                        ? "GRIFF / TOP · ZEIT"
                        : "PUNKTE · ROUTEN"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.entries
                    .slice((frame?.page ?? 0) * pageSize, ((frame?.page ?? 0) + 1) * pageSize)
                    .map((row, index) => (
                      <tr
                        key={`${frame?.key}-${index}`}
                      >
                        <td className="tv-rank">
                          {row.rank ?? "–"}
                        </td>
                        <td className="tv-name">
                          {row.name}
                        </td>
                        <td className="tv-score">
                          {scoreLabel(row)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!selected.entries.length && (
                <p className="tv-empty">
                  Ergebnisse folgen nach dem ersten Start.
                </p>
              )}
              </div>
            </>
          ) : (
            <div className="tv-empty">
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
      <footer className="tv-footer">
        {!fullscreen && classes.length > 1 && (
          <div
            aria-label="Klassen der Anzeige"
            className="tv-class-sequence"
          >
            <span>Klasse {classIndex + 1} von {classes.length}</span>
            <span>Als Nächstes: {nextClass?.league === "lead" ? "Vorstieg" : "Toprope"} · {nextClass?.class_label}</span>
          </div>
        )}
        {phase === "final" && !official && (
          <p className="tv-disclaimer">
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
                className="tv-banner"
              >
                {item.title}: {item.body}
              </p>
            ))}
        {!fullscreen && frames.length > 1 && <div className="tv-progress" aria-hidden="true"><div key={changedAt} style={{ width: `${100 * (seconds - remaining) / seconds}%` }} /></div>}
      </footer>
    </div>
  );
}
