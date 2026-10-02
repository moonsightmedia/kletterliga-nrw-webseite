import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CompetitionButton,
  CompetitionDialogContent,
  CompetitionField,
  competitionHeading,
  type CompetitionAction,
} from "./CompetitionAdminPanels";
import {
  classKey,
  className,
  type DisplaySettings,
  type FinalAdmin,
  type LiveNotice,
} from "@/services/competitionFinal";
import type { CompetitionCenterSource } from "@/app/pages/admin/CompetitionCenter";

const defaults: DisplaySettings = {
  phase: "semifinal",
  class_keys: [],
  pinned_key: null,
  interval_seconds: 15,
};
const panel = "rounded-xl border border-[#003d55]/15 bg-white p-4 sm:p-5";
const noticeDraft = () => ({
  title: "",
  body: "",
  show_app: true,
  show_tv: true,
  fullscreen: false,
});
export default function CompetitionDisplayPanel({
  data,
  season,
  busy,
  error,
  source,
  run,
  tvHref,
  clock,
}: {
  data: FinalAdmin;
  season: string;
  busy: boolean;
  error: string;
  source: CompetitionCenterSource;
  run: CompetitionAction;
  tvHref: string;
  clock: number;
}) {
  const saved = data.display ?? defaults;
  const savedKey = JSON.stringify(saved);
  const [display, setDisplay] = useState<DisplaySettings>(saved);
  const baseline = useRef(savedKey);
  const accepted = useRef<{ previous: string; next: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LiveNotice | null>(null);
  const [draft, setDraft] = useState(noticeDraft);
  const [duration, setDuration] = useState("10");
  const [failed, setFailed] = useState(false);
  const [discard, setDiscard] = useState(false);
  const classes = [
    ...new Map(
      data.semifinal.map((row) => [
        classKey(row.league, row.class_label),
        {
          key: classKey(row.league, row.class_label),
          league: row.league,
          label: row.class_label,
        },
      ]),
    ).values(),
  ];
  const allKeys = classes.map((row) => row.key);
  const eligible =
    display.phase === "final"
      ? classes.filter((row) =>
          data.classes.some(
            (c) =>
              classKey(c.league, c.class_label) === row.key &&
              c.phase !== "preparation",
          ),
        )
      : classes;
  const eligibleKeys = eligible.map((row) => row.key);
  const keys = display.class_keys.length ? display.class_keys : allKeys;
  const visibleKeys = keys.filter((key) => eligibleKeys.includes(key));
  const changedElsewhere = dirty && baseline.current !== savedKey;
  useEffect(() => {
    if (!dirty) {
      if (
        accepted.current &&
        savedKey === accepted.current.previous &&
        savedKey !== accepted.current.next
      )
        return;
      accepted.current = null;
      setDisplay(data.display ?? defaults);
      baseline.current = savedKey;
    }
  }, [data.display, savedKey, dirty]);
  const update = (next: DisplaySettings) => {
    setDisplay(next);
    setDirty(true);
  };
  const reset = () => {
    setDisplay(saved);
    baseline.current = savedKey;
    setDirty(false);
  };
  const active = data.notices.filter(
    (n) =>
      !n.withdrawn_at && (!n.expires_at || Date.parse(n.expires_at) > clock),
  );
  const expired = data.notices.filter(
    (n) => !n.withdrawn_at && n.expires_at && Date.parse(n.expires_at) <= clock,
  );
  const edit = (notice: LiveNotice | null) => {
    setEditing(notice);
    setDraft(
      notice
        ? {
            title: notice.title,
            body: notice.body,
            show_app: notice.show_app,
            show_tv: notice.show_tv,
            fullscreen: notice.fullscreen,
          }
        : noticeDraft(),
    );
    setDuration(notice ? "existing" : "10");
    setFailed(false);
    setDiscard(false);
    setOpen(true);
  };
  const noticeDirty = editing
    ? JSON.stringify(draft) !==
        JSON.stringify({
          title: editing.title,
          body: editing.body,
          show_app: editing.show_app,
          show_tv: editing.show_tv,
          fullscreen: editing.fullscreen,
        }) || duration !== "existing"
    : Boolean(draft.title || draft.body);
  const noticeRow = (n: LiveNotice, isExpired: boolean) => (
    <li
      key={n.id}
      className="flex min-w-0 flex-col items-start justify-between gap-3 py-4 sm:flex-row"
    >
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold">{n.title}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{n.body}</p>
        <p className="mt-2 text-xs text-[#003d55]/70">
          {isExpired && "Abgelaufen · "}
          {[
            n.show_app && "App",
            n.show_tv && (n.fullscreen ? "TV Vollbild" : "TV"),
          ]
            .filter(Boolean)
            .join(" + ")}{" "}
          ·{" "}
          {n.expires_at
            ? `bis ${new Date(n.expires_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}`
            : "bis zur Rücknahme"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CompetitionButton
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => edit(n)}
        >
          Bearbeiten
        </CompetitionButton>
        <CompetitionButton
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(
              () => source.saveLiveNotice(season, { ...n, withdrawn: true }),
              "Hinweis zurückgezogen.",
            )
          }
        >
          Zurückziehen
        </CompetitionButton>
      </div>
    </li>
  );
  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={competitionHeading}>Fernsehanzeige</h2>
            <p className="mt-1 text-sm text-[#003d55]/70">
              Öffentliche URL · keine Anmeldung nötig
            </p>
            <Link
              target="_blank"
              rel="noreferrer"
              className="mt-2 block break-all text-sm underline underline-offset-4"
              to={tvHref}
            >
              {window.location.origin}
              {tvHref}
            </Link>
          </div>
          <CompetitionButton asChild variant="outline">
            <Link target="_blank" rel="noreferrer" to={tvHref}>
              <ExternalLink size={16} />
              TV öffnen
            </Link>
          </CompetitionButton>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Ergebnisse
            <Select
              value={display.phase}
              disabled={busy}
              onValueChange={(value) =>
                update({ ...display, phase: value as DisplaySettings["phase"] })
              }
            >
              <SelectTrigger aria-label="TV-Phase" className="min-h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semifinal">Halbfinale</SelectItem>
                <SelectItem value="final">Finale</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Anzeige
            <Select
              value={display.pinned_key ?? "auto"}
              disabled={busy}
              onValueChange={(value) =>
                update({
                  ...display,
                  pinned_key: value === "auto" ? null : value,
                })
              }
            >
              <SelectTrigger
                aria-label="Fixierte TV-Klasse"
                className="min-h-12"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Klassen automatisch wechseln
                </SelectItem>
                {classes
                  .filter((row) => keys.includes(row.key))
                  .map((row) => (
                    <SelectItem key={row.key} value={row.key}>
                      {className(row.league, row.label)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">Klassen</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {classes.map((row) => (
              <label
                key={row.key}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#003d55]/15 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-[#003d55]"
                  checked={keys.includes(row.key)}
                  disabled={
                    busy || (keys.length === 1 && keys.includes(row.key))
                  }
                  onChange={(event) => {
                    const nextKeys = event.target.checked
                      ? [...new Set([...keys, row.key])]
                      : keys.filter((key) => key !== row.key);
                    update({
                      ...display,
                      class_keys: nextKeys,
                      pinned_key: nextKeys.includes(display.pinned_key ?? "")
                        ? display.pinned_key
                        : null,
                    });
                  }}
                />
                <span className="min-w-0 break-words">
                  {className(row.league, row.label)}
                  {display.phase === "final" &&
                    !eligibleKeys.includes(row.key) && (
                      <span className="mt-1 block text-xs text-[#003d55]/65">
                        Startliste noch nicht freigegeben
                      </span>
                    )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-sm font-semibold">
            Seitenwechsel (Sekunden)
            <input
              type="number"
              min={5}
              max={120}
              value={display.interval_seconds}
              disabled={busy}
              className="min-h-11 w-28 rounded-xl border border-[#003d55]/25 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
              onChange={(event) =>
                update({
                  ...display,
                  interval_seconds: Number(event.target.value),
                })
              }
            />
          </label>
          <p className="max-w-sm pb-2 text-xs leading-5 text-[#003d55]/70">
            Lange Listen laufen seitenweise durch.{" "}
            {display.pinned_key
              ? "Die gewählte Klasse bleibt auf dem Bildschirm."
              : "Danach folgt die nächste Klasse."}
          </p>
        </div>
        {visibleKeys.length === 0 && (
          <p role="status" className="mt-3 text-sm text-[#a15523]">
            Noch keine freigegebene Klasse für diese Anzeige. Der TV zeigt bis
            dahin „Wettkampfergebnisse folgen“.
          </p>
        )}
        {display.pinned_key && !visibleKeys.includes(display.pinned_key) && (
          <p role="alert" className="mt-3 text-sm text-[#a15523]">
            Die fixierte Klasse ist noch nicht verfügbar. Bis zur Freigabe
            wechseln die verfügbaren Klassen.
          </p>
        )}
        {changedElsewhere && (
          <p role="alert" className="mt-3 text-sm text-[#a15523]">
            Die Anzeige wurde inzwischen geändert. Aktuellen Stand übernehmen
            und Einstellungen erneut prüfen.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#003d55]/15 pt-4">
          <CompetitionButton
            disabled={
              busy ||
              !dirty ||
              changedElsewhere ||
              !Number.isInteger(display.interval_seconds) ||
              display.interval_seconds < 5 ||
              display.interval_seconds > 120
            }
            onClick={() =>
              void run(
                () => source.setLiveDisplay(season, display),
                "Fernsehanzeige gespeichert.",
              ).then((ok) => {
                if (ok) {
                  accepted.current = {
                    previous: baseline.current,
                    next: JSON.stringify(display),
                  };
                  baseline.current = JSON.stringify(display);
                  setDirty(false);
                }
              })
            }
          >
            Anzeige speichern
          </CompetitionButton>
          {dirty && (
            <CompetitionButton
              variant="outline"
              disabled={busy}
              onClick={reset}
            >
              {changedElsewhere
                ? "Aktuellen Stand übernehmen"
                : "Änderungen verwerfen"}
            </CompetitionButton>
          )}
          <span className="text-xs text-[#003d55]/70">
            {dirty ? "Nicht gespeichert" : "Gespeicherter Stand"}
          </span>
        </div>
      </section>
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={competitionHeading}>Hinweise</h2>
          <CompetitionButton disabled={busy} onClick={() => edit(null)}>
            <Plus size={16} />
            Neuer Hinweis
          </CompetitionButton>
        </div>
        {active.length ? (
          <ul className="mt-2 divide-y divide-[#003d55]/15">
            {active.map((n) => noticeRow(n, false))}
          </ul>
        ) : (
          <p className="py-5 text-sm text-[#003d55]/70">
            Kein aktiver Hinweis.
          </p>
        )}
        {expired.length > 0 && (
          <details className="border-t border-[#003d55]/15 pt-3">
            <summary className="cursor-pointer py-1 text-sm font-semibold">
              Abgelaufene Hinweise ({expired.length})
            </summary>
            <ul className="divide-y divide-[#003d55]/15">
              {expired.map((n) => noticeRow(n, true))}
            </ul>
          </details>
        )}
      </section>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (value || busy) return;
          if (noticeDirty) setDiscard(true);
          else setOpen(false);
        }}
      >
        <CompetitionDialogContent busy={busy}>
          <DialogHeader className="px-0 pt-0 text-left">
            <DialogTitle className={competitionHeading}>
              {editing ? "Hinweis bearbeiten" : "Neuer Hinweis"}
            </DialogTitle>
            <DialogDescription>
              Für App, Fernseher oder beide veröffentlichen.
            </DialogDescription>
          </DialogHeader>
          <CompetitionField
            label="Titel"
            maxLength={100}
            disabled={busy}
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
          />
          <label className="grid gap-2 text-sm font-semibold">
            Text
            <textarea
              maxLength={500}
              disabled={busy}
              className="min-h-28 rounded-xl border border-[#003d55]/25 bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]"
              value={draft.body}
              onChange={(event) =>
                setDraft({ ...draft, body: event.target.value })
              }
            />
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            {(["app", "tv"] as const).map((target) => (
              <label key={target} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  disabled={busy}
                  className="h-5 w-5 accent-[#003d55]"
                  checked={draft[`show_${target}`]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [`show_${target}`]: event.target.checked,
                      fullscreen:
                        target === "tv" && !event.target.checked
                          ? false
                          : draft.fullscreen,
                    })
                  }
                />
                {target === "tv" ? "TV" : "App"}
              </label>
            ))}
          </div>
          {draft.show_tv && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[#003d55]"
                disabled={busy}
                checked={draft.fullscreen}
                onChange={(event) =>
                  setDraft({ ...draft, fullscreen: event.target.checked })
                }
              />
              TV bildschirmfüllend
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold">
            Automatisch ausblenden
            <Select
              value={duration}
              disabled={busy}
              onValueChange={setDuration}
            >
              <SelectTrigger
                aria-label="Hinweis automatisch ausblenden"
                className="min-h-12"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editing && (
                  <SelectItem value="existing">
                    Bisherige Ablaufzeit behalten
                  </SelectItem>
                )}
                {[5, 10, 30, 60].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Nach {value} Minuten
                  </SelectItem>
                ))}
                <SelectItem value="0">Bis zur Rücknahme</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <p className="text-xs leading-5 text-[#003d55]/70">
            Nach Ablauf oder Rücknahme läuft die TV-Rangliste automatisch
            weiter.
          </p>
          {failed && (
            <p role="alert" className="text-sm text-red-800">
              {error || "Hinweis nicht gespeichert."}
            </p>
          )}
          {discard ? (
            <div className="space-y-3 rounded-lg bg-amber-50 p-3">
              <p className="text-sm font-semibold">
                Ungespeicherten Hinweis verwerfen?
              </p>
              <div className="flex flex-wrap gap-2">
                <CompetitionButton
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDiscard(false)}
                >
                  Weiter bearbeiten
                </CompetitionButton>
                <CompetitionButton
                  disabled={busy}
                  onClick={() => {
                    setDiscard(false);
                    setOpen(false);
                  }}
                >
                  Verwerfen
                </CompetitionButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              <CompetitionButton
                variant="outline"
                disabled={busy}
                onClick={() =>
                  noticeDirty ? setDiscard(true) : setOpen(false)
                }
              >
                Abbrechen
              </CompetitionButton>
              <CompetitionButton
                disabled={
                  busy ||
                  !draft.title.trim() ||
                  !draft.body.trim() ||
                  !(draft.show_app || draft.show_tv) ||
                  Boolean(
                    editing?.expires_at &&
                    duration === "existing" &&
                    Date.parse(editing.expires_at) <= clock,
                  )
                }
                onClick={() =>
                  void run(
                    () =>
                      source.saveLiveNotice(season, {
                        ...draft,
                        id: editing?.id,
                        expires_at:
                          duration === "existing"
                            ? (editing?.expires_at ?? null)
                            : Number(duration)
                              ? new Date(
                                  Date.now() + Number(duration) * 60000,
                                ).toISOString()
                              : null,
                      }),
                    editing
                      ? "Hinweis aktualisiert."
                      : "Hinweis veröffentlicht.",
                  ).then((ok) => {
                    if (ok) setOpen(false);
                    else setFailed(true);
                  })
                }
              >
                {busy
                  ? "Speichern …"
                  : editing
                    ? "Änderung speichern"
                    : "Hinweis veröffentlichen"}
              </CompetitionButton>
            </div>
          )}
          {editing?.expires_at &&
            duration === "existing" &&
            Date.parse(editing.expires_at) <= clock && (
              <p role="alert" className="text-sm text-[#a15523]">
                Die bisherige Ablaufzeit ist vorbei. Neue Dauer wählen, um den
                Hinweis wieder anzuzeigen.
              </p>
            )}
        </CompetitionDialogContent>
      </Dialog>
    </div>
  );
}
