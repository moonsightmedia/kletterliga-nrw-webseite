import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Maximize, RefreshCw, Ticket, Trophy, Undo2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { raffleSource, raffleWinnersCsv, type RaffleCancelRequest, type RaffleDraw, type RaffleRequest, type RaffleScope, type RaffleSource, type RaffleState } from "@/services/competitionRaffle";

const scopes: Record<RaffleScope, string> = {
  semifinal: "Anwesende", final: "Frühere Finalisten-Ziehung", all: "Alle Teilnehmenden",
};
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#f2dcab]/30 px-4 py-2 text-sm font-semibold transition-colors hover:bg-[#f2dcab]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab] disabled:cursor-not-allowed disabled:opacity-40";
const storageKey = (season: string) => `kletterliga-raffle-pending-${season}`;
const repeatKey = (season: string) => `kletterliga-raffle-repeat-v1-${season}`;
const readRepeat = (season: string) => {
  try { return localStorage.getItem(repeatKey(season)) !== "false"; }
  catch { return true; }
};
const readPending = (season: string): RaffleRequest | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(season)) || "null");
    return value && ["all", "semifinal", "final"].includes(value.scope) && typeof value.request_id === "string"
      && typeof value.prize === "string" && typeof value.present_only === "boolean"
      && (value.repeat_allowed === undefined || typeof value.repeat_allowed === "boolean")
      ? { ...value, repeat_allowed: value.repeat_allowed ?? true } : null;
  } catch { return null; }
};
const persistPending = (season: string, request: RaffleRequest | null) => {
  // This contains only a request ID and operator settings, never a token or names.
  try {
    if (request) sessionStorage.setItem(storageKey(season), JSON.stringify(request));
    else sessionStorage.removeItem(storageKey(season));
  } catch { /* Server idempotency remains active if browser storage is unavailable. */ }
};

