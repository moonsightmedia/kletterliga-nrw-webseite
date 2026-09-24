import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Flag, Plus, QrCode, RefreshCw, Shield, Trash2 } from "lucide-react";
import { StitchBadge, StitchButton, StitchCard, StitchTextField } from "@/app/components/StitchPrimitives";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeasonSettings } from "@/services/seasonSettings";
import { listAdminSemifinalRegistrations, type AdminSemifinalRegistration } from "@/services/semifinalAdminApi";
import { competitionClassKey, registeredCompetitionClasses, validateCompetitionConfig, validateCompetitionRouteDraft } from "@/lib/competitionConfig";
import { correctCompetitionResult, getCompetitionAdmin, getCompetitionDay, getCompetitionJudgeAccessStatus, saveCompetitionConfig, saveCompetitionRouteDraft, setCompetitionJudgePassword, setCompetitionPhase, type CompetitionAdminData, type CompetitionAdminResult, type CompetitionConfig, type CompetitionDay } from "@/services/competitionDay";

const emptyConfig = (): CompetitionConfig => ({ routes: [], assignments: [], zone_points: Array(11).fill(0), flash_bonus: 0 });
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
  const [correction, setCorrection] = useState<CompetitionAdminResult | null>(null);
  const [correctZone, setCorrectZone] = useState(0);
  const [correctFlash, setCorrectFlash] = useState(false);
  const [reason, setReason] = useState("");
  const [resultSearch, setResultSearch] = useState("");

  const reload = useCallback(async () => {
    if (!season) return;
    setLoading(true);
    try {
      const [current, administration, roster, codeConfigured] = await Promise.all([getCompetitionDay(season), getCompetitionAdmin(season), listAdminSemifinalRegistrations(season), getCompetitionJudgeAccessStatus(season)]);
      setDay(current); setAdmin(administration); setRegistrations(roster);
      setJudgeCodeConfigured(codeConfigured);
      setConfig(administration.config?.routes?.length ? administration.config : emptyConfig());
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
  const validation = validateCompetitionConfig(config, classes);
  const routeValidation = validateCompetitionRouteDraft(config.routes);
  const otherUnsavedChanges = Boolean(admin && (JSON.stringify(config.assignments) !== JSON.stringify(admin.config.assignments)
    || JSON.stringify(config.zone_points) !== JSON.stringify(admin.config.zone_points)
    || config.flash_bonus !== admin.config.flash_bonus));
  const canSaveRouteDraft = canConfigure && dirty && !routeValidation && !otherUnsavedChanges && !admin?.config.assignments.length && !admin?.staff.length;
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
    <StitchCard tone="navy" className="space-y-4 p-5 sm:p-8">
      <div className="flex flex-wrap items-center gap-3"><Flag aria-hidden="true" /><StitchBadge tone="cream">{day?.event ? phaseLabels[day.event.phase] : "Noch nicht eingerichtet"}</StitchBadge></div>
      <h1 className="stitch-headline text-3xl text-[#f2dcab]">Wettkampftag · Halbfinale</h1>
      <p className="max-w-2xl text-sm leading-6 text-[#f2dcab]">Saison {season ?? "–"}. Physische Routen anlegen, jeder Klasse fünf Routen zuordnen und den gemeinsamen Schiedsrichter-Code erzeugen. Qualifikation und Anmeldung bleiben unverändert.</p>
      <div className="flex flex-wrap gap-3"><StitchButton asChild variant="cream"><Link to="/app/schiedsrichter"><QrCode size={18} /> Schiedsrichteransicht</Link></StitchButton><StitchButton asChild variant="outline"><Link to="/app/wettkampf/rangliste">Live-Wertung</Link></StitchButton></div>
    </StitchCard>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{classes.reduce((sum, c) => sum + c.count, 0)} startberechtigte Zusagen · {classes.length} Klassen</p><StitchButton variant="outline" size="sm" disabled={busy || loading || dirty} onClick={() => void reload()}><RefreshCw size={16} /> Neu laden</StitchButton></div>
    {loading || settingsLoading ? <p role="status">Wettkampfdaten werden geladen …</p> : !admin || !day ? <p>Die Verwaltung ist erst nach erfolgreichem Laden verfügbar.</p> : <>
      <section aria-labelledby="competition-setup" className="space-y-5">
        <h2 id="competition-setup" className="stitch-headline text-2xl">1. Routen & Klassen</h2>
        {locked && <StitchCard tone="cream" className="p-4 text-sm">Die Zuordnung und Wertung sind seit der ersten Öffnung gesperrt. So klettern alle Teilnehmenden einer Klasse unter denselben Bedingungen.</StitchCard>}
        <div className="flex flex-wrap gap-2">{[12, 14].map((count) => <StitchButton key={count} variant="outline" size="sm" disabled={!canConfigure || config.routes.length >= count} onClick={() => addRoutes(count)}>Auf {count} Routen ergänzen</StitchButton>)}<StitchButton variant="outline" size="sm" disabled={!canConfigure || config.routes.length >= 30} onClick={() => addRoutes(config.routes.length + 1)}><Plus size={16} /> Route</StitchButton></div>
        {!locked && <div className="space-y-2"><p className="text-sm leading-6">Routen können zunächst allein als Entwurf gespeichert werden. Klassen und Punktwerte bleiben unberührt; die Ergebniseingabe wird dadurch nicht geöffnet.</p><StitchButton variant="outline" disabled={!canSaveRouteDraft} onClick={() => season && void action(() => saveCompetitionRouteDraft(season, config.routes), "Routenentwurf gespeichert. Die Ergebniseingabe bleibt geschlossen.", true)}><Check size={18} /> Nur Routenentwurf speichern</StitchButton>{otherUnsavedChanges && <p role="status" className="text-sm">Für einen reinen Routenentwurf dürfen keine ungespeicherten Klassen- oder Punkteänderungen vorliegen.</p>}{routeValidation && dirty && <p role="status" className="text-sm">{routeValidation}</p>}</div>}
        <div className="grid gap-3 md:grid-cols-2">{config.routes.map((route, index) => <StitchCard key={route.number} className="space-y-3 p-4">
          <div className="flex items-center justify-between"><h3 className="stitch-headline text-lg">Route {route.number}</h3><StitchButton variant="ghost" size="icon" aria-label={`Route ${route.number} entfernen`} disabled={!canConfigure} onClick={() => change({ ...config, routes: config.routes.filter((r) => r.number !== route.number), assignments: config.assignments.map((a) => ({ ...a, route_numbers: a.route_numbers.filter((n) => n !== route.number) })) })}><Trash2 size={16} /></StitchButton></div>
          {([['name', 'Name'], ['grade', 'Schwierigkeit (Planwert)'], ['color', 'Farbe / Erkennung']] as const).map(([key, label]) => <StitchTextField key={key} label={`${label} · Route ${route.number}`} value={route[key]} maxLength={key === "name" ? 100 : 40} disabled={!canConfigure} onChange={(e) => change({ ...config, routes: config.routes.map((r, i) => i === index ? { ...r, [key]: e.target.value } : r) })} />)}
        </StitchCard>)}</div>
        {!classRows.length && <p className="text-sm">Noch keine startberechtigten Zusagen. Klassen erscheinen hier mit der bestätigten Anmeldung und Orga-Freigabe.</p>}
        {classRows.map((row) => {
          const key = competitionClassKey(row);
          const selected = config.assignments.find((a) => competitionClassKey(a) === key)?.route_numbers ?? [];
          return <StitchCard key={key} className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{leagueLabel(row.league)} · {row.class_label}</h3><span className="text-sm">{row.count} Personen · {selected.length}/5 Routen</span></div><div className="flex flex-wrap gap-2">{config.routes.map((route) => <button key={route.number} type="button" aria-pressed={selected.includes(route.number)} disabled={!canConfigure || (!selected.includes(route.number) && selected.length >= 5)} className={`min-h-12 rounded-xl px-4 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${selected.includes(route.number) ? 'bg-[#003d55] text-[#f2dcab]' : 'bg-[#f2dcab]/40 text-[#003d55]'}`} onClick={() => toggleRoute(key, route.number)}>Route {route.number}</button>)}</div></StitchCard>;
        })}
      </section>
      <section aria-labelledby="competition-scoring" className="space-y-4">
        <h2 id="competition-scoring" className="stitch-headline text-2xl">2. Wertung festlegen</h2>
        <p className="text-sm leading-6">Zehn Zonen, letzter sicher gehaltener Wertungsgriff. Tragt die beschlossenen Punkte ein. Zone 10 ist hier TOP; ein Flash ist nur bei TOP möglich. Diese Festlegung vor der Öffnung mit dem endgültigen Regelwerk abgleichen.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{config.zone_points.map((points, zone) => <StitchTextField key={zone} label={zone === 10 ? "Zone 10 / TOP" : `Zone ${zone}`} type="number" min="0" max="1000" step="0.01" value={Number.isFinite(points) ? points : ""} disabled={!canConfigure || zone === 0} onChange={(e) => change({ ...config, zone_points: config.zone_points.map((v, i) => i === zone ? (e.target.value === "" ? NaN : Number(e.target.value)) : v) })} />)}<StitchTextField label="Flash-Bonus" type="number" min="0" max="1000" step="0.01" value={Number.isFinite(config.flash_bonus) ? config.flash_bonus : ""} disabled={!canConfigure} onChange={(e) => change({ ...config, flash_bonus: e.target.value === "" ? NaN : Number(e.target.value) })} /></div>
        {!locked && <><p className="text-sm" role="status">{validation ?? (dirty ? "Zuordnung vollständig. Änderungen noch nicht gespeichert." : "Zuordnung vollständig gespeichert.")}</p><StitchButton disabled={busy || Boolean(validation) || !dirty} onClick={() => season && void action(() => saveCompetitionConfig(season, config), "Routen, Klassen und Wertung sind gespeichert.", true)}><Check size={18} /> Konfiguration speichern</StitchButton></>}
      </section>
      <section aria-labelledby="competition-access" className="space-y-4">
        <p className="text-sm leading-6">Schiedsrichter öffnen <span className="font-bold">/app/schiedsrichter</span> ohne App-Konto. Ein gemeinsamer Code schaltet nur die Stoppuhren und Routen-QR-Codes frei – keine Ergebnisänderung oder Liga-Verwaltung.</p>
        {!day.event ? <p>Bitte zunächst einen Routenentwurf speichern.</p> : <>
          <p className="text-sm font-semibold">Gemeinsamer Zugang: {judgeCodeConfigured ? "Code eingerichtet" : "Noch kein Code eingerichtet"}</p>
          <StitchButton disabled={busy || dirty} onClick={async () => {
            if (!season || busy) return;
            const code = createJudgeCode();
            const ok = await action(() => setCompetitionJudgePassword(season, code), judgeCodeConfigured ? "Alter Schiedsrichter-Code ersetzt." : "Schiedsrichter-Code eingerichtet.");
            if (ok) { setGeneratedJudgeCode(code); setJudgeCodeConfigured(true); setCopyError(""); }
          }}><Shield size={16} />{judgeCodeConfigured ? "Neuen Code erzeugen" : "Zugangscode erzeugen"}</StitchButton>
          {generatedJudgeCode && <StitchCard tone="cream" className="space-y-3 p-4" role="status"><p className="text-sm font-bold">Diesen Code jetzt sicher an die Schiedsrichter weitergeben. Er wird nur hier einmal angezeigt.</p><p className="break-all font-mono text-lg font-bold tracking-wider select-all">{generatedJudgeCode}</p><StitchButton variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(generatedJudgeCode); setCopyError(""); } catch { setCopyError("Kopieren nicht möglich. Bitte den Code markieren und selbst kopieren."); } }}><Copy size={16} /> Code kopieren</StitchButton>{copyError && <p role="alert" className="text-sm">{copyError}</p>}</StitchCard>}
          <p className="text-xs leading-5">Ein neuer Code sperrt den alten für diese Seite. Bereits ausgedruckte oder gespeicherte Routen-QR-Codes bleiben jedoch gültig und müssen bei Missbrauch gesondert ersetzt werden.</p>
          {admin.staff.length > 0 && <p role="alert" className="text-sm">Hinweis: Es bestehen noch {admin.staff.length} frühere personenbezogene Helferfreigaben. Diese sind vom neuen Code unabhängig.</p>}
        </>}
      </section>
      <section aria-labelledby="competition-phase" className="space-y-4">
        <h2 id="competition-phase" className="stitch-headline text-2xl">4. Eingabe steuern</h2>
        <p className="text-sm leading-6">Keine automatische Öffnung. Die erste Öffnung friert Routenzuordnung und Punktwerte dauerhaft ein. Schließen sperrt nur weitere Abgaben; Ergebnisse bleiben erhalten.</p>
        <StitchButton disabled={busy || !day.event || dirty || (day.event.phase !== "open" && Boolean(validation))} variant={day.event?.phase === "open" ? "navy" : "primary"} onClick={() => setPhaseDialog(day.event?.phase === "open" ? "closed" : "open")}>{day.event?.phase === "open" ? "Eingabe schließen" : "Eingabe öffnen"}</StitchButton>
      </section>
      <section aria-labelledby="competition-results" className="space-y-4">
        <h2 id="competition-results" className="stitch-headline text-2xl">Eingetragene Ergebnisse</h2>
        <StitchTextField label="Ergebnisse nach Namen filtern" value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} />
        {!admin.results.length && <p className="text-sm">Noch keine Halbfinalergebnisse eingetragen.</p>}
        {admin.results.filter((r) => r.name.toLocaleLowerCase("de").includes(resultSearch.toLocaleLowerCase("de"))).map((result) => <StitchCard key={result.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-bold">{result.name}</h3><p className="text-sm">{leagueLabel(result.league)} · {result.class_label} · Route {day.routes.find((r) => r.id === result.route_id)?.number ?? "–"}</p><p className="mt-1">Zone {result.zone}{result.flash ? " · Flash" : ""} · <strong>{result.points} Punkte</strong></p></div><StitchButton size="sm" variant="outline" disabled={busy} onClick={() => { setCorrection(result); setCorrectZone(result.zone); setCorrectFlash(result.flash); setReason(""); }}>Korrigieren</StitchButton></StitchCard>)}
      </section>
    </>}
    <AlertDialog open={phaseDialog !== null} onOpenChange={(open) => !open && !busy && setPhaseDialog(null)}>
      <AlertDialogContent className="stitch-app max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-[#f2dcab] text-[#003d55]">
        <AlertDialogHeader>
          <AlertDialogTitle>{phaseDialog === "open" ? "Halbfinale jetzt öffnen?" : "Ergebniseingabe schließen?"}</AlertDialogTitle>
          <AlertDialogDescription className="text-[#003d55]">{phaseDialog === "open" ? "Teilnehmende können danach Ergebnisse mit dem Routen-QR eintragen. Kontrolliere Routen, alle Klassen und das beschlossene Punktesystem. Nach der ersten Öffnung sind diese Einstellungen gesperrt." : "Es werden keine neuen Teilnehmerergebnisse angenommen. Vorhandene Ergebnisse bleiben unverändert. Du kannst die Eingabe wieder öffnen."}</AlertDialogDescription>
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
