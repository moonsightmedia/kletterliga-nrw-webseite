import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StitchButton,
  StitchCard,
  StitchTextField,
} from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
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
}
const empty = (): Draft => ({
  classId: "",
  entryId: "",
  grip: "",
  top: false,
  minutes: "",
  seconds: "",
  reason: "",
  request: crypto.randomUUID(),
});
const draftKey = (season: string, station: number) =>
  `kletterliga:final-draft:${season}:${station}`;
const accessKey = (season: string) => `kletterliga:final-station:${season}`;
const inputClass =
  "min-h-12 w-full rounded-xl border border-[#003d55]/25 bg-white px-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]";

export default function FinalStation() {
  const { settings, loading: settingsLoading } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  const [station, setStation] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [classes, setClasses] = useState<StationClass[]>([]);
  const [draft, setDraft] = useState<Draft>(empty);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draftReadyKey, setDraftReadyKey] = useState<string | null>(null);
  const updateDraft = (change: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...change, request: crypto.randomUUID() }));

  const reload = useCallback(
    async (credential: string, targetStation: 1 | 2) => {
      if (!season || !credential) return;
      const data = await getFinalStation(season, targetStation, credential);
      setClasses(data.classes);
      setActiveCode(credential);
      try {
        sessionStorage.setItem(
          accessKey(season),
          JSON.stringify({ station: targetStation, code: credential }),
        );
      } catch {
        /* session only */
      }
    },
    [season],
  );
  useEffect(() => {
    if (!season) return;
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(accessKey(season)) ?? "null",
      ) as { station?: number; code?: string } | null;
      if (saved?.code && (saved.station === 1 || saved.station === 2)) {
        setStation(saved.station);
        setCode(saved.code);
        void reload(saved.code, saved.station).catch(() => {
          sessionStorage.removeItem(accessKey(season));
          setActiveCode("");
        });
      }
    } catch {
      /* no persisted access */
    }
  }, [season, reload]);
  useEffect(() => {
    if (!season) return;
    const key = draftKey(season, station);
    try {
      const saved = JSON.parse(
        localStorage.getItem(key) ?? "null",
      ) as Draft | null;
      setDraft(
        saved?.request && typeof saved.entryId === "string" ? saved : empty(),
      );
      if (saved?.entryId)
        setNotice(
          "Nicht übertragener Entwurf wiederhergestellt. Vor dem Senden mit der Papierliste prüfen.",
        );
    } catch {
      setDraft(empty());
    }
    setDraftReadyKey(key);
  }, [season, station]);
  useEffect(() => {
    if (!season || draftReadyKey !== draftKey(season, station)) return;
    try {
      localStorage.setItem(draftReadyKey, JSON.stringify(draft));
    } catch {
      /* input remains in memory */
    }
  }, [draft, draftReadyKey, season, station]);
  useEffect(() => {
    if (!activeCode) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void reload(activeCode, station).catch((err) => {
          const message =
            err instanceof Error ? err.message : "Verbindung unterbrochen.";
          if (message.includes("ungültig")) {
            if (season) sessionStorage.removeItem(accessKey(season));
            setActiveCode("");
            setClasses([]);
          }
          setError(message);
        });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeCode, reload, season, station]);
  const selectedClass = classes.find((c) => c.id === draft.classId);
  const selectedEntry = selectedClass?.entries.find(
    (e) => e.entry_id === draft.entryId,
  );
  const totalSeconds = Number(draft.minutes) * 60 + Number(draft.seconds);
  const grip = draft.top
    ? (selectedClass?.route.max_grip ?? 0)
    : Number(draft.grip);
  const validTime =
    draft.minutes !== "" &&
    draft.seconds !== "" &&
    Number.isInteger(Number(draft.minutes)) &&
    Number.isInteger(Number(draft.seconds)) &&
    Number(draft.seconds) >= 0 &&
    Number(draft.seconds) < 60 &&
    totalSeconds >= 0 &&
    totalSeconds <= 300;
  const canSubmit =
    !!selectedClass &&
    selectedClass.phase === "running" &&
    !!selectedEntry &&
    selectedEntry.status === "ready" &&
    (draft.top || draft.grip !== "") &&
    Number.isInteger(grip) &&
    grip >= 0 &&
    grip <= selectedClass.route.max_grip &&
    validTime &&
    (!selectedEntry.attempt_id || draft.reason.trim().length > 0);
  const output = useMemo(
    () => (selectedEntry ? resultLabel(selectedEntry) : ""),
    [selectedEntry],
  );
  async function login() {
    if (!season || busy) return;
    setBusy(true);
    setError("");
    try {
      await reload(code.trim(), station);
      setNotice("Station verbunden.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Stationszugang fehlgeschlagen.",
      );
    } finally {
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
      busy
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await submitFinalAttempt({
        season,
        station,
        code: activeCode,
        entry: selectedEntry.entry_id,
        request: draft.request,
        grip,
        top: draft.top,
        seconds: totalSeconds,
        version: selectedClass.version,
        reason: draft.reason,
      });
      await reload(activeCode, station);
      setDraft(empty());
      setConfirming(false);
      try {
        localStorage.removeItem(draftKey(season, station));
      } catch {
        /* memory cleared */
      }
      setNotice("Ergebnis gespeichert und im vorläufigen Live-Stand sichtbar.");
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : "Übertragung fehlgeschlagen."} Entwurf nicht übertragen oder Bestätigung unklar: aktuellen Stand prüfen, dann bewusst erneut senden.`,
      );
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="stitch-kicker text-[#a15523]">
            Finale · {season ?? "–"}
          </p>
          <h1 className="stitch-headline text-3xl">Digitale Ergebniseingabe</h1>
        </div>
        <StitchButton asChild variant="outline">
          <Link to="/app/schiedsrichter">QR-Codes & Uhren</Link>
        </StitchButton>
      </div>
      {settingsLoading && <p role="status">Saison wird geladen …</p>}
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
      {!activeCode ? (
        <StitchCard className="space-y-4 p-5">
          <p>
            Gib den eigenen Code deiner Zeitnahmestation ein. Die Papierliste
            bleibt für den Abgleich maßgeblich.
          </p>
          <Select
            value={String(station)}
            onValueChange={(v) => {
              setStation(Number(v) as 1 | 2);
            }}
          >
            <SelectTrigger className="min-h-12 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Station 1</SelectItem>
              <SelectItem value="2">Station 2</SelectItem>
            </SelectContent>
          </Select>
          <StitchTextField
            label="Stationscode"
            type="password"
            autoComplete="off"
            maxLength={24}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <StitchButton
            disabled={busy || code.trim().length !== 24}
            onClick={() => void login()}
          >
            Station öffnen
          </StitchButton>
        </StitchCard>
      ) : (
        <>
          <StitchCard
            tone="navy"
            className="flex flex-wrap items-center justify-between gap-3 p-5 text-[#f2dcab]"
          >
            <div>
              <h2 className="stitch-headline text-xl">Station {station}</h2>
              <p className="text-sm">
                Manuelle Übernahme der gestoppten Zeit in ganzen Sekunden ·
                maximal 5:00
              </p>
            </div>
            <StitchButton
              variant="outline"
              onClick={() => {
                if (season) sessionStorage.removeItem(accessKey(season));
                setActiveCode("");
                setClasses([]);
                setCode("");
              }}
            >
              Station verlassen
            </StitchButton>
          </StitchCard>
          <StitchCard className="space-y-5 p-5">
            <div>
              <label className="mb-2 block font-bold">1. Klasse wählen</label>
              <Select
                value={draft.classId}
                onValueChange={(v) => {
                  setConfirming(false);
                  updateDraft({
                    classId: v,
                    entryId: "",
                    grip: "",
                    top: false,
                    minutes: "",
                    seconds: "",
                    reason: "",
                  });
                }}
              >
                <SelectTrigger className="min-h-12 bg-white">
                  <SelectValue placeholder="Klasse wählen" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {className(c.league, c.class_label)} · Route{" "}
                      {c.route.number} ·{" "}
                      {c.phase === "running" ? "Eingabe offen" : "Geschlossen"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <>
                <p className="rounded-lg bg-[#f2dcab] p-3 text-sm">
                  Route {selectedClass.route.number}: {selectedClass.route.name}{" "}
                  · letzter Griff {selectedClass.route.max_grip}. Klasse:{" "}
                  {selectedClass.phase === "running"
                    ? "Eingabe offen"
                    : "Eingabe geschlossen"}
                  .
                </p>
                <div>
                  <label className="mb-2 block font-bold">
                    2. Person aus Startliste wählen
                  </label>
                  <Select
                    value={draft.entryId}
                    onValueChange={(v) => {
                      setConfirming(false);
                      updateDraft({
                        entryId: v,
                        grip: "",
                        top: false,
                        minutes: "",
                        seconds: "",
                        reason: "",
                      });
                    }}
                  >
                    <SelectTrigger className="min-h-12 bg-white">
                      <SelectValue placeholder="Person wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...selectedClass.entries]
                        .sort((a, b) => a.start_position - b.start_position)
                        .map((e) => (
                          <SelectItem key={e.entry_id} value={e.entry_id}>
                            {e.start_position}. {e.name} · {resultLabel(e)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selectedEntry && (
              <>
                <p className="text-sm">
                  Aktuell gespeichert: <strong>{output}</strong>.{" "}
                  {selectedEntry.attempt_id &&
                    "Eine Änderung benötigt eine Begründung."}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex items-center gap-2 rounded-xl bg-white p-3 font-bold">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#003d55]"
                      checked={draft.top}
                      onChange={(e) => updateDraft({ top: e.target.checked })}
                    />
                    TOP erreicht
                  </label>
                  <label className="grid gap-1 font-bold">
                    3. Erreichter Griff
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      max={selectedClass?.route.max_grip}
                      disabled={draft.top}
                      value={
                        draft.top ? selectedClass?.route.max_grip : draft.grip
                      }
                      onChange={(e) => updateDraft({ grip: e.target.value })}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 font-bold">
                    4. Minuten
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      max="5"
                      value={draft.minutes}
                      onChange={(e) => updateDraft({ minutes: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 font-bold">
                    Sekunden
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      max="59"
                      value={draft.seconds}
                      onChange={(e) => updateDraft({ seconds: e.target.value })}
                    />
                  </label>
                </div>
                {selectedEntry.attempt_id && (
                  <StitchTextField
                    label="Grund für die Korrektur"
                    value={draft.reason}
                    onChange={(e) => updateDraft({ reason: e.target.value })}
                  />
                )}
                {!confirming ? (
                  <StitchButton
                    disabled={!canSubmit || busy}
                    onClick={() => setConfirming(true)}
                  >
                    5. Eintrag prüfen
                  </StitchButton>
                ) : (
                  <div className="rounded-xl border-2 border-[#a15523] bg-white p-4">
                    <h3 className="stitch-headline text-xl">
                      Vor dem Speichern vergleichen
                    </h3>
                    <p className="my-3 text-lg font-bold">
                      {selectedEntry.name} ·{" "}
                      {draft.top ? "TOP" : `Griff ${grip}`} · {draft.minutes}:
                      {String(draft.seconds).padStart(2, "0")}
                    </p>
                    <p className="mb-3 text-sm">
                      Bitte mit der Papierliste abgleichen. Erst „Jetzt
                      speichern“ veröffentlicht den vorläufigen Wert.
                    </p>
                    <div className="flex gap-2">
                      <StitchButton
                        disabled={busy}
                        onClick={() => void submit()}
                      >
                        {busy ? "Wird gespeichert …" : "Jetzt speichern"}
                      </StitchButton>
                      <StitchButton
                        variant="outline"
                        disabled={busy}
                        onClick={() => setConfirming(false)}
                      >
                        Zurück
                      </StitchButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </StitchCard>
        </>
      )}
    </div>
  );
}
