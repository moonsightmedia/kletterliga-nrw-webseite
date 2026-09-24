import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, Check, ChevronDown, Clock3, LockKeyhole, Pause, Play, Printer, QrCode, RefreshCw, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StitchButton, StitchCard, StitchTextField } from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
import { getCompetitionJudgeRoutes, type CompetitionStaffRoute } from "@/services/competitionDay";
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
const JUDGE_TIMER_DEVICE_KEY = "shared-judge";
const QR_RENDER_SIZE = 512;
const QR_ERROR_CORRECTION = "M";
const selectionStorageKey = (season: string) => `kletterliga:judge-routes:${encodeURIComponent(season)}`;

function routeUrl(route: CompetitionStaffRoute) {
  return `${window.location.origin}/app/wettkampf#route=${encodeURIComponent(route.id)}&token=${encodeURIComponent(route.qr_token)}`;
}

function QrImage({ route, size, className = "" }: { route: CompetitionStaffRoute; size: number; className?: string }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setImage(null);
    QRCode.toDataURL(routeUrl(route), { width: size, margin: 4, errorCorrectionLevel: QR_ERROR_CORRECTION })
      .then((value) => { if (active) setImage(value); })
      .catch(() => { if (active) setImage(""); });
    return () => { active = false; };
  }, [route, size]);

  if (image === "") return <div role="status" className={`grid aspect-square w-full place-items-center rounded-2xl bg-[#ede8e1] p-4 text-center text-sm text-[#003d55] ${className}`}>QR-Code konnte nicht erzeugt werden.</div>;
  return image
    ? <img src={image} alt={`QR-Code Route ${route.number}`} width={size} height={size} className={`block aspect-square h-auto w-full max-w-full bg-white ${className}`} />
    : <div aria-label="QR-Code wird erzeugt" className={`aspect-square w-full animate-pulse rounded-2xl bg-[#ede8e1] ${className}`} />;
}

const readableLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (/Schiedsrichter-Code/i.test(message)) return message;
  return "Die Wettkampfdaten konnten nicht geladen werden. Prüfe die Verbindung und versuche es erneut.";
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character] ?? character));

