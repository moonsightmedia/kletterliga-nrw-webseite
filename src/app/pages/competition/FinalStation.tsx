import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LogOut,
  RefreshCw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSeasonSettings } from "@/services/seasonSettings";
import { validFinalPassword } from "@/lib/finalPassword";
import { cn } from "@/lib/utils";
import {
  className,
  getFinalStation,
  resultLabel,
  submitFinalAttempt,
  type StationClass,
} from "@/services/competitionFinal";

interface Draft {
  classId: string;
  entryId: string;
  grip: string;
  top: boolean;
  minutes: string;
  seconds: string;
  reason: string;
  request: string;
  version: number | null;
  baseline: string;
}
type View = "classes" | "participants" | "edit" | "review";
type Choice = { classId: string; entryId: string };
const values = (
  draft: Pick<Draft, "grip" | "top" | "minutes" | "seconds" | "reason">,
) =>
  JSON.stringify([
    draft.grip,
    draft.top,
    draft.minutes,
    draft.seconds,
    draft.reason,
  ]);
const empty = (): Draft => {
  const draft = {
    classId: "",
    entryId: "",
    grip: "",
    top: false,
    minutes: "",
    seconds: "",
    reason: "",
    request: crypto.randomUUID(),
    version: null,
    baseline: "",
  };
  return { ...draft, baseline: values(draft) };
};
const digits = (value: string) => /^\d+$/.test(value);
const timeLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const phaseLabel = (phase: StationClass["phase"]) =>
  phase === "preparation"
    ? "Starterliste folgt"
    : phase === "running"
    ? "Eingabe offen"
    : phase === "published"
      ? "Noch nicht gestartet"
      : "Eingabe geschlossen";
const errorText = (err: unknown) =>
  err instanceof Error ? err.message : "Verbindung unterbrochen.";
const invalidAccess = (message: string) =>
  /ungültig|FINAL_PASSWORD_INVALID|FINAL_STATION_INVALID/.test(message);
const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] focus-visible:ring-offset-2";
const secondary = `min-h-12 rounded-xl border border-[#003d55]/20 bg-white px-4 py-3 text-sm font-semibold text-[#003d55] disabled:opacity-50 ${focus}`;
const primary = `min-h-12 w-full rounded-xl bg-[#a15523] px-4 py-3 text-base font-semibold text-white hover:bg-[#88451a] disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;
const input = `min-h-14 w-full min-w-0 rounded-xl border border-[#003d55]/25 bg-white px-4 py-3 text-2xl font-semibold tabular-nums disabled:opacity-60 ${focus}`;

export default function FinalStation() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  return (
    <FinalStationContent
      season={settings?.season_year?.trim()}
      settingsLoading={settingsLoading}
    />
  );
}

