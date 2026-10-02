import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
  StitchButton,
  StitchTextField,
} from "@/app/components/StitchPrimitives";
import {
  classKey,
  className,
  type FinalAdmin,
  type SemifinalRow,
} from "@/services/competitionFinal";
import type {
  CompetitionAdminData,
  CompetitionPhase,
} from "@/services/competitionDay";
import { formatCompetitionDeadline } from "@/lib/competitionDeadline";

export interface SemifinalEdit {
  kind: "result" | "not-climbed";
  profileId: string;
  routeId: string;
  resultId?: string;
  expected?: { zone: number; points: number; changedAt: string | null };
  zone: number;
  reason: string;
}

const gripLabel = (zone: number) =>
  zone === 0 ? "Kein Griff · 0 Punkte" : `Griff ${zone * 10}`;
const timestamp = (value: string) =>
  new Date(value).toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  });
const control =
  "min-h-11 rounded-lg border border-[#003d55]/20 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523]";

export default function SemifinalAdminRanking({
  data,
  admin,
  phase,
  busy,
  updated,
  onSave,
  errorMessage,
}: {
  data: FinalAdmin;
  admin: CompetitionAdminData | null;
  phase: CompetitionPhase;
  busy: boolean;
  updated: Date | null;
  onSave: (edit: SemifinalEdit) => Promise<boolean>;
  errorMessage?: string;
}) {
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState<number | null>(null);
  const [zone, setZone] = useState("");
  const [reason, setReason] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState("");
  const [editingSnapshot, setEditingSnapshot] = useState("");
  const classes = useMemo(
    () =>
      [
        ...new Map(
          data.semifinal.map((row) => [
            classKey(row.league, row.class_label),
            className(row.league, row.class_label),
          ]),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1], "de")),
    [data.semifinal],
  );
  const visible = data.semifinal
    .filter(
      (row) =>
        (classFilter === "all" ||
          classKey(row.league, row.class_label) === classFilter) &&
        row.name
          .toLocaleLowerCase("de")
          .includes(search.trim().toLocaleLowerCase("de")) &&
        (!onlyOpen || row.missing.some((m) => !m.settled)),
    )
    .sort(
      (a, b) =>
        classKey(a.league, a.class_label).localeCompare(
          classKey(b.league, b.class_label),
          "de",
        ) ||
        a.rank - b.rank ||
        a.name.localeCompare(b.name, "de"),
    );
  const participant = data.semifinal.find((row) => row.profile_id === selected);
  const routes = participant
    ? (admin?.config.assignments.find(
        (item) =>
          item.league === participant.league &&
          item.class_label === participant.class_label,
      )?.route_numbers ?? [])
    : [];
  const participantResults = (data.semifinal_results ?? []).filter(
    (result) => result.profile_id === selected,
  );
  const changes = [...(data.semifinal_audit ?? []), ...data.audit]
    .filter(
      (item) =>
        participantResults.some((result) => item.result_id === result.id) ||
        (item.after_data &&
          typeof item.after_data === "object" &&
          "profile_id" in item.after_data &&
          item.after_data.profile_id === selected),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  function routeSnapshot(number: number) {
    const result = participantResults.find(
      (item) => item.route_number === number,
    );
    return JSON.stringify(
      result
        ? [
            result.id,
            result.zone,
            result.points,
            changes.find((item) => item.result_id === result.id)?.created_at ??
              null,
          ]
        : [
            "missing",
            participant?.missing.find((item) => item.number === number)
              ?.settled ?? false,
          ],
    );
  }
  const stale =
    editingRoute !== null && routeSnapshot(editingRoute) !== editingSnapshot;
  const canSave =
    !busy &&
    !stale &&
    phase !== "draft" &&
    zone !== "" &&
    reason.trim().length > 0 &&
    reason.length <= 500;

  function openParticipant(row: SemifinalRow) {
    setSelected(row.profile_id);
    setEditingRoute(null);
    setSaved("");
    setSaveError("");
  }
  async function save(kind: SemifinalEdit["kind"]) {
    if (
      !participant ||
      editingRoute === null ||
      busy ||
      stale ||
      phase === "draft" ||
      !reason.trim() ||
      reason.length > 500 ||
      (kind === "result" && zone === "")
    )
      return;
    const result = participantResults.find(
      (result) => result.route_number === editingRoute,
    );
    const routeId = participant.missing.find(
      (route) => route.number === editingRoute,
    )?.route_id;
    if (!routeId && !result) {
      setSaveError("Die Route ist nicht verfügbar. Bitte aktualisieren.");
      return;
    }
    setSaveError("");
    const success = await onSave({
      kind,
      profileId: participant.profile_id,
      routeId: routeId ?? "",
      resultId: result?.id,
      expected: result
        ? {
            zone: result.zone,
            points: result.points,
            changedAt:
              changes.find((item) => item.result_id === result.id)
                ?.created_at ?? null,
          }
        : undefined,
      zone: kind === "result" ? Number(zone) : 0,
      reason: reason.trim(),
    });
    if (success) {
      setEditingRoute(null);
      setSaved(`Route ${editingRoute} gespeichert.`);
    } else
      setSaveError(
        "Nicht gespeichert. Bitte erneut versuchen.",
      );
  }

  return (
    <section className="space-y-4" aria-label="Halbfinalverwaltung">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">Halbfinale</h2>
        <p className="text-xs text-[#003d55]/70">
          {phase === "closed"
            ? "Eingabe geschlossen"
            : phase === "open"
              ? "Eingabe offen"
              : "Vorbereitung"}
          {phase === "open" &&
            data.submission_deadline_at &&
            ` · Sperre ${formatCompetitionDeadline(data.submission_deadline_at)} Uhr`}
          {updated &&
            ` · Stand ${updated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)_auto]">
        <label
          className={`${control} flex items-center gap-2 px-3 focus-within:ring-2 focus-within:ring-[#a15523]`}
        >
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Teilnehmer suchen"
            placeholder="Teilnehmer suchen"
            className="min-w-0 flex-1 bg-transparent py-3 outline-none"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger
            aria-label="Halbfinalklasse filtern"
            className={control}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Klassen</SelectItem>
            {classes.map(([key, name]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-pressed={onlyOpen}
          onClick={() => setOnlyOpen(!onlyOpen)}
          className={`${control} px-4 ${onlyOpen ? "border-[#003d55] bg-[#003d55] text-white" : "hover:bg-[#f7f3e9]"}`}
        >
          Offene Ergebnisse
        </button>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-[#003d55]/15 bg-white"
        role="region"
        aria-label="Halbfinalrangliste"
      >
        <div className="grid grid-cols-[2rem_1fr_auto_1rem] gap-3 border-b border-[#003d55]/15 bg-[#f7f3e9] px-4 py-3 text-xs text-[#003d55]/70">
          <span>Platz</span>
          <span>Teilnehmer</span>
          <span>Punkte</span>
          <span />
        </div>
        {visible.map((row) => (
          <button
            type="button"
            key={row.profile_id}
            onClick={() => openParticipant(row)}
            aria-label={`${row.name}: ${row.points} Punkte, Ergebnisse bearbeiten`}
            className="grid min-h-16 w-full grid-cols-[2rem_minmax(0,1fr)_auto_1rem] items-center gap-3 border-b border-[#003d55]/10 px-4 py-3 text-left last:border-b-0 hover:bg-[#f7f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a15523]"
          >
            <span className="font-bold">{row.rank}.</span>
            <span className="min-w-0">
              <span className="block break-words font-semibold">
                {row.name}
              </span>
              <span className="mt-1 block text-xs text-[#003d55]/65">
                {classFilter === "all" &&
                  `${className(row.league, row.class_label)} · `}
                {row.missing.filter((m) => !m.settled).length
                  ? `${row.missing.filter((m) => !m.settled).length} offen`
                  : "Vollständig"}
                {row.excluded &&
                  ` · ${row.excluded === "dns" ? "Nicht erschienen" : "Zurückgezogen"}`}
              </span>
            </span>
            <span className="font-bold tabular-nums">{row.points}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ))}
        {!visible.length && (
          <p className="p-6 text-sm">
            {data.semifinal.length
              ? "Keine Teilnehmer für diese Auswahl."
              : "Noch keine Teilnehmer vorhanden."}
          </p>
        )}
      </div>
      <Dialog
        open={Boolean(participant)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent
          hideCloseButton
          className="max-h-[90dvh] space-y-4 bg-white p-5 text-[#003d55] sm:w-[calc(100%-2rem)] sm:max-w-xl sm:space-y-0 sm:overflow-y-auto"
        >
          <DialogClose
            disabled={busy}
            aria-label="Schließen"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#f7f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a15523] disabled:opacity-50"
          >
            <X size={20} />
          </DialogClose>
          <DialogTitle>{participant?.name}</DialogTitle>
          <DialogDescription>
            {participant &&
              `${className(participant.league, participant.class_label)} · Platz ${participant.rank} · ${participant.points} Punkte`}
          </DialogDescription>
          {saved && (
            <p role="status" className="text-sm text-emerald-800">
              {saved}
            </p>
          )}
          <div className="space-y-2">
            {routes.map((number) => {
              const result = participantResults.find(
                (item) => item.route_number === number,
              );
              const missing = participant?.missing.find(
                (item) => item.number === number,
              );
              const lastCorrection = changes.find(
                (item) =>
                  result &&
                  item.result_id === result.id &&
                  item.before_data &&
                  typeof item.before_data === "object" &&
                  "zone" in item.before_data,
              );
              return (
                <div
                  key={number}
                  className="rounded-lg border border-[#003d55]/15 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Route {number}</h3>
                      <p
                        className={`mt-1 text-sm ${!result && !missing?.settled ? "text-[#a15523]" : ""}`}
                      >
                        {result
                          ? `${gripLabel(result.zone)}${result.zone !== 0 ? ` · ${result.points} Punkte` : ""}`
                          : missing?.settled
                            ? "Nicht geklettert · 0 Punkte"
                            : "Offen"}
                      </p>
                      {result && (
                        <p className="mt-1 text-xs text-[#003d55]/65">
                          Eingetragen {timestamp(result.created_at)}
                          {lastCorrection &&
                            ` · Korrigiert ${timestamp(lastCorrection.created_at)}`}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busy || phase === "draft"}
                      onClick={() => {
                        setEditingRoute(number);
                        setEditingSnapshot(routeSnapshot(number));
                        setZone(result ? String(result.zone) : "");
                        setReason("");
                        setSaveError("");
                        setSaved("");
                      }}
                      className={`${control} shrink-0 px-3 disabled:opacity-50`}
                      aria-label={`Route ${number}: ${result ? "Ändern" : "Eintragen"}`}
                    >
                      {result ? "Ändern" : "Eintragen"}
                    </button>
                  </div>
                  {editingRoute === number && (
                    <div className="mt-4 space-y-3 border-t border-[#003d55]/10 pt-3">
                      <Select value={zone} onValueChange={setZone}>
                        <SelectTrigger
                          className={control}
                          aria-label={`Route ${number}: Griff wählen`}
                        >
                          <SelectValue placeholder="Griff wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 11 }, (_, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {gripLabel(index)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <StitchTextField
                        label="Begründung"
                        value={reason}
                        maxLength={500}
                        onChange={(event) => setReason(event.target.value)}
                      />
                      {stale && (
                        <p role="alert" className="text-sm text-red-800">
                          Ergebnis wurde inzwischen geändert.{" "}
                          <button
                            type="button"
                            className="underline"
                            onClick={() => {
                              setEditingSnapshot(routeSnapshot(number));
                              setZone(result ? String(result.zone) : "");
                            }}
                          >
                            Aktuellen Wert laden
                          </button>
                        </p>
                      )}
                      {saveError && (
                        <p role="alert" className="text-sm text-red-800">
                          {errorMessage || saveError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <StitchButton
                          size="sm"
                          className="normal-case tracking-normal shadow-none"
                          disabled={!canSave}
                          onClick={() => void save("result")}
                        >
                          Speichern
                        </StitchButton>
                        {!result && (
                          <StitchButton
                            size="sm"
                            variant="outline"
                            className="normal-case tracking-normal"
                            disabled={
                              busy ||
                              stale ||
                              phase === "draft" ||
                              !reason.trim() ||
                              reason.length > 500
                            }
                            onClick={() => void save("not-climbed")}
                          >
                            Nicht geklettert
                          </StitchButton>
                        )}
                        <StitchButton
                          size="sm"
                          variant="ghost"
                          className="normal-case tracking-normal"
                          disabled={busy}
                          onClick={() => setEditingRoute(null)}
                        >
                          Abbrechen
                        </StitchButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!routes.length && (
              <p className="text-sm">
                Die Routenzuordnung ist noch nicht verfügbar.
              </p>
            )}
          </div>
          {!!changes.length && (
            <details className="border-t border-[#003d55]/15 pt-3">
              <summary className="cursor-pointer py-2 text-sm font-semibold">
                Änderungsverlauf
              </summary>
              <div className="space-y-3 pt-2">
                {changes.map((item, index) => (
                  <div key={`${item.created_at}-${index}`} className="text-xs">
                    <p className="font-semibold">
                      {timestamp(item.created_at)} ·{" "}
                      {item.actor ?? "Administration"}
                    </p>
                    {item.before_data &&
                      typeof item.before_data === "object" &&
                      "zone" in item.before_data && (
                        <p>
                          {gripLabel(Number(item.before_data.zone))} →{" "}
                          {item.after_data &&
                          typeof item.after_data === "object" &&
                          "zone" in item.after_data
                            ? gripLabel(Number(item.after_data.zone))
                            : "–"}
                        </p>
                      )}
                    <p className="mt-1">{item.reason}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
