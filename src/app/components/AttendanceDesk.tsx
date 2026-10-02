import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { attendanceSource, type AttendanceAction, type AttendanceData, type AttendanceRow } from "@/services/competitionAttendance";

type Filter = "expected" | "arrived" | "late" | "absent";
type Pending = { row: AttendanceRow; action: AttendanceAction; requestId: string; reason: string };
const filters: Array<{ value: Filter; label: string }> = [
  { value: "expected", label: "Angemeldet" }, { value: "arrived", label: "Angekommen" },
  { value: "late", label: "Nachmelden" }, { value: "absent", label: "Nicht erschienen" },
];
const buttonStyle = "min-h-11 normal-case tracking-normal font-sans text-sm shadow-none";
const leagueLabel = (league: AttendanceRow["league"]) => league === "lead" ? "Vorstieg" : "Toprope";
const matchesFilter = (row: AttendanceRow, filter: Filter) => filter === "late"
  ? !row.registered : row.registered && row.status === filter;
const errorText = (error: unknown) => error instanceof Error ? error.message : "Die Aktion konnte nicht bestätigt werden.";
const emptyRows: AttendanceRow[] = [];

export function AttendanceDesk({ season, password = null, mode = "admin", source = attendanceSource, onAccessInvalid }: {
  season: string;
  password?: string | null;
  mode?: "admin" | "crew";
  source?: typeof attendanceSource;
  onAccessInvalid?: () => void;
}) {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("expected");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(Date.now());
  const savingRef = useRef(false);
  const pendingRef = useRef<Pending | null>(null);
  const readingRef = useRef(false);
  const sequence = useRef(0);
  pendingRef.current = pending;
  const reload = useCallback(async (quiet = false) => {
    if (savingRef.current || readingRef.current || (quiet && pendingRef.current)) return;
    readingRef.current = true;
    const request = ++sequence.current;
    if (!quiet) setLoading(true);
    try {
      const next = await source.get(season, password);
      if (sequence.current !== request) return;
      setData(next); setError("");
    } catch (err) {
      if (sequence.current !== request) return;
      const message = errorText(err);
      setError(message);
      if (/Einlasspasswort/.test(message)) onAccessInvalid?.();
    } finally {
      if (sequence.current === request) {
        readingRef.current = false;
        if (!quiet) setLoading(false);
      }
    }
  }, [season, password, source, onAccessInvalid]);
  useEffect(() => {
    const activeSequence = sequence;
    const activeRead = readingRef;
    void reload();
    const refresh = () => { if (document.visibilityState !== "hidden") void reload(true); };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      ++activeSequence.current;
      activeRead.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [reload]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const rows = data?.rows ?? emptyRows;
  const filtered = useMemo(() => rows.filter((row) => matchesFilter(row, filter)
    && `${row.name} ${leagueLabel(row.league)} ${row.class_label}`.toLocaleLowerCase("de").includes(search.trim().toLocaleLowerCase("de")))
    .sort((a, b) => a.name.localeCompare(b.name, "de")), [rows, filter, search]);
  const lateClosed = data?.phase === "closed" || Boolean(data?.deadline && now >= new Date(data.deadline).getTime());
  const changed = (draft: Pending) => {
    setPending(draft); setSuccess(""); setError("");
  };
  const save = async (draft: Pending) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(""); setSuccess("");
    // Invalidate an already pending background response before this transaction.
    ++sequence.current;
    readingRef.current = false;
    try {
      const change = await source.set(season, draft.row.profile_id, draft.action, draft.row.version, draft.requestId, draft.reason.trim() || null, password);
      setData((current) => current && ({ ...current, rows: current.rows.map((row) => row.profile_id === change.profile_id ? { ...row, ...change } : row) }));
      setPending(null);
      setSuccess(`${draft.row.name}: ${change.status === "arrived" ? "Anwesenheit bestätigt" : change.status === "absent" ? "Nicht erschienen gespeichert" : "Anwesenheit zurückgenommen"}.`);
    } catch (err) {
      const message = errorText(err); setError(message);
      // Preserve the exact request and reason for a deliberate retry.
      setPending(draft);
      if (/Einlasspasswort/.test(message)) onAccessInvalid?.();
    } finally { savingRef.current = false; setSaving(false); }
  };
  const begin = (row: AttendanceRow, action: AttendanceAction) => {
    const draft = { row, action, requestId: crypto.randomUUID(), reason: "" };
    changed(draft);
    if (action === "arrive") void save(draft);
  };
  const needsReason = pending?.action === "undo" || pending?.action === "absent";

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-label={data ? `Angekommen: ${rows.filter((row) => row.registered && row.status === "arrived").length} von ${rows.filter((row) => row.registered).length}` : "Teilnehmerzahl noch nicht geladen"}>
        {data ? `${rows.filter((row) => row.registered && row.status === "arrived").length} von ${rows.filter((row) => row.registered).length} angekommen` : "Teilnehmerzahl wird geladen"}
      </p>
      <StitchButton className={buttonStyle} variant="outline" disabled={loading || saving} onClick={() => void reload()}><RefreshCw className="h-4 w-4" aria-hidden="true" />Aktualisieren</StitchButton>
    </div>
    <div className="relative">
      <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <Input className="min-h-12 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name suchen" aria-label="Teilnehmer nach Name oder Klasse suchen" />
    </div>
    <nav className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Einlassfilter">
      {filters.map(({ value, label }) => <StitchButton key={value} className={buttonStyle} variant={filter === value ? "navy" : "outline"} aria-current={filter === value ? "page" : undefined} onClick={() => setFilter(value)}>
        {label}{data ? ` (${rows.filter((row) => matchesFilter(row, value)).length})` : ""}
      </StitchButton>)}
    </nav>
    {success && <p role="status" className="flex gap-2 rounded-xl border border-primary/15 bg-white p-3 text-sm"><Check className="h-5 w-5 shrink-0" aria-hidden="true" />{success}</p>}
    {error && !pending && <div role="alert" className="space-y-2 rounded-xl border border-destructive/30 bg-white p-4"><p>{error}</p><StitchButton className={buttonStyle} variant="outline" onClick={() => void reload()}>Erneut laden</StitchButton></div>}
    {loading && !data ? <p role="status" className="py-6 text-center text-muted-foreground">Lade Einlassliste …</p> : data && <>
      {loading && <p role="status" className="text-sm text-muted-foreground">Aktualisiere …</p>}
      {filter === "late" && lateClosed && <p className="rounded-xl border border-primary/15 bg-white p-3 text-sm">Nachmeldungen sind geschlossen.</p>}
      {filtered.length === 0 ? <p className="py-6 text-center text-muted-foreground">{search ? "Keine passenden Teilnehmer." : "Keine Teilnehmer in dieser Ansicht."}</p> : <ul className="overflow-hidden rounded-xl border border-primary/15 bg-white">
        {filtered.map((row) => <li key={row.profile_id} className="flex flex-col gap-3 border-b border-primary/10 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="break-words font-semibold">{row.name}</h2>
            <p className="text-sm text-muted-foreground">{leagueLabel(row.league)} · {row.class_label}</p>
            {row.checked_in_at && row.status === "arrived" && <p className="text-xs text-muted-foreground">Angekommen um {new Date(row.checked_in_at).toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" })}</p>}
            {!row.eligible && <p className="text-sm text-secondary">Startberechtigung fehlt · René fragen</p>}
            {row.route_count !== 5 && <p className="text-sm text-secondary">{row.route_count}/5 Halbfinalrouten · René informieren</p>}
            {!row.registered && row.eligible && row.route_count === 5 && !row.can_late_register && <p className="text-sm text-secondary">Nachmeldung gesperrt · René fragen</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {row.registered && row.status === "expected" && <StitchButton className={buttonStyle} disabled={saving || loading || Boolean(error) || !row.eligible} onClick={() => begin(row, "arrive")} aria-label={`Anwesenheit von ${row.name} bestätigen`}>Anwesenheit bestätigen</StitchButton>}
            {!row.registered && <StitchButton className={buttonStyle} disabled={saving || loading || Boolean(error) || lateClosed || !row.can_late_register || !row.eligible || row.route_count !== 5} onClick={() => begin(row, "late-register")} aria-label={`${row.name} nachmelden`}>Nachmelden</StitchButton>}
            {mode === "admin" && row.registered && row.status === "arrived" && <StitchButton className={buttonStyle} variant="outline" disabled={saving || loading || Boolean(error) || !row.eligible} onClick={() => begin(row, "undo")} aria-label={`Anwesenheit von ${row.name} zurücknehmen`}>Zurücknehmen</StitchButton>}
            {mode === "admin" && row.registered && row.status !== "absent" && <StitchButton className={buttonStyle} variant="outline" disabled={saving || loading || Boolean(error) || !row.eligible} onClick={() => begin(row, "absent")} aria-label={`${row.name} als nicht erschienen markieren`}>Nicht erschienen</StitchButton>}
            {mode === "admin" && row.registered && row.status === "absent" && <StitchButton className={buttonStyle} variant="outline" disabled={saving || loading || Boolean(error) || !row.eligible} onClick={() => begin(row, "undo")} aria-label={`Ausfall von ${row.name} zurücknehmen`}>Ausfall zurücknehmen</StitchButton>}
          </div>
        </li>)}
      </ul>}
    </>}
    <Dialog open={Boolean(pending && (pending.action !== "arrive" || error))} onOpenChange={(open) => { if (!open && !saving) { setPending(null); setError(""); } }}>
      <DialogContent className="space-y-4 p-5" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onInteractOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader><DialogTitle>{pending?.action === "late-register" ? "Teilnehmer nachmelden" : pending?.action === "absent" ? "Nicht erschienen" : pending?.action === "undo" ? "Status zurücknehmen" : "Anwesenheit erneut senden"}</DialogTitle>
          <DialogDescription>{pending?.row.name} · {pending && leagueLabel(pending.row.league)} · {pending?.row.class_label}</DialogDescription></DialogHeader>
        {pending?.action === "late-register" && <p className="text-sm">Name und Klasse prüfen. Die Person wird nachgemeldet und als angekommen bestätigt.</p>}
        {needsReason && <div className="space-y-2"><label htmlFor="attendance-reason" className="text-sm font-semibold">Begründung</label><Textarea id="attendance-reason" value={pending?.reason ?? ""} disabled={saving} onChange={(event) => pending && setPending({ ...pending, reason: event.target.value, requestId: crypto.randomUUID() })} /></div>}
        {error && <p role="alert" className="text-sm text-destructive">Nicht bestätigt. {error}</p>}
        {error.includes("inzwischen geändert") ? <StitchButton className={buttonStyle} variant="navy" onClick={() => { setPending(null); void reload(); }}>Aktuellen Stand laden</StitchButton> : <DialogFooter className="gap-2"><StitchButton className={buttonStyle} variant="outline" disabled={saving} onClick={() => { setPending(null); setError(""); }}>Zurück</StitchButton><StitchButton className={buttonStyle} disabled={saving || Boolean(needsReason && !pending?.reason.trim())} onClick={() => pending && void save(pending)}>{saving ? "Wird gespeichert …" : error ? "Erneut senden" : pending?.action === "late-register" ? "Nachmelden & einchecken" : "Speichern"}</StitchButton></DialogFooter>}
      </DialogContent>
    </Dialog>
  </div>;
}