export function RaffleScreen({ season, source = raffleSource }: { season: string; source?: RaffleSource }) {
  const initial = useRef(readPending(season));
  const [scope, setScope] = useState<RaffleScope>(initial.current?.scope === "all" ? "all" : "semifinal");
  const [repeat, setRepeat] = useState(() => initial.current?.repeat_allowed ?? readRepeat(season));
  const [prize, setPrize] = useState(initial.current?.prize ?? "");
  const [state, setState] = useState<RaffleState | null>(null);
  const [winner, setWinner] = useState<RaffleDraw | null>(null);
  const [pending, setPending] = useState<RaffleRequest | null>(initial.current);
  const pendingRef = useRef<RaffleRequest | null>(initial.current);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const loadRevision = useRef(0);
  const animationTimer = useRef<ReturnType<typeof setInterval>>();
  const revealTimer = useRef<ReturnType<typeof setTimeout>>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animatedName, setAnimatedName] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<(RaffleCancelRequest & { name?: string }) | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cancellingRef = useRef(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelStatus, setCancelStatus] = useState("");

  useEffect(() => {
    alive.current = true;
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      alive.current = false;
      clearInterval(animationTimer.current); clearTimeout(revealTimer.current); meta.remove();
    };
  }, []);

  const load = useCallback(async () => {
    const revision = ++loadRevision.current;
    try {
      const data = await source.get(season, scope, scope !== "all", repeat);
      if (!alive.current || revision !== loadRevision.current) return;
      setState(data); setUpdated(new Date()); setError("");
      const recovered = pendingRef.current && data.history.find(draw => draw.request_id === pendingRef.current?.request_id);
      if (recovered && !busyRef.current) {
        setWinner(recovered); setPending(null); pendingRef.current = null; persistPending(season, null);
      } else if (!busyRef.current && !pendingRef.current) setWinner(data.history[0] ?? null);
    } catch {
      if (alive.current && revision === loadRevision.current) setError("Daten konnten nicht geladen werden. Bitte aktualisieren – es wird nicht mit veralteten Daten ausgelost.");
    } finally { if (alive.current && revision === loadRevision.current) setLoading(false); }
  }, [season, source, scope, repeat]);

  useEffect(() => {
    setLoading(true); setState(null);
    void load();
    const timer = window.setInterval(() => { if (!busyRef.current && document.visibilityState === "visible") void load(); }, 5000);
    return () => { window.clearInterval(timer); };
  }, [load]);

  const start = useCallback(async () => {
    if (busyRef.current || cancellingRef.current || cancelTarget || loading || (!pendingRef.current && (!state?.entries.length || error))) return;
    busyRef.current = true; setBusy(true); setError(""); setWinner(null);
    const request = pendingRef.current ?? {
      scope, present_only: scope !== "all", repeat_allowed: repeat, prize: prize.trim() || "Überraschungsgewinn", request_id: crypto.randomUUID(),
    };
    pendingRef.current = request; setPending(request); persistPending(season, request);
    const started = Date.now();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let index = 0;
    setAnimatedName(reduced ? "Das Los wird gezogen …" : state?.entries[0]?.name ?? "Das Los wird gezogen …");
    if (!reduced && state?.entries.length) {
      animationTimer.current = setInterval(() => {
        if (alive.current) setAnimatedName(state.entries[(index++ * 7 + Math.floor(index / state.entries.length)) % state.entries.length].name);
      }, 110);
    }
    try {
      const result = await source.draw(season, request);
      if (!alive.current) return;
      revealTimer.current = setTimeout(() => {
        if (!alive.current) return;
        clearInterval(animationTimer.current);
        setWinner(result); setBusy(false); busyRef.current = false;
        setPending(null); pendingRef.current = null; persistPending(season, null);
        void load();
      }, reduced ? 0 : Math.max(0, 3800 - (Date.now() - started)));
    } catch (failure) {
      clearInterval(animationTimer.current);
      if (!alive.current) return;
      setBusy(false); busyRef.current = false;
      if (failure instanceof Error && failure.message.includes("RAFFLE_DRAW_CANCELLED")) {
        setPending(null); pendingRef.current = null; persistPending(season, null);
        setError("Diese Ziehung wurde bereits rückgängig gemacht. Bitte die Lose aktualisieren.");
        void load();
      } else if (failure instanceof Error && failure.message.includes("RAFFLE_POOL_EMPTY")) {
        setPending(null); pendingRef.current = null; persistPending(season, null);
        setState(current => current ? { ...current, entries: [], pool_count: 0, total_tickets: 0 } : current);
        setError("Dieser Lostopf ist jetzt leer. Es wurde niemand ausgelost. Bitte Teilnehmerkreis wechseln oder aktualisieren.");
      } else setError("Die Antwort fehlt. Mit „Ziehung prüfen / fortsetzen“ dieselbe Ziehung sicher wiederholen – es wird kein zweiter Gewinner gezogen.");
    }
  }, [loading, state, error, scope, repeat, prize, season, source, load, cancelTarget]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true'], [role='combobox'], [role='listbox'], [role='dialog'], [role='alertdialog']")) return;
      event.preventDefault(); void start();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [start]);

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setError("Vollbild ist hier nicht verfügbar. Die Auslosung funktioniert auch ohne Vollbild."); }
  };
  const exportWinners = async () => {
    if (!source.export || exporting) return;
    setExporting(true); setExportError("");
    try {
      const rows = await source.export(season);
      const url = URL.createObjectURL(new Blob([raffleWinnersCsv(rows)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url; link.download = `Kletterliga-Gewinnliste-${season}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (alive.current) setExportError("Die Gewinnliste konnte nicht heruntergeladen werden. Bitte erneut versuchen.");
    } finally { if (alive.current) setExporting(false); }
  };
  const requestCancellation = (draw?: RaffleDraw) => {
    if (!source.cancel || busy || pending || cancelling || !state?.history.length) return;
    setCancelError(""); setCancelStatus("");
    setCancelTarget({ draw_ids: draw ? [draw.id] : state.history.map(d => d.id), reset_all: !draw, request_id: crypto.randomUUID(), name: draw?.winner_name });
  };
  const confirmCancellation = async () => {
    if (!source.cancel || !cancelTarget || cancellingRef.current) return;
    cancellingRef.current = true; setCancelling(true); setCancelError("");
    try {
      const result = await source.cancel(season, cancelTarget);
      if (!alive.current) return;
      setCancelTarget(null); setWinner(null);
      setCancelStatus(`${result.cancelled_count} ${result.cancelled_count === 1 ? "Gewinn wurde" : "Gewinne wurden"} rückgängig gemacht. Die Lose sind wieder im Topf.`);
      await load();
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof Error && failure.message.includes("RAFFLE_HISTORY_CHANGED")) {
        setCancelTarget(null); setCancelStatus("Die Gewinnliste hat sich inzwischen geändert. Bitte prüfen und das Zurücksetzen erneut bestätigen.");
        await load();
      } else setCancelError("Die Bestätigung fehlt. Bitte erneut versuchen – derselbe Auftrag wird sicher geprüft und kein Los doppelt zurückgegeben.");
    } finally {
      cancellingRef.current = false;
      if (alive.current) setCancelling(false);
    }
  };
  const locked = busy || !!pending || cancelling || !!cancelTarget;
  const disabled = busy || cancelling || !!cancelTarget || loading || (!pending && (!state?.entries.length || !!error));
  return (
    <main className="relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden bg-[#003d55] font-sans text-[#f2dcab]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-24 h-64 w-64 rotate-45 border-[28px] border-[#f2dcab]/[0.04] sm:h-96 sm:w-96" />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#f2dcab]/20 px-5 py-4 sm:px-10">
        <div className="flex items-center gap-4"><img src={logo} alt="Kletterliga NRW" className="h-16 w-16 object-contain" /><div><p className="text-xs uppercase tracking-[0.2em]">Finaltag · {season}</p><h1 className="text-xl sm:text-2xl">Verlosung</h1></div></div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48"><label className="mb-1 block text-xs" id="raffle-scope-label">Teilnehmerkreis</label><Select value={scope} disabled={locked} onValueChange={value => setScope(value as RaffleScope)}><SelectTrigger aria-labelledby="raffle-scope-label" className="min-h-11 rounded-md border-[#f2dcab]/35 bg-transparent text-[#f2dcab] focus:ring-[#f2dcab]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(scopes).filter(([value]) => value !== "final").map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#a15523]" checked={repeat} disabled={locked} onChange={event => {
            const allowed = event.target.checked;
            setRepeat(allowed);
            try { localStorage.setItem(repeatKey(season), String(allowed)); } catch { /* Setting still works for this page. */ }
          }} />Mehrfachgewinne erlauben</label>
          <button className={button} disabled={busy || loading} onClick={() => void load()} aria-label="Lose aktualisieren"><RefreshCw size={18} /></button>
          <button className={button} onClick={() => void fullscreen()} aria-label="Vollbild umschalten"><Maximize size={18} /></button>
        </div>
      </header>

      <section aria-label="Auslosung" className="relative z-10 flex min-h-[42vh] flex-col items-center justify-center px-5 py-8 text-center sm:px-12 sm:py-6">
        <p className="mb-5 flex items-center gap-2 text-sm uppercase tracking-[0.2em] sm:text-base">{winner ? <Trophy size={22} /> : <Ticket size={22} />}{busy ? "Das Los entscheidet" : winner ? "Herzlichen Glückwunsch" : "Dein Los. Dein Moment."}</p>
        <div className="flex min-h-36 w-full max-w-[1500px] items-center justify-center" aria-live={busy ? "off" : "polite"} aria-atomic="true">
          <p className={`break-words text-[clamp(2.5rem,5.5vw,7.5rem)] font-bold leading-[1.15] [font-family:Heavitas,sans-serif] ${busy ? "motion-safe:animate-pulse" : ""}`}>{busy ? animatedName : winner ? winner.winner_name : loading ? "Lose werden geladen …" : !state?.entries.length ? "Noch keine Lose" : "WER HAT DAS\nGLÜCKSLOS?"}</p>
        </div>
        <div className="mt-5 h-1 w-24 bg-[#a15523] sm:w-40" />
        <p className="mt-4 max-w-4xl break-words text-xl sm:text-3xl">{winner ? winner.prize : prize.trim() || "Die große Kletterliga-Verlosung"}</p>
        {winner && <p className="mt-4 text-sm text-[#f2dcab]/75">{winner.tickets} {winner.tickets === 1 ? "Los" : "Lose"} vor der Ziehung{winner.remaining_tickets != null && ` · ${winner.remaining_tickets} übrig`} · {scopes[winner.scope]}{winner.present_only ? " · eingecheckt" : ""}</p>}
        {!busy && <p className="mt-5 text-sm text-[#f2dcab]/75">{scope === "all" ? "Alle aktiven Saison-Teilnehmenden mit verbleibenden Losen – auch ohne Anwesenheit." : "Nur am Einlass als angekommen markierte Teilnehmende mit verbleibenden Losen."}</p>}
      </section>

      <footer className="relative z-10 border-t border-[#f2dcab]/20 px-5 py-5 sm:px-10">
        {error && <p role="alert" className="mb-4 border-l-4 border-[#a15523] bg-[#f2dcab] p-3 text-sm font-semibold text-[#003d55]">{error}</p>}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-6"><div><span className="block text-3xl font-bold tabular-nums">{state?.pool_count ?? "–"}</span><span className="text-xs uppercase tracking-wider">Personen im Lostopf</span></div><div><span className="block text-3xl font-bold tabular-nums">{state?.total_tickets ?? "–"}</span><span className="text-xs uppercase tracking-wider">Lose</span></div></div>
          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto"><div className="min-w-48 flex-1"><label htmlFor="raffle-prize" className="mb-1 block text-xs">Preis für die nächste Ziehung</label><input id="raffle-prize" value={prize} maxLength={120} disabled={locked} onChange={event => setPrize(event.target.value)} placeholder="z. B. Sponsor-Goodie" className="min-h-11 w-full rounded-md border border-[#f2dcab]/35 bg-transparent px-3 py-2 text-sm text-[#f2dcab] placeholder:text-[#f2dcab]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab] disabled:opacity-40" /></div>
          <button type="button" onClick={() => void start()} disabled={disabled} className={`${button} min-h-12 border-[#f2dcab] bg-[#f2dcab] px-6 text-[#003d55] hover:bg-[#f2dcab]/90`}>
            {busy ? "Wird ausgelost …" : pending ? "Ziehung prüfen / fortsetzen" : "Jetzt auslosen"}
          </button></div>
        </div>
        <p className="mt-4 text-xs text-[#f2dcab]/70">Leertaste zum Losen · 1 Los je besuchter Halle + 1 für die Finaltag-Anmeldung · maximal 9 Lose · jeder Gewinn verbraucht 1 Los · {repeat ? "Mehrfachgewinne mit verbleibenden Losen" : "bisherige Gewinner ausgeschlossen – auch bei Filterwechsel"}{updated && ` · Stand ${updated.toLocaleTimeString("de-DE")}`}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><button className={button} disabled={locked || exporting || !state?.history.length || !source.export} onClick={() => void exportWinners()}><Download size={16} />{exporting ? "Gewinnliste wird geladen …" : "Gewinnliste (CSV)"}</button><span className="text-xs text-[#f2dcab]/70">Name, Kontakt und Preis für eure Versandplanung · dauerhaft gespeichert</span></div>
        {exportError && <p role="alert" className="mt-3 text-sm">{exportError}</p>}
        {cancelStatus && <p role="status" className="mt-3 text-sm">{cancelStatus}</p>}
        <details className="mt-4 border-t border-[#f2dcab]/15 pt-3"><summary className="cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]">Bisherige Gewinne ({state?.history.length ?? 0})</summary><ol className="mt-3 grid gap-2 sm:grid-cols-2">{state?.history.map(draw => <li key={draw.id} className="flex items-center justify-between gap-3 border-l-2 border-[#a15523] pl-3 text-sm"><div className="min-w-0 break-words"><span className="font-semibold">{draw.winner_name}</span> · {draw.prize}<span className="block text-xs text-[#f2dcab]/70">{new Date(draw.created_at).toLocaleTimeString("de-DE")} · {draw.tickets} Lose</span></div>{source.cancel && <button className={`${button} shrink-0 px-3`} disabled={locked} aria-label={`Gewinn von ${draw.winner_name} rückgängig machen`} onClick={() => requestCancellation(draw)}><Undo2 size={16} /></button>}</li>)}</ol>{source.cancel && <div className="mt-4"><button className={button} disabled={locked || !state?.history.length} onClick={() => requestCancellation()}><Undo2 size={16} />Alle Gewinne zurücksetzen</button><p className="mt-2 text-xs text-[#f2dcab]/70">Gilt für die gesamte Saison-Verlosung, unabhängig vom gewählten Filter.</p></div>}</details>
      </footer>
      <AlertDialog open={!!cancelTarget} onOpenChange={open => { if (!open && !cancellingRef.current) setCancelTarget(null); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto rounded-lg border-[#f2dcab]/35 bg-[#003d55] font-sans text-[#f2dcab]">
          <AlertDialogHeader>
            <AlertDialogTitle>{cancelTarget?.reset_all ? "Alle Gewinne zurücksetzen?" : "Gewinn rückgängig machen?"}</AlertDialogTitle>
            <AlertDialogDescription className="break-words text-[#f2dcab]/85">{cancelTarget?.reset_all ? `Die gesamte Gewinnliste der Saison ${season} (${cancelTarget.draw_ids.length} ${cancelTarget.draw_ids.length === 1 ? "Gewinn" : "Gewinne"}) wird geleert. Alle betroffenen Gewinne werden auch aus dem CSV-Export entfernt.` : `Der Gewinn von ${cancelTarget?.name ?? "dieser Person"} wird aus der Gewinnliste und dem CSV-Export entfernt.`} Pro Gewinn kommt ein Los zurück in den Topf. Betroffene Personen können wieder gewinnen. Intern bleibt die Stornierung nachvollziehbar.</AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && <p role="alert" className="text-sm text-[#f2dcab]">{cancelError}</p>}
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel disabled={cancelling} className={`${button} mt-0 bg-transparent text-[#f2dcab] hover:text-[#f2dcab]`}>Abbrechen</AlertDialogCancel>
            <button className={`${button} bg-[#f2dcab] text-[#003d55] hover:bg-[#f2dcab]/90`} disabled={cancelling} onClick={() => void confirmCancellation()}>{cancelling ? "Wird zurückgesetzt …" : cancelTarget?.reset_all ? "Ja, alle zurücksetzen" : "Ja, Gewinn rückgängig machen"}</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function CompetitionRaffle() {
  const { season } = useParams();
  return <RaffleScreen key={season} season={season ?? "2026"} />;
}
