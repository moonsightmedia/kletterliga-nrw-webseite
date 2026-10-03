import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Maximize, RefreshCw, Ticket, Trophy } from "lucide-react";
import logo from "@/assets/logo.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { raffleSource, type RaffleDraw, type RaffleRequest, type RaffleScope, type RaffleSource, type RaffleState } from "@/services/competitionRaffle";

const scopes: Record<RaffleScope, string> = {
  semifinal: "Halbfinale", final: "Finalisten", all: "Alle Teilnehmenden",
};
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#f2dcab]/30 px-4 py-2 text-sm font-semibold transition-colors hover:bg-[#f2dcab]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab] disabled:cursor-not-allowed disabled:opacity-40";
const storageKey = (season: string) => `kletterliga-raffle-pending-${season}`;
const readPending = (season: string): RaffleRequest | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(season)) || "null");
    return value && ["all", "semifinal", "final"].includes(value.scope) && typeof value.request_id === "string"
      && typeof value.prize === "string" && typeof value.present_only === "boolean" ? value : null;
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
  const [scope, setScope] = useState<RaffleScope>(initial.current?.scope ?? "semifinal");
  const [present, setPresent] = useState(initial.current?.present_only ?? true);
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
      const data = await source.get(season, scope, scope !== "all" && present);
      if (!alive.current || revision !== loadRevision.current) return;
      setState(data); setUpdated(new Date()); setError("");
      const recovered = pendingRef.current && data.history.find(draw => draw.request_id === pendingRef.current?.request_id);
      if (recovered && !busyRef.current) {
        setWinner(recovered); setPending(null); pendingRef.current = null; persistPending(season, null);
      } else if (!busyRef.current && !pendingRef.current) setWinner(current => data.history[0] ?? current);
    } catch {
      if (alive.current && revision === loadRevision.current) setError("Daten konnten nicht geladen werden. Bitte aktualisieren – es wird nicht mit veralteten Daten ausgelost.");
    } finally { if (alive.current && revision === loadRevision.current) setLoading(false); }
  }, [season, source, scope, present]);

  useEffect(() => {
    setLoading(true); setState(null);
    void load();
    const timer = window.setInterval(() => { if (!busyRef.current && document.visibilityState === "visible") void load(); }, 5000);
    return () => { window.clearInterval(timer); };
  }, [load]);

  const start = useCallback(async () => {
    if (busyRef.current || loading || (!pendingRef.current && (!state?.entries.length || error))) return;
    busyRef.current = true; setBusy(true); setError(""); setWinner(null);
    const request = pendingRef.current ?? {
      scope, present_only: scope !== "all" && present, prize: prize.trim() || "Überraschungsgewinn", request_id: crypto.randomUUID(),
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
      if (failure instanceof Error && failure.message.includes("RAFFLE_POOL_EMPTY")) {
        setPending(null); pendingRef.current = null; persistPending(season, null);
        setState(current => current ? { ...current, entries: [], pool_count: 0, total_tickets: 0 } : current);
        setError("Dieser Lostopf ist jetzt leer. Es wurde niemand ausgelost. Bitte Teilnehmerkreis wechseln oder aktualisieren.");
      } else setError("Die Antwort fehlt. Mit „Ziehung prüfen / fortsetzen“ dieselbe Ziehung sicher wiederholen – es wird kein zweiter Gewinner gezogen.");
    }
  }, [loading, state, error, scope, present, prize, season, source, load]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true'], [role='combobox'], [role='listbox'], [role='dialog']")) return;
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
  const locked = busy || !!pending;
  const disabled = busy || loading || (!pending && (!state?.entries.length || !!error));
  return (
    <main className="relative grid min-h-screen grid-rows-[auto_1fr_auto] overflow-hidden bg-[#003d55] font-sans text-[#f2dcab]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-24 h-64 w-64 rotate-45 border-[28px] border-[#f2dcab]/[0.04] sm:h-96 sm:w-96" />
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#f2dcab]/20 px-5 py-4 sm:px-10">
        <div className="flex items-center gap-4"><img src={logo} alt="Kletterliga NRW" className="h-16 w-16 object-contain" /><div><p className="text-xs uppercase tracking-[0.2em]">Finaltag · {season}</p><h1 className="text-xl sm:text-2xl">Verlosung</h1></div></div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48"><label className="mb-1 block text-xs" id="raffle-scope-label">Teilnehmerkreis</label><Select value={scope} disabled={locked} onValueChange={value => setScope(value as RaffleScope)}><SelectTrigger aria-labelledby="raffle-scope-label" className="min-h-11 rounded-md border-[#f2dcab]/35 bg-transparent text-[#f2dcab] focus:ring-[#f2dcab]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(scopes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#a15523]" checked={scope === "all" ? false : present} disabled={scope === "all" || locked} onChange={event => setPresent(event.target.checked)} />Nur eingecheckte</label>
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
        {winner && <p className="mt-4 text-sm text-[#f2dcab]/75">{winner.tickets} {winner.tickets === 1 ? "Los" : "Lose"} · {scopes[winner.scope]}{winner.present_only ? " · eingecheckt" : ""}</p>}
        {!busy && <p className="mt-5 text-sm text-[#f2dcab]/75">{scope === "all" ? "Alle aktiven Saison-Teilnehmenden mit Losen – auch ohne Anwesenheit." : present ? "Nur am Einlass als angekommen markierte Teilnehmende." : "Anmeldung / Finalstartliste – Anwesenheit nicht bestätigt."}</p>}
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
        <p className="mt-4 text-xs text-[#f2dcab]/70">Leertaste zum Losen · 1 Los je besuchter Halle + 1 für die Finaltag-Anmeldung · maximal 9 Lose · mehrere Gewinne pro Person möglich{updated && ` · Stand ${updated.toLocaleTimeString("de-DE")}`}</p>
        <details className="mt-4 border-t border-[#f2dcab]/15 pt-3"><summary className="cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2dcab]">Bisherige Gewinne ({state?.history.length ?? 0})</summary><ol className="mt-3 grid gap-2 sm:grid-cols-2">{state?.history.map(draw => <li key={draw.id} className="border-l-2 border-[#a15523] pl-3 text-sm"><span className="font-semibold">{draw.winner_name}</span> · {draw.prize}<span className="block text-xs text-[#f2dcab]/70">{new Date(draw.created_at).toLocaleTimeString("de-DE")} · {draw.tickets} Lose</span></li>)}</ol></details>
      </footer>
    </main>
  );
}

export default function CompetitionRaffle() {
  const { season } = useParams();
  return <RaffleScreen key={season} season={season ?? "2026"} />;
}
