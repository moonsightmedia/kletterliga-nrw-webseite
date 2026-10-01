import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { classNextStep } from "@/lib/competitionPresentation";
import {
  competitionDeadlineReached,
  formatCompetitionDeadline,
} from "@/lib/competitionDeadline";
import SemifinalRanking from "@/app/components/SemifinalRanking";
import * as finalSource from "@/services/competitionFinal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
  StitchTextField,
} from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
import {
  getCompetitionAdmin,
  setCompetitionPhase,
  type CompetitionAdminData,
} from "@/services/competitionDay";
import LeagueCompetition from "./LeagueCompetition";
import {
  classKey,
  className,
  downloadFinalCsv,
  resultLabel,
  type DisplaySettings,
  type FinalAdmin,
  type FinalClass,
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
const randomCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
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
  if (row.status !== undefined) return String(row.status ?? "kein Status");
  if (row.position !== undefined) return `Startplatz ${row.position}`;
  if (row.phase !== undefined)
    return phaseName[String(row.phase)] ?? String(row.phase);
  if (row.points !== undefined) return `${row.points} P.`;
  if (row.version !== undefined) return `Listenstand v${row.version}`;
  return "–";
};
const numberInput =
  "min-h-11 w-24 rounded-xl border border-[#003d55]/25 bg-white px-3 text-[#003d55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]";

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
  | "setFinalStation"
  | "setLiveDisplay"
  | "settleSemifinal"
