import type {
  FinalClass,
  LiveClass,
  LiveNotice,
  PublicFinalEntry,
} from "@/services/competitionFinal";

export const finalPhaseLabels = {
  preparation: "Vorbereitung",
  published: "Startliste freigegeben",
  running: "Finale läuft",
  review: "Papierprüfung",
  final: "Offiziell",
} as const;

export const isFinalEntry = (
  row: LiveClass["entries"][number],
): row is PublicFinalEntry => "has_result" in row;
export const activeNotices = (
  notices: LiveNotice[],
  target: "tv" | "app",
  time = Date.now(),
) =>
  notices.filter(
    (notice) =>
      !notice.withdrawn_at &&
      notice[`show_${target}`] &&
      (!notice.expires_at || Date.parse(notice.expires_at) > time),
  );

export function liveFrames(
  classes: LiveClass[],
  keys: string[],
  pinned: string | null,
  pageSize = 8,
) {
  const selected = classes.filter(
    (item) => !keys.length || keys.includes(item.key),
  );
  const visible = selected.some((item) => item.key === pinned)
    ? selected.filter((item) => item.key === pinned)
    : selected;
  return visible.flatMap((item) =>
    Array.from(
      { length: Math.max(1, Math.ceil(item.entries.length / pageSize)) },
      (_, page) => ({
        key: `${item.key}:${page}`,
        classKey: item.key,
        page,
      }),
    ),
  );
}

export function classNextStep(
  item: Pick<FinalClass, "phase" | "stale" | "entries"> | undefined,
  missing: number,
  semifinalPhase: string,
) {
  const started = item && ["running", "review", "final"].includes(item.phase);
  if (!started && semifinalPhase !== "closed")
    return {
      tab: "semifinal",
      title:
        semifinalPhase === "open"
          ? "Halbfinale live verfolgen"
          : "Halbfinale vorbereiten",
      detail:
        semifinalPhase === "open"
          ? "QR-bestätigte Ergebnisse erscheinen automatisch. Fehlende Routeneinträge im Blick behalten."
          : "Routen und Klassen zuordnen, anschließend die Halbfinaleingabe öffnen.",
    };
  if (!started && missing > 0)
    return {
      tab: "semifinal",
      title: `${missing} ${missing === 1 ? "Routeneintrag" : "Routeneinträge"} klären`,
      detail:
        "Papierwerte nachtragen oder ausdrücklich als nicht geklettert dokumentieren.",
    };
  if (!item || item.phase === "preparation")
    return {
      tab: "roster",
      title: "Finalfeld bestätigen",
      detail:
        "Qualifizierte, Route und Station prüfen. Danach die Startliste drucken.",
    };
  if (item.stale && item.phase === "published")
    return {
      tab: "roster",
      title: "Startliste erneut prüfen",
      detail:
        "Das Halbfinale wurde korrigiert. Finalfeld bestätigen und neu drucken.",
    };
  if (item.phase === "published")
    return {
      tab: "final",
      title: "Finalklasse starten",
      detail: "Aktuelle Ausdrucke verteilen und Zeitnahme bereitstellen.",
    };
  if (item.phase === "running")
    return {
      tab: "final",
      title: "Finalergebnisse begleiten",
      detail: item.stale
        ? "Halbfinalkorrektur prüfen; das gestartete Finalfeld bleibt bestehen. Eingaben und Ausfälle begleiten."
        : "Eingaben und Ausfälle prüfen. Nach dem letzten Start Eingabe schließen.",
    };
  if (item.phase === "review") {
    const pending = item.entries.filter(
      (entry) =>
        entry.status === "incident" ||
        (entry.status === "ready" && (!entry.attempt_id || !entry.checked_at)),
    ).length;
    return {
      tab: "final",
      title: pending
        ? `${pending} Einträge prüfen`
        : "Wertung offiziell freigeben",
      detail: pending
        ? "Alle Papierwerte abgleichen und offene Ergebnisse oder Ausfälle klären."
        : "Der Papierabgleich ist vollständig. Ergebnisliste endgültig freigeben.",
    };
  }
  return {
    tab: "final",
    title: "Offizielle Ergebnisliste",
    detail:
      "Die Klasse ist abgeschlossen. Ergebnisliste drucken oder als CSV exportieren.",
  };
}
