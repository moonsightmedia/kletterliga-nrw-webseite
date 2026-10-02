import { useState, type ComponentProps } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Download,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { finalPhaseLabels } from "@/lib/competitionPresentation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StitchButton,
  StitchTextField,
} from "@/app/components/StitchPrimitives";
import {
  classKey,
  className,
  downloadFinalCsv,
  resultLabel,
  type FinalAdmin,
  type FinalClass,
  type FinalEntry,
  type League,
  type SemifinalRow,
} from "@/services/competitionFinal";
import type { CompetitionCenterSource } from "@/app/pages/admin/CompetitionCenter";

export function CompetitionButton({
  className: style,
  ...props
}: ComponentProps<typeof StitchButton>) {
  return (
    <StitchButton
      {...props}
      className={cn(
        "min-h-11 normal-case text-sm tracking-normal shadow-none",
        style,
      )}
    />
  );
}
export function CompetitionField({
  className: style,
  label,
  hint,
  error,
  icon,
  ...props
}: ComponentProps<typeof StitchTextField>) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[#003d55]/25 bg-white px-3 focus-within:ring-2 focus-within:ring-[#a15523]">
        {icon}
        <input
          {...props}
          className={cn(
            "min-h-12 min-w-0 w-full bg-transparent text-base font-normal focus:outline-none disabled:opacity-50 sm:text-sm",
            style,
          )}
        />
      </span>
      {error ? (
        <span role="alert" className="text-xs text-red-800">
          {error}
        </span>
      ) : (
        hint && (
          <span className="text-xs font-normal text-[#003d55]/70">{hint}</span>
        )
      )}
    </label>
  );
}
export const competitionHeading =
  "[font-family:inherit] text-lg font-bold tracking-normal";