> & {
  getCompetitionAdmin: typeof getCompetitionAdmin;
  setCompetitionPhase: typeof setCompetitionPhase;
};
const defaultSource: CompetitionCenterSource = {
  ...finalSource,
  getCompetitionAdmin,
  setCompetitionPhase,
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
  semifinalConfiguration = <LeagueCompetition />,
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
  tvHref?: string;
  printHref?: string;
  stationHref?: string;
  initialTab?: string;
  demo?: boolean;
}) {
  const {
    getFinalAdmin,
    getCompetitionAdmin,
    setCompetitionPhase,
    checkFinalEntry,
    enterSemifinalResult,
    moveFinalEntry,
    publishFinalClass,
    saveFinalRoute,
    saveLiveNotice,
    setFinalEntryStatus,
    setFinalExclusion,
    setFinalPhase,
    setFinalStation,
    setLiveDisplay,
    settleSemifinal,
  } = source;
  const [data, setData] = useState<FinalAdmin | null>(null);
  const [semiAdmin, setSemiAdmin] = useState<CompetitionAdminData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState(initialTab);
  const [clock, setClock] = useState(Date.now);
  const [updated, setUpdated] = useState<Date | null>(null);
  const loadPending = useRef(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [semifinalZones, setSemifinalZones] = useState<Record<string, string>>(
    {},
  );
  const [routeNumber, setRouteNumber] = useState("1");
  const [routeName, setRouteName] = useState("");
  const [maxGrip, setMaxGrip] = useState("30");
  const [routeSelections, setRouteSelections] = useState<
    Record<string, string>
  >({});
  const [stationSelections, setStationSelections] = useState<
    Record<string, string>
  >({});
  const [generatedCodes, setGeneratedCodes] = useState<Record<number, string>>(
    {},
  );
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeApp, setNoticeApp] = useState(true);
  const [noticeTv, setNoticeTv] = useState(true);
  const [noticeFullscreen, setNoticeFullscreen] = useState(false);
  const [noticeExpiry, setNoticeExpiry] = useState("");
  const [noticeDuration, setNoticeDuration] = useState("10");
  const [editingNotice, setEditingNotice] = useState<string | undefined>();
  const [display, setDisplay] = useState<DisplaySettings>({
    phase: "semifinal",
    class_keys: [],
    pinned_key: null,
    interval_seconds: 15,
  });

  const reload = useCallback(
    async (quiet = false) => {
      if (!season || loadPending.current) return;
      loadPending.current = true;
      if (!quiet) setLoading(true);
      try {
        const [next, halftime] = await Promise.all([
          getFinalAdmin(season),
          getCompetitionAdmin(season),
        ]);
        setData(next);
        setSemiAdmin(halftime);
        setUpdated(new Date());
        if (!quiet)
          setDisplay(
            next.display ?? {
              phase: "semifinal",
              class_keys: [],
              pinned_key: null,
              interval_seconds: 15,
            },
          );
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Wettkampfdaten konnten nicht geladen werden.",
        );
      } finally {
        loadPending.current = false;
        if (!quiet) setLoading(false);
      }
    },
    [season, getFinalAdmin, getCompetitionAdmin],
  );
  useEffect(() => {
    if (settingsLoading) return;
    if (!season) {
      setError("Die Saison ist nicht verfügbar.");
      setLoading(false);
      return;
    }
    void reload();
  }, [reload, season, settingsLoading]);
  useEffect(() => {
    if (!season || busy) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload(true);
    }, 5000);
    return () => window.clearInterval(id);
  }, [season, busy, reload]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  async function run(
    action: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await reload(true);
      setNotice(success);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Die Aktion ist fehlgeschlagen.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  const deadlinePassed = competitionDeadlineReached(
    data?.submission_deadline_at,
    clock,
  );
  const semifinalPhase =
    data?.phase === "open" && deadlinePassed ? "closed" : data?.phase;
  const classPairs = useMemo(() => {
    const map = new Map<
      string,
      { league: League; label: string; rows: SemifinalRow[] }
    >();
    for (const row of data?.semifinal ?? []) {
      const key = classKey(row.league, row.class_label);
      if (!map.has(key))
        map.set(key, { league: row.league, label: row.class_label, rows: [] });
      map.get(key)!.rows.push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [data]);
  const allKeys = classPairs.map(([key]) => key);
  const finalClass = (key: string) =>
    data?.classes.find((c) => classKey(c.league, c.class_label) === key);
  const unresolved = (data?.semifinal ?? []).reduce(
    (n, row) => n + row.missing.filter((m) => !m.settled).length,
    0,
  );
  const unchecked = (data?.classes ?? []).reduce(
    (n, c) =>
      n +
      c.entries.filter(
        (e) => e.status === "ready" && e.attempt_id && !e.checked_at,
      ).length,
    0,
  );
  const readyForPublish = (rows: SemifinalRow[]) =>
    semifinalPhase === "closed" &&
    rows.every((row) => row.missing.every((m) => m.settled));
  const reasonReady = reason.trim().length > 0 && reason.length <= 500;
  const activePair =
    classPairs.find(([key]) => key === selectedKey) ?? classPairs[0];
  const activeKey = activePair?.[0];
  const activeFinal = activeKey ? finalClass(activeKey) : undefined;
  const activeMissing =
    activePair?.[1].rows.reduce(
      (total, row) =>
        total + row.missing.filter((entry) => !entry.settled).length,
      0,
    ) ?? 0;
  const nextStep =
    tab === "semifinal"
      ? {
          tab: "semifinal",
          title: "Halbfinalrangliste ansehen",
          detail:
            "Namen anklicken für die fünf Routenergebnisse und Eingabezeiten. Fehlende Einträge bleiben sichtbar offen.",
        }
      : classNextStep(activeFinal, activeMissing, semifinalPhase ?? "draft");
  const filteredPairs = classPairs.filter(([key]) => key === activeKey);
  const activeTvHref = tvHref ?? `/live/${season}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-16 text-[#003d55]">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#003d55] p-5 text-[#f2dcab] sm:p-7">
        <div>
          <p className="stitch-kicker text-[#d58a4c]">
            Wettkampftag · {season ?? "–"}
          </p>
          <h1 className="stitch-headline text-3xl">Wettkampfzentrale</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#f2dcab]/85">
            {tab === "semifinal"
              ? "Halbfinalranglisten nach Klasse verfolgen und einzelne Routenergebnisse ansehen. Bestätigte Abgaben zählen automatisch."
              : "Ergebnisse klären, Startlisten freigeben und das Finale sicher abschließen. Wähle eine Klasse und folge ihrem nächsten Schritt."}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs font-bold">
            <ShieldCheck size={15} />
            {demo
              ? "Testbetrieb · erfundene Daten"
              : "Geschützter Bereich · Liga-Administration"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StitchButton asChild variant="cream">
            <Link target="_blank" to={activeTvHref}>
              <ExternalLink size={16} />
              TV öffnen
            </Link>
          </StitchButton>
          <StitchButton
            variant="cream"
            disabled={busy || loading}
            onClick={() => void reload()}
          >
            <RefreshCw size={17} className="mr-2" />
            Aktualisieren
          </StitchButton>
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-900"
        >
          {notice}
        </p>
      )}
      {loading || settingsLoading ? (
        <p role="status">Wettkampfzentrale wird geladen …</p>
      ) : !data || !season ? (
        <p>Die Daten sind nicht verfügbar.</p>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["overview", "Übersicht"],
              ["semifinal", "Halbfinale"],
              ["roster", "Finalstartlisten"],
              ["final", "Finale"],
              ["display", "Anzeige & Hinweise"],
            ].map(([value, label], index) => (
              <TabsTrigger
                key={value}
                value={value}
                className="min-h-14 justify-start gap-2 whitespace-normal rounded-xl border border-[#003d55]/20 bg-white px-3 text-left data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#a15523]/15 text-xs font-black">
                  <span aria-hidden="true">{index + 1}</span>
                </span>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {["semifinal", "roster", "final"].includes(tab) && activePair && (
            <div className="mt-5 rounded-xl border border-[#003d55]/15 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="stitch-kicker text-[#a15523]">
                    Aktuelle Klasse
                  </p>
                  <h2 className="mt-2 font-bold">
                    {className(activePair[1].league, activePair[1].label)}
                  </h2>
                  <p className="mt-2 text-sm">{nextStep.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#003d55]/70">
                    {nextStep.detail}
                  </p>
                </div>
                <div className="w-full sm:w-72">
                  <Select value={activeKey} onValueChange={setSelectedKey}>
                    <SelectTrigger
                      aria-label="Klasse bearbeiten"
                      className="min-h-12 bg-[#f7f3e9]"
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
              </div>
              {nextStep.tab !== tab && (
                <StitchButton
                  className="mt-4"
                  onClick={() => setTab(nextStep.tab)}
                >
                  {nextStep.title}
                  <ArrowRight size={16} />
                </StitchButton>
              )}
            </div>
          )}

          <TabsContent value="overview" className="space-y-5 pt-4">
            {data.semifinal.length > 0 && (
              <StitchCard className="space-y-4 p-5">
                <div>
                  <h2 className="stitch-headline text-xl">
                    Halbfinalranglisten
                  </h2>
                  <p className="mt-2 text-sm">
                    QR-bestätigte Ergebnisse erscheinen automatisch. Namen
                    anklicken, um die einzelnen Routen zu sehen.
                  </p>
                </div>
                <Select value={activeKey} onValueChange={setSelectedKey}>
                  <SelectTrigger
                    aria-label="Halbfinalklasse in der Übersicht"
                    className="min-h-12 max-w-sm bg-white"
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
                {activePair && (
                  <SemifinalRanking
                    rows={activePair[1].rows}
                    results={data.semifinal_results ?? []}
                    assignments={semiAdmin?.config.assignments ?? []}
                    audit={data.semifinal_audit}
                  />
                )}
              </StitchCard>
            )}
            <section className="overflow-hidden rounded-xl border border-[#003d55]/15 bg-white">
              <div className="border-b p-5">
                <h2 className="stitch-headline text-xl">So geht es weiter</h2>
                <p className="mt-2 text-sm">
                  Jede Klasse kann unabhängig ins Finale wechseln. Der Fernseher
                  läuft parallel.
                </p>
              </div>
              {classPairs.map(([key, group]) => {
                const item = finalClass(key);
                const missing = group.rows.reduce(
                  (count, row) =>
                    count + row.missing.filter((m) => !m.settled).length,
                  0,
                );
                const step = classNextStep(
                  item,
                  missing,
                  semifinalPhase ?? "draft",
                );
                return (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-4 border-b p-5 last:border-0"
                  >
                    <div>
                      <p className="font-bold">
                        {className(group.league, group.label)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#003d55]/70">
                        {item ? phaseName[item.phase] : "Vorbereitung"}
                      </p>
                      <p className="mt-1 text-sm text-[#a15523]">
                        {step.title}
                      </p>
                      <p className="mt-1 max-w-lg text-xs leading-5 text-[#003d55]/70">
                        {step.detail}
                      </p>
                    </div>
                    <StitchButton
                      variant={item?.phase === "final" ? "outline" : "primary"}
                      onClick={() => {
                        setSelectedKey(key);
                        setTab(step.tab);
                      }}
                    >
                      {item?.phase === "final" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <ArrowRight size={16} />
                      )}
                      Klasse öffnen
                    </StitchButton>
                  </div>
                );
              })}
              {!classPairs.length && (
                <p className="p-5 text-sm">
                  Zuerst den Halbfinal-Wettkampf mit Klassen und Routen
                  vorbereiten.
                </p>
              )}
            </section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StitchCard tone="navy" className="p-5 text-[#f2dcab]">
                <p>Halbfinale</p>
                <strong className="stitch-headline text-2xl">
                  {semifinalPhase === "closed"
                    ? "Geschlossen"
                    : semifinalPhase === "open"
                      ? "Eingabe offen"
                      : "Vorbereitung"}
                </strong>
              </StitchCard>
              <StitchCard className="p-5">
                <p>Ungeklärte Routen</p>
                <strong className="stitch-headline text-3xl">
                  {unresolved}
                </strong>
              </StitchCard>
              <StitchCard className="p-5">
                <p>Freigegebene Finalklassen</p>
                <strong className="stitch-headline text-3xl">
                  {data.classes.filter((c) => c.phase !== "preparation").length}
                  /{classPairs.length}
                </strong>
              </StitchCard>
              <StitchCard className="p-5">
                <p>Offener Papierabgleich</p>
                <strong className="stitch-headline text-3xl">
                  {unchecked}
                </strong>
              </StitchCard>
            </div>
            {data.classes.some((c) => c.stale) && (
              <p
                role="alert"
                className="rounded-xl bg-amber-100 p-4 font-bold text-[#653414]"
              >
                Halbfinaländerung: Noch nicht gestartete Finalklassen erneut
                bestätigen und neu drucken. Bereits gestartete Klassen behalten
                ihr Finalfeld und die eingefrorenen Halbfinalplätze.
              </p>
            )}
            <StitchCard className="p-5">
              <h2 className="stitch-headline text-xl">Letzte Änderungen</h2>
              <div className="mt-3 space-y-2 text-sm">
                {[...data.audit, ...data.semifinal_audit]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 12)
                  .map((a, i) => (
                    <div
                      key={`${a.created_at}-${i}`}
                      className="border-b border-[#003d55]/10 py-2"
                    >
                      <p>
                        <strong>{formatWhen(a.created_at)}</strong> ·{" "}
                        {a.action ?? "Halbfinalkorrektur"} ·{" "}
                        {a.actor ||
                          (a.station_no && `Station ${a.station_no}`) ||
                          "System"}{" "}
                        · {a.reason}
                      </p>
                      {(a.before_data || a.after_data) && (
                        <p className="text-[#003d55]/75">
                          Vorher: {auditValue(a.before_data)} → Nachher:{" "}
                          {auditValue(a.after_data)}
                        </p>
                      )}
                    </div>
                  ))}
                {!data.audit.length && !data.semifinal_audit.length && (
                  <p>Noch keine Korrekturen.</p>
                )}
              </div>
            </StitchCard>
          </TabsContent>

          <TabsContent value="semifinal" className="space-y-5 pt-4">
            <StitchCard className="space-y-3 p-5">
              <h2 className="stitch-headline text-xl">
                Halbfinale live verfolgen
              </h2>
              <p className="text-sm leading-6">
                Teilnehmer tragen ihr Ergebnis ein, der Schiedsrichter
                kontrolliert es und lässt den Routen-QR scannen. Nach dem
                Absenden erscheint der Wert automatisch in der Rangliste für
                René, Teilnehmer und TV. René muss diese Einträge nicht noch
                einmal bestätigen.
              </p>
              <p className="text-sm">
                0 Punkte sind ein eingetragenes Ergebnis. Ein fehlender Eintrag
                bleibt offen. Teilnehmer prüfen ihre eigenen Einträge unter
                „Meine Routen“.
              </p>
              {data.submission_deadline_at && (
                <p className="rounded-lg bg-[#f2dcab]/50 p-3 text-sm font-bold">
                  {deadlinePassed
                    ? "Automatische Abgabefrist erreicht"
                    : "Automatische Sperre"}
                  : {formatCompetitionDeadline(data.submission_deadline_at)} Uhr
                  · René kann anschließend begründet nachtragen.
                </p>
              )}
              <p className="text-xs text-[#003d55]/70">
                {semifinalPhase === "open"
                  ? "Eingabe offen"
                  : semifinalPhase === "closed"
                    ? "Normale Eingabe geschlossen"
                    : "Vorbereitung"}{" "}
                · Aktualisierung alle 5 Sekunden
                {updated &&
                  ` · Datenstand ${updated.toLocaleTimeString("de-DE")}`}
                . Namen anklicken für Routenergebnisse und Eingabezeiten.
              </p>
            </StitchCard>
            {activePair && (
              <SemifinalRanking
                rows={activePair[1].rows}
                results={data.semifinal_results ?? []}
                assignments={semiAdmin?.config.assignments ?? []}
                audit={data.semifinal_audit}
              />
            )}
            <details className="rounded-xl border border-[#003d55]/15 bg-white p-4">
              <summary className="min-h-11 cursor-pointer py-3 font-bold">
                Fehlende Einträge nachtragen · {activeMissing} offen in dieser
                Klasse
              </summary>
              <StitchCard className="space-y-3 p-5">
                <h2 className="stitch-headline text-xl">
                  Offene Halbfinalrouten klären
                </h2>
                <p className="text-sm">
                  Nach Schließen der Eingabe jeden fehlenden Eintrag anhand der
                  Papierliste nachtragen oder begründet als nicht geklettert mit
                  null Punkten markieren. {unresolved} offen.
                </p>
                <StitchTextField
                  label="Begründung für die nächste Änderung"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {semifinalPhase !== "closed" && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-[#a15523]">
                      {semifinalPhase === "open"
                        ? "Erst die Eingabe für alle Halbfinalklassen schließen. Anschließend lassen sich offene Werte klären."
                        : "Zuerst die Halbfinalkonfiguration unten vorbereiten und die Eingabe öffnen."}
                    </p>
                    {semifinalPhase === "open" && (
                      <StitchButton
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => setCompetitionPhase(season, "closed"),
                            "Halbfinaleingabe für alle Klassen geschlossen.",
                          )
                        }
                      >
                        Halbfinaleingabe schließen
                      </StitchButton>
                    )}
                  </div>
                )}
              </StitchCard>
              {filteredPairs.map(([key, group]) => (
                <StitchCard key={key} className="p-5">
                  <h3 className="stitch-headline mb-3 text-xl">
                    {className(group.league, group.label)}
                  </h3>
                  <div className="space-y-2">
                    {group.rows
                      .filter((row) => row.missing.some((m) => !m.settled))
                      .map((row) => (
                        <div
                          key={row.profile_id}
                          className="rounded-xl bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <strong>
                                {row.rank}. {row.name}
                              </strong>
                              <p className="text-sm">
                                {row.points} Punkte · {row.completed}/5
                                Ergebnisse{" "}
                                {row.excluded &&
                                  `· ${row.excluded === "dns" ? "Nicht erschienen" : "Zurückgezogen"}`}
                              </p>
                            </div>
                          </div>
                          {semiAdmin && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {(
                                semiAdmin.config.assignments.find(
                                  (assignment) =>
                                    assignment.league === row.league &&
                                    assignment.class_label === row.class_label,
                                )?.route_numbers ?? []
                              ).map((routeNumber) => {
                                const result = data.semifinal_results.find(
                                  (item) =>
                                    item.profile_id === row.profile_id &&
                                    item.route_number === routeNumber,
                                );
                                const lastCorrection =
                                  data.semifinal_audit.find(
                                    (item) => item.result_id === result?.id,
                                  );
                                return (
                                  <span
                                    key={routeNumber}
                                    className="rounded-lg bg-[#f2dcab]/60 px-2 py-1"
                                  >
                                    R{routeNumber}:{" "}
                                    {result
                                      ? `${result.points} P. · Griff ${result.zone * 10}`
                                      : row.missing.some(
                                            (m) =>
                                              m.number === routeNumber &&
                                              m.settled,
                                          )
                                        ? "Nicht geklettert · 0 P."
                                        : "offen"}
                                    {result &&
                                      ` · Erst ${formatWhen(result.created_at)}`}
                                    {lastCorrection &&
                                      ` · Korr. ${formatWhen(lastCorrection.created_at)}`}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {row.missing.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {row.missing.map((m) => (
                                <div
                                  key={m.route_id}
                                  className="flex flex-wrap items-center gap-2 text-sm"
                                >
                                  <span>
                                    Route {m.number}:{" "}
                                    {m.settled
                                      ? "Nicht geklettert · 0 P."
                                      : "Offen"}
                                  </span>
                                  {!m.settled && (
                                    <>
                                      <Select
                                        value={
                                          semifinalZones[
                                            `${row.profile_id}|${m.route_id}`
                                          ] ?? ""
                                        }
                                        onValueChange={(value) =>
                                          setSemifinalZones((current) => ({
                                            ...current,
                                            [`${row.profile_id}|${m.route_id}`]:
                                              value,
                                          }))
                                        }
                                      >
                                        <SelectTrigger
                                          aria-label={`${row.name}, Route ${m.number}: Griff`}
                                          className="min-h-11 w-36 bg-white"
                                        >
                                          <SelectValue placeholder="Griff wählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from(
                                            { length: 11 },
                                            (_, i) => (
                                              <SelectItem
                                                key={i}
                                                value={String(i)}
                                              >
                                                {i === 0
                                                  ? "Kein Griff"
                                                  : `Griff ${i * 10}`}
                                              </SelectItem>
                                            ),
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <StitchButton
                                        size="sm"
                                        disabled={
                                          busy ||
                                          semifinalPhase !== "closed" ||
                                          !reasonReady ||
                                          semifinalZones[
                                            `${row.profile_id}|${m.route_id}`
                                          ] === undefined
                                        }
                                        onClick={() => {
                                          const value =
                                            semifinalZones[
                                              `${row.profile_id}|${m.route_id}`
                                            ];
                                          const zone = Number(value);
                                          if (
                                            !Number.isInteger(zone) ||
                                            zone < 0 ||
                                            zone > 10 ||
                                            value === undefined
                                          ) {
                                            setError(
                                              "Bitte zuerst einen Griff wählen.",
                                            );
                                            return;
                                          }
                                          void run(
                                            () =>
                                              enterSemifinalResult(
                                                season,
                                                row.profile_id,
                                                m.route_id,
                                                zone,
                                                reason,
                                              ),
                                            "Halbfinalergebnis nachgetragen.",
                                          );
                                        }}
                                      >
                                        Nachtragen
                                      </StitchButton>
                                      <StitchButton
                                        size="sm"
                                        variant="outline"
                                        disabled={
                                          busy ||
                                          semifinalPhase !== "closed" ||
                                          !reasonReady
                                        }
                                        onClick={() =>
                                          void run(
                                            () =>
                                              settleSemifinal(
                                                season,
                                                row.profile_id,
                                                m.route_id,
                                                reason,
                                              ),
                                            "Nicht geklettert dokumentiert.",
                                          )
                                        }
                                      >
                                        Nicht geklettert
                                      </StitchButton>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </StitchCard>
              ))}
            </details>
            {semiAdmin && (
              <StitchCard className="p-5">
                <h3 className="stitch-headline text-xl">Eingabezeiten</h3>
                <div className="mt-3 max-h-96 overflow-auto text-sm">
                  {semiAdmin.results
                    .filter(
                      (r) => classKey(r.league, r.class_label) === activeKey,
                    )
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .map((r) => (
                      <p
                        key={r.id}
                        className="border-b border-[#003d55]/10 py-2"
                      >
                        {formatWhen(r.created_at)} · {r.name} · Route{" "}
                        {data.semifinal_results.find(
                          (result) => result.id === r.id,
                        )?.route_number ?? "–"}{" "}
                        · {r.points} P.
                      </p>
                    ))}
                </div>
              </StitchCard>
            )}
            <details
              open={data.phase === "draft"}
              className="rounded-xl border border-[#003d55]/15 bg-white p-4"
            >
              <summary className="cursor-pointer py-2 font-bold">
                Halbfinaleingabe & Grundeinstellungen
              </summary>
              <div className="mt-4">{semifinalConfiguration}</div>
            </details>
          </TabsContent>

          <TabsContent value="roster" className="space-y-5 pt-4">
            <details
              className="rounded-xl border border-[#003d55]/15 bg-white p-4"
              open={!data.routes.length}
            >
              <summary className="cursor-pointer py-2 font-bold">
                Finalrouten verwalten · {data.routes.length} vorbereitet
              </summary>
              <StitchCard className="space-y-4 p-5">
                <h2 className="stitch-headline text-xl">Finalrouten</h2>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="grid gap-1 text-sm font-bold">
                    Nummer
                    <input
                      className={numberInput}
                      type="number"
                      min="1"
                      max="99"
                      value={routeNumber}
                      onChange={(e) => setRouteNumber(e.target.value)}
                    />
                  </label>
                  <div className="min-w-48 flex-1">
                    <StitchTextField
                      label="Routenname"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                    />
                  </div>
                  <label className="grid gap-1 text-sm font-bold">
                    Letzter Griff
                    <input
                      className={numberInput}
                      type="number"
                      min="1"
                      max="999"
                      value={maxGrip}
                      onChange={(e) => setMaxGrip(e.target.value)}
                    />
                  </label>
                  <StitchButton
                    disabled={
                      busy ||
                      !routeName.trim() ||
                      !Number.isInteger(Number(routeNumber)) ||
                      !Number.isInteger(Number(maxGrip))
                    }
                    onClick={() =>
                      void run(
                        () =>
                          saveFinalRoute(
                            season,
                            Number(routeNumber),
                            routeName,
                            Number(maxGrip),
                          ),
                        "Finalroute gespeichert.",
                      )
                    }
                  >
                    Route speichern
                  </StitchButton>
                </div>
                <p className="text-sm">
                  Eine physische Route kann mehreren Klassen zugeordnet werden.
                  Nach Freigabe einer Klasse ist ihre Route gesperrt.
                </p>
              </StitchCard>
            </details>
            <StitchCard className="space-y-3 p-5">
              <h2 className="stitch-headline text-xl">
                Nachrücken und Ausfälle
              </h2>
              <StitchTextField
                label="Begründung für Absage oder Rücknahme"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-sm">
                Vor Klassenstart können Personen als nicht erschienen oder
                zurückgezogen markiert werden. Danach die Finalstartliste erneut
                bestätigen und drucken.
              </p>
            </StitchCard>
            {filteredPairs.map(([key, group]) => {
              const c = finalClass(key);
              const selectedRoute = routeSelections[key] ?? c?.route_id ?? "";
              const selectedStation =
                stationSelections[key] ?? String(c?.station_no ?? "1");
              const excluded = group.rows.filter((r) => r.excluded);
              const eligible = group.rows.filter((r) => !r.excluded);
              const cut = eligible[5]?.points;
              const proposed = eligible.filter(
                (r) => cut === undefined || r.points >= cut,
              );
              return (
                <StitchCard key={key} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="stitch-headline text-xl">
                      {className(group.league, group.label)}
                    </h3>
                    <StitchBadge tone="cream">
                      {c
                        ? `${phaseName[c.phase]} · Liste v${c.version}`
                        : "Noch nicht freigegeben"}
                    </StitchBadge>
                  </div>
                  {c?.phase === "published" && (
                    <p className="rounded-lg bg-amber-100 p-3 text-sm font-bold text-[#653414]">
                      Neu drucken · aktueller Listenstand v{c.version}. Nach
                      jeder Änderung der Finalstarter oder Startreihenfolge
                      ersetzt die neue Liste den bisherigen Ausdruck.
                    </p>
                  )}
                  {c?.stale && (
                    <p
                      role="alert"
                      className="rounded-lg bg-amber-100 p-3 text-sm font-bold"
                    >
                      Halbfinalwertung seit Freigabe geändert · Liste prüfen und
                      neu drucken.
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.rows.map((row) => (
                      <div
                        key={row.profile_id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-sm ${row.excluded ? "bg-amber-100" : proposed.some((p) => p.profile_id === row.profile_id) ? "bg-white" : "bg-[#e9e2d3]"}`}
                      >
                        <span>
                          <strong>
                            {row.rank}. {row.name}
                          </strong>{" "}
                          · {row.points} P.{" "}
                          {row.excluded
                            ? "· Ausfall"
                            : proposed.some(
                                  (p) => p.profile_id === row.profile_id,
                                )
                              ? "· Finalvorschlag"
                              : "· Nachrücker"}
                        </span>
                        {semifinalPhase === "closed" &&
                          (!c || c.phase === "published") && (
                            <div className="flex gap-1">
                              {row.excluded ? (
                                <StitchButton
                                  size="sm"
                                  variant="outline"
                                  disabled={busy || !reasonReady}
                                  onClick={() =>
                                    void run(
                                      () =>
                                        setFinalExclusion(
                                          season,
                                          row.profile_id,
                                          null,
                                          reason,
                                        ),
                                      "Ausfall zurückgenommen.",
                                    )
                                  }
                                >
                                  Zurücknehmen
                                </StitchButton>
                              ) : (
                                <>
                                  <StitchButton
                                    size="sm"
                                    variant="outline"
                                    disabled={busy || !reasonReady}
                                    onClick={() =>
                                      void run(
                                        () =>
                                          setFinalExclusion(
                                            season,
                                            row.profile_id,
                                            "dns",
                                            reason,
                                          ),
                                        "Nicht erschienen dokumentiert.",
                                      )
                                    }
                                  >
                                    Nicht erschienen
                                  </StitchButton>
                                  <StitchButton
                                    size="sm"
                                    variant="outline"
                                    disabled={busy || !reasonReady}
                                    onClick={() =>
                                      void run(
                                        () =>
                                          setFinalExclusion(
                                            season,
                                            row.profile_id,
                                            "withdrawn",
                                            reason,
                                          ),
                                        "Rückzug dokumentiert.",
                                      )
                                    }
                                  >
                                    Zurückgezogen
                                  </StitchButton>
                                </>
                              )}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-56">
                      <label className="mb-1 block text-sm font-bold">
                        Finalroute
                      </label>
                      <Select
                        value={selectedRoute}
                        disabled={Boolean(
                          c && !["preparation", "published"].includes(c.phase),
                        )}
                        onValueChange={(v) =>
                          setRouteSelections((prev) => ({ ...prev, [key]: v }))
                        }
                      >
                        <SelectTrigger
                          aria-label="Finalroute"
                          className="min-h-11 bg-white"
                        >
                          <SelectValue placeholder="Route wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.routes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              Route {r.number} · {r.name} · Griff {r.max_grip}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold">
                        Eingabestation
                      </label>
                      <Select
                        value={selectedStation}
                        disabled={Boolean(
                          c && !["preparation", "published"].includes(c.phase),
                        )}
                        onValueChange={(v) =>
                          setStationSelections((prev) => ({
                            ...prev,
                            [key]: v,
                          }))
                        }
                      >
                        <SelectTrigger
                          aria-label="Eingabestation der Klasse"
                          className="min-h-11 w-40 bg-white"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Station 1</SelectItem>
                          <SelectItem value="2">Station 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <StitchButton
                      disabled={
                        busy ||
                        !readyForPublish(group.rows) ||
                        !selectedRoute ||
                        Boolean(
                          c?.phase === "published" &&
                          !c.stale &&
                          selectedRoute === c.route_id &&
                          Number(selectedStation) === c.station_no,
                        ) ||
                        Boolean(
                          c && !["preparation", "published"].includes(c.phase),
                        )
                      }
                      onClick={() =>
                        void run(
                          () =>
                            publishFinalClass(
                              season,
                              group.league,
                              group.label,
                              selectedRoute,
                              Number(selectedStation),
                              c?.version ?? 0,
                            ),
                          "Finalstartliste bestätigt. Bitte drucken.",
                        )
                      }
                    >
                      {c?.phase === "published"
                        ? "Finalfeld aktualisieren"
                        : "Finalfeld bestätigen"}
                    </StitchButton>
                    {c && c.phase !== "preparation" && (
                      <StitchButton asChild variant="outline">
                        <Link
                          target="_blank"
                          rel="noreferrer"
                          to={`${printHref}?klasse=${encodeURIComponent(key)}`}
                        >
                          <Printer size={16} className="mr-2" />
                          Drucken
                        </Link>
                      </StitchButton>
                    )}
                  </div>
                  {!readyForPublish(group.rows) && (
                    <p className="text-sm text-[#a15523]">
                      Freigabe erst nach geschlossener Halbfinaleingabe und
                      Klärung aller fehlenden Ergebnisse.
                    </p>
                  )}
                  {c?.entries.length ? (
                    <div className="space-y-2">
                      <h4 className="font-bold">Bestätigte Startreihenfolge</h4>
                      {[...c.entries]
                        .sort((a, b) => a.start_position - b.start_position)
                        .map((e) => (
                          <div
                            key={e.entry_id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3"
                          >
                            <span>
                              <strong>
                                {e.start_position}. {e.name}
                              </strong>{" "}
                              · Halbfinalplatz {e.semifinal_rank}
                            </span>
                            {["published", "running"].includes(c.phase) && (
                              <div className="flex gap-2">
                                <StitchButton
                                  variant="outline"
                                  size="sm"
                                  aria-label={`${e.name} früher starten`}
                                  disabled={
                                    busy ||
                                    e.start_position === 1 ||
                                    Boolean(e.attempt_id) ||
                                    Boolean(
                                      c.entries.find(
                                        (other) =>
                                          other.start_position ===
                                          e.start_position - 1,
                                      )?.attempt_id,
                                    )
                                  }
                                  onClick={() =>
                                    void run(
                                      () =>
                                        moveFinalEntry(
                                          e.entry_id,
                                          e.start_position - 1,
                                          c.version,
                                        ),
                                      "Startreihenfolge geändert. Bitte Liste neu drucken.",
                                    )
                                  }
                                >
                                  ↑
                                </StitchButton>
                                <StitchButton
                                  variant="outline"
                                  size="sm"
                                  aria-label={`${e.name} später starten`}
                                  disabled={
                                    busy ||
                                    e.start_position === c.entries.length ||
                                    Boolean(e.attempt_id) ||
                                    Boolean(
                                      c.entries.find(
                                        (other) =>
                                          other.start_position ===
                                          e.start_position + 1,
                                      )?.attempt_id,
                                    )
                                  }
                                  onClick={() =>
                                    void run(
                                      () =>
                                        moveFinalEntry(
                                          e.entry_id,
                                          e.start_position + 1,
                                          c.version,
                                        ),
                                      "Startreihenfolge geändert. Bitte Liste neu drucken.",
                                    )
                                  }
                                >
                                  ↓
                                </StitchButton>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : null}
                </StitchCard>
              );
            })}
            <StitchButton asChild variant="outline">
              <Link to={printHref} target="_blank" rel="noreferrer">
                <Printer size={16} className="mr-2" />
                Alle Startlisten drucken
              </Link>
            </StitchButton>
          </TabsContent>

          <TabsContent value="final" className="space-y-5 pt-4">
            <details
              className="rounded-xl border border-[#003d55]/15 bg-white p-4"
              open={!data.stations.length}
            >
              <summary className="cursor-pointer py-2 font-bold">
                Zugänge der Zeitnahme · {data.stations.length}/2 eingerichtet
              </summary>
              <StitchCard className="space-y-3 p-5">
                <h2 className="stitch-headline text-xl">
                  Digitale Eingabestationen
                </h2>
                <p className="text-sm">
                  Je ein eigener Code für die beiden Zeitnehmenden. Ein neuer
                  Code widerruft den alten Zugang dieser Station.
                </p>
                <div className="flex flex-wrap gap-3">
                  {([1, 2] as const).map((station) => (
                    <StitchButton
                      key={station}
                      disabled={busy}
                      variant="outline"
                      onClick={() => {
                        const code = randomCode();
                        void run(
                          () => setFinalStation(season, station, code),
                          `Code für Station ${station} erzeugt.`,
                        ).then((ok) => {
                          if (ok)
                            setGeneratedCodes((prev) => ({
                              ...prev,
                              [station]: code,
                            }));
                        });
                      }}
                    >
                      Code Station {station}{" "}
                      {data.stations.some((s) => s.station_no === station)
                        ? "ersetzen"
                        : "erzeugen"}
                    </StitchButton>
                  ))}
                </div>
                {Object.entries(generatedCodes).map(([station, code]) => (
                  <p
                    key={station}
                    className="break-all rounded-lg bg-white p-3 text-sm"
                  >
                    <strong>
                      Station {station}: {code}
                    </strong>
                    <br />
                    Nur jetzt sichtbar. Sicher an die zuständige Person
                    weitergeben.
                  </p>
                ))}
                <StitchButton asChild variant="outline">
                  <Link to={stationHref}>
                    <ExternalLink size={16} className="mr-2" />
                    Eingabeseite öffnen
                  </Link>
                </StitchButton>
              </StitchCard>
            </details>
            <StitchCard className="p-5">
              <StitchTextField
                label="Begründung für Statusänderungen und Wiederöffnung"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </StitchCard>
            {data.classes
              .filter(
                (c) =>
                  c.phase !== "preparation" &&
                  classKey(c.league, c.class_label) === activeKey,
              )
              .map((c) => (
                <StitchCard key={c.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="stitch-headline text-xl">
                        {className(c.league, c.class_label)}
                      </h3>
                      <p className="text-sm">
                        {phaseName[c.phase]} · Liste v{c.version} · Station{" "}
                        {c.station_no} · Route{" "}
                        {data.routes.find((r) => r.id === c.route_id)?.number ??
                          "–"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.phase === "published" && (
                        <StitchButton asChild variant="outline">
                          <Link
                            target="_blank"
                            rel="noreferrer"
                            to={`${printHref}?klasse=${encodeURIComponent(classKey(c.league, c.class_label))}`}
                          >
                            <Printer size={16} />
                            Startliste drucken
                          </Link>
                        </StitchButton>
                      )}
                      {c.phase === "published" && (
                        <StitchButton
                          disabled={busy || c.stale}
                          onClick={() =>
                            void run(
                              () => setFinalPhase(c.id, "running", c.version),
                              "Finalklasse gestartet.",
                            )
                          }
                        >
                          Klasse starten
                        </StitchButton>
                      )}
                      {c.phase === "running" && (
                        <StitchButton
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => setFinalPhase(c.id, "review", c.version),
                              "Finaleingabe geschlossen; Papierprüfung läuft.",
                            )
                          }
                        >
                          Eingabe schließen
                        </StitchButton>
                      )}
                      {c.phase === "review" && (
                        <>
                          <StitchButton
                            variant="outline"
                            disabled={busy || !reasonReady}
                            onClick={() =>
                              void run(
                                () =>
                                  setFinalPhase(
                                    c.id,
                                    "running",
                                    c.version,
                                    reason,
                                  ),
                                "Eingabe für Korrektur wieder geöffnet.",
                              )
                            }
                          >
                            Eingabe wieder öffnen
                          </StitchButton>
                          <StitchButton
                            disabled={
                              busy ||
                              c.entries.some(
                                (entry) =>
                                  entry.status === "incident" ||
                                  (entry.status === "ready" &&
                                    (!entry.attempt_id || !entry.checked_at)),
                              )
                            }
                            onClick={() =>
                              void run(
                                () => setFinalPhase(c.id, "final", c.version),
                                "Klassenwertung endgültig freigegeben.",
                              )
                            }
                          >
                            Endgültig freigeben
                          </StitchButton>
                        </>
                      )}
                      {c.phase === "final" && (
                        <StitchButton
                          variant="outline"
                          disabled={busy || !reasonReady}
                          onClick={() =>
                            void run(
                              () =>
                                setFinalPhase(
                                  c.id,
                                  "review",
                                  c.version,
                                  reason,
                                ),
                              "Freigabe mit Begründung aufgehoben.",
                            )
                          }
                        >
                          Freigabe aufheben
                        </StitchButton>
                      )}
                      <StitchButton
                        variant="outline"
                        onClick={() => downloadFinalCsv(c, season)}
                      >
                        <Download size={16} className="mr-2" />
                        CSV {c.phase === "final" ? "offiziell" : "vorläufig"}
                      </StitchButton>
                      <StitchButton asChild variant="outline">
                        <Link
                          target="_blank"
                          rel="noreferrer"
                          to={`${printHref}?klasse=${encodeURIComponent(classKey(c.league, c.class_label))}&art=ergebnis`}
                        >
                          <Printer size={16} className="mr-2" />
                          Ergebnisliste
                        </Link>
                      </StitchButton>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[690px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#003d55]/30">
                          <th className="p-2">Platz</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Ergebnis</th>
                          <th className="p-2">Halbfinale</th>
                          <th className="p-2">Papierabgleich / Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.entries.map((e) => (
                          <tr
                            key={e.entry_id}
                            className="border-b border-[#003d55]/10"
                          >
                            <td className="p-2">{e.rank ?? "–"}</td>
                            <td className="p-2 font-bold">{e.name}</td>
                            <td className="p-2">
                              <strong>{resultLabel(e)}</strong>
                              {e.entered_at && (
                                <span className="mt-1 block text-xs">
                                  Erst:{" "}
                                  {formatWhen(
                                    data.audit.find(
                                      (a) =>
                                        a.entry_id === e.entry_id &&
                                        a.action === "submit",
                                    )?.created_at ?? e.entered_at,
                                  )}
                                  {data.audit.some(
                                    (a) =>
                                      a.entry_id === e.entry_id &&
                                      a.action === "correct",
                                  ) &&
                                    ` · Letzte Korrektur: ${formatWhen(e.entered_at)}`}
                                </span>
                              )}
                            </td>
                            <td className="p-2">{e.semifinal_rank}.</td>
                            <td className="p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {e.checked_at ? (
                                  <span>
                                    Geprüft · {formatWhen(e.checked_at)}
                                  </span>
                                ) : e.status === "ready" &&
                                  e.attempt_id &&
                                  ["running", "review"].includes(c.phase) ? (
                                  <StitchButton
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                      void run(
                                        () =>
                                          checkFinalEntry(
                                            e.entry_id,
                                            c.version,
                                          ),
                                        "Papierabgleich gespeichert.",
                                      )
                                    }
                                  >
                                    Mit Papier abgeglichen
                                  </StitchButton>
                                ) : (
                                  <span>
                                    {e.status === "incident"
                                      ? "Zwischenfall offen"
                                      : "Offen"}
                                  </span>
                                )}
                                {["published", "running", "review"].includes(
                                  c.phase,
                                ) && (
                                  <>
                                    <StitchButton
                                      variant="outline"
                                      size="sm"
                                      disabled={busy || !reasonReady}
                                      onClick={() =>
                                        void run(
                                          () =>
                                            setFinalEntryStatus(
                                              e.entry_id,
                                              "dns",
                                              reason,
                                              c.version,
                                            ),
                                          "Nicht gestartet dokumentiert.",
                                        )
                                      }
                                    >
                                      DNS
                                    </StitchButton>
                                    <StitchButton
                                      variant="outline"
                                      size="sm"
                                      disabled={busy || !reasonReady}
                                      onClick={() =>
                                        void run(
                                          () =>
                                            setFinalEntryStatus(
                                              e.entry_id,
                                              "incident",
                                              reason,
                                              c.version,
                                            ),
                                          "Zwischenfall dokumentiert.",
                                        )
                                      }
                                    >
                                      Zwischenfall
                                    </StitchButton>
                                    {e.status !== "ready" && (
                                      <StitchButton
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !reasonReady}
                                        onClick={() =>
                                          void run(
                                            () =>
                                              setFinalEntryStatus(
                                                e.entry_id,
                                                "ready",
                                                reason,
                                                c.version,
                                              ),
                                            "Startstatus wiederhergestellt.",
                                          )
                                        }
                                      >
                                        Werten
                                      </StitchButton>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </StitchCard>
              ))}
          </TabsContent>

          <TabsContent value="display" className="space-y-5 pt-4">
            <div className="rounded-xl bg-[#003d55] p-5 text-sm leading-6 text-[#f2dcab]">
              <h2 className="stitch-headline text-lg">
                Einmal öffnen. Automatisch laufen lassen.
              </h2>
              <p className="mt-2">
                Die TV-URL ist öffentlich lesbar und braucht keine Anmeldung.
                Einstellungen und Hinweise steuerst du hier mit deinem
                Admin-Konto. Alle Seiten einer Klasse erscheinen nacheinander,
                anschließend die nächste Klasse. Am Fernseher gibt es keine
                Bedienelemente.
              </p>
            </div>
            <StitchCard className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="stitch-headline text-xl">Fernsehanzeige</h2>
                  <p className="text-sm">
                    Feste URL:{" "}
                    <strong>
                      {window.location.origin}
                      {activeTvHref}
                    </strong>
                  </p>
                </div>
                <StitchButton asChild variant="outline">
                  <Link target="_blank" to={activeTvHref}>
                    <ExternalLink size={16} className="mr-2" />
                    TV-Vorschau
                  </Link>
                </StitchButton>
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-sm font-bold">Phase</label>
                  <Select
                    value={display.phase}
                    onValueChange={(v) =>
                      setDisplay({
                        ...display,
                        phase: v as DisplaySettings["phase"],
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label="TV-Phase"
                      className="min-h-11 w-44 bg-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semifinal">Halbfinale</SelectItem>
                      <SelectItem value="final">Finale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="grid gap-1 text-sm font-bold">
                  Wechsel alle Sekunden
                  <input
                    className={numberInput}
                    type="number"
                    min="5"
                    max="120"
                    value={display.interval_seconds}
                    onChange={(e) =>
                      setDisplay({
                        ...display,
                        interval_seconds: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <div>
                  <label className="mb-1 block text-sm font-bold">
                    Fixierte Klasse
                  </label>
                  <Select
                    value={display.pinned_key ?? "auto"}
                    onValueChange={(v) =>
                      setDisplay({
                        ...display,
                        pinned_key: v === "auto" ? null : v,
                        class_keys:
                          v !== "auto" && !display.class_keys.length
                            ? allKeys
                            : display.class_keys,
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label="Fixierte TV-Klasse"
                      className="min-h-11 w-56 bg-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Automatischer Wechsel
                      </SelectItem>
                      {(display.class_keys.length
                        ? display.class_keys
                        : allKeys
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {key
                            .replace("lead|", "Vorstieg · ")
                            .replace("toprope|", "Toprope · ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">
                  Klassen in der Rotation
                </p>
                <p className="mb-3 text-xs leading-5">
                  {display.class_keys.length
                    ? `${display.class_keys.length} Klassen ausgewählt.`
                    : "Alle Klassen automatisch ausgewählt."}{" "}
                  Im Finale erscheinen nur freigegebene Startlisten. Lange
                  Klassenlisten werden seitenweise angezeigt.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {allKeys.map((key) => (
                    <label
                      key={key}
                      className="flex min-h-11 items-center gap-2 rounded-lg bg-white p-3"
                    >
                      <input
                        className="h-5 w-5 accent-[#003d55]"
                        type="checkbox"
                        checked={
                          !display.class_keys.length ||
                          display.class_keys.includes(key)
                        }
                        disabled={
                          allKeys.length === 1 ||
                          (display.class_keys.length === 1 &&
                            display.class_keys.includes(key))
                        }
                        onChange={(e) =>
                          setDisplay((prev) => ({
                            ...prev,
                            class_keys: e.target.checked
                              ? [...prev.class_keys, key]
                              : (prev.class_keys.length
                                  ? prev.class_keys
                                  : allKeys
                                ).filter((k) => k !== key),
                            pinned_key:
                              !e.target.checked && prev.pinned_key === key
                                ? null
                                : prev.pinned_key,
                          }))
                        }
                      />
                      {key
                        .replace("lead|", "Vorstieg · ")
                        .replace("toprope|", "Toprope · ")}
                    </label>
                  ))}
                </div>
              </div>
              <StitchButton
                variant="outline"
                size="sm"
                onClick={() =>
                  setDisplay((prev) => ({
                    ...prev,
                    class_keys: [],
                    pinned_key: null,
                  }))
                }
              >
                Alle Klassen automatisch
              </StitchButton>
              <StitchButton
                disabled={
                  busy ||
                  !Number.isInteger(display.interval_seconds) ||
                  display.interval_seconds < 5 ||
                  display.interval_seconds > 120
                }
                onClick={() =>
                  void run(
                    () => setLiveDisplay(season, display),
                    "Fernsehanzeige aktualisiert.",
                  )
                }
              >
                Anzeige speichern
              </StitchButton>
            </StitchCard>
            <StitchCard className="space-y-4 p-5">
              <h2 className="stitch-headline text-xl">
                Hinweis veröffentlichen
              </h2>
              <StitchTextField
                label="Titel"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
              />
              <label className="grid gap-1 text-sm font-bold">
                Text
                <textarea
                  className="min-h-28 rounded-xl border border-[#003d55]/25 bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
                  maxLength={500}
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-4 text-sm">
                {[
                  ["App", noticeApp, setNoticeApp],
                  ["TV", noticeTv, setNoticeTv],
                  [
                    "TV bildschirmfüllend",
                    noticeFullscreen,
                    setNoticeFullscreen,
                  ],
                ].map(([label, checked, setter]) => (
                  <label
                    key={String(label)}
                    className="flex min-h-11 items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#003d55]"
                      checked={checked as boolean}
                      onChange={(e) =>
                        (setter as (v: boolean) => void)(e.target.checked)
                      }
                    />
                    {String(label)}
                  </label>
                ))}
              </div>
              <div className="max-w-sm">
                <label className="mb-2 block text-sm font-bold">
                  Hinweis automatisch ausblenden
                </label>
                <Select
                  value={noticeDuration}
                  onValueChange={setNoticeDuration}
                >
                  <SelectTrigger
                    aria-label="Hinweis automatisch ausblenden"
                    className="min-h-12 bg-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editingNotice && (
                      <SelectItem value="existing">
                        Bisherige Ablaufzeit beibehalten
                      </SelectItem>
                    )}
                    <SelectItem value="5">Nach 5 Minuten</SelectItem>
                    <SelectItem value="10">Nach 10 Minuten</SelectItem>
                    <SelectItem value="30">Nach 30 Minuten</SelectItem>
                    <SelectItem value="60">Nach 60 Minuten</SelectItem>
                    <SelectItem value="0">Bis ich ihn zurückziehe</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs leading-5">
                  Nach dem Ablauf läuft die Klassenanzeige automatisch weiter.
                  Das funktioniert auch bei einem Verbindungsabbruch.
                </p>
              </div>
              <div className="flex gap-2">
                <StitchButton
                  disabled={
                    busy ||
                    !noticeTitle.trim() ||
                    !noticeBody.trim() ||
                    !(noticeApp || noticeTv)
                  }
                  onClick={() =>
                    void run(
                      () =>
                        saveLiveNotice(season, {
                          id: editingNotice,
                          title: noticeTitle,
                          body: noticeBody,
                          show_app: noticeApp,
                          show_tv: noticeTv,
                          fullscreen: noticeFullscreen,
                          expires_at:
                            noticeDuration === "existing"
                              ? noticeExpiry || null
                              : Number(noticeDuration) > 0
                                ? new Date(
                                    Date.now() + Number(noticeDuration) * 60000,
                                  ).toISOString()
                                : null,
                        }),
                      editingNotice
                        ? "Hinweis aktualisiert."
                        : "Hinweis veröffentlicht.",
                    ).then((ok) => {
                      if (ok) {
                        setEditingNotice(undefined);
                        setNoticeTitle("");
                        setNoticeBody("");
                        setNoticeDuration("10");
                      }
                    })
                  }
                >
                  {editingNotice
                    ? "Änderung speichern"
                    : "Hinweis veröffentlichen"}
                </StitchButton>
                {editingNotice && (
                  <StitchButton
                    variant="outline"
                    onClick={() => {
                      setEditingNotice(undefined);
                      setNoticeTitle("");
                      setNoticeBody("");
                      setNoticeDuration("10");
                    }}
                  >
                    Abbrechen
                  </StitchButton>
                )}
              </div>
              <div className="space-y-2">
                {data.notices
                  .filter((n) => !n.withdrawn_at)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-3"
                    >
                      <div>
                        <strong>{n.title}</strong>
                        <p className="text-sm">{n.body}</p>
                        <small>
                          {n.expires_at &&
                            Date.parse(n.expires_at) <= Date.now() &&
                            "Abgelaufen · "}
                          {n.show_app && "App "}
                          {n.show_tv && "TV "}
                          {n.expires_at && `· bis ${formatWhen(n.expires_at)}`}
                        </small>
                      </div>
                      <div className="flex gap-2">
                        <StitchButton
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNotice(n.id);
                            setNoticeTitle(n.title);
                            setNoticeBody(n.body);
                            setNoticeApp(n.show_app);
                            setNoticeTv(n.show_tv);
                            setNoticeFullscreen(n.fullscreen);
                            setNoticeExpiry(n.expires_at ?? "");
                            setNoticeDuration("existing");
                          }}
                        >
                          Bearbeiten
                        </StitchButton>
                        <StitchButton
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () =>
                                saveLiveNotice(season, {
                                  ...n,
                                  withdrawn: true,
                                }),
                              "Hinweis zurückgezogen.",
                            )
                          }
                        >
                          Zurückziehen
                        </StitchButton>
                      </div>
                    </div>
                  ))}
              </div>
            </StitchCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
