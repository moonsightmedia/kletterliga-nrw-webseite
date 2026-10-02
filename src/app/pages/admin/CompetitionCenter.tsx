import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
import { classNextStep } from "@/lib/competitionPresentation";
import { validFinalPassword } from "@/lib/finalPassword";
import { competitionDeadlineReached } from "@/lib/competitionDeadline";
import SemifinalAdminRanking from "@/app/components/SemifinalAdminRanking";
import * as finalSource from "@/services/competitionFinal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSeasonSettings } from "@/services/seasonSettings";
import {
  getCompetitionAdmin,
  correctCompetitionResult,
  setCompetitionPhase,
  type CompetitionAdminData,
} from "@/services/competitionDay";
import LeagueCompetition from "./LeagueCompetition";
import {
  CompetitionButton,
  CompetitionField,
  CompetitionRosterPanel,
  CompetitionFinalRoutes,
  CompetitionFinalPanel,
} from "@/app/components/CompetitionAdminPanels";
import CompetitionDisplayPanel from "@/app/components/CompetitionDisplayPanel";
import {
  classKey,
  className,
  type FinalAdmin,
  type League,
  type SemifinalRow,
} from "@/services/competitionFinal";

const phaseName: Record<string, string> = {
  preparation: "Vorbereitung",
  published: "Startliste freigegeben",
  running: "Finale läuft",
  review: "Papierprüfung",
  final: "Endgültig",
};
const formatWhen = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleString("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "–";
const auditValue = (value: unknown) => {
  if (!value || typeof value !== "object") return "–";
  const row = value as Record<string, unknown>;
  if (row.is_top === true) return `TOP · ${row.seconds ?? "?"} s`;
  if (row.grip !== undefined)
    return `Griff ${row.grip} · ${row.seconds ?? "?"} s`;
  if (row.zone !== undefined)
    return `Griff ${Number(row.zone) * 10} · ${row.points ?? "?"} P.`;
  if (row.status !== undefined)
    return (
      {
        ready: "Regulär",
        dns: "Nicht gestartet",
        incident: "Zwischenfall ungeklärt",
        withdrawn: "Zurückgezogen",
      }[String(row.status)] ?? "Teilnahmestatus geändert"
    );
  if (row.position !== undefined) return `Startplatz ${row.position}`;
  if (row.phase !== undefined)
    return phaseName[String(row.phase)] ?? String(row.phase);
  if (row.points !== undefined) return `${row.points} P.`;
  if (row.version !== undefined) return `Listenstand v${row.version}`;
  return "–";
};
const auditActionLabel = (action: string) =>
  ({
    submit: "Ergebnis eingetragen",
    correct: "Ergebnis korrigiert",
    check: "Papierabgleich",
    publish: "Startliste freigegeben",
    move: "Startreihenfolge geändert",
    phase: "Klassenstatus geändert",
    status: "Teilnehmerstatus geändert",
  })[action] ?? "Änderung";

export type CompetitionCenterSource = Pick<
  typeof finalSource,
  | "getFinalAdmin"
  | "checkFinalEntry"
  | "enterSemifinalResult"
  | "moveFinalEntry"
  | "publishFinalClass"
  | "saveFinalRoute"
  | "saveLiveNotice"
  | "setFinalEntryStatus"
  | "setFinalExclusion"
  | "setFinalPhase"
  | "setFinalPassword"
  | "setLiveDisplay"
  | "settleSemifinal"
> & {
  getCompetitionAdmin: typeof getCompetitionAdmin;
  setCompetitionPhase: typeof setCompetitionPhase;
  correctCompetitionResult: typeof correctCompetitionResult;
};
const defaultSource: CompetitionCenterSource = {
  ...finalSource,
  getCompetitionAdmin,
  setCompetitionPhase,
  correctCompetitionResult,
};
export default function CompetitionCenter() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  return (
    <CompetitionCenterContent
      season={season}
      settingsLoading={settingsLoading}
    />
  );
}
export function CompetitionCenterContent({
  season,
  settingsLoading = false,
  source = defaultSource,
  semifinalConfiguration,
  certificateConfiguration,
  tvHref,
  printHref = "/app/admin/league/wettkampf/druck",
  stationHref = "/app/schiedsrichter/finale",
  initialTab = "overview",
  demo = false,
}: {
  season?: string;
  settingsLoading?: boolean;
  source?: CompetitionCenterSource;
  semifinalConfiguration?: ReactNode;
  certificateConfiguration?: ReactNode;
  tvHref?: string;
  printHref?: string;
  stationHref?: string;
  initialTab?: string;
  demo?: boolean;
}) {
  const [data, setData] = useState<FinalAdmin | null>(null);
  const [semiAdmin, setSemiAdmin] = useState<CompetitionAdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [params, setParams] = useSearchParams();
  const supportedTabs = ["overview", "setup", "semifinal", "roster", "final", "display", "certificates"];
  const requestedTab = params.get("bereich") ?? initialTab;
  const tab = supportedTabs.includes(requestedTab) ? requestedTab : "overview";
  const requestedSetup = params.get("einrichtung") ?? "routes";
  const setupTab = ["routes", "final-routes", "access"].includes(requestedSetup) ? requestedSetup : "routes";
  const [setupVisited, setSetupVisited] = useState(tab === "setup");
  useEffect(() => { if (tab === "setup") setSetupVisited(true); }, [tab]);
  function setTab(value: string) {
    const next = new URLSearchParams(params); next.set("bereich", value);
    setParams(next); setNotice("");
  }
  function setSetupTab(value: string) {
    const next = new URLSearchParams(params); next.set("einrichtung", value);
    setParams(next); setNotice("");
  }
  const [clock, setClock] = useState(Date.now);
  const [updated, setUpdated] = useState<Date | null>(null);
  const sequence = useRef(0);
  const writing = useRef(false);
  const stale = useRef(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [finalPassword, setFinalPasswordInput] = useState("");
  const [finalPasswordRepeat, setFinalPasswordRepeat] = useState("");
  const reload = useCallback(
    async (quiet = false) => {
      if (!season) return false;
      const request = ++sequence.current;
      if (!quiet) setLoading(true);
      try {
        const [next, halftime] = await Promise.all([
          source.getFinalAdmin(season),
          source.getCompetitionAdmin(season),
        ]);
        if (request !== sequence.current) return false;
        setData(next);
        setSemiAdmin(halftime);
        setUpdated(new Date());
        setLoadError("");
        stale.current = false;
        return true;
      } catch (err) {
        if (request === sequence.current) {
          stale.current = true;
          setLoadError(
            err instanceof Error
              ? err.message
              : "Daten konnten nicht aktualisiert werden. Letzter Stand bleibt sichtbar.",
          );
        }
        return false;
      } finally {
        if (request === sequence.current) setLoading(false);
      }
    },
    [season, source],
  );
  useEffect(() => {
    if (settingsLoading) return;
    if (!season) {
      setError("Die Saison ist nicht verfügbar.");
      setLoading(false);
      return;
    }
    void reload();
    return () => {
      sequence.current += 1;
    };
  }, [reload, season, settingsLoading]);
  useEffect(() => {
    if (!season || busy) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && !writing.current)
        void reload(true);
    }, 5000);
    return () => window.clearInterval(id);
  }, [season, busy, reload]);
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  async function run(
    action: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> {
    if (writing.current) return false;
    if (stale.current) {
      setError(
        "Der Datenstand ist veraltet. Zuerst aktualisieren und erneut prüfen.",
      );
      return false;
    }
    writing.current = true;
    sequence.current += 1;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      const refreshed = await reload(true);
      setNotice(
        refreshed
          ? success
          : `${success} Der neue Stand konnte noch nicht geladen werden.`,
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nicht gespeichert. Bitte erneut prüfen.",
      );
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const semifinalPhase =
    data?.phase === "open" &&
    competitionDeadlineReached(data.submission_deadline_at, clock)
      ? "closed"
      : (data?.phase ?? "draft");
  const classPairs = useMemo(() => {
    const groups = new Map<
      string,
      { league: League; label: string; rows: SemifinalRow[] }
    >();
    for (const row of data?.semifinal ?? []) {
      const key = classKey(row.league, row.class_label);
      if (!groups.has(key))
        groups.set(key, {
          league: row.league,
          label: row.class_label,
          rows: [],
        });
      groups.get(key)!.rows.push(row);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [data]);
  const activePair =
    classPairs.find(([key]) => key === selectedKey) ?? classPairs[0];
  const activeKey = activePair?.[0];
  const activeFinal = data?.classes.find(
    (item) => classKey(item.league, item.class_label) === activeKey,
  );
  const activeTvHref = tvHref ?? `/live/${season}`;
  const unresolved = (data?.semifinal ?? []).reduce(
    (total, row) => total + row.missing.filter((item) => !item.settled).length,
    0,
  );
  const unchecked = (data?.classes ?? []).reduce(
    (total, c) =>
      total +
      c.entries.filter(
        (entry) =>
          entry.status === "ready" && entry.attempt_id && !entry.checked_at,
      ).length,
    0,
  );
  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-16 text-[#003d55]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#003d55]/15 pb-4">
        <div>
          <p className="text-xs text-[#003d55]/65">
            Wettkampftag · {season ?? "–"}
            {demo && " · Demo"}
          </p>
          <h1 className="[font-family:inherit] text-2xl font-bold tracking-normal">
            Halbfinale & Finale
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <CompetitionButton asChild variant="outline">
            <Link target="_blank" rel="noreferrer" to={activeTvHref}>
              <ExternalLink size={16} />
              TV öffnen
            </Link>
          </CompetitionButton>
          <CompetitionButton
            variant="ghost"
            disabled={busy || loading}
            onClick={() => void reload(true)}
          >
            <RefreshCw size={17} />
            Aktualisieren
          </CompetitionButton>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {loadError && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
        >
          {loadError}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {loading || settingsLoading ? (
        <p role="status">Wettkampfzentrale wird geladen …</p>
      ) : !data || !season ? (
        <p>Die Daten sind nicht verfügbar.</p>
      ) : (
        <Tabs value={["roster", "final"].includes(tab) ? "finale" : tab} onValueChange={(value) => setTab(value === "finale" ? "roster" : value)}>
          <TabsList aria-label="Wettkampftag" className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-[#ebe8df] p-1 sm:flex sm:flex-wrap sm:justify-start">
            {[
              ["overview", "Übersicht"],
              ["setup", "Einrichtung"],
              ["semifinal", "Halbfinale"],
              ["finale", "Finale"],
              ["display", "TV & Hinweise"],
              ["certificates", "Abschluss"],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-h-11 rounded-lg px-3 text-sm font-medium shadow-none focus-visible:ring-2 focus-visible:ring-[#a15523] data-[state=active]:bg-white data-[state=active]:text-[#003d55] data-[state=active]:shadow-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {["roster", "final"].includes(tab) && activePair && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="[font-family:inherit] text-lg font-bold tracking-normal">
                  {className(activePair[1].league, activePair[1].label)}
                </h2>
                <p className="mt-1 text-xs text-[#003d55]/70">
                  {activeFinal ? phaseName[activeFinal.phase] : "Vorbereitung"}
                </p>
              </div>
                <Select value={activeKey} onValueChange={(value) => { setSelectedKey(value); setNotice(""); }}>
                <SelectTrigger
                  aria-label="Klasse bearbeiten"
                  className="min-h-12 w-full bg-white sm:w-72"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classPairs.map(([key, group]) => (
                    <SelectItem key={key} value={key}>
                      {className(group.league, group.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <TabsContent value="overview" className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span>
                Halbfinale:{" "}
                <strong>
                  {semifinalPhase === "closed"
                    ? "Geschlossen"
                    : semifinalPhase === "open"
                      ? "Eingabe offen"
                      : "Vorbereitung"}
                </strong>
              </span>
              <span>{unresolved} offene Routeneinträge</span>
              <span>{unchecked} offene Papierabgleiche</span>
            </div>
            <section
              aria-label="Wettkampfstatus je Klasse"
              className="overflow-hidden rounded-xl border border-[#003d55]/15 bg-white"
            >
              {classPairs.map(([key, group]) => {
                const item = data.classes.find(
                  (c) => classKey(c.league, c.class_label) === key,
                );
                const missing = group.rows.reduce(
                  (n, row) => n + row.missing.filter((m) => !m.settled).length,
                  0,
                );
                const step = classNextStep(item, missing, semifinalPhase);
                return (
                  <button
                    key={key}
                    type="button"
                    className="flex min-h-20 w-full items-center justify-between gap-4 border-b border-[#003d55]/10 p-4 text-left last:border-b-0 hover:bg-[#f7f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a15523]"
                    onClick={() => {
                      setSelectedKey(key);
                      setTab(step.tab);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-semibold">
                        {className(group.league, group.label)}
                      </span>
                      <span className="mt-1 block text-xs text-[#003d55]/70">
                        {item ? phaseName[item.phase] : "Halbfinale"}
                        {missing > 0 && ` · ${missing} offene Routeneinträge`}
                      </span>
                      <span className="mt-1 block text-sm text-[#a15523]">
                        {step.title}
                      </span>
                    </span>
                    <ArrowRight size={18} className="shrink-0" />
                  </button>
                );
              })}
              {!classPairs.length && (
                <p className="p-5 text-sm">
                  Zuerst Halbfinalklassen und Routen vorbereiten.
                </p>
              )}
            </section>
            <CompetitionButton
              variant="outline"
              onClick={() => setTab("semifinal")}
            >
              Halbfinalranglisten ansehen
            </CompetitionButton>
            <details className="rounded-xl border border-[#003d55]/15 bg-white p-4">
              <summary className="cursor-pointer py-1 text-sm font-semibold">
                Letzte Änderungen
              </summary>
              <div className="mt-3 divide-y divide-[#003d55]/10 text-sm">
                {[...data.audit, ...data.semifinal_audit]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 20)
                  .map((item, index) => (
                    <div
                      key={`${item.created_at}-${index}`}
                      className="space-y-1 py-3"
                    >
                      <p>
                        {formatWhen(item.created_at)} ·{" "}
                        {auditActionLabel(item.action)} ·{" "}
                        {item.actor ||
                          (item.station_no
                            ? `Handy ${item.station_no}`
                            : "System")}
                      </p>
                      <p className="text-[#003d55]/75">
                        {auditValue(item.before_data)} →{" "}
                        {auditValue(item.after_data)}
                      </p>
                      {item.reason && (
                        <p className="break-words text-xs">{item.reason}</p>
                      )}
                    </div>
                  ))}
                {!data.audit.length && !data.semifinal_audit.length && (
                  <p>Noch keine Änderungen.</p>
                )}
              </div>
            </details>
          </TabsContent>
          <TabsContent value="setup" forceMount hidden={tab !== "setup"} className="pt-4 data-[state=inactive]:hidden">
            {setupVisited && <div className="space-y-5">
              <nav aria-label="Wettkampf einrichten">
                <div className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-[#003d55]/15 bg-transparent p-0">
                  {[["routes", "Halbfinalrouten"], ["final-routes", "Finalrouten"], ["access", "Zugänge & Eingabe"]].map(([value, label]) => <button key={value} type="button" aria-current={setupTab === value ? "page" : undefined} onClick={() => setSetupTab(value)} className={`min-h-11 border-b-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] ${setupTab === value ? "border-[#a15523] font-semibold" : "border-transparent text-[#526570]"}`}>{label}</button>)}
                </div>
              </nav>
              <div hidden={setupTab === "final-routes"}>
                {semifinalConfiguration ?? <LeagueCompetition section={setupTab === "access" ? "access" : "routes"} />}
              </div>
              <div hidden={setupTab !== "final-routes"}>
                <CompetitionFinalRoutes data={data} season={season} busy={busy} source={source} run={run} />
              </div>
              <div hidden={setupTab !== "access"}>
            <details
              className="rounded-xl border border-[#003d55]/15 bg-white p-4"
              open={!data.final_password_set}
            >
              <summary className="cursor-pointer py-1 text-sm font-semibold">
                Finalpasswort ·{" "}
                {data.final_password_set
                  ? "eingerichtet"
                  : "noch nicht eingerichtet"}
              </summary>
              <div className="mt-4 max-w-xl space-y-3">
                <p className="text-sm">
                  Gemeinsames Passwort für beide Handys. Ein neues Passwort
                  erfordert eine erneute Anmeldung auf beiden.
                </p>
                <CompetitionField
                  label="Neues Finalpasswort"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={finalPassword}
                  disabled={busy}
                  onChange={(event) =>
                    setFinalPasswordInput(event.target.value)
                  }
                />
                <CompetitionField
                  label="Finalpasswort wiederholen"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={finalPasswordRepeat}
                  disabled={busy}
                  onChange={(event) =>
                    setFinalPasswordRepeat(event.target.value)
                  }
                />
                <p className="text-xs text-[#003d55]/70">
                  Mindestens 12 Zeichen · keine Leerzeichen am Anfang oder Ende.
                </p>
                <CompetitionButton
                  disabled={
                    busy ||
                    !validFinalPassword(finalPassword) ||
                    finalPassword !== finalPasswordRepeat
                  }
                  onClick={() =>
                    void run(
                      () => source.setFinalPassword(season, finalPassword),
                      "Finalpasswort für beide Handys gespeichert.",
                    ).then((ok) => {
                      if (ok) {
                        setFinalPasswordInput("");
                        setFinalPasswordRepeat("");
                      }
                    })
                  }
                >
                  {data.final_password_set
                    ? "Finalpasswort ändern"
                    : "Finalpasswort speichern"}
                </CompetitionButton>
              </div>
            </details>
              </div>
            </div>}
          </TabsContent>
          <TabsContent value="certificates" className="pt-4">
            {certificateConfiguration ?? <LeagueCompetition section="certificates" />}
          </TabsContent>
          <TabsContent value="semifinal" className="space-y-5 pt-4">
            <SemifinalAdminRanking
              data={data}
              admin={semiAdmin}
              phase={semifinalPhase}
              busy={busy}
              updated={updated}
              errorMessage={error}
              onSave={(edit) =>
                run(
                  () =>
                    edit.kind === "not-climbed"
                      ? source.settleSemifinal(
                          season,
                          edit.profileId,
                          edit.routeId,
                          edit.reason,
                        )
                      : edit.resultId
                        ? source.correctCompetitionResult({
                            resultId: edit.resultId,
                            expected: edit.expected,
                            zone: edit.zone,
                            reason: edit.reason,
                          })
                        : source.enterSemifinalResult(
                            season,
                            edit.profileId,
                            edit.routeId,
                            edit.zone,
                            edit.reason,
                          ),
                  edit.kind === "not-climbed"
                    ? "Nicht geklettert dokumentiert."
                    : edit.resultId
                      ? "Halbfinalergebnis geändert."
                      : "Halbfinalergebnis eingetragen.",
                )
              }
            />

          </TabsContent>
          <TabsContent value="finale" className="pt-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList aria-label="Finale bearbeiten" className="mb-4 h-auto rounded-lg bg-white p-1">
                <TabsTrigger value="roster" className="min-h-11 px-4">Finalstartlisten</TabsTrigger>
                <TabsTrigger value="final" className="min-h-11 px-4">Finalergebnisse</TabsTrigger>
              </TabsList>
          <TabsContent value="roster">
            <CompetitionRosterPanel
              key={activeKey}
              data={data}
              season={season}
              busy={busy}
              error={error}
              source={source}
              run={run}
              printHref={printHref}
              group={activePair?.[1]}
              phase={semifinalPhase}
              onSemifinal={() => setTab("semifinal")}
            />
          </TabsContent>
          <TabsContent value="final" className="space-y-4 pt-4">
            <CompetitionFinalPanel
              key={activeKey}
              data={data}
              season={season}
              busy={busy}
              error={error}
              source={source}
              run={run}
              printHref={printHref}
              finalClass={activeFinal}
              stationHref={stationHref}
              onRoster={() => setTab("roster")}
            />

          </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent
            value="display"
            hidden={tab !== "display"}
            forceMount
            className="pt-4 data-[state=inactive]:hidden"
          >
            <CompetitionDisplayPanel
              data={data}
              season={season}
              busy={busy}
              error={error}
              source={source}
              run={run}
              tvHref={activeTvHref}
              clock={clock}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
