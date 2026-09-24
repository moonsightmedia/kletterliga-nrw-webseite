import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ListOrdered, Plus, QrCode, RefreshCw, Shield, ToggleRight, Trash2 } from "lucide-react";
import { StitchBadge, StitchButton, StitchCard, StitchTextField } from "@/app/components/StitchPrimitives";
import { CompetitionCustomColor } from "@/app/components/CompetitionCustomColor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeasonSettings } from "@/services/seasonSettings";
import { listAdminSemifinalRegistrations, type AdminSemifinalRegistration } from "@/services/semifinalAdminApi";
import { competitionClassKey, competitionZonePoints, registeredCompetitionClasses, validateCompetitionConfig, validateCompetitionRouteDraft } from "@/lib/competitionConfig";
import { competitionRouteColor, competitionRouteColors } from "@/lib/competitionRouteColors";
import { correctCompetitionResult, getCompetitionAdmin, getCompetitionDay, getCompetitionJudgeAccessStatus, saveCompetitionConfig, saveCompetitionRouteDraft, setCompetitionJudgePassword, setCompetitionPhase, type CompetitionAdminData, type CompetitionAdminResult, type CompetitionConfig, type CompetitionDay } from "@/services/competitionDay";

const emptyConfig = (): CompetitionConfig => ({ routes: [], assignments: [], zone_points: [...competitionZonePoints], flash_bonus: 0 });
const leagueLabel = (league: string) => league === "lead" ? "Vorstieg" : "Toprope";
const phaseLabels = { draft: "In Vorbereitung", open: "Eingabe offen", closed: "Eingabe geschlossen" };
const errorText = (error: unknown) => error instanceof Error ? error.message : "Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.";
const createJudgeCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