export function FinalStationContent({
  season,
  settingsLoading = false,
  source = { getFinalStation, submitFinalAttempt },
  storagePrefix = "kletterliga",
  backHref = "/app/schiedsrichter",
}: {
  season?: string;
  settingsLoading?: boolean;
  source?: {
    getFinalStation: typeof getFinalStation;
    submitFinalAttempt: typeof submitFinalAttempt;
  };
  storagePrefix?: string;
  backHref?: string;
}) {
  const { getFinalStation: loadClasses, submitFinalAttempt: saveAttempt } =
    source;
  const draftKey = useCallback(
    (year: string, handset: number) =>
      `${storagePrefix}:final-draft:${year}:${handset}`,
    [storagePrefix],
  );
  const accessKey = useCallback(
    (year: string) => `${storagePrefix}:final-station:${year}`,
    [storagePrefix],
  );
  const [station, setStation] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [classes, setClasses] = useState<StationClass[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const [view, setView] = useState<View>("classes");
  const [browsingClass, setBrowsingClass] = useState("");
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const writing = useRef(false);
  const loadSequence = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  const clearAccess = useCallback(() => {
    loadSequence.current++;
    setActiveCode("");
    setCode("");
    setClasses([]);
    setNotice("");
    if (season) {
      try {
        sessionStorage.removeItem(accessKey(season));
      } catch {
        /* access remains cleared */
      }
    }
  }, [season, accessKey]);
  const reload = useCallback(
    async (credential: string, handset: 1 | 2) => {
      if (!season || !credential) return;
      const sequence = ++loadSequence.current;
      let data: Awaited<ReturnType<typeof getFinalStation>>;
      try {
        data = await loadClasses(season, handset, credential);
      } catch (err) {
        if (sequence !== loadSequence.current) return;
        throw err;
      }
      if (sequence !== loadSequence.current) return;
      setClasses(data.classes);
      setActiveCode(credential);
      setConnectionError("");
      try {
        sessionStorage.setItem(
          accessKey(season),
          JSON.stringify({ station: handset, code: credential }),
        );
      } catch {
        /* access only in memory */
      }
    },
    [season, loadClasses, accessKey],
  );

  useEffect(() => {
    if (!season) return;
    let cancelled = false;
    const sequences = loadSequence;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(accessKey(season)) ?? "null",
      ) as { station?: number; code?: string } | null;
      if (saved?.code && (saved.station === 1 || saved.station === 2)) {
        setStation(saved.station);
        setBusy(true);
        void reload(saved.code, saved.station)
          .catch((err) => {
            if (cancelled) return;
            clearAccess();
            setError(errorText(err));
          })
          .finally(() => {
            if (!cancelled) setBusy(false);
          });
      }
    } catch {
      /* no saved session */
    }
    return () => {
      cancelled = true;
      sequences.current++;
    };
  }, [season, reload, accessKey, clearAccess]);
  useEffect(() => {
    if (!season) return;
    const key = draftKey(season, station);
    try {
      const saved = JSON.parse(
        localStorage.getItem(key) ?? "null",
      ) as Partial<Draft> | null;
      const valid =
        saved &&
        typeof saved.classId === "string" &&
        typeof saved.entryId === "string" &&
        typeof saved.grip === "string" &&
        typeof saved.top === "boolean" &&
        typeof saved.minutes === "string" &&
        typeof saved.seconds === "string" &&
        typeof saved.reason === "string" &&
        typeof saved.request === "string";
      const restored = valid
        ? ({
            ...empty(),
            ...saved,
            version: Number.isInteger(saved.version) ? saved.version! : null,
          } as Draft)
        : empty();
      setDraft(restored);
      setBrowsingClass(restored.classId);
      setView(restored.entryId ? "edit" : "classes");
      setNotice(
        restored.entryId ? "Entwurf wiederhergestellt · nicht übertragen" : "",
      );
    } catch {
      setDraft(empty());
    }
    setDraftReadyKey(key);
  }, [season, station, draftKey]);
  useEffect(() => {
    if (!season || draftReadyKey !== draftKey(season, station)) return;
    try {
      if (draft.entryId)
        localStorage.setItem(draftReadyKey, JSON.stringify(draft));
      else localStorage.removeItem(draftReadyKey);
      setStorageError("");
    } catch {
      setStorageError(
        "Entwurf nur auf dieser Seite verfügbar. Bei Ausfall auf Papier weiterarbeiten.",
      );
    }
  }, [draft, draftReadyKey, season, station, draftKey]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!activeCode || writing.current) return;
    try {
      await reload(activeCode, station);
    } catch (err) {
      const message = errorText(err);
      if (invalidAccess(message)) {
        clearAccess();
        setError(message);
      } else
        setConnectionError(
          "Liste konnte nicht aktualisiert werden. Letzter Stand bleibt sichtbar.",
        );
    }
  }, [activeCode, reload, station, clearAccess]);
  useEffect(() => {
    if (!activeCode) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeCode, refresh]);
  useEffect(() => {
    if (activeCode) heading.current?.focus();
  }, [view, draft.entryId, activeCode]);

  const selectedClass = classes.find((c) => c.id === draft.classId);
  const selectedEntry = selectedClass?.entries.find(
    (e) => e.entry_id === draft.entryId,
  );
  const listedClass = classes.find((c) => c.id === browsingClass || `${c.league}|${c.class_label}` === browsingClass);
  const dirty = !!draft.entryId && values(draft) !== draft.baseline;
  const stale = !!selectedClass && selectedClass.version !== draft.version;
  const totalSeconds = Number(draft.minutes) * 60 + Number(draft.seconds);
  const maxGrip = selectedClass?.route?.max_grip ?? 999;
  const grip = draft.top
    ? (selectedClass?.route?.max_grip ?? 0)
    : Number(draft.grip);
  const validGrip =
    !!selectedClass &&
    (draft.top || digits(draft.grip)) &&
    Number.isSafeInteger(grip) &&
    grip >= 0 &&
    grip <= maxGrip;
  const validTime =
    digits(draft.minutes) &&
    digits(draft.seconds) &&
    Number(draft.seconds) < 60 &&
    totalSeconds <= 300;
  const validReason =
    !selectedEntry?.attempt_id ||
    (draft.reason.trim().length > 0 && draft.reason.length <= 500);
  const editable =
    selectedClass?.phase === "running" && selectedEntry?.status === "ready";
  const canSubmit =
    editable &&
    validGrip &&
    validTime &&
    validReason &&
    !stale &&
    online &&
    !connectionError &&
    !busy;
  const draftResult = `${draft.top ? "TOP" : `Griff ${draft.grip || "–"}`} · ${validTime ? timeLabel(totalSeconds) : "Zeit offen"}`;
  const updateDraft = (change: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...change, request: crypto.randomUUID() }));
    setError("");
    setNotice("");
  };
  function chooseEntry(choice: Choice) {
    const targetClass = classes.find((c) => c.id === choice.classId);
    const entry = targetClass?.entries.find(
      (e) => e.entry_id === choice.entryId,
    );
    if (
      !targetClass ||
      !entry ||
      targetClass.phase !== "running" ||
      entry.status !== "ready"
    )
      return;
    if (draft.classId === choice.classId && draft.entryId === choice.entryId) {
      setView("edit");
      return;
    }
    const next: Draft = {
      ...empty(),
      ...choice,
      version: targetClass.version,
      grip: entry.attempt_id ? String(entry.grip ?? 0) : "",
      top: entry.attempt_id ? !!entry.is_top : false,
      minutes: entry.attempt_id
        ? String(Math.floor((entry.seconds ?? 0) / 60))
        : "",
      seconds: entry.attempt_id ? String((entry.seconds ?? 0) % 60) : "",
    };
    next.baseline = values(next);
    setDraft(next);
    setView("edit");
    setError("");
    setNotice("");
  }
  async function login() {
    if (!season || writing.current || busy || !validFinalPassword(code)) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      await reload(code, station);
      setCode("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (
      !season ||
      !activeCode ||
      !selectedClass ||
      !selectedEntry ||
      !canSubmit ||
      writing.current
    )
      return;
    writing.current = true;
    loadSequence.current++;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveAttempt({
        season,
        station,
        code: activeCode,
        entry: selectedEntry.entry_id,
        request: draft.request,
        grip,
        top: draft.top,
        seconds: totalSeconds,
        version: draft.version!,
        reason: draft.reason.trim(),
      });
    } catch (err) {
      const message = errorText(err);
      setError(
        invalidAccess(message)
          ? message
          : `${message} Speicherung nicht bestätigt. Entwurf bleibt erhalten.`,
      );
      if (invalidAccess(message)) clearAccess();
      setView("edit");
      writing.current = false;
      setBusy(false);
      return;
    }
    // A confirmed write is successful even if the subsequent list fetch fails.
    const confirmedClass = selectedClass.id;
    const confirmedEntry = selectedEntry.entry_id;
    setClasses((current) =>
      current.map((c) =>
        c.id === confirmedClass
          ? {
              ...c,
              version: c.version + 1,
              entries: c.entries.map((e) =>
                e.entry_id === confirmedEntry
                  ? {
                      ...e,
                      attempt_id: draft.request,
                      is_top: draft.top,
                      grip,
                      seconds: totalSeconds,
                      checked_at: null,
                    }
                  : e,
              ),
            }
          : c,
      ),
    );
    setDraft(empty());
    setBrowsingClass(confirmedClass);
    setView("participants");
    setNotice(
      `${selectedEntry.name}: ${draft.top ? "TOP" : `Griff ${grip}`} · ${timeLabel(totalSeconds)} gespeichert`,
    );
    try {
      localStorage.removeItem(draftKey(season, station));
    } catch {
      setStorageError(
        "Gespeichert. Lokaler Entwurf konnte nicht entfernt werden.",
      );
    }
    try {
      await reload(activeCode, station);
    } catch (err) {
      if (invalidAccess(errorText(err))) {
        clearAccess();
        setError(errorText(err));
      } else
        setConnectionError(
          "Ergebnis gespeichert. Liste konnte nicht aktualisiert werden.",
        );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  const goBack = () => {
    setError("");
    if (view === "review") setView("edit");
    else if (view === "edit") {
      setBrowsingClass(draft.classId);
      setView("participants");
    } else setView("classes");
  };
  const title = !activeCode
    ? "Finaleingabe"
    : view === "classes"
      ? "Klasse wählen"
      : view === "participants"
        ? listedClass
          ? className(listedClass.league, listedClass.class_label)
          : "Teilnehmer"
        : (selectedEntry?.name ?? "Entwurf");

  return (
    <section
      aria-label="Mobile Finaleingabe"
      className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-md flex-col gap-5 pb-4 text-[#003d55]"
    >
      <header>
        <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
          {activeCode && view !== "classes" ? (
            <button
              aria-label={
                view === "review"
                  ? "Zur Eingabe"
                  : view === "edit"
                    ? "Zur Teilnehmerliste"
                    : "Zur Klassenliste"
              }
              disabled={busy}
              onClick={goBack}
              className={`flex min-h-11 items-center gap-2 text-sm font-semibold ${focus}`}
            >
              <ArrowLeft size={18} />
              {view === "review"
                ? "Eingabe"
                : view === "edit"
                  ? "Teilnehmer"
                  : "Klassen"}
            </button>
          ) : (
            <span className="text-sm text-[#003d55]/65">
              Finale · {season ?? "–"}
            </span>
          )}
          {activeCode ? (
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-[#003d55]/65">
                Handy {station}
              </span>
              <button
                aria-label="Liste aktualisieren"
                disabled={busy || !online}
                onClick={() => void refresh()}
                className={`flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[#003d55]/5 disabled:opacity-40 ${focus}`}
              >
                <RefreshCw size={18} />
              </button>
              <button
                aria-label="Abmelden"
                disabled={busy}
                onClick={clearAccess}
                className={`flex h-11 w-11 items-center justify-center rounded-xl hover:bg-[#003d55]/5 disabled:opacity-40 ${focus}`}
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              aria-label="Zur Schiedsrichterübersicht"
              to={backHref}
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${focus}`}
            >
              <ArrowLeft size={18} />
            </Link>
          )}
        </div>
        <h1
          ref={heading}
          tabIndex={-1}
          className="break-words [font-family:inherit] text-2xl font-semibold tracking-normal leading-tight outline-none"
        >
          {title}
        </h1>
        {activeCode &&
          (view === "edit" || view === "review") &&
          selectedClass &&
          selectedEntry && (
            <p className="mt-2 text-sm text-[#003d55]/70">
              {className(selectedClass.league, selectedClass.class_label)} ·
              {selectedClass.route && <>Route {selectedClass.route.number} · </>}Start{" "}
              {selectedEntry.start_position}
            </p>
          )}
        {activeCode && view === "participants" && listedClass?.route && (
          <p className="mt-2 text-sm text-[#003d55]/70">
            Route {listedClass.route.number} · {listedClass.route.name}
          </p>
        )}
      </header>
      {settingsLoading && (
        <p role="status" className="text-sm">
          Saison wird geladen …
        </p>
      )}
      {!settingsLoading && !season && (
        <p role="alert" className="text-sm text-red-800">
          Die Saison ist nicht verfügbar.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {!online && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
        >
          Offline · Entwurf nicht übertragen. Auf Papier weiterarbeiten.
        </p>
      )}
      {connectionError && online && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <p>{connectionError}</p>
          <button
            disabled={busy}
            onClick={() => void refresh()}
            className={`mt-1 min-h-11 font-semibold underline underline-offset-4 ${focus}`}
          >
            Aktualisieren
          </button>
        </div>
      )}
      {storageError && (
        <p role="alert" className="text-sm text-amber-950">
          {storageError}
        </p>
      )}
      {notice && (
        <p role="status" className="flex gap-2 text-sm text-[#245543]">
          {view === "participants" && (
            <Check className="mt-0.5 shrink-0" size={16} />
          )}
          {notice}
        </p>
      )}

      {!activeCode ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
          className="flex flex-1 flex-col gap-6"
        >
          <fieldset disabled={busy} className="space-y-5">
            <div>
              <span className="mb-2 block text-sm font-semibold">
                Dieses Handy
              </span>
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label="Eingabehandy"
              >
                {([1, 2] as const).map((number) => (
                  <button
                    key={number}
                    type="button"
                    aria-pressed={station === number}
                    onClick={() => setStation(number)}
                    className={cn(
                      secondary,
                      station === number &&
                        "border-[#003d55] bg-[#003d55] text-[#f2dcab]",
                    )}
                  >
                    Handy {number}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Finalpasswort
              </span>
              <input
                className={cn(input, "text-base font-normal")}
                aria-label="Finalpasswort"
                type="password"
                autoComplete="off"
                maxLength={72}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <span className="mt-2 block text-xs text-[#003d55]/65">
                Das gemeinsame Passwort von René.
              </span>
            </label>
          </fieldset>
          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={
                busy ||
                !season ||
                settingsLoading ||
                !online ||
                !validFinalPassword(code)
              }
              className={primary}
            >
              {busy ? "Wird angemeldet …" : "Anmelden"}
            </button>
          </div>
        </form>
      ) : view === "classes" ? (
        <div className="space-y-2">
          {classes.length === 0 && (
            <div className="space-y-3 py-4">
              <p className="text-sm">Noch keine Finalklasse freigegeben.</p>
              <button
                className={secondary}
                disabled={busy}
                onClick={() => void refresh()}
              >
                Aktualisieren
              </button>
            </div>
          )}
          {classes.map((c) => (
            <button
              key={c.id}
              disabled={busy}
              onClick={() => {
                setBrowsingClass(`${c.league}|${c.class_label}`);
                setView("participants");
                setNotice("");
              }}
              className={`flex min-h-20 w-full items-center gap-3 rounded-xl border border-[#003d55]/15 bg-white p-4 text-left disabled:opacity-50 ${focus}`}
            >
              <div className="min-w-0 flex-1">
                <span className="block text-base font-semibold">
                  {className(c.league, c.class_label)}
                </span>
                <span className="mt-1 block text-xs text-[#003d55]/65">
                  {c.phase === "preparation" ? "Starterliste folgt" : <>{c.route && <>Route {c.route.number} · </>}{c.entries.filter((e) => e.attempt_id).length}/{c.entries.length} erfasst</>}
                </span>
                {c.phase !== "preparation" && <span
                  className={`mt-1 block text-xs ${c.phase === "running" ? "text-[#245543]" : "text-[#003d55]/65"}`}
                >
                  {phaseLabel(c.phase)}
                </span>}
              </div>
              <ChevronRight size={20} className="shrink-0" />
            </button>
          ))}
        </div>
      ) : view === "participants" && listedClass ? (
        <div className="space-y-3">
          {listedClass.phase !== "preparation" && <div className="flex justify-between gap-3 text-xs text-[#003d55]/65">
            <span>
              {`${listedClass.entries.filter((e) => e.attempt_id).length}/${listedClass.entries.length} erfasst`}
            </span>
            <span>{phaseLabel(listedClass.phase)}</span>
          </div>}
          {listedClass.phase === "published" && <p className="text-sm text-[#003d55]/70">René öffnet die Eingabe mit „Klasse starten“.</p>}
          <div className="overflow-hidden rounded-xl border border-[#003d55]/15 bg-white">
            {[...listedClass.entries]
              .sort((a, b) => a.start_position - b.start_position)
              .map((entry) => (
                <button
                  key={entry.entry_id}
                  disabled={
                    busy ||
                    listedClass.phase !== "running" ||
                    entry.status !== "ready"
                  }
                  onClick={() => {
                    const choice = {
                      classId: listedClass.id,
                      entryId: entry.entry_id,
                    };
                    if (dirty && entry.entry_id !== draft.entryId)
                      setPendingChoice(choice);
                    else chooseEntry(choice);
                  }}
                  aria-label={`${entry.start_position}. ${entry.name}, ${resultLabel(entry)}`}
                  className={`flex min-h-20 w-full items-center gap-3 border-b border-[#003d55]/10 p-4 text-left last:border-b-0 disabled:cursor-default ${focus}`}
                >
                  <span className="w-7 shrink-0 text-lg font-semibold tabular-nums text-[#003d55]/55">
                    {entry.start_position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block break-words text-base font-semibold">
                      {entry.name}
                    </span>
                    <span
                      className={`mt-1 block text-sm ${entry.attempt_id ? "text-[#245543]" : "text-[#003d55]/65"}`}
                    >
                      {dirty && draft.entryId === entry.entry_id
                        ? "Entwurf · nicht übertragen"
                        : resultLabel(entry)}
                    </span>
                  </div>
                  {entry.attempt_id ? (
                    <Check size={18} className="shrink-0 text-[#245543]" />
                  ) : listedClass.phase === "running" ? (
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-[#003d55]/55"
                    />
                  ) : null}
                </button>
              ))}
          </div>
          {!listedClass.entries.length && (
            <p className="py-3 text-sm">{listedClass.phase === "preparation" ? "René erstellt die Starterliste nach Abschluss des Halbfinales." : "Die Startliste ist noch leer."}</p>
          )}
        </div>
      ) : (view === "edit" || view === "review") &&
        selectedClass &&
        selectedEntry ? (
        <>
          {!editable && (
            <p
              role="alert"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950"
            >
              {selectedEntry.status === "ready"
                ? "Eingabe für diese Klasse geschlossen."
                : "Startstatus ungeklärt. Bitte René informieren."}
            </p>
          )}
          {stale && (
            <div
              role="alert"
              className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
            >
              <p className="font-semibold">
                Stand geändert · bitte vergleichen
              </p>
              <p>Aktuell: {resultLabel(selectedEntry)}</p>
              <p>Dein Entwurf: {draftResult}</p>
              <button
                disabled={busy || !editable}
                onClick={() => {
                  setDraft((prev) => ({
                    ...prev,
                    version: selectedClass.version,
                    request: crypto.randomUUID(),
                  }));
                  setView("edit");
                  setError("");
                }}
                className={`${secondary} w-full`}
              >
                Aktuellen Stand übernehmen
              </button>
            </div>
          )}
          {view === "edit" ? (
            <form
              className="flex flex-1 flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) setView("review");
              }}
            >
              <fieldset disabled={busy || !editable} className="space-y-5">
                <div>
                  <span className="mb-2 block text-sm font-semibold">
                    Ergebnis
                  </span>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="group"
                    aria-label="Griff oder TOP"
                  >
                    <button
                      type="button"
                      aria-pressed={!draft.top}
                      onClick={() => updateDraft({ top: false })}
                      className={cn(
                        secondary,
                        !draft.top &&
                          "border-[#003d55] bg-[#003d55] text-[#f2dcab]",
                      )}
                    >
                      Griff
                    </button>
                    <button
                      type="button"
                      aria-pressed={draft.top}
                      onClick={() => updateDraft({ top: true })}
                      className={cn(
                        secondary,
                        draft.top &&
                          "border-[#003d55] bg-[#003d55] text-[#f2dcab]",
                      )}
                    >
                      TOP
                    </button>
                  </div>
                </div>
                {!draft.top && (
                  <label className="block">
                    <span className="mb-2 flex justify-between text-sm font-semibold">
                      <span>Erreichter Griff</span>
                      <span className="font-normal text-[#003d55]/65">
                        0–{maxGrip}
                      </span>
                    </span>
                    <input
                      className={input}
                      aria-label="Erreichter Griff"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={draft.grip}
                      onChange={(e) => updateDraft({ grip: e.target.value })}
                      aria-invalid={draft.grip !== "" && !validGrip}
                    />
                    {draft.grip !== "" && !validGrip && (
                      <span className="mt-2 block text-xs text-red-800">
                        Ganze Griffnummer von 0 bis{" "}
                        {maxGrip} eingeben.
                      </span>
                    )}
                  </label>
                )}
                <div>
                  <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span>Zeit</span>
                    <span className="font-normal text-[#003d55]/65">
                      Bis 5:00
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="mb-1 block text-xs text-[#003d55]/65">
                        Minuten
                      </span>
                      <input
                        className={input}
                        aria-label="Minuten"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="0"
                        value={draft.minutes}
                        onChange={(e) =>
                          updateDraft({ minutes: e.target.value })
                        }
                        aria-invalid={
                          draft.minutes !== "" &&
                          (!digits(draft.minutes) || Number(draft.minutes) > 5)
                        }
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-xs text-[#003d55]/65">
                        Sekunden
                      </span>
                      <input
                        className={input}
                        aria-label="Sekunden"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="00"
                        value={draft.seconds}
                        onChange={(e) =>
                          updateDraft({ seconds: e.target.value })
                        }
                        aria-invalid={
                          draft.seconds !== "" &&
                          (!digits(draft.seconds) ||
                            Number(draft.seconds) >= 60)
                        }
                      />
                    </label>
                  </div>
                  {draft.minutes !== "" &&
                    draft.seconds !== "" &&
                    !validTime && (
                      <p className="mt-2 text-xs text-red-800">
                        Ganze Minuten und Sekunden eingeben. Höchstens 5:00,
                        Sekunden 0–59.
                      </p>
                    )}
                </div>
                {selectedEntry.attempt_id && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">
                      Grund für die Korrektur
                    </span>
                    <textarea
                      className={cn(input, "min-h-20 text-base font-normal")}
                      aria-label="Grund für die Korrektur"
                      rows={2}
                      maxLength={500}
                      value={draft.reason}
                      onChange={(e) => updateDraft({ reason: e.target.value })}
                    />
                    <span className="mt-2 block text-xs text-[#003d55]/65">
                      Aktuell: {resultLabel(selectedEntry)}
                    </span>
                  </label>
                )}
              </fieldset>
              <footer className="sticky bottom-0 mt-auto space-y-2 bg-[#f8f4ee] py-3">
                <p className="text-center text-xs text-[#003d55]/65">
                  Entwurf · nicht übertragen
                </p>
                <button type="submit" disabled={!canSubmit} className={primary}>
                  Eintrag prüfen
                </button>
              </footer>
            </form>
          ) : (
            <div className="flex flex-1 flex-col gap-5">
              <h2 className="[font-family:inherit] text-base font-semibold tracking-normal">
                Eintrag prüfen
              </h2>
              <div className="divide-y divide-[#003d55]/15 rounded-xl border border-[#003d55]/15 bg-white px-4">
                <div className="flex items-center justify-between py-5">
                  <span className="text-sm text-[#003d55]/65">Ergebnis</span>
                  <strong className="text-2xl font-semibold">
                    {draft.top ? "TOP" : `Griff ${grip}`}
                  </strong>
                </div>
                <div className="flex items-center justify-between py-5">
                  <span className="text-sm text-[#003d55]/65">Zeit</span>
                  <strong className="text-2xl font-semibold tabular-nums">
                    {timeLabel(totalSeconds)}
                  </strong>
                </div>
              </div>
              {selectedEntry.attempt_id && (
                <p className="text-sm">
                  <span className="font-semibold">Korrekturgrund: </span>
                  {draft.reason}
                </p>
              )}
              <p className="text-sm text-[#003d55]/70">
                Mit Papierliste vergleichen.
              </p>
              <footer className="sticky bottom-0 mt-auto space-y-2 bg-[#f8f4ee] py-3">
                <p className="text-center text-xs text-[#003d55]/65">
                  Wird als vorläufiges Ergebnis veröffentlicht
                </p>
                <button
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                  className={primary}
                >
                  {busy ? "Wird gespeichert …" : "Ergebnis speichern"}
                </button>
              </footer>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p role="alert" className="text-sm">
            Die Klasse oder Person ist nicht mehr für die Eingabe verfügbar. Der
            Entwurf bleibt erhalten.
          </p>
          <button onClick={() => setView("classes")} className={secondary}>
            Klassen anzeigen
          </button>
        </div>
      )}

      <AlertDialog
        open={!!pendingChoice}
        onOpenChange={(open) => {
          if (!open) setPendingChoice(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-xl bg-[#f8f4ee] text-[#003d55] sm:max-w-sm">
          <AlertDialogTitle className="[font-family:inherit] tracking-normal">
            Entwurf verwerfen?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#003d55]/70">
            Das Ergebnis wurde noch nicht gespeichert. Beim Wechsel werden die
            eingegebenen Werte verworfen.
          </AlertDialogDescription>
          <AlertDialogCancel
            className={cn(
              secondary,
              "h-auto skew-x-0 normal-case tracking-normal hover:bg-[#003d55]/5 hover:text-[#003d55]",
            )}
          >
            Entwurf behalten
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              primary,
              "h-auto skew-x-0 normal-case tracking-normal hover:translate-y-0",
            )}
            onClick={() => {
              if (pendingChoice) chooseEntry(pendingChoice);
              setPendingChoice(null);
            }}
          >
            Verwerfen und wechseln
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
