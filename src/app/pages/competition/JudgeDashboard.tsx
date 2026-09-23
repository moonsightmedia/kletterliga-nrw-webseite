import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, Clock3, Printer, QrCode, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StitchBadge, StitchButton, StitchCard, StitchSectionHeading } from "@/app/components/StitchPrimitives";
import { useAuth } from "@/app/auth/AuthProvider";
import { useSeasonSettings } from "@/services/seasonSettings";
import { getCompetitionDay, getCompetitionStaffRoutes, type CompetitionStaffRoute } from "@/services/competitionDay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COMPETITION_TIMER_DURATION_MS,
  COMPETITION_TIMER_WARNING_MS,
  formatCompetitionTimer,
  getCompetitionTimerElapsed,
  getCompetitionTimerStatus,
  getCompetitionTimerStorageKey,
  readCompetitionTimers,
  resetCompetitionTimer,
  startCompetitionTimer,
  stopCompetitionTimer,
  writeCompetitionTimers,
  type CompetitionTimer,
} from "@/lib/competitionTimers";

type DashboardTab = "timers" | "codes";
type RouteTimerMap = Record<string, CompetitionTimer>;
type TimerNotice = { id: string; text: string; status: "last-minute" | "finished" };

function routeUrl(route: CompetitionStaffRoute) {
  return `${window.location.origin}/app/wettkampf#route=${encodeURIComponent(route.id)}&token=${encodeURIComponent(route.qr_token)}`;
}

function QrImage({ route, size, className = "" }: { route: CompetitionStaffRoute; size: number; className?: string }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setImage(null);
    QRCode.toDataURL(routeUrl(route), { width: size, margin: 4, errorCorrectionLevel: "H" })
      .then((value) => { if (active) setImage(value); })
      .catch(() => { if (active) setImage(""); });
    return () => { active = false; };
  }, [route, size]);

  if (image === "") return <div role="status" className={`grid aspect-square w-full place-items-center rounded-2xl bg-[#ede8e1] p-4 text-center text-sm text-[#003d55] ${className}`}>QR-Code konnte nicht erzeugt werden.</div>;
  return image
    ? <img src={image} alt={`QR-Code Route ${route.number}`} width={size} height={size} className={`block h-auto w-full max-w-full rounded-2xl bg-white p-2 ${className}`} />
    : <div aria-label="QR-Code wird erzeugt" className={`aspect-square w-full animate-pulse rounded-2xl bg-[#ede8e1] ${className}`} />;
}

const readableLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (/staff|required|permission|berechtigt|admin/i.test(message)) return "Für diesen Wettkampftag ist dein Profil nicht als Schiedsrichter oder Liga-Administration freigeschaltet.";
  return "Die Wettkampfdaten konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.";
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character] ?? character));