export default function LeagueCompetition() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  const [day, setDay] = useState<CompetitionDay | null>(null);
  const [admin, setAdmin] = useState<CompetitionAdminData | null>(null);
  const [registrations, setRegistrations] = useState<AdminSemifinalRegistration[]>([]);
  const [config, setConfig] = useState<CompetitionConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [phaseDialog, setPhaseDialog] = useState<"open" | "closed" | null>(null);
  const [judgeCodeConfigured, setJudgeCodeConfigured] = useState(false);
  const [generatedJudgeCode, setGeneratedJudgeCode] = useState("");
  const [copyError, setCopyError] = useState("");
  const [judgeCodeDialog, setJudgeCodeDialog] = useState(false);
  const [correction, setCorrection] = useState<CompetitionAdminResult | null>(null);
  const [correctZone, setCorrectZone] = useState(0);
  const [correctFlash, setCorrectFlash] = useState(false);
  const [reason, setReason] = useState("");
  const [resultSearch, setResultSearch] = useState("");
  const [selectedRouteNumber, setSelectedRouteNumber] = useState<number | null>(null);
  const [routeToRemove, setRouteToRemove] = useState<number | null>(null);
  const [operationsMenu, setOperationsMenu] = useState("");

  const reload = useCallback(async () => {
    if (!season) return;
    setLoading(true);
    try {
      const [current, administration, roster, codeConfigured] = await Promise.all([getCompetitionDay(season), getCompetitionAdmin(season), listAdminSemifinalRegistrations(season), getCompetitionJudgeAccessStatus(season)]);
      setDay(current); setAdmin(administration); setRegistrations(roster);
      setJudgeCodeConfigured(codeConfigured);
      const loaded = administration.config?.routes?.length ? administration.config : emptyConfig();
      setConfig(current.event?.opened_at ? loaded : { ...loaded, zone_points: [...competitionZonePoints] });
      setSelectedRouteNumber((currentNumber) => administration.config.routes.some((route) => route.number === currentNumber)
        ? currentNumber : administration.config.routes[0]?.number ?? null);
      setDirty(false); setError("");
      return true;
    } catch (err) { setError(errorText(err)); return false; }
    finally { setLoading(false); }
  }, [season]);
  useEffect(() => { if (!settingsLoading) { if (season) void reload(); else { setLoading(false); setError("Die Saison ist nicht verfügbar. Bitte lade die Seite erneut."); } } }, [reload, season, settingsLoading]);
  const classes = useMemo(() => registeredCompetitionClasses(registrations), [registrations]);
  const classRows = useMemo(() => {
    const rows = [...classes];
    for (const assignment of config.assignments) if (!rows.some((c) => competitionClassKey(c) === competitionClassKey(assignment))) rows.push({ ...assignment, count: 0 });
    return rows;
  }, [classes, config.assignments]);
  const locked = Boolean(day?.event?.opened_at);
  const canConfigure = !locked && !busy;
  const scoringNeedsSave = !locked && Boolean(admin && JSON.stringify(admin.config.zone_points) !== JSON.stringify(competitionZonePoints));
  const validation = validateCompetitionConfig(config, classes);
  const routeValidation = validateCompetitionRouteDraft(config.routes);
  const otherUnsavedChanges = Boolean(admin && JSON.stringify(config.assignments) !== JSON.stringify(admin.config.assignments));
  const canSaveRouteDraft = canConfigure && dirty && !routeValidation && !otherUnsavedChanges && !admin?.config.assignments.length && !admin?.staff.length;
  const selectedRoute = config.routes.find((route) => route.number === selectedRouteNumber) ?? config.routes[0];
  const canSaveConfig = canConfigure && !validation && (dirty || scoringNeedsSave);
  const change = (next: CompetitionConfig) => { setConfig(next); setDirty(true); setNotice(""); };

  async function action(run: () => Promise<unknown>, success: string, allowDirty = false) {
    if (busy) return;
    if (dirty && !allowDirty) { setError("Bitte speichere zuerst deine Änderungen an der Konfiguration."); return false; }
    setBusy(true); setError(""); setNotice("");
    try {
      await run();
      const refreshed = await reload();
      setNotice(success);
      if (!refreshed) {
        setDay(null); setAdmin(null); setDirty(false);
        setError("Die Änderung wurde gespeichert, aber die aktuelle Übersicht konnte nicht nachgeladen werden. Bitte neu laden, bevor du weiterarbeitest.");
      }
      return true;
    }
    catch (err) { setError(errorText(err)); return false; }
    finally { setBusy(false); }
  }
  const addRoutes = (count: number) => {
    const routes = [...config.routes];
    for (let number = 1; routes.length < count && number <= 99; number++) if (!routes.some((r) => r.number === number)) routes.push({ number, name: `Route ${number}`, grade: "", color: "" });
    change({ ...config, routes });
  };
  const toggleRoute = (key: string, number: number) => {
    const row = classRows.find((c) => competitionClassKey(c) === key);
    if (!row) return;
    const assignment = config.assignments.find((a) => competitionClassKey(a) === key) ?? { league: row.league, class_label: row.class_label, route_numbers: [] };
    const numbers = assignment.route_numbers.includes(number) ? assignment.route_numbers.filter((n) => n !== number) : [...assignment.route_numbers, number].sort((a, b) => a - b);
    change({ ...config, assignments: [...config.assignments.filter((a) => competitionClassKey(a) !== key), { ...assignment, route_numbers: numbers }] });
  };

  return <div className="mx-auto max-w-6xl space-y-6 pb-12 text-[#003d55]">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="stitch-kicker text-[#a15523]">Halbfinale · {season ?? "–"}</p><h1 className="stitch-headline mt-2 text-3xl">Wettkampftag</h1></div>
      <div className="flex flex-wrap items-center gap-2">
        <StitchBadge tone={day?.event?.phase === "open" ? "navy" : "cream"}>{day?.event ? phaseLabels[day.event.phase] : "In Vorbereitung"}</StitchBadge>
        <StitchButton variant="ghost" size="icon" aria-label="Neu laden" disabled={busy || loading || dirty} onClick={() => void reload()}><RefreshCw size={18} /></StitchButton>
      </div>
    </header>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</div>}
    {loading || settingsLoading ? <p role="status">Wettkampfdaten werden geladen …</p> : !admin || !day ? <p>Die Verwaltung ist erst nach erfolgreichem Laden verfügbar.</p> : <>
      <section aria-labelledby="competition-routes-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="competition-routes-heading" className="stitch-headline text-xl">Routen <span className="text-[#a15523]">{config.routes.length}</span></h2>
          {!locked && <div className="flex flex-wrap gap-2">
            {!config.routes.length && [12, 14].map((count) => <StitchButton key={count} variant="outline" size="sm" disabled={!canConfigure} onClick={() => addRoutes(count)}>Auf {count} Routen ergänzen</StitchButton>)}
            <StitchButton variant="outline" size="sm" disabled={!canConfigure || config.routes.length >= 30} onClick={() => addRoutes(config.routes.length + 1)}><Plus size={16} /> Route</StitchButton>
          </div>}
        </div>
        {locked && <p className="rounded-lg bg-[#f2dcab]/40 p-3 text-sm">Die Zuordnung ist seit der ersten Öffnung gesperrt.</p>}
        {!config.routes.length ? <p className="py-8 text-sm text-[#526b72]">Lege zunächst die Routen für das Halbfinale an.</p> : <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="grid min-w-0 grid-flow-col auto-cols-[8.5rem] grid-rows-2 gap-2 overflow-x-auto pb-2 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-2 lg:grid-rows-none lg:overflow-visible" aria-label="Routen auswählen">
            {config.routes.map((route) => {
              const inClasses = config.assignments.filter((assignment) => assignment.route_numbers.includes(route.number));
              const selected = selectedRoute?.number === route.number;
              return <button key={route.number} type="button" aria-label={"Route " + route.number + " bearbeiten"} aria-pressed={selected} onClick={() => setSelectedRouteNumber(route.number)} className={"min-h-24 min-w-0 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] focus-visible:ring-offset-2 " + (selected ? "bg-[#003d55] text-[#f2dcab]" : "bg-[#ede9e1] text-[#003d55] hover:bg-[#f8edcf]")}>
                <span className="flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/20" style={{ backgroundColor: competitionRouteColor(route.color).value }} /><strong className="stitch-headline text-lg">Route {route.number}</strong></span>
                <span className="mt-1 block truncate text-xs">{route.grade || "Grad offen"} · {competitionRouteColor(route.color).label}</span>
                <span className="mt-1 block text-xs opacity-80">{inClasses.length ? inClasses.length + (inClasses.length === 1 ? " Klasse" : " Klassen") : "Keine Klasse"}</span>
              </button>;
            })}
          </div>
          {selectedRoute && <StitchCard className="min-w-0 space-y-5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><h3 className="stitch-headline text-2xl">Route {selectedRoute.number}</h3><StitchButton variant="ghost" size="icon" aria-label={"Route " + selectedRoute.number + " entfernen"} disabled={!canConfigure} onClick={() => setRouteToRemove(selectedRoute.number)}><Trash2 size={16} /></StitchButton></div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
              {([["name", "Name"], ["grade", "Schwierigkeit"]] as const).map(([key, label]) => <StitchTextField key={key} label={label + " · Route " + selectedRoute.number} value={selectedRoute[key]} maxLength={key === "name" ? 100 : 40} disabled={!canConfigure} onChange={(e) => change({ ...config, routes: config.routes.map((route) => route.number === selectedRoute.number ? { ...route, [key]: e.target.value } : route) })} />)}
            </div>
            <fieldset disabled={!canConfigure} className="space-y-2">
              <legend className="mb-2 text-sm font-bold">Farbe <span className="font-normal text-[#526b72]">· {competitionRouteColor(selectedRoute.color).label}</span></legend>
              <div className="flex flex-wrap gap-2">{competitionRouteColors.map((color) => {
                const selected = competitionRouteColor(selectedRoute.color).value === color.value && Boolean(selectedRoute.color);
                return <button key={color.value} type="button" aria-label={color.label} aria-pressed={selected} title={color.label} onClick={() => change({ ...config, routes: config.routes.map((route) => route.number === selectedRoute.number ? { ...route, color: color.value } : route) })} className={"flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] focus-visible:ring-offset-2 " + (selected ? "bg-[#003d55]" : "bg-[#ede9e1] hover:bg-[#f2dcab]")}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/20" style={{ backgroundColor: color.value }}>{selected && <Check size={16} strokeWidth={3} className={["#f2cf35", "#ffffff", "#71c7b0"].includes(color.value) ? "text-[#003d55]" : "text-white"} />}</span>
                </button>;
              })}</div>
              <CompetitionCustomColor key={selectedRoute.number} value={selectedRoute.color} disabled={!canConfigure} onChange={(color) => change({ ...config, routes: config.routes.map((route) => route.number === selectedRoute.number ? { ...route, color } : route) })} />
            </fieldset>
            <fieldset disabled={!canConfigure} className="space-y-2">
              <legend className="mb-2 text-sm font-bold">Klassen für diese Route</legend>
              {!classRows.length && <p className="text-sm text-[#526b72]">Klassen erscheinen mit den freigegebenen Anmeldungen.</p>}
              <div className="grid gap-2 sm:grid-cols-2">{classRows.map((row) => {
                const key = competitionClassKey(row);
                const numbers = config.assignments.find((assignment) => competitionClassKey(assignment) === key)?.route_numbers ?? [];
                const selected = numbers.includes(selectedRoute.number);
                return <button key={key} type="button" aria-pressed={selected} aria-label={leagueLabel(row.league) + " " + row.class_label + " für Route " + selectedRoute.number} disabled={!canConfigure || (!selected && numbers.length >= 5)} onClick={() => toggleRoute(key, selectedRoute.number)} className={"flex min-h-14 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] focus-visible:ring-offset-2 disabled:cursor-not-allowed " + (selected ? "bg-[#003d55] text-[#f2dcab]" : "bg-[#ede9e1] text-[#003d55] enabled:hover:bg-[#f8edcf] disabled:opacity-55")}>
                  <span><span className="block text-[0.65rem] uppercase tracking-wider">{leagueLabel(row.league)}</span><strong>{row.class_label}</strong></span>
                  <span className="flex items-center gap-1 text-xs">{selected && <Check size={14} />}{numbers.length}/5</span>
                </button>;
              })}</div>
              {classRows.length > 0 && <p className="text-xs leading-5 text-[#526b72]">Mehrere Klassen sind möglich. Jede Klasse braucht insgesamt fünf Routen.</p>}
            </fieldset>
          </StitchCard>}
        </div>}
        {!locked && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#ede9e1] p-4">
          <div className="min-w-0 text-sm" role="status">
            <p className="font-bold">{dirty ? "Ungespeicherte Änderungen." : scoringNeedsSave ? "Routen und feste Wertung speichern." : "Alle Änderungen gespeichert."}</p>
            {validation && !canSaveRouteDraft && <p className="mt-1 text-[#765127]">{validation}</p>}
          </div>
          <StitchButton disabled={busy || (!canSaveConfig && !canSaveRouteDraft)} onClick={() => {
            if (!season) return;
            if (canSaveConfig) void action(() => saveCompetitionConfig(season, config), "Routen und Klassen gespeichert.", true);
            else if (canSaveRouteDraft) void action(() => saveCompetitionRouteDraft(season, config.routes), "Routen gespeichert. Die Klassen kannst du als Nächstes zuordnen.", true);
          }}><Check size={18} /> Änderungen speichern</StitchButton>
        </div>}
      </section>
      <Accordion type="single" collapsible value={operationsMenu} onValueChange={setOperationsMenu} className="space-y-2" aria-label="Wettkampfbetrieb">
        <AccordionItem value="entry" className="overflow-hidden rounded-xl border-0 bg-[#ede9e1]">
          <AccordionTrigger className="gap-3 px-4 text-left hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a15523] sm:px-5"><ToggleRight size={20} className="shrink-0" /><span className="min-w-0 flex-1"><span className="stitch-headline block text-lg">Ergebniseingabe</span><span className="block text-xs font-normal text-[#526b72]">{day.event ? phaseLabels[day.event.phase] : "In Vorbereitung"}</span></span></AccordionTrigger>
          <AccordionContent className="space-y-3 px-4 pb-5 sm:px-5">
          <p className="text-sm">Zone 1–10 = 1–10 Punkte. Keine Zone erreicht = 0.{config.flash_bonus > 0 ? " Flash: +" + config.flash_bonus + (config.flash_bonus === 1 ? " Punkt." : " Punkte.") : ""}</p>
          <StitchButton disabled={busy || !day.event || dirty || (day.event.phase !== "open" && (Boolean(validation) || scoringNeedsSave))} onClick={() => setPhaseDialog(day.event?.phase === "open" ? "closed" : "open")}>{day.event?.phase === "open" ? "Eingabe schließen" : "Eingabe öffnen"}</StitchButton>
          <p className="text-xs leading-5 text-[#526b72]">Nach der ersten Öffnung ist die Routenzuordnung gesperrt.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="judges" className="overflow-hidden rounded-xl border-0 bg-[#ede9e1]">
          <AccordionTrigger className="gap-3 px-4 text-left hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a15523] sm:px-5"><Shield size={20} className="shrink-0" /><span className="min-w-0 flex-1"><span className="stitch-headline block text-lg">Schiedsrichter</span><span className="block text-xs font-normal text-[#526b72]">{judgeCodeConfigured ? "Zugangscode aktiv" : "Zugangscode noch nicht eingerichtet"}</span></span></AccordionTrigger>
          <AccordionContent className="space-y-3 px-4 pb-5 sm:px-5">
          <StitchButton asChild variant="outline" size="sm"><Link to="/app/schiedsrichter"><QrCode size={16} /> Schiedsrichteransicht</Link></StitchButton>
          {!day.event ? <p className="text-sm">Zuerst die Routen speichern.</p> : <>
            <p className="text-sm">{judgeCodeConfigured ? "Zugangscode eingerichtet." : "Noch kein Zugangscode eingerichtet."}</p>
            <StitchButton variant="outline" size="sm" disabled={busy || dirty} onClick={() => setJudgeCodeDialog(true)}><Shield size={16} />{judgeCodeConfigured ? "Neuen Code erzeugen" : "Zugangscode erzeugen"}</StitchButton>
            {generatedJudgeCode && <div className="space-y-2 rounded-lg bg-[#f2dcab] p-3" role="status"><p className="text-xs">Code jetzt kopieren und an die Schiedsrichter weitergeben.</p><p className="break-all font-mono font-bold select-all">{generatedJudgeCode}</p><StitchButton variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(generatedJudgeCode); setCopyError(""); } catch { setCopyError("Bitte den Code markieren und selbst kopieren."); } }}><Copy size={16} /> Code kopieren</StitchButton>{copyError && <p role="alert" className="text-sm">{copyError}</p>}</div>}
          </>}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="results" className="overflow-hidden rounded-xl border-0 bg-[#ede9e1]">
          <AccordionTrigger className="gap-3 px-4 text-left hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a15523] sm:px-5"><ListOrdered size={20} className="shrink-0" /><span className="min-w-0 flex-1"><span className="stitch-headline block text-lg">Ergebnisse</span><span className="block text-xs font-normal text-[#526b72]">{admin.results.length} Einträge · Kontrolle und Korrekturen</span></span></AccordionTrigger>
          <AccordionContent className="space-y-3 px-4 pb-5 sm:px-5">
            <Link className="inline-block min-h-11 py-3 text-sm font-bold underline underline-offset-4" to="/app/wettkampf/rangliste">Live-Wertung öffnen</Link>
        {admin.results.length > 0 && <StitchTextField label="Ergebnisse nach Namen filtern" value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} />}
        {!admin.results.length && <p className="text-sm text-[#526b72]">Noch keine Ergebnisse eingetragen.</p>}
        {admin.results.filter((r) => r.name.toLocaleLowerCase("de").includes(resultSearch.toLocaleLowerCase("de"))).map((result) => <StitchCard key={result.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-bold">{result.name}</h3><p className="text-sm">{leagueLabel(result.league)} · {result.class_label} · Route {day.routes.find((r) => r.id === result.route_id)?.number ?? "–"}</p><p className="mt-1">Zone {result.zone}{result.flash ? " · Flash" : ""} · <strong>{result.points} Punkte</strong></p></div><StitchButton size="sm" variant="outline" disabled={busy || dirty} onClick={() => { setCorrection(result); setCorrectZone(result.zone); setCorrectFlash(result.flash); setReason(""); }}>Korrigieren</StitchButton></StitchCard>)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>}
    <AlertDialog open={routeToRemove !== null} onOpenChange={(open) => !open && setRouteToRemove(null)}>
      <AlertDialogContent className="stitch-app max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[#f2dcab] text-[#003d55]">
        <AlertDialogHeader><AlertDialogTitle>Route {routeToRemove} aus der Planung entfernen?</AlertDialogTitle><AlertDialogDescription className="text-[#003d55]">Die Route wird auch aus allen Klassenzuordnungen entfernt. Die Änderung bleibt zunächst ungespeichert und kann durch Neuladen verworfen werden.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel asChild><StitchButton variant="outline">Abbrechen</StitchButton></AlertDialogCancel><StitchButton onClick={() => {
          if (routeToRemove === null) return;
          change({ ...config, routes: config.routes.filter((route) => route.number !== routeToRemove), assignments: config.assignments.map((assignment) => ({ ...assignment, route_numbers: assignment.route_numbers.filter((number) => number !== routeToRemove) })) });
          setRouteToRemove(null);
        }}>Route entfernen</StitchButton></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={judgeCodeDialog} onOpenChange={(open) => !open && !busy && setJudgeCodeDialog(false)}>
      <AlertDialogContent className="stitch-app max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[#f2dcab] text-[#003d55]">
        <AlertDialogHeader><AlertDialogTitle>{judgeCodeConfigured ? "Schiedsrichter-Code ersetzen?" : "Schiedsrichter-Code erzeugen?"}</AlertDialogTitle><AlertDialogDescription className="text-[#003d55]">{judgeCodeConfigured ? "Der bisherige Code funktioniert danach nicht mehr für die Schiedsrichterseite. Gib den neuen Code allen eingeteilten Personen erneut weiter. Bereits ausgegebene Routen-QR-Codes bleiben gültig." : "Der Code wird nur unmittelbar nach dem Erzeugen angezeigt. Gib ihn nur an eingeteilte Schiedsrichter weiter."}</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel asChild><StitchButton variant="outline" disabled={busy}>Abbrechen</StitchButton></AlertDialogCancel><StitchButton disabled={busy} onClick={async () => {
          if (!season || busy) return;
          const code = createJudgeCode();
          const ok = await action(() => setCompetitionJudgePassword(season, code), judgeCodeConfigured ? "Alter Schiedsrichter-Code ersetzt." : "Schiedsrichter-Code eingerichtet.");
          if (ok) { setGeneratedJudgeCode(code); setJudgeCodeConfigured(true); setCopyError(""); setJudgeCodeDialog(false); }
        }}>{busy ? "Wird erzeugt …" : "Code jetzt erzeugen"}</StitchButton></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={phaseDialog !== null} onOpenChange={(open) => !open && !busy && setPhaseDialog(null)}>
      <AlertDialogContent className="stitch-app max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[#f2dcab] text-[#003d55]">
        <AlertDialogHeader>
          <AlertDialogTitle>{phaseDialog === "open" ? "Halbfinale jetzt öffnen?" : "Ergebniseingabe schließen?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-[#003d55]">{phaseDialog === "open" ? "Teilnehmende können danach Ergebnisse mit dem Routen-QR eintragen. Kontrolliere die fünf Routen jeder Klasse. Nach der ersten Öffnung sind diese Einstellungen gesperrt." : "Es werden keine neuen Teilnehmerergebnisse angenommen. Vorhandene Ergebnisse bleiben unverändert. Du kannst die Eingabe wieder öffnen."}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel asChild><StitchButton variant="outline" disabled={busy}>Abbrechen</StitchButton></AlertDialogCancel>
          <StitchButton disabled={busy} onClick={async () => {
            if (season && phaseDialog && await action(() => setCompetitionPhase(season, phaseDialog), "Eingabestatus aktualisiert.")) setPhaseDialog(null);
          }}>{busy ? "Wird gespeichert …" : "Bestätigen"}</StitchButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={Boolean(correction)} onOpenChange={(open) => !open && !busy && setCorrection(null)}>
      <AlertDialogContent className="stitch-app max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[#f2dcab] text-[#003d55]">
        <AlertDialogHeader><AlertDialogTitle>Ergebnis korrigieren</AlertDialogTitle><AlertDialogDescription className="text-[#003d55]">{correction?.name}. Die Änderung wird mit altem Wert, neuem Wert und Begründung protokolliert.</AlertDialogDescription></AlertDialogHeader>
        <label className="space-y-2"><span>Letzte gehaltene Zone</span><Select disabled={busy} value={String(correctZone)} onValueChange={(v) => { setCorrectZone(Number(v)); if (v !== "10") setCorrectFlash(false); }}><SelectTrigger aria-label="Korrigierte Zone"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 11 }, (_, zone) => <SelectItem key={zone} value={String(zone)}>Zone {zone}{zone === 10 ? " / TOP" : ""}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={correctFlash} disabled={busy || correctZone !== 10} onChange={(e) => setCorrectFlash(e.target.checked)} /> Flash bei TOP im ersten Versuch</label>
        <StitchTextField label="Begründung (Pflicht)" disabled={busy} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel asChild><StitchButton variant="outline" disabled={busy}>Abbrechen</StitchButton></AlertDialogCancel>
          <StitchButton className="whitespace-normal tracking-[0.1em]" disabled={busy || reason.trim().length < 5} onClick={async () => {
            if (correction && await action(() => correctCompetitionResult({ resultId: correction.id, zone: correctZone, flash: correctFlash, reason: reason.trim() }), "Korrektur gespeichert und protokolliert.")) setCorrection(null);
          }}>Korrektur speichern</StitchButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