export function CompetitionDialogContent({
  busy = false,
  children,
  ...props
}: ComponentProps<typeof DialogContent> & { busy?: boolean }) {
  return (
    <DialogContent
      {...props}
      hideCloseButton
      className="grid max-h-[90dvh] gap-4 overflow-y-auto rounded-t-xl p-5 text-[#003d55] sm:w-full sm:max-w-lg sm:overflow-y-auto"
    >
      {children}
      <DialogClose
        aria-label="Schließen"
        disabled={busy}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-xl hover:bg-[#003d55]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
      >
        ×
      </DialogClose>
    </DialogContent>
  );
}
const panel = "rounded-xl border border-[#003d55]/15 bg-white p-4 sm:p-5";
const input =
  "min-h-11 w-full rounded-xl border border-[#003d55]/25 bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]";
const when = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "–";
const auditValue = (value: unknown) => {
  if (!value || typeof value !== "object") return "–";
  const item = value as Record<string, unknown>;
  if (item.grip !== undefined || item.is_top === true)
    return `${item.is_top ? "TOP" : `Griff ${item.grip}`} · ${item.seconds ?? "?"} s`;
  if (item.status !== undefined)
    return item.status === "dns"
      ? "Nicht gestartet"
      : item.status === "incident"
        ? "Zwischenfall ungeklärt"
        : "Regulär";
  return "–";
};
export type CompetitionAction = (
  action: () => Promise<unknown>,
  success: string,
) => Promise<boolean>;
type SharedProps = {
  data: FinalAdmin;
  season: string;
  busy: boolean;
  error: string;
  source: CompetitionCenterSource;
  run: CompetitionAction;
  printHref: string;
};

type Decision = {
  title: string;
  detail: string;
  button: string;
  reason?: boolean;
  version?: number;
  action: (reason: string) => Promise<unknown>;
  success: string;
};
export function CompetitionDecisionDialog({
  decision,
  busy,
  error,
  currentVersion,
  onClose,
  run,
}: {
  decision: Decision | null;
  busy: boolean;
  error: string;
  currentVersion?: number;
  onClose: () => void;
  run: CompetitionAction;
}) {
  const [reason, setReason] = useState("");
  const [failed, setFailed] = useState(false);
  const changed =
    decision?.version !== undefined && decision.version !== currentVersion;
  return (
    <Dialog
      open={Boolean(decision)}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
          setReason("");
          setFailed(false);
        }
      }}
    >
      <CompetitionDialogContent busy={busy}>
        <DialogHeader className="px-0 pt-0 text-left">
          <DialogTitle className={competitionHeading}>
            {decision?.title}
          </DialogTitle>
          <DialogDescription>{decision?.detail}</DialogDescription>
        </DialogHeader>
        {changed && (
          <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">
            Die Klasse wurde inzwischen geändert. Dialog schließen und den
            aktuellen Stand prüfen.
          </p>
        )}
        {decision?.reason && (
          <CompetitionField
            label="Begründung"
            maxLength={500}
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
        {failed && (
          <p role="alert" className="text-sm text-red-800">
            {error || "Nicht gespeichert. Bitte erneut prüfen."}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <CompetitionButton
            variant="outline"
            disabled={busy}
            onClick={() => {
              onClose();
              setReason("");
              setFailed(false);
            }}
          >
            Abbrechen
          </CompetitionButton>
          <CompetitionButton
            disabled={
              busy || changed || Boolean(decision?.reason && !reason.trim())
            }
            onClick={() => {
              if (!decision) return;
              void run(() => decision.action(reason), decision.success).then(
                (ok) => {
                  if (ok) {
                    onClose();
                    setReason("");
                    setFailed(false);
                  } else setFailed(true);
                },
              );
            }}
          >
            {busy ? "Speichern …" : decision?.button}
          </CompetitionButton>
        </div>
      </CompetitionDialogContent>
    </Dialog>
  );
}

export function CompetitionFinalRoutes({ data, season, busy, source, run }: Pick<SharedProps, "data" | "season" | "busy" | "source" | "run">) {
  const [routeNumber, setRouteNumber] = useState("1");
  const [routeName, setRouteName] = useState("");
  const [maxGrip, setMaxGrip] = useState("30");
  const existingRoute = data.routes.find((route) => route.number === Number(routeNumber));
  return (<section aria-label="Finalrouten einrichten" className="space-y-4">
      <div className={panel}>
        <h2 className="text-lg font-semibold">
          Finalrouten · {data.routes.length} eingerichtet
        </h2>
        <div className="mt-4 space-y-4">
          {data.routes.length > 0 && (
            <ul className="divide-y text-sm">
              {data.routes.map((item) => (
                <li key={item.id} className="py-2">
                  Route {item.number} · {item.name} · letzter Griff{" "}
                  {item.max_grip}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-[5rem_1fr_7rem]">
            <label className="grid gap-1 text-sm">
              Nummer
              <input
                type="number"
                min={1}
                max={99}
                className={input}
                value={routeNumber}
                onChange={(event) => setRouteNumber(event.target.value)}
              />
            </label>
            <CompetitionField
              label="Routenname"
              value={routeName}
              maxLength={100}
              onChange={(event) => setRouteName(event.target.value)}
            />
            <label className="grid gap-1 text-sm">
              Letzter Griff
              <input
                type="number"
                min={1}
                max={999}
                className={input}
                value={maxGrip}
                onChange={(event) => setMaxGrip(event.target.value)}
              />
            </label>
          </div>
          {existingRoute && <p className="text-sm">Route {existingRoute.number} ist bereits eingerichtet: {existingRoute.name}. Speichern aktualisiert diese Route.</p>}
          <CompetitionButton
            disabled={
              busy ||
              !routeName.trim() ||
              !Number.isInteger(Number(routeNumber)) ||
              Number(routeNumber) < 1 ||
              Number(routeNumber) > 99 ||
              !Number.isInteger(Number(maxGrip)) ||
              Number(maxGrip) < 1 ||
              Number(maxGrip) > 999
            }
            onClick={() =>
              void run(
                () =>
                  source.saveFinalRoute(
                    season,
                    Number(routeNumber),
                    routeName,
                    Number(maxGrip),
                  ),
                "Finalroute gespeichert.",
              ).then((ok) => {
                if (ok) setRouteName("");
              })
            }
          >
            Route speichern
          </CompetitionButton>
          <p className="text-xs text-[#003d55]/70">
            Mehrere Klassen können dieselbe Route nutzen. Freigegebene Routen
            sind gesperrt.
          </p>
        </div>
      </div>
  </section>);
}

export function CompetitionRosterPanel({
  data,
  season,
  busy,
  error,
  source,
  run,
  printHref,
  group,
  phase,
  onSemifinal,
}: SharedProps & {
  group?: { league: League; label: string; rows: SemifinalRow[] };
  phase: string;
  onSemifinal: () => void;
}) {
  const [routeSelection, setRouteSelection] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  if (!group)
    return <p className="py-6 text-sm">Noch keine Klassen vorhanden.</p>;
  const key = classKey(group.league, group.label);
  const c = data.classes.find(
    (item) => classKey(item.league, item.class_label) === key,
  );
  const mutable = !c || ["preparation", "published"].includes(c.phase);
  const routeId =
    routeSelection?.key === key ? routeSelection.id : (c?.route_id ?? "");
  const route = data.routes.find((item) => item.id === routeId);
  const eligible = [...group.rows]
    .filter((row) => !row.excluded)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "de"));
  const boundary = eligible[5]?.points;
  const proposed = eligible.filter(
    (row) => boundary === undefined || row.points >= boundary,
  );
  const missing = group.rows.reduce(
    (total, row) => total + (row.excluded ? 0 : row.missing.filter((item) => !item.settled).length),
    0,
  );
  const ready =
    phase === "closed" &&
    missing === 0 &&
    proposed.length > 0 &&
    Boolean(route);
  const confirmed = Boolean(c?.entries.length && c.phase !== "preparation");
  const canExclude = mutable && phase === "closed";
  const startRows = confirmed
    ? [...c!.entries].sort((a, b) => a.start_position - b.start_position)
    : [...proposed].sort(
        (a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "de"),
      );
  return (
    <div className="space-y-4">
      <section className={panel} aria-label="Finalstartliste">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={competitionHeading}>
              {confirmed
                ? "Startreihenfolge"
                : "Vorgeschlagene Startreihenfolge"}
            </h3>
            <p className="mt-1 text-sm text-[#003d55]/70">
              {startRows.length} Starter{c && ` · Version ${c.version}`}
              {!confirmed && " · umgekehrter Halbfinalplatz"}
            </p>
          </div>
          {confirmed && (
            <CompetitionButton asChild variant="outline">
              <Link
                target="_blank"
                rel="noreferrer"
                to={`${printHref}?klasse=${encodeURIComponent(key)}`}
              >
                <Printer size={16} />
                Startliste drucken
              </Link>
            </CompetitionButton>
          )}
        </div>
        {c?.stale && (
          <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">
            Halbfinale geändert.{" "}
            {mutable
              ? "Finalfeld erneut prüfen, bestätigen und neu drucken."
              : "Das gestartete Finalfeld bleibt bestehen. Änderungen im Verlauf prüfen."}
          </p>
        )}
        {c?.phase === "published" && (
          <p className="mt-3 text-xs text-[#a15523]">
            Aktueller Listenstand v{c.version} · nach Änderungen neu drucken.
          </p>
        )}
        <ol className="mt-4 divide-y divide-[#003d55]/10">
          {startRows.map((row, index) => {
            const entry = "entry_id" in row ? row : null;
            const locked =
              Boolean(entry?.attempt_id) || entry?.status !== "ready";
            const neighbourLocked = (direction: number) => {
              const other = c?.entries.find(
                (item) =>
                  item.start_position ===
                  (entry?.start_position ?? 0) + direction,
              );
              return Boolean(
                other && (other.attempt_id || other.status !== "ready"),
              );
            };
            return (
              <li
                key={entry?.entry_id ?? row.profile_id}
                className="flex min-w-0 items-center gap-3 py-3"
              >
                <span className="w-6 shrink-0 font-bold">
                  {entry?.start_position ?? index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{row.name}</p>
                  <p className="mt-1 text-xs text-[#003d55]/70">
                    Halbfinalplatz{" "}
                    {entry?.semifinal_rank ?? (row as SemifinalRow).rank}
                    {entry?.status === "dns" && " · Nicht gestartet"}
                    {entry?.status === "incident" && " · Zwischenfall"}
                  </p>
                </div>
                {entry && c && ["published", "running"].includes(c.phase) && (
                  <div className="flex shrink-0 gap-1">
                    {[-1, 1].map((direction) => (
                      <CompetitionButton
                        key={direction}
                        variant="outline"
                        size="sm"
                        className="w-11 px-0"
                        aria-label={`${row.name} ${direction < 0 ? "früher" : "später"} starten`}
                        disabled={
                          busy ||
                          locked ||
                          neighbourLocked(direction) ||
                          entry.start_position + direction < 1 ||
                          entry.start_position + direction > c.entries.length
                        }
                        onClick={() =>
                          void run(
                            () =>
                              source.moveFinalEntry(
                                entry.entry_id,
                                entry.start_position + direction,
                                c.version,
                              ),
                            "Startreihenfolge gespeichert. Liste neu drucken.",
                          )
                        }
                      >
                        {direction < 0 ? (
                          <ArrowUp size={17} />
                        ) : (
                          <ArrowDown size={17} />
                        )}
                      </CompetitionButton>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {!startRows.length && (
          <p className="py-5 text-sm">Keine verfügbaren Finalstarter.</p>
        )}
        {mutable && (
          <div className="mt-4 space-y-3 border-t border-[#003d55]/15 pt-4">
            <label className="block text-sm font-semibold">Finalroute</label>
            <Select
              value={routeId}
              disabled={busy}
              onValueChange={(id) => setRouteSelection({ key, id })}
            >
              <SelectTrigger
                aria-label="Finalroute"
                className="min-h-12 bg-white"
              >
                <SelectValue placeholder="Route wählen" />
              </SelectTrigger>
              <SelectContent>
                {data.routes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    Route {item.number} · {item.name} · Griff {item.max_grip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {phase !== "closed" ? (
              <p className="text-sm">Halbfinaleingabe zuerst schließen.</p>
            ) : missing > 0 ? (
              <CompetitionButton variant="outline" onClick={onSemifinal}>
                {missing} fehlende Routeneinträge klären
              </CompetitionButton>
            ) : null}
            <CompetitionButton
              disabled={busy || !ready}
              onClick={() =>
                setDecision({
                  title: "Finalfeld bestätigen",
                  detail: `${className(group.league, group.label)} · ${proposed.length} Starter · Route ${route?.number}. Die Liste wird veröffentlicht. Eine bisherige Startreihenfolge wird durch die umgekehrte Halbfinalreihenfolge ersetzt.`,
                  button: "Bestätigen",
                  version: c?.version ?? 0,
                  action: () =>
                    source.publishFinalClass(
                      season,
                      group.league,
                      group.label,
                      routeId,
                      c?.station_no ?? 1,
                      c?.version ?? 0,
                    ),
                  success:
                    "Finalstartliste freigegeben. Aktuelle Liste drucken.",
                })
              }
            >
              Finalfeld bestätigen
            </CompetitionButton>
          </div>
        )}
        {confirmed && !mutable && (
          <p className="mt-3 text-xs text-[#003d55]/70">
            Route {route?.number ?? "–"} · Nachrücken ist seit Klassenstart
            gesperrt.
          </p>
        )}
      </section>
      <details className={panel}>
        <summary className="cursor-pointer py-1 text-sm font-semibold">
          Halbfinalfeld & Nachrücker
        </summary>
        <ul className="mt-3 divide-y divide-[#003d55]/10">
          {group.rows.map((row) => (
            <li
              key={row.profile_id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="break-words font-semibold">
                  {row.rank}. {row.name}
                </p>
                <p className="mt-1 text-xs text-[#003d55]/70">
                  {row.points} Punkte ·{" "}
                  {row.excluded === "dns"
                    ? "Nicht erschienen"
                    : row.excluded === "withdrawn"
                      ? "Zurückgezogen"
                      : proposed.some(
                            (item) => item.profile_id === row.profile_id,
                          )
                        ? "Finalvorschlag"
                        : "Nachrücker"}
                </p>
              </div>
              {canExclude && (
                <CompetitionButton
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDecision({
                      title: row.excluded
                        ? "Ausfall zurücknehmen"
                        : "Teilnahme ändern",
                      detail: `${row.name} · ${className(group.league, group.label)}. Anschließend Finalfeld neu bestätigen und Startliste drucken.`,
                      button: row.excluded
                        ? "Zurücknehmen"
                        : "Nicht erschienen",
                      reason: true,
                      version: c?.version ?? 0,
                      action: (reason) =>
                        source.setFinalExclusion(
                          season,
                          row.profile_id,
                          row.excluded ? null : "dns",
                          reason,
                        ),
                      success:
                        "Teilnahmestatus gespeichert. Finalfeld erneut bestätigen.",
                    })
                  }
                >
                  {row.excluded ? "Zurücknehmen" : "Nicht erschienen"}
                </CompetitionButton>
              )}
              {canExclude && !row.excluded && (
                <CompetitionButton
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDecision({
                      title: "Rückzug dokumentieren",
                      detail: `${row.name} · ${className(group.league, group.label)}. Anschließend Finalfeld neu bestätigen und Startliste drucken.`,
                      button: "Zurückgezogen markieren",
                      reason: true,
                      version: c?.version ?? 0,
                      action: (reason) =>
                        source.setFinalExclusion(
                          season,
                          row.profile_id,
                          "withdrawn",
                          reason,
                        ),
                      success:
                        "Rückzug gespeichert. Finalfeld erneut bestätigen.",
                    })
                  }
                >
                  Zurückgezogen
                </CompetitionButton>
              )}
            </li>
          ))}
        </ul>
      </details>
      <CompetitionButton asChild variant="outline">
        <Link target="_blank" rel="noreferrer" to={printHref}>
          <Printer size={16} />
          Alle Startlisten drucken
        </Link>
      </CompetitionButton>
      <CompetitionDecisionDialog
        decision={decision}
        busy={busy}
        error={error}
        currentVersion={c?.version ?? 0}
        onClose={() => setDecision(null)}
        run={run}
      />
    </div>
  );
}

export function CompetitionFinalPanel({
  data,
  season,
  busy,
  error,
  source,
  run,
  printHref,
  finalClass: c,
  stationHref,
  onRoster,
}: SharedProps & {
  finalClass?: FinalClass;
  stationHref: string;
  onRoster: () => void;
}) {
  const [selection, setSelection] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [status, setStatus] = useState<FinalEntry["status"]>("ready");
  const [reason, setReason] = useState("");
  const [failed, setFailed] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  if (!c || c.phase === "preparation")
    return (
      <div className={panel}>
        <p className="mb-4 text-sm">
          Für diese Klasse ist noch keine Finalstartliste freigegeben.
        </p>
        <CompetitionButton onClick={onRoster}>
          Startliste vorbereiten
        </CompetitionButton>
      </div>
    );
  const chosen = c.entries.find((entry) => entry.entry_id === selection?.id);
  const conflict = Boolean(selection && selection.version !== c.version);
  const pending = c.entries.filter(
    (entry) =>
      entry.status === "incident" ||
      (entry.status === "ready" && (!entry.attempt_id || !entry.checked_at)),
  ).length;
  const missing = c.entries.filter(
    (entry) => entry.status === "ready" && !entry.attempt_id,
  ).length;
  const checked = c.entries.filter(
    (entry) => entry.checked_at && entry.status === "ready",
  ).length;
  const mutable = ["published", "running", "review"].includes(c.phase);
  const exportHref = `${printHref}?klasse=${encodeURIComponent(classKey(c.league, c.class_label))}`;
  const phaseDecision = (
    next: FinalClass["phase"],
    title: string,
    detail: string,
    needsReason = false,
  ) =>
    setDecision({
      title,
      detail: `${className(c.league, c.class_label)}. ${detail}`,
      button: title,
      version: c.version,
      reason: needsReason,
      action: (text) => source.setFinalPhase(c.id, next, c.version, text),
      success:
        next === "final"
          ? "Klassenwertung offiziell freigegeben."
          : "Klassenstatus gespeichert.",
    });
  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className={competitionHeading}>{finalPhaseLabels[c.phase]}</h3>
            <p className="mt-1 text-sm text-[#003d55]/70">
              {checked}/
              {
                c.entries.filter(
                  (entry) => entry.status === "ready" && entry.attempt_id,
                ).length
              }{" "}
              Ergebnisse mit Papier abgeglichen
              {missing > 0 && ` · ${missing} Ergebnisse fehlen`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.phase === "published" && (
              <CompetitionButton
                disabled={busy || c.stale || !data.final_password_set}
                onClick={() =>
                  phaseDecision(
                    "running",
                    "Klasse starten",
                    "Die Startliste ist verteilt und die Zeitnahme bereit. Nachrücken ist danach gesperrt.",
                  )
                }
              >
                Klasse starten
              </CompetitionButton>
            )}
            {c.phase === "running" && (
              <CompetitionButton
                disabled={busy}
                onClick={() =>
                  phaseDecision(
                    "review",
                    "Eingabe schließen",
                    `${missing ? `${missing} Ergebnisse fehlen noch. ` : ""}Die Handys können danach keine Ergebnisse speichern. Papierabgleich und Ausfälle können weiter geklärt werden.`,
                  )
                }
              >
                Eingabe schließen
              </CompetitionButton>
            )}
            {c.phase === "review" && (
              <CompetitionButton
                disabled={busy || pending > 0}
                onClick={() =>
                  phaseDecision(
                    "final",
                    "Offiziell freigeben",
                    "Alle Ergebnisse und Ausfälle sind geklärt. Die Ergebnisliste wird offiziell veröffentlicht.",
                  )
                }
              >
                Offiziell freigeben
              </CompetitionButton>
            )}
          </div>
        </div>
        {c.phase === "published" && !data.final_password_set && (
          <p role="alert" className="mt-3 text-sm text-[#a15523]">
            Finalpasswort zuerst einrichten.
          </p>
        )}
        {c.phase === "review" && pending > 0 && (
          <p className="mt-3 text-sm">
            Vor Freigabe noch {pending} {pending === 1 ? "Eintrag" : "Einträge"}{" "}
            prüfen oder klären.
          </p>
        )}
        {c.stale && (
          <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
            Halbfinalwertung geändert.{" "}
            {c.phase === "published"
              ? "Startliste erneut prüfen und bestätigen."
              : "Das gestartete Finalfeld bleibt bestehen. Änderungen im Verlauf prüfen."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#003d55]/15 pt-3 text-sm">
          <CompetitionButton asChild variant="outline">
            <Link target="_blank" rel="noreferrer" to={stationHref}>
              Finaleingabe öffnen
            </Link>
          </CompetitionButton>
          <label className="flex min-h-11 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(event) => setOnlyOpen(event.target.checked)}
              className="h-5 w-5 accent-[#003d55]"
            />
            Nur offene Prüfungen
          </label>
        </div>
        <ol className="mt-2 divide-y divide-[#003d55]/10">
          {[...c.entries]
            .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.start_position - b.start_position)
            .filter(
              (entry) =>
                !onlyOpen ||
                entry.status === "incident" ||
                (entry.status === "ready" &&
                  (!entry.attempt_id || !entry.checked_at)),
            )
            .map((entry) => (
              <li key={entry.entry_id}>
                <button
                  type="button"
                  className="flex min-h-16 w-full items-center gap-3 rounded-lg py-3 text-left hover:bg-[#f7f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
                  onClick={() => {
                    setSelection({ id: entry.entry_id, version: c.version });
                    setStatus(entry.status);
                    setReason("");
                    setFailed(false);
                  }}
                >
                  <span className="w-6 shrink-0 text-center font-bold">
                    {entry.rank ?? "–"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold">
                      {entry.name}
                    </span>
                    <span className="mt-1 block text-xs text-[#003d55]/70">
                      Start {entry.start_position} · Halbfinalplatz{" "}
                      {entry.semifinal_rank}
                    </span>
                    <span className="mt-1 block text-sm font-semibold sm:hidden">
                      {resultLabel(entry)}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm font-semibold sm:block">
                    {resultLabel(entry)}
                    <span className="mt-1 block text-xs font-normal text-[#003d55]/70">
                      {entry.status === "dns"
                        ? "Ausfall geklärt"
                        : entry.checked_at
                          ? "Papier geprüft"
                          : entry.attempt_id
                            ? "Papierabgleich offen"
                            : ""}
                    </span>
                  </span>
                  {entry.checked_at && entry.status === "ready" && (
                    <Check
                      size={18}
                      aria-label="Papier geprüft"
                      className="shrink-0 text-emerald-700"
                    />
                  )}
                  <ChevronRight size={18} className="shrink-0" />
                </button>
              </li>
            ))}
        </ol>
        {onlyOpen && !pending && (
          <p className="py-5 text-sm">Alle Einträge sind geklärt.</p>
        )}
      </section>
      <details className={panel}>
        <summary className="cursor-pointer py-1 text-sm font-semibold">
          Drucken, Export & Wiederöffnung
        </summary>
        <div className="mt-4 flex flex-wrap gap-2">
          <CompetitionButton asChild variant="outline">
            <Link
              target="_blank"
              rel="noreferrer"
              to={`${exportHref}&art=ergebnis`}
            >
              <Printer size={16} />
              Ergebnisliste drucken
            </Link>
          </CompetitionButton>
          <CompetitionButton
            variant="outline"
            onClick={() => downloadFinalCsv(c, season)}
          >
            <Download size={16} />
            CSV {c.phase === "final" ? "offiziell" : "vorläufig"}
          </CompetitionButton>
          <CompetitionButton asChild variant="outline">
            <Link target="_blank" rel="noreferrer" to={exportHref}>
              <Printer size={16} />
              Startliste drucken
            </Link>
          </CompetitionButton>
          {c.phase === "review" && (
            <CompetitionButton
              variant="outline"
              disabled={busy}
              onClick={() =>
                phaseDecision(
                  "running",
                  "Eingabe wieder öffnen",
                  "Die Handys können wieder Ergebnisse und Korrekturen erfassen.",
                  true,
                )
              }
            >
              Eingabe wieder öffnen
            </CompetitionButton>
          )}
          {c.phase === "final" && (
            <CompetitionButton
              variant="outline"
              disabled={busy}
              onClick={() =>
                phaseDecision(
                  "review",
                  "Freigabe aufheben",
                  "Die Wertung wird wieder vorläufig. Vor erneuter Freigabe Papierwerte prüfen.",
                  true,
                )
              }
            >
              Freigabe aufheben
            </CompetitionButton>
          )}
        </div>
      </details>
      <Dialog
        open={Boolean(chosen)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelection(null);
        }}
      >
        <CompetitionDialogContent busy={busy}>
          <DialogHeader className="px-0 pt-0 text-left">
            <DialogTitle className={competitionHeading}>
              {chosen?.name}
            </DialogTitle>
            <DialogDescription>
              {className(c.league, c.class_label)} · Start{" "}
              {chosen?.start_position} · Halbfinalplatz {chosen?.semifinal_rank}
            </DialogDescription>
          </DialogHeader>
          {chosen && (
            <>
              <p className="text-2xl font-bold">{resultLabel(chosen)}</p>
              <p className="text-sm">
                {chosen.status === "dns"
                  ? "Nicht gestartet · kein regulärer Ergebnisrang"
                  : chosen.checked_at
                    ? `Mit Papier abgeglichen · ${when(chosen.checked_at)}`
                    : chosen.attempt_id
                      ? "Papierabgleich offen"
                      : chosen.status === "incident"
                        ? "Zwischenfall ungeklärt"
                        : "Noch kein Ergebnis eingetragen"}
              </p>
              {chosen.entered_at && (
                <p className="text-xs text-[#003d55]/70">
                  Erstabgabe:{" "}
                  {when(
                    data.audit
                      .filter(
                        (item) =>
                          item.entry_id === chosen.entry_id &&
                          item.action === "submit",
                      )
                      .sort((a, b) =>
                        a.created_at.localeCompare(b.created_at),
                      )[0]?.created_at ?? chosen.entered_at,
                  )}
                  {data.audit.some(
                    (item) =>
                      item.entry_id === chosen.entry_id &&
                      item.action === "correct",
                  ) && ` · Korrektur: ${when(chosen.entered_at)}`}
                </p>
              )}
              {conflict && (
                <div
                  role="alert"
                  className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm"
                >
                  <p>
                    Die Klasse wurde inzwischen geändert. Aktuellen Wert oben
                    mit der Papierliste vergleichen.
                  </p>
                  <CompetitionButton
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setSelection({ id: chosen.entry_id, version: c.version });
                      setStatus(chosen.status);
                      setReason("");
                      setFailed(false);
                    }}
                  >
                    Aktuellen Stand übernehmen
                  </CompetitionButton>
                </div>
              )}
              {failed && (
                <p role="alert" className="text-sm text-red-800">
                  {error || "Nicht gespeichert. Bitte erneut prüfen."}
                </p>
              )}
              {!chosen.checked_at &&
                chosen.attempt_id &&
                chosen.status === "ready" &&
                ["running", "review"].includes(c.phase) && (
                  <CompetitionButton
                    disabled={busy || conflict}
                    onClick={() =>
                      void run(
                        () =>
                          source.checkFinalEntry(
                            chosen.entry_id,
                            selection!.version,
                          ),
                        "Papierabgleich gespeichert.",
                      ).then((ok) => {
                        if (ok) setSelection(null);
                        else setFailed(true);
                      })
                    }
                  >
                    Mit Papier abgeglichen
                  </CompetitionButton>
                )}
              {mutable && (
                <details className="border-t border-[#003d55]/15 pt-3">
                  <summary className="cursor-pointer py-2 text-sm font-semibold">
                    Ausfall oder Zwischenfall
                  </summary>
                  <div className="mt-3 space-y-3">
                    <Select
                      value={status}
                      disabled={busy}
                      onValueChange={(value) =>
                        setStatus(value as FinalEntry["status"])
                      }
                    >
                      <SelectTrigger
                        aria-label="Teilnehmerstatus"
                        className="min-h-12"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ready">
                          Regulär werten / Eingabe möglich
                        </SelectItem>
                        <SelectItem value="dns">Nicht gestartet</SelectItem>
                        <SelectItem value="incident">
                          Zwischenfall ungeklärt
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <CompetitionField
                      label="Begründung"
                      maxLength={500}
                      disabled={busy}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                    <p className="text-xs text-[#003d55]/70">
                      Eine Statusänderung hebt den Papierabgleich auf. Ein
                      vorhandener Versuch bleibt dokumentiert.
                    </p>
                    <CompetitionButton
                      disabled={
                        busy ||
                        conflict ||
                        !reason.trim() ||
                        status === chosen.status
                      }
                      onClick={() =>
                        void run(
                          () =>
                            source.setFinalEntryStatus(
                              chosen.entry_id,
                              status,
                              reason,
                              selection!.version,
                            ),
                          "Teilnehmerstatus gespeichert.",
                        ).then((ok) => {
                          if (ok) setSelection(null);
                          else setFailed(true);
                        })
                      }
                    >
                      Status speichern
                    </CompetitionButton>
                  </div>
                </details>
              )}
              <details className="border-t border-[#003d55]/15 pt-3">
                <summary className="cursor-pointer py-2 text-sm font-semibold">
                  Änderungsverlauf
                </summary>
                <ul className="mt-2 divide-y text-xs">
                  {data.audit
                    .filter((item) => item.entry_id === chosen.entry_id)
                    .map((item, index) => (
                      <li key={index} className="space-y-1 py-2">
                        <p>
                          {when(item.created_at)} ·{" "}
                          {item.actor ||
                            (item.station_no
                              ? `Handy ${item.station_no}`
                              : "Administration")}
                        </p>
                        {(item.before_data || item.after_data) && (
                          <p>
                            {auditValue(item.before_data)} →{" "}
                            {auditValue(item.after_data)}
                          </p>
                        )}
                        <p>
                          {item.reason ||
                            (item.action === "submit"
                              ? "Erstabgabe"
                              : item.action === "check"
                                ? "Papierabgleich"
                                : "Änderung")}
                        </p>
                      </li>
                    ))}
                </ul>
              </details>
            </>
          )}
        </CompetitionDialogContent>
      </Dialog>
      <CompetitionDecisionDialog
        decision={decision}
        busy={busy}
        error={error}
        currentVersion={c.version}
        onClose={() => setDecision(null)}
        run={run}
      />
    </div>
  );
}