export default function JudgeDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, refreshSettings } = useSeasonSettings();
  const season = settings?.season_year ? String(settings.season_year) : null;
  const [event, setEvent] = useState<{ id: string; phase: string } | null>(null);
  const [routes, setRoutes] = useState<CompetitionStaffRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<DashboardTab>("timers");
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const [timers, setTimers] = useState<RouteTimerMap | null>(null);
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const alerted = useRef(new Set<string>());
  const eventSequence = useRef(0);
  const selectionInitialized = useRef(false);

  const load = useCallback(async () => {
    if (!profile?.id || !season) return;
    const sequence = ++eventSequence.current;
    setLoading(true);
    setLoadError(null);
    setIsAllowed(null);
    try {
      const day = await getCompetitionDay(season);
      if (sequence !== eventSequence.current) return;
      setEvent(day.event ? { id: day.event.id, phase: day.event.phase } : null);
      setIsAllowed(Boolean(day.is_staff || day.is_admin));
      if (!day.event || !(day.is_staff || day.is_admin)) {
        setRoutes([]);
      } else {
        const staffRoutes = await getCompetitionStaffRoutes(season);
        if (sequence !== eventSequence.current) return;
        setRoutes(staffRoutes);
        let restoredRunningRouteIds: string[] = [];
        try {
          restoredRunningRouteIds = Object.values(readCompetitionTimers(window.localStorage, profile.id, season))
            .filter((timer) => timer.startedAt !== null && getCompetitionTimerElapsed(timer, Date.now()) < COMPETITION_TIMER_DURATION_MS)
            .map((timer) => timer.routeId);
        } catch { /* Timers remain usable in memory if local storage is blocked. */ }
        setSelectedRouteIds((current) => {
          const available = new Set(staffRoutes.map((route) => route.id));
          if (selectionInitialized.current) return new Set([...current].filter((id) => available.has(id)));
          selectionInitialized.current = true;
          return new Set([...staffRoutes.slice(0, 2).map((route) => route.id), ...restoredRunningRouteIds.filter((id) => available.has(id))]);
        });
        setSelectedQrId((current) => current && staffRoutes.some((route) => route.id === current) ? current : staffRoutes[0]?.id ?? null);
      }
    } catch (error) {
      if (sequence !== eventSequence.current) return;
      setLoadError(readableLoadError(error));
      setEvent(null);
      setRoutes([]);
    } finally {
      if (sequence === eventSequence.current) setLoading(false);
    }
  }, [profile?.id, season]);

  useEffect(() => {
    if (authLoading || settingsLoading) return;
    if (!profile?.id || !season) {
      setLoading(false);
      return;
    }
    void load();
    return () => { eventSequence.current += 1; };
  }, [authLoading, load, profile?.id, season, settingsLoading]);

  useEffect(() => {
    const invalidateHiddenView = () => {
      if (document.visibilityState === "hidden") {
        eventSequence.current += 1;
        setRoutes([]);
        setEvent(null);
        setIsAllowed(null);
        return;
      }
      if (profile?.id && season) void load();
    };
    window.addEventListener("focus", invalidateHiddenView);
    document.addEventListener("visibilitychange", invalidateHiddenView);
    return () => {
      window.removeEventListener("focus", invalidateHiddenView);
      document.removeEventListener("visibilitychange", invalidateHiddenView);
    };
  }, [load, profile?.id, season]);

  useEffect(() => {
    if (!profile?.id || !season) { setTimers(null); return; }
    let storedTimers: RouteTimerMap = {};
    let storedSound = false;
    try {
      storedTimers = readCompetitionTimers(window.localStorage, profile.id, season);
      storedSound = window.localStorage.getItem(`${getCompetitionTimerStorageKey(profile.id, season)}:sound`) === "on";
    } catch { setStorageWarning(true); }
    setTimers(storedTimers);
    setSoundEnabled(storedSound);
  }, [profile?.id, season]);

  useEffect(() => {
    if (!timers || !profile?.id || !season) return;
    setStorageWarning(!writeCompetitionTimers(window.localStorage, profile.id, season, timers));
  }, [profile?.id, season, timers]);

  useEffect(() => {
    if (!profile?.id || !season) return;
    try { window.localStorage.setItem(`${getCompetitionTimerStorageKey(profile.id, season)}:sound`, soundEnabled ? "on" : "off"); }
    catch { setStorageWarning(true); }
  }, [profile?.id, season, soundEnabled]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const playSignal = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.48);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.5);
      oscillator.onended = () => { void context.close(); };
    } catch { /* Browser audio may be unavailable or blocked. */ }
  }, [soundEnabled]);

  useEffect(() => {
    if (!timers) return;
    Object.values(timers).forEach((timer) => {
      if (timer.startedAt === null) return;
      const elapsed = getCompetitionTimerElapsed(timer, now);
        const route = routes.find((item) => item.id === timer.routeId);
      if (elapsed >= COMPETITION_TIMER_WARNING_MS) {
        const warningKey = `${timer.routeId}:last-minute`;
        if (!alerted.current.has(warningKey)) { alerted.current.add(warningKey); playSignal(); }
      }
      if (elapsed >= COMPETITION_TIMER_DURATION_MS) {
        const endKey = `${timer.routeId}:finished`;
        if (!alerted.current.has(endKey)) { alerted.current.add(endKey); playSignal(); }
      }
    });
  }, [now, playSignal, routes, timers]);

  const visibleTimerRoutes = useMemo(() => routes.filter((route) => selectedRouteIds.has(route.id)), [routes, selectedRouteIds]);
  const activeNotices = useMemo(() => routes.reduce<TimerNotice[]>((notices, route) => {
    const timer = timers?.[route.id];
    if (!timer) return notices;
    const status = getCompetitionTimerStatus(timer, now);
    if (status === "last-minute") notices.push({ id: route.id, text: `Letzte Minute · Route ${route.number}`, status });
    if (status === "finished") notices.push({ id: route.id, text: `5 Minuten beendet · Route ${route.number}`, status });
    return notices;
  }, []), [now, routes, timers]);

  const updateTimer = (routeId: string, update: (timer: CompetitionTimer) => CompetitionTimer) => {
    setTimers((current) => {
      if (!current) return current;
      const timer = current[routeId] ?? resetCompetitionTimer(routeId);
      const next = update(timer);
      return next === timer ? current : { ...current, [routeId]: next };
    });
  };

  const toggleRoute = (routeId: string, selected: boolean) => setSelectedRouteIds((current) => {
    const next = new Set(current);
    if (selected) next.add(routeId);
    else next.delete(routeId);
    return next;
  });

  const setSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    if (enabled) playSignal();
  };

  const printRoutes = async (items: CompetitionStaffRoute[]) => {
    setPrintError(null);
    const popup = window.open("", "_blank");
    if (!popup) { setPrintError("Drucken wurde vom Browser blockiert. Erlaube Pop-ups und versuche es erneut."); return; }
    try {
      const codes = await Promise.all(items.map(async (route) => ({
        route,
        dataUrl: await QRCode.toDataURL(routeUrl(route), { width: 420, margin: 4, errorCorrectionLevel: "H" }),
      })));
      const cards = codes.map(({ route, dataUrl }) => `<article class="route"><img src="${dataUrl}" alt="QR-Code Route ${route.number}"><div><p class="eyebrow">Kletterliga NRW · Wettkampftag</p><h1>Route ${route.number}</h1><p class="name">${escapeHtml(route.name)}</p><p class="hint">Mit dem Scanner in der Kletterliga-App öffnen.</p></div></article>`).join("");
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Routen QR-Codes</title><style>body{font-family:Arial,sans-serif;color:#002637;margin:0}.sheet{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12mm;padding:12mm}.route{display:flex;align-items:center;gap:6mm;break-inside:avoid;padding:5mm;background:#f8f4ee;border-radius:5mm}.route img{width:42mm;height:42mm;flex:none}.route>div{min-width:0;overflow-wrap:anywhere}.eyebrow{font-size:9pt;text-transform:uppercase;letter-spacing:.12em;color:#a15523}.route h1{font-size:25pt;margin:2mm 0}.name{font-size:15pt;margin:0}.hint{font-size:9pt;margin-top:3mm}@media screen and (max-width:700px){.sheet{grid-template-columns:1fr;padding:4mm}.route{gap:3mm;padding:3mm}}@page{size:A4;margin:12mm}@media print{.sheet{padding:0;gap:8mm}.route h1{font-size:22pt}}</style></head><body><main class="sheet">${cards}</main><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
      popup.document.close();
    } catch {
      popup.close();
      setPrintError("Der QR-Druckbogen konnte nicht erstellt werden. Bitte lade die Routen erneut.");
    }
  };

  const selectedQrRoute = routes.find((route) => route.id === selectedQrId) ?? routes[0] ?? null;
  const pendingResetRoute = routes.find((route) => route.id === resetTarget);

  if (authLoading || settingsLoading || loading) return <div className="mx-auto max-w-5xl" aria-live="polite"><StitchCard tone="muted" className="animate-pulse p-6"><p className="stitch-kicker">Wettkampftag</p><p className="mt-3 text-sm">Schiedsrichterbereich wird geladen …</p></StitchCard></div>;
  if (!profile?.id) return <div className="mx-auto max-w-2xl"><StitchCard tone="muted" className="p-6"><h1 className="stitch-headline text-2xl">Anmeldung erforderlich</h1><p className="mt-3 text-sm leading-6">Melde dich mit deinem persönlichen Profil an, um die Schiedsrichteransicht zu öffnen.</p></StitchCard></div>;
  if (!season) return <div className="mx-auto max-w-2xl"><StitchCard tone="muted" className="space-y-4 p-6" role="alert"><h1 className="stitch-headline text-2xl">Saison nicht verfügbar</h1><p className="text-sm leading-6">Die aktuelle Saison konnte nicht geladen werden. Bitte versuche es erneut.</p><StitchButton onClick={() => void refreshSettings()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Saisonstatus erneut laden</StitchButton></StitchCard></div>;
  if (loadError) return <div className="mx-auto max-w-2xl"><StitchCard tone="muted" className="space-y-4 p-6" role="alert"><AlertCircle className="h-6 w-6 text-[#a15523]" aria-hidden="true" /><h1 className="stitch-headline text-2xl">Ansicht nicht verfügbar</h1><p className="text-sm leading-6">{loadError}</p><StitchButton onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4" aria-hidden="true" />Erneut laden</StitchButton></StitchCard></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-7">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <StitchSectionHeading eyebrow={`Kletterliga NRW · ${season ?? ""}`} title="Schiedsrichter" description="Unabhängige Fünf-Minuten-Uhren und Routencodes für deine Station." titleAs="h1" />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <StitchBadge tone="navy"><Clock3 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />5 MINUTEN</StitchBadge>
          <StitchButton variant={soundEnabled ? "navy" : "outline"} size="sm" aria-pressed={soundEnabled} onClick={() => setSound(!soundEnabled)} title={soundEnabled ? "Signalton ausschalten" : "Signalton einschalten"}>
            {soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Ton {soundEnabled ? "an" : "aus"}</span>
          </StitchButton>
        </div>
      </header>

      {activeNotices.length > 0 && <section aria-label="Timerwarnungen" className="space-y-2" aria-live="assertive">
        {activeNotices.map((notice) => <div key={notice.id} className={`flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 font-bold ${notice.status === "finished" ? "bg-[#003d55] text-[#f2dcab]" : "bg-[#a15523] text-white"}`}>
          <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{notice.text}</span>
        </div>)}
      </section>}

      {!event ? <StitchCard tone="muted" className="space-y-2 p-6"><p className="stitch-kicker text-[#a15523]">Noch kein Wettkampftag</p><h2 className="stitch-headline text-2xl">Die Station ist noch nicht vorbereitet</h2><p className="text-sm leading-6 text-[rgba(27,28,26,0.7)]">Sobald die Wettkampfleitung den Saison-Wettkampftag angelegt hat, erscheinen hier deine freigegebenen Routen.</p><StitchButton variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Erneut prüfen</StitchButton></StitchCard>
        : isAllowed === false ? <StitchCard tone="muted" className="space-y-3 p-6" role="alert"><AlertCircle className="h-6 w-6 text-[#a15523]" aria-hidden="true" /><h2 className="stitch-headline text-2xl">Keine Schiedsrichterfreigabe</h2><p className="text-sm leading-6">Dein Profil ist für diesen Wettkampftag nicht als Schiedsrichter oder Liga-Administration freigegeben. Bitte wende dich an die Wettkampfleitung.</p></StitchCard>
          : routes.length === 0 ? <StitchCard tone="muted" className="space-y-3 p-6"><h2 className="stitch-headline text-2xl">Noch keine Routen zugewiesen</h2><p className="text-sm leading-6">Deine Schiedsrichterfreigabe ist aktiv, aber es sind aktuell keine Routen für deine Station verfügbar.</p><StitchButton variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Routen erneut laden</StitchButton></StitchCard>
            : <>
              <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)} className="space-y-5">
                <TabsList aria-label="Schiedsrichterwerkzeuge" className="grid h-auto w-full grid-cols-2 rounded-2xl bg-[#ede8e1] p-1.5">
                  <TabsTrigger value="timers" className="min-h-12 rounded-xl px-2 py-2 text-sm font-extrabold text-[#003d55] data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab] data-[state=active]:shadow-sm focus-visible:ring-[#003d55] sm:px-3"><Clock3 className="mr-2 inline h-4 w-4" aria-hidden="true" />Routenuhren</TabsTrigger>
                  <TabsTrigger value="codes" className="min-h-12 rounded-xl px-2 py-2 text-sm font-extrabold text-[#003d55] data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab] data-[state=active]:shadow-sm focus-visible:ring-[#003d55] sm:px-3"><QrCode className="mr-2 inline h-4 w-4" aria-hidden="true" />QR-Codes</TabsTrigger>
                </TabsList>

                <TabsContent value="timers" className="m-0 space-y-5">
                <StitchCard tone="surface" className="space-y-4 p-4 sm:p-5">
                  <div><p className="stitch-kicker text-[#a15523]">Deine Station</p><h2 className="stitch-headline mt-2 text-xl">Routen für die Zeitnahme</h2><p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">Wähle die Routen aus, die du gerade betreust. Jede Uhr läuft unabhängig und bleibt nach dem Neuladen erhalten.</p></div>
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl bg-[#f8f4ee] px-4 py-3 text-sm font-extrabold text-[#003d55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] [&::-webkit-details-marker]:hidden">
                      <span>Routen auswählen <span className="ml-1 font-semibold opacity-70">· {selectedRouteIds.size} ausgewählt</span></span>
                      <span className="stitch-kicker text-[0.6rem] text-[#a15523] group-open:hidden">ÖFFNEN</span><span className="stitch-kicker hidden text-[0.6rem] text-[#a15523] group-open:inline">SCHLIESSEN</span>
                    </summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{routes.map((route) => {
                    const checked = selectedRouteIds.has(route.id);
                    const timer = timers?.[route.id];
                    const status = timer ? getCompetitionTimerStatus(timer, now) : "ready";
                    const running = Boolean(timer && timer.startedAt !== null && status !== "finished");
                    return <label key={route.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition focus-within:ring-2 focus-within:ring-[#003d55] ${checked ? "bg-[#f2dcab] text-[#002637]" : "bg-[#f8f4ee] text-[#003d55] hover:bg-[#ede8e1]"}`}>
                      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#003d55]" checked={checked} disabled={checked && running} onChange={(e) => toggleRoute(route.id, e.target.checked)} aria-label={`Timer für Route ${route.number} ${checked ? running ? "läuft" : "ausblenden" : "anzeigen"}`} />
                      <span className="min-w-0"><span className="block text-sm font-extrabold">Route {route.number}</span><span className="block truncate text-xs opacity-75">{status === "finished" ? "Beendet" : status === "last-minute" ? "Letzte Minute" : running ? "Läuft · sichtbar" : status === "ready" && timer && timer.elapsedMs > 0 ? "Pausiert" : "Bereit"}</span></span>
                    </label>;
                    })}</div>
                  </details>
                  {storageWarning && <p role="alert" className="text-sm font-semibold text-[#a15523]">Speichern auf diesem Gerät ist nicht verfügbar. Laufende Zeiten gehen beim Schließen möglicherweise verloren.</p>}
                </StitchCard>

                {visibleTimerRoutes.length === 0 ? <StitchCard tone="muted" className="p-6 text-center"><p className="text-sm">Wähle mindestens eine Route, um ihre Uhr anzuzeigen.</p></StitchCard>
                  : <div className="grid gap-4 md:grid-cols-2">{visibleTimerRoutes.map((route) => {
                    const timer = timers?.[route.id] ?? resetCompetitionTimer(route.id);
                    const elapsed = getCompetitionTimerElapsed(timer, now);
                    const remaining = Math.max(0, COMPETITION_TIMER_DURATION_MS - elapsed);
                    const status = getCompetitionTimerStatus(timer, now);
                    const running = timer.startedAt !== null && status !== "finished";
                    return <StitchCard key={route.id} tone={status === "finished" ? "navy" : status === "last-minute" ? "cream" : "surface"} className="p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="stitch-kicker opacity-70">Station · Route</p><h3 className="stitch-headline mt-2 truncate text-2xl">{route.number}<span className="ml-2 text-base font-semibold normal-case tracking-normal opacity-75">{route.name}</span></h3></div><StitchBadge tone={status === "finished" ? "cream" : status === "last-minute" ? "terracotta" : "navy"}>{status === "finished" ? "ABGELAUFEN" : status === "last-minute" ? "LETZTE MINUTE" : running ? "LÄUFT" : elapsed > 0 ? "PAUSIERT" : "BEREIT"}</StitchBadge></div>
                      <div className="my-6 text-center"><p className="stitch-headline tabular-nums text-6xl leading-none sm:text-7xl" aria-label={`${Math.floor(remaining / 60000)} Minuten ${Math.floor((remaining % 60000) / 1000)} Sekunden verbleibend`}>{formatCompetitionTimer(remaining)}</p><p className="mt-3 text-xs font-extrabold tracking-[0.2em] opacity-65">VERBLEIBEND</p></div>
                      <div className="grid grid-cols-2 gap-3">
                        {running ? <StitchButton size="lg" variant="outline" className="min-h-14" aria-label={`Route ${route.number} pausieren`} onClick={() => updateTimer(route.id, (value) => stopCompetitionTimer(value, Date.now()))}><span aria-hidden="true">Ⅱ</span>Pause</StitchButton>
                          : <StitchButton size="lg" variant={status === "finished" ? "outline" : "primary"} className="min-h-14" aria-label={`Route ${route.number} ${elapsed > 0 ? "fortsetzen" : "starten"}`} disabled={status === "finished"} onClick={() => updateTimer(route.id, (value) => startCompetitionTimer(value, Date.now()))}><span aria-hidden="true">▶</span>{elapsed > 0 ? "Weiter" : "Start"}</StitchButton>}
                        <StitchButton size="lg" variant="outline" className="min-h-14 whitespace-normal break-words px-2 text-center text-[0.7rem] leading-tight tracking-normal" aria-label={`Route ${route.number} zurücksetzen`} onClick={() => setResetTarget(route.id)}>Zurücksetzen</StitchButton>
                      </div>
                    </StitchCard>;
                  })}</div>}
                <p className="px-1 text-xs leading-5 text-[rgba(27,28,26,0.62)]">Die Zeit wird aus Start- und Pausenzeitpunkten berechnet. Browser können Hinweise im Hintergrund verzögern; eine Alarmzustellung bei gesperrtem Bildschirm ist nicht garantiert.</p>
                </TabsContent>
                <TabsContent value="codes" className="m-0 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                <StitchCard tone="surface" className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="stitch-kicker text-[#a15523]">Routen vor Ort</p><h2 className="stitch-headline mt-2 text-xl">QR-Code anzeigen</h2><p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.68)]">Wähle die physische Routennummer. Scanne den Code mit dem Scanner in der Kletterliga-App.</p></div><StitchButton variant="outline" className="max-w-full whitespace-normal break-words px-3 text-center text-xs leading-tight tracking-normal" onClick={() => void printRoutes(routes)}><Printer className="h-4 w-4 shrink-0" aria-hidden="true" />Alle drucken</StitchButton></div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{routes.map((route) => <button key={route.id} type="button" onClick={() => setSelectedQrId(route.id)} aria-pressed={selectedQrRoute?.id === route.id} className={`min-h-14 rounded-xl px-2 py-3 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] ${selectedQrRoute?.id === route.id ? "bg-[#003d55] text-[#f2dcab]" : "bg-[#f8f4ee] text-[#003d55] hover:bg-[#ede8e1]"}`}>Route {route.number}</button>)}</div>
                  {printError && <p role="alert" className="text-sm font-semibold text-[#a15523]">{printError}</p>}
                </StitchCard>
                {selectedQrRoute && <StitchCard tone="cream" className="flex min-w-0 flex-col items-center p-5 text-center sm:p-7"><p className="stitch-kicker text-[#a15523]">Kletterliga NRW · Wettkampftag</p><h3 className="stitch-headline mt-2 text-3xl">Route {selectedQrRoute.number}</h3><p className="mt-1 text-sm font-semibold">{selectedQrRoute.name}</p><div className="my-5 flex w-full max-w-[296px] justify-center rounded-2xl bg-white p-2 shadow-[0_12px_28px_rgba(0,38,55,0.1)]"><QrImage route={selectedQrRoute} size={420} className="[image-rendering:pixelated]" /></div><p className="max-w-xs text-xs leading-5 text-[rgba(27,28,26,0.68)]">Mit dem Scanner in der Kletterliga-App öffnen. Der Code ordnet zur physischen Route zu.</p><StitchButton className="mt-5 w-full whitespace-normal break-words px-3 text-center text-xs leading-tight tracking-normal sm:w-auto" onClick={() => void printRoutes([selectedQrRoute])}><Printer className="h-4 w-4 shrink-0" aria-hidden="true" />Diese Route drucken</StitchButton></StitchCard>}
                </TabsContent>
              </Tabs>
            </>}

      <AlertDialog open={Boolean(resetTarget)} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <AlertDialogContent className="stitch-app">
          <AlertDialogHeader><AlertDialogTitle className="stitch-headline">Uhr zurücksetzen?</AlertDialogTitle><AlertDialogDescription>Die Zeit für Route {pendingResetRoute?.number ?? ""} wird auf 0:00 zurückgesetzt. Eine laufende Uhr wird dabei gestoppt.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setResetTarget(null)}>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={() => { if (resetTarget) { setTimers((current) => current ? { ...current, [resetTarget]: resetCompetitionTimer(resetTarget) } : current); alerted.current.delete(`${resetTarget}:last-minute`); alerted.current.delete(`${resetTarget}:finished`); } setResetTarget(null); }}>Zurücksetzen</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