export default function JudgeDashboard() {
  const { settings, loading: settingsLoading, refreshSettings } = useSeasonSettings();
  const season = settings?.season_year ? String(settings.season_year) : null;
  const [enteredCode, setEnteredCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [event, setEvent] = useState<{ id: string; phase: string } | null>(null);
  const [routes, setRoutes] = useState<CompetitionStaffRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<DashboardTab>("timers");
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [selectedQrId, setSelectedQrId] = useState<string | null>(null);
  const [timers, setTimers] = useState<RouteTimerMap | null>(null);
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [quickQrId, setQuickQrId] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const alerted = useRef(new Set<string>());
  const eventSequence = useRef(0);
  const selectionInitialized = useRef(false);

  const load = useCallback(async (code: string, background = false) => {
    if (!code || !season) return;
    const sequence = ++eventSequence.current;
    if (!background) setLoading(true);
    setLoadError(null);
    try {
      const day = await getCompetitionJudgeRoutes(season, code);
      if (sequence !== eventSequence.current) return;
      setEvent(day.event);
      const staffRoutes = day.routes;
      setRoutes(staffRoutes);
        let restoredRunningRouteIds: string[] = [];
        let savedRouteIds: string[] | null = null;
        try {
          restoredRunningRouteIds = Object.values(readCompetitionTimers(window.localStorage, JUDGE_TIMER_DEVICE_KEY, season))
            .filter((timer) => timer.startedAt !== null)
            .map((timer) => timer.routeId);
          const saved = window.localStorage.getItem(selectionStorageKey(season));
          const parsed: unknown = saved ? JSON.parse(saved) : null;
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) savedRouteIds = parsed;
        } catch { /* Timers remain usable in memory if local storage is blocked. */ }
        setSelectedRouteIds((current) => {
          const available = new Set(staffRoutes.map((route) => route.id));
          if (selectionInitialized.current) return new Set([...current].filter((id) => available.has(id)));
          selectionInitialized.current = true;
          const preferred = savedRouteIds ?? staffRoutes.slice(0, 2).map((route) => route.id);
          return new Set([...preferred, ...restoredRunningRouteIds].filter((id) => available.has(id)));
        });
        setSelectedQrId((current) => current && staffRoutes.some((route) => route.id === current) ? current : staffRoutes[0]?.id ?? null);
    } catch (error) {
      if (sequence !== eventSequence.current) return;
      const message = readableLoadError(error);
      setLoadError(message);
      if (/Schiedsrichter-Code/i.test(message)) {
        setActiveCode("");
        setEvent(null);
        setRoutes([]);
        setQuickQrId(null);
      }
    } finally {
      if (sequence === eventSequence.current && !background) setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    if (settingsLoading) return;
    if (!activeCode || !season) {
      setLoading(false);
      return;
    }
    void load(activeCode);
    return () => { eventSequence.current += 1; };
  }, [activeCode, load, season, settingsLoading]);

  useEffect(() => {
    const invalidateHiddenView = () => {
      if (document.visibilityState === "hidden") {
        eventSequence.current += 1;
        return;
      }
      if (activeCode && season) void load(activeCode, true);
    };
    window.addEventListener("focus", invalidateHiddenView);
    document.addEventListener("visibilitychange", invalidateHiddenView);
    return () => {
      window.removeEventListener("focus", invalidateHiddenView);
      document.removeEventListener("visibilitychange", invalidateHiddenView);
    };
  }, [activeCode, load, season]);

  useEffect(() => {
    if (!activeCode || !season) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(activeCode, true);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [activeCode, load, season]);

  useEffect(() => {
    if (!season) { setTimers(null); return; }
    let storedTimers: RouteTimerMap = {};
    let storedSound = false;
    try {
      storedTimers = readCompetitionTimers(window.localStorage, JUDGE_TIMER_DEVICE_KEY, season);
      storedSound = window.localStorage.getItem(`${getCompetitionTimerStorageKey(JUDGE_TIMER_DEVICE_KEY, season)}:sound`) === "on";
    } catch { setStorageWarning(true); }
    setTimers(storedTimers);
    setSoundEnabled(storedSound);
  }, [season]);

  useEffect(() => {
    if (!timers || !season) return;
    setStorageWarning(!writeCompetitionTimers(window.localStorage, JUDGE_TIMER_DEVICE_KEY, season, timers));
  }, [season, timers]);

  useEffect(() => {
    if (!season || !selectionInitialized.current) return;
    try { window.localStorage.setItem(selectionStorageKey(season), JSON.stringify([...selectedRouteIds])); }
    catch { setStorageWarning(true); }
  }, [season, selectedRouteIds]);

  useEffect(() => {
    if (!season) return;
    try { window.localStorage.setItem(`${getCompetitionTimerStorageKey(JUDGE_TIMER_DEVICE_KEY, season)}:sound`, soundEnabled ? "on" : "off"); }
    catch { setStorageWarning(true); }
  }, [season, soundEnabled]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const playSignal = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (!timers) return;
    Object.values(timers).forEach((timer) => {
      if (!selectedRouteIds.has(timer.routeId)) return;
      if (timer.startedAt === null) return;
      const elapsed = getCompetitionTimerElapsed(timer, now);
      if (elapsed >= COMPETITION_TIMER_WARNING_MS) {
        const warningKey = `${timer.routeId}:last-minute`;
        if (!alerted.current.has(warningKey)) { alerted.current.add(warningKey); if (soundEnabled) playSignal(); }
      }
      if (elapsed >= COMPETITION_TIMER_DURATION_MS) {
        const endKey = `${timer.routeId}:finished`;
        if (!alerted.current.has(endKey)) { alerted.current.add(endKey); if (soundEnabled) playSignal(); }
      }
    });
  }, [now, playSignal, selectedRouteIds, soundEnabled, timers]);

  const visibleTimerRoutes = useMemo(() => routes.filter((route) => selectedRouteIds.has(route.id)), [routes, selectedRouteIds]);
  const trackedRoutes = useMemo(() => visibleTimerRoutes.filter((route) => {
    const timer = timers?.[route.id];
    return Boolean(timer && (timer.startedAt !== null || timer.elapsedMs > 0));
  }), [timers, visibleTimerRoutes]);
  const activeNotices = useMemo(() => visibleTimerRoutes.reduce<TimerNotice[]>((notices, route) => {
    const timer = timers?.[route.id];
    if (!timer) return notices;
    const status = getCompetitionTimerStatus(timer, now);
    if (status === "last-minute") notices.push({ id: route.id, text: `Letzte Minute · Route ${route.number}`, status });
    if (status === "finished") notices.push({ id: route.id, text: `5 Minuten beendet · Route ${route.number}`, status });
    return notices;
  }, []), [now, visibleTimerRoutes, timers]);

  const updateTimer = (routeId: string, update: (timer: CompetitionTimer) => CompetitionTimer) => {
    setTimers((current) => {
      if (!current) return current;
      const timer = current[routeId] ?? resetCompetitionTimer(routeId);
      const next = update(timer);
      return next === timer ? current : { ...current, [routeId]: next };
    });
  };

  const toggleRoute = (routeId: string, selected: boolean) => setSelectedRouteIds((current) => {
    const timer = timers?.[routeId];
    if (!selected && timer?.startedAt !== null && timer && getCompetitionTimerStatus(timer, Date.now()) !== "finished") return current;
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
        dataUrl: await QRCode.toDataURL(routeUrl(route), { width: QR_RENDER_SIZE, margin: 4, errorCorrectionLevel: QR_ERROR_CORRECTION }),
      })));
      const cards = codes.map(({ route, dataUrl }) => `<article class="route"><img src="${dataUrl}" alt="QR-Code Route ${route.number}"><div><p class="eyebrow">Kletterliga NRW · Wettkampftag</p><h1>Route ${route.number}</h1><p class="name">${escapeHtml(route.name)}</p><p class="hint">Mit dem Scanner in der Kletterliga-App öffnen.</p></div></article>`).join("");
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Routen QR-Codes</title><style>body{font-family:Arial,sans-serif;color:#002637;margin:0}.sheet{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8mm;padding:12mm}.route{display:flex;align-items:center;gap:4mm;break-inside:avoid;padding:3mm;background:#f8f4ee;border-radius:5mm}.route img{width:55mm;height:55mm;flex:none}.route>div{min-width:0;overflow-wrap:anywhere}.eyebrow{font-size:9pt;text-transform:uppercase;letter-spacing:.12em;color:#a15523}.route h1{font-size:25pt;margin:2mm 0}.name{font-size:15pt;margin:0}.hint{font-size:9pt;margin-top:3mm}@media screen and (max-width:700px){.sheet{grid-template-columns:1fr;padding:4mm}.route{gap:3mm;padding:3mm}}@page{size:A4;margin:12mm}@media print{.sheet{padding:0;gap:8mm}.route h1{font-size:22pt}}</style></head><body><main class="sheet">${cards}</main><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
      popup.document.close();
    } catch {
      popup.close();
      setPrintError("Der QR-Druckbogen konnte nicht erstellt werden. Bitte lade die Routen erneut.");
    }
  };

  const selectedQrRoute = routes.find((route) => route.id === selectedQrId) ?? routes[0] ?? null;
  const quickQrRoute = routes.find((route) => route.id === quickQrId) ?? null;
  const pendingResetRoute = routes.find((route) => route.id === resetTarget);

  if (settingsLoading || loading) return <div className="mx-auto max-w-5xl" aria-live="polite"><StitchCard tone="muted" className="p-6"><p className="stitch-kicker">Wettkampftag</p><p className="mt-3 text-sm">Schiedsrichterbereich wird geladen …</p></StitchCard></div>;
  if (!season) return <div className="mx-auto max-w-2xl"><StitchCard tone="muted" className="space-y-4 p-6" role="alert"><h1 className="stitch-headline text-2xl">Saison nicht verfügbar</h1><p className="text-sm leading-6">Die aktuelle Saison konnte nicht geladen werden. Bitte versuche es erneut.</p><StitchButton onClick={() => void refreshSettings()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Saisonstatus erneut laden</StitchButton></StitchCard></div>;
  if (!activeCode) return <div className="mx-auto max-w-xl space-y-6 pb-8">
    <div className="space-y-3 pt-4 sm:pt-8"><p className="stitch-kicker text-[#a15523]">Wettkampftag · {season}</p><h1 className="stitch-headline text-3xl leading-none sm:text-4xl">Deine Station.<br />Dein Überblick.</h1><p className="max-w-md text-sm leading-6 text-[#425967]">Fünf-Minuten-Uhren und Routen-QRs für den Einsatz an der Wand. Kein App-Konto nötig.</p></div>
    <StitchCard tone="surface" className="p-5 sm:p-7"><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); setLoadError(null); setActiveCode(enteredCode.trim()); setEnteredCode(""); }}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2dcab] text-[#003d55]"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="stitch-headline text-lg">Schiedsrichter-Zugang</h2><p className="text-xs text-[#425967]">Den Code erhältst du von der Wettkampfleitung.</p></div></div><StitchTextField label="Schiedsrichter-Code" aria-label="Schiedsrichter-Code" type="password" value={enteredCode} autoComplete="off" minLength={24} maxLength={24} required onChange={(event) => setEnteredCode(event.target.value)} />{loadError && <p role="alert" className="rounded-xl bg-[#fff0df] px-4 py-3 text-sm font-semibold text-[#803712]">{loadError}</p>}<StitchButton className="w-full" disabled={enteredCode.trim().length !== 24}>Bereich öffnen</StitchButton></form></StitchCard>
    <p className="px-1 text-xs leading-5 text-[#425967]">Der Zugangscode wird nicht auf diesem Gerät gespeichert. Nach einem Neuladen gibst du ihn erneut ein; lokale Uhren bleiben erhalten.</p>
  </div>;
  if (loadError && !event) return <div className="mx-auto max-w-2xl"><StitchCard tone="muted" className="space-y-4 p-6" role="alert"><AlertCircle className="h-6 w-6 text-[#a15523]" aria-hidden="true" /><h1 className="stitch-headline text-2xl">Ansicht nicht verfügbar</h1><p className="text-sm leading-6">{loadError}</p><StitchButton onClick={() => void load(activeCode)} disabled={loading}><RefreshCw className="h-4 w-4" aria-hidden="true" />Erneut laden</StitchButton></StitchCard></div>;

  return (
    <div className="judge-workstation mx-auto max-w-5xl space-y-4 pb-8 sm:space-y-6">
      {loadError && <div role="alert" className="rounded-xl border border-[#a15523]/30 bg-[#f2dcab] px-4 py-3 text-sm font-semibold text-[#003d55]">Verbindung unterbrochen. Die lokalen Uhren laufen weiter; prüfe die Verbindung, bevor du QR-Codes verwendest. <button type="button" className="underline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void load(activeCode, true)}>Erneut prüfen</button></div>}
      <header className="flex flex-wrap items-start justify-between gap-4 pt-1">
        <div><p className="stitch-kicker text-[#a15523]">Halbfinale · {season}</p><h1 className="stitch-headline mt-2 text-2xl leading-none sm:text-3xl">Schiedsrichter-Station</h1><p className="mt-2 text-sm text-[#425967]">{visibleTimerRoutes.length} {visibleTimerRoutes.length === 1 ? "Route" : "Routen"} im Blick · 5 Minuten pro Start</p></div>
        <div className="flex items-center gap-2">
          <StitchButton variant={soundEnabled ? "navy" : "outline"} size="sm" className="min-h-11 tracking-normal" aria-pressed={soundEnabled} aria-label={`Signalton ${soundEnabled ? "ausschalten" : "einschalten"}`} onClick={() => setSound(!soundEnabled)} title={soundEnabled ? "Signalton ausschalten" : "Signalton einschalten"}>{soundEnabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}<span className="hidden min-[390px]:inline">Ton {soundEnabled ? "an" : "aus"}</span></StitchButton>
          <StitchButton variant="ghost" size="sm" className="min-h-11 tracking-normal" onClick={() => { eventSequence.current += 1; setActiveCode(""); setRoutes([]); setEvent(null); setQuickQrId(null); }}>Verlassen</StitchButton>
        </div>
      </header>

      {event && <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold leading-5 ${event.phase === "open" ? "bg-[#e5f1e8] text-[#23523b]" : "bg-[#f2dcab] text-[#003d55]"}`} role="status">{event.phase === "open" ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}<span>{event.phase === "open" ? "Ergebniseingabe ist geöffnet. QR-Codes können zur Bestätigung gescannt werden." : event.phase === "closed" ? "Ergebniseingabe ist geschlossen. Es sind keine neuen Abgaben möglich." : "Ergebniseingabe ist noch geschlossen. Uhren können getestet werden; QR-Abgaben sind erst nach Freigabe möglich."}</span></div>}

      {trackedRoutes.length > 0 && <section aria-label="Laufende und verwendete Uhren" className="judge-live-rail sticky top-16 z-30 rounded-xl bg-[#003d55] px-3 py-2 text-[#f2dcab] shadow-[0_10px_28px_rgba(0,38,55,0.18)] sm:px-4"><div className="flex items-center gap-2 overflow-x-auto"><span className="stitch-kicker shrink-0 text-[#f2dcab]">Uhren</span>{trackedRoutes.map((route) => { const timer = timers?.[route.id] ?? resetCompetitionTimer(route.id); const status = getCompetitionTimerStatus(timer, now); const remaining = Math.max(0, COMPETITION_TIMER_DURATION_MS - getCompetitionTimerElapsed(timer, now)); return <button key={route.id} type="button" onClick={() => setTab("timers")} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-extrabold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2dcab] ${status === "finished" ? "bg-[#a15523] text-white" : status === "last-minute" ? "bg-[#f2dcab] text-[#003d55]" : "bg-[#21566a] text-[#f2dcab]"}`} aria-label={`Route ${route.number}: ${formatCompetitionTimer(remaining)} verbleibend, ${status === "finished" ? "Zeit abgelaufen" : status === "last-minute" ? "letzte Minute" : timer.startedAt ? "läuft" : "pausiert"}. Uhren anzeigen.`}>R{route.number} <span>{formatCompetitionTimer(remaining)}</span>{status === "finished" && <span className="text-[0.6rem] uppercase">Ende</span>}{status === "last-minute" && <span className="text-[0.6rem] uppercase">Letzte Min.</span>}</button>; })}</div></section>}

      {activeNotices.length > 0 && <section aria-label="Timerwarnungen" className="space-y-2" aria-live="assertive">
        {activeNotices.map((notice) => <div key={notice.id} className={`flex min-h-14 items-center gap-3 rounded-xl px-4 py-3 font-bold ${notice.status === "finished" ? "bg-[#003d55] text-[#f2dcab]" : "bg-[#a15523] text-white"}`}>
          <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{notice.text}</span>
        </div>)}
      </section>}

      {!event ? <StitchCard tone="muted" className="space-y-2 p-6"><p className="stitch-kicker text-[#a15523]">Noch kein Wettkampftag</p><h2 className="stitch-headline text-2xl">Die Station ist noch nicht vorbereitet</h2><p className="text-sm leading-6 text-[rgba(27,28,26,0.7)]">Sobald die Wettkampfleitung den Saison-Wettkampftag angelegt hat, erscheinen hier die Routen.</p><StitchButton variant="outline" onClick={() => void load(activeCode)}><RefreshCw className="h-4 w-4" aria-hidden="true" />Erneut prüfen</StitchButton></StitchCard>
        : routes.length === 0 ? <StitchCard tone="muted" className="space-y-3 p-6"><h2 className="stitch-headline text-2xl">Noch keine Routen vorhanden</h2><p className="text-sm leading-6">Die Wettkampfleitung hat noch keine Routen für diese Saison angelegt.</p><StitchButton variant="outline" onClick={() => void load(activeCode)}><RefreshCw className="h-4 w-4" aria-hidden="true" />Routen erneut laden</StitchButton></StitchCard>
            : <>
              <Tabs value={tab} onValueChange={(value) => setTab(value as DashboardTab)} className="space-y-4">
                <TabsList aria-label="Schiedsrichterwerkzeuge" className="grid h-auto w-full grid-cols-2 rounded-xl bg-[#ede8e1] p-1">
                  <TabsTrigger value="timers" className="min-h-12 rounded-lg px-2 py-2 text-sm font-extrabold text-[#003d55] data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab] focus-visible:ring-[#003d55]"><Clock3 className="mr-2 inline h-4 w-4" aria-hidden="true" />Routenuhren</TabsTrigger>
                  <TabsTrigger value="codes" className="min-h-12 rounded-lg px-2 py-2 text-sm font-extrabold text-[#003d55] data-[state=active]:bg-[#003d55] data-[state=active]:text-[#f2dcab] focus-visible:ring-[#003d55]"><QrCode className="mr-2 inline h-4 w-4" aria-hidden="true" />QR-Codes</TabsTrigger>
                </TabsList>

                <TabsContent value="timers" className="m-0 flex flex-col gap-4">
                <div className="order-1 flex flex-wrap items-end justify-between gap-2 px-1"><div><p className="stitch-kicker text-[#a15523]">Deine Station</p><h2 className="stitch-headline mt-1 text-xl">Routen für die Zeitnahme</h2></div><p className="text-xs font-semibold text-[#425967]">Unabhängige 5-Minuten-Uhren</p></div>
                <StitchCard tone="muted" className="order-3 p-3 sm:p-4">
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm font-extrabold text-[#003d55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] [&::-webkit-details-marker]:hidden">
                      <span>Betreute Routen ändern <span className="ml-1 font-semibold text-[#425967]">· {selectedRouteIds.size} gewählt</span></span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-[#a15523] transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <p className="px-1 pt-3 text-xs leading-5 text-[#425967]">Wähle nur die Routen, die du betreust. Laufende Uhren lassen sich nicht ausblenden. Deine Auswahl bleibt auf diesem Gerät erhalten.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{routes.map((route) => {
                    const checked = selectedRouteIds.has(route.id);
                    const timer = timers?.[route.id];
                    const status = timer ? getCompetitionTimerStatus(timer, now) : "ready";
                    const running = Boolean(timer && timer.startedAt !== null && status !== "finished");
                    return <label key={route.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition focus-within:ring-2 focus-within:ring-[#003d55] ${checked ? "bg-[#f2dcab] text-[#002637]" : "bg-white text-[#003d55] hover:bg-[#fffaf0]"}`}>
                      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#003d55]" checked={checked} disabled={checked && running} onChange={(e) => toggleRoute(route.id, e.target.checked)} aria-label={`Timer für Route ${route.number} ${checked ? running ? "läuft" : "ausblenden" : "anzeigen"}`} />
                      <span className="min-w-0"><span className="block text-sm font-extrabold">Route {route.number}</span><span className="block truncate text-xs opacity-75">{status === "finished" ? "Beendet" : status === "last-minute" ? "Letzte Minute" : running ? "Läuft · sichtbar" : status === "ready" && timer && timer.elapsedMs > 0 ? "Pausiert" : "Bereit"}</span></span>
                    </label>;
                    })}</div>
                  </details>
                  {storageWarning && <p role="alert" className="mt-3 text-sm font-semibold text-[#803712]">Speichern auf diesem Gerät ist nicht verfügbar. Laufende Zeiten gehen beim Schließen möglicherweise verloren.</p>}
                </StitchCard>

                {visibleTimerRoutes.length === 0 ? <StitchCard tone="muted" className="order-2 p-6 text-center"><p className="text-sm">Noch keine Routenuhr ausgewählt. Öffne „Betreute Routen ändern“ und wähle deine Station.</p></StitchCard>
                  : <div className="order-2 grid gap-3 md:grid-cols-2 md:gap-4">{visibleTimerRoutes.map((route) => {
                    const timer = timers?.[route.id] ?? resetCompetitionTimer(route.id);
                    const elapsed = getCompetitionTimerElapsed(timer, now);
                    const remaining = Math.max(0, COMPETITION_TIMER_DURATION_MS - elapsed);
                    const status = getCompetitionTimerStatus(timer, now);
                    const running = timer.startedAt !== null && status !== "finished";
                    const stateLabel = status === "finished" ? "ZEIT ABGELAUFEN" : status === "last-minute" ? "LETZTE MINUTE" : running ? "LÄUFT" : elapsed > 0 ? "PAUSIERT" : "BEREIT";
                    return <StitchCard key={route.id} tone="surface" className={`judge-timer-card min-w-0 p-4 sm:p-5 ${status === "finished" ? "judge-timer-card--finished" : status === "last-minute" ? "judge-timer-card--warning" : ""}`}>
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="stitch-kicker text-[#a15523]">Route {route.number}</p><h3 className="mt-1 truncate text-sm font-bold text-[#003d55]" title={route.name}>{route.name}</h3></div><span className={`judge-state shrink-0 ${status === "finished" ? "judge-state--finished" : status === "last-minute" ? "judge-state--warning" : running ? "judge-state--running" : "judge-state--ready"}`}>{stateLabel}</span></div>
                      <div className="flex items-end justify-between gap-3 pt-4"><div><p className="stitch-kicker text-[#526776]">Verbleibend</p><p className="stitch-headline mt-1 tabular-nums text-[clamp(3.25rem,13vw,5rem)] leading-none text-[#003d55]" aria-label={`${Math.floor(remaining / 60000)} Minuten ${Math.floor((remaining % 60000) / 1000)} Sekunden verbleibend`}>{formatCompetitionTimer(remaining)}</p></div><button type="button" aria-label={`QR-Code für Route ${route.number} anzeigen`} className="judge-qr-shortcut grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f2dcab] text-[#003d55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003d55]" onClick={() => setQuickQrId(route.id)}><QrCode className="h-6 w-6" aria-hidden="true" /></button></div>
                      <div role="progressbar" aria-label={`Zeitfortschritt Route ${route.number}`} aria-valuemin={0} aria-valuemax={300} aria-valuenow={Math.round(elapsed / 1000)} className="judge-timer-track mt-4 h-2 overflow-hidden rounded-full bg-[#ede8e1]"><span className="block h-full rounded-full bg-[#003d55] transition-[width] duration-200" style={{ width: `${Math.min(100, elapsed / COMPETITION_TIMER_DURATION_MS * 100)}%` }} /></div>
                      {status === "last-minute" && <p className="mt-2 text-xs font-extrabold text-[#803712]">Letzte Minute jetzt laut ankündigen.</p>}
                      {status === "finished" && <p className="mt-2 text-xs font-extrabold text-[#803712]">Fünf Minuten vorbei – Kletternde ablassen.</p>}
                      <div className="mt-4 flex items-center gap-3">
                        {running ? <StitchButton size="lg" variant="navy" className="min-h-14 flex-1 tracking-normal" aria-label={`Route ${route.number} pausieren`} onClick={() => updateTimer(route.id, (value) => stopCompetitionTimer(value, Date.now()))}><Pause className="h-5 w-5" aria-hidden="true" />Pause</StitchButton>
                          : <StitchButton size="lg" variant="primary" className="min-h-14 flex-1 tracking-normal" aria-label={`Route ${route.number} ${status === "finished" ? "beendet" : elapsed > 0 ? "fortsetzen" : "starten"}`} disabled={status === "finished"} onClick={() => updateTimer(route.id, (value) => startCompetitionTimer(value, Date.now()))}><Play className="h-5 w-5" aria-hidden="true" />{status === "finished" ? "Beendet" : elapsed > 0 ? "Fortsetzen" : "Starten"}</StitchButton>}
                        <StitchButton size="icon" variant="ghost" className="h-12 w-12 shrink-0" aria-label={`Route ${route.number} zurücksetzen`} title={`Route ${route.number} zurücksetzen`} onClick={() => setResetTarget(route.id)}><RotateCcw className="h-5 w-5" aria-hidden="true" /></StitchButton>
                      </div>
                    </StitchCard>;
                  })}</div>}
                <p className="order-4 px-1 text-xs leading-5 text-[#526776]">Uhren sind lokale Hilfsmittel. Bildschirm während des Kletterns sichtbar lassen: Ton und Hinweise bei gesperrtem Bildschirm sind nicht garantiert.</p>
                </TabsContent>
                <TabsContent value="codes" className="m-0 grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)] lg:gap-4">
                <StitchCard tone="surface" className="min-w-0 space-y-3 p-4 sm:p-5">
                  <div><p className="stitch-kicker text-[#a15523]">Physische Route wählen</p><h2 className="stitch-headline mt-1 text-xl">QR-Code anzeigen</h2><p className="mt-2 text-xs leading-5 text-[#425967]">Nach dem Klettern trägt die Person ihr Ergebnis ein und scannt den Code der gekletterten Route.</p></div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0" aria-label="Routen-QR auswählen">{routes.map((route) => <button key={route.id} type="button" onClick={() => setSelectedQrId(route.id)} aria-pressed={selectedQrRoute?.id === route.id} className={`min-h-12 shrink-0 rounded-lg px-4 py-2 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d55] lg:shrink ${selectedQrRoute?.id === route.id ? "bg-[#003d55] text-[#f2dcab]" : "bg-[#f8f4ee] text-[#003d55] hover:bg-[#ede8e1]"}`}>Route {route.number}</button>)}</div>
                  <StitchButton variant="outline" size="sm" className="min-h-11 tracking-normal" onClick={() => void printRoutes(routes)}><Printer className="h-4 w-4 shrink-0" aria-hidden="true" />Alle QR-Codes drucken</StitchButton>
                  {printError && <p role="alert" className="text-sm font-semibold text-[#803712]">{printError}</p>}
                </StitchCard>
                {selectedQrRoute && <StitchCard tone="cream" className="flex min-w-0 flex-col items-center p-3 text-center sm:p-6"><p className="stitch-kicker text-[#803712]">Kletterliga NRW · Halbfinale</p><h3 className="stitch-headline mt-2 text-3xl">Route {selectedQrRoute.number}</h3><p className="mt-1 text-sm font-semibold">{selectedQrRoute.name}</p><div className="my-4 flex w-full max-w-[360px] justify-center rounded-xl bg-white p-2 shadow-[0_12px_28px_rgba(0,38,55,0.1)]"><QrImage route={selectedQrRoute} size={QR_RENDER_SIZE} className="[image-rendering:pixelated]" /></div><p className="max-w-xs text-xs leading-5 text-[#425967]">Der Code bestätigt nur die physische Route. Ergebnis vorher am eigenen Handy eintragen lassen.</p><StitchButton variant="navy" className="mt-4 w-full tracking-normal sm:w-auto" onClick={() => void printRoutes([selectedQrRoute])}><Printer className="h-4 w-4 shrink-0" aria-hidden="true" />Route {selectedQrRoute.number} drucken</StitchButton></StitchCard>}
                </TabsContent>
              </Tabs>
            </>}

      <Dialog open={Boolean(quickQrRoute)} onOpenChange={(open) => { if (!open) setQuickQrId(null); }}>
        <DialogContent hideCloseButton className="judge-qr-dialog stitch-app max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-[#f2dcab] p-4 text-[#003d55] sm:p-6">
          <DialogClose className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-lg bg-white text-[#003d55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003d55]" aria-label="QR-Code schließen"><X className="h-5 w-5" aria-hidden="true" /></DialogClose>
          <DialogHeader className="px-0 pt-0 text-left"><p className="stitch-kicker text-[#803712]">Routenbestätigung</p><DialogTitle className="stitch-headline text-2xl">Route {quickQrRoute?.number}</DialogTitle><DialogDescription className="text-sm text-[#425967]">{quickQrRoute?.name} · Ergebnis zuerst am eigenen Handy eintragen, danach diesen Code scannen lassen.</DialogDescription></DialogHeader>
          {trackedRoutes.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Aktuelle Routenzeiten">{trackedRoutes.map((route) => { const timer = timers?.[route.id] ?? resetCompetitionTimer(route.id); const status = getCompetitionTimerStatus(timer, now); const remaining = Math.max(0, COMPETITION_TIMER_DURATION_MS - getCompetitionTimerElapsed(timer, now)); return <span key={route.id} className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold tabular-nums ${status === "finished" ? "bg-[#803712] text-white" : status === "last-minute" ? "bg-[#a15523] text-white" : "bg-[#003d55] text-[#f2dcab]"}`}>Route {route.number} · {formatCompetitionTimer(remaining)}{status === "finished" ? " · Ende" : status === "last-minute" ? " · letzte Minute" : ""}</span>; })}</div>}
          {quickQrRoute && <div className="judge-qr-artwork mx-auto w-full max-w-[360px] rounded-xl bg-white p-2"><QrImage route={quickQrRoute} size={QR_RENDER_SIZE} className="[image-rendering:pixelated]" /></div>}
          <p className="text-center text-xs leading-5 text-[#425967]">Die Routenuhren laufen weiter, während dieser Code geöffnet ist.</p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(resetTarget)} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <AlertDialogContent className="stitch-app w-[calc(100%-2rem)] max-w-md rounded-xl bg-[#f8f4ee] text-[#003d55]">
          <AlertDialogHeader><AlertDialogTitle className="stitch-headline">Route {pendingResetRoute?.number ?? ""} zurücksetzen?</AlertDialogTitle><AlertDialogDescription className="text-[#425967]">Die bisherige Zeit wird gelöscht und die Uhr steht wieder bei 5:00. Eine laufende Uhr wird gestoppt.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setResetTarget(null)} className="min-h-11">Abbrechen</AlertDialogCancel><AlertDialogAction className="min-h-11 bg-[#a15523] text-white hover:bg-[#803712]" onClick={() => { if (resetTarget) { setTimers((current) => current ? { ...current, [resetTarget]: resetCompetitionTimer(resetTarget) } : current); alerted.current.delete(`${resetTarget}:last-minute`); alerted.current.delete(`${resetTarget}:finished`); } setResetTarget(null); }}>Uhr zurücksetzen</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
