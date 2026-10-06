import type { SeasonFeedbackEntry } from "@/services/seasonFeedbackApi";

export const feedbackPerspectives: Record<string, string> = {
  active: "Mitgeklettert", followed: "Liga gekannt, nicht mitgemacht",
  not_participated: "Spät entdeckt", spectator: "Zuschauende / Begleitung",
};
export const feedbackTopics: Record<string, string> = { routes: "Routen", halls: "Hallen & Wege", timing: "Zeitplan", scoring: "Wertung" };
export const feedbackNextYear: Record<string, string> = { yes: "Ja", maybe: "Vielleicht", no: "Eher nicht", unanswered: "Keine Angabe" };
type Answer = { label: string; value: string };
type Section = { title: string; answers: Answer[] };
const reasons: Record<string, string> = { time: "Zu wenig Zeit", travel: "Anreise / Entfernung", format: "Ablauf oder Regeln", routes: "Routen passten nicht", cost: "Kosten", registration: "Anmeldung / App funktionierte nicht", confidence: "Unsicherheit über das eigene Können", personal: "Persönliche Umstände", other: "Anderer Grund", date: "Termin passte nicht", cancelled: "Abgemeldet", awareness: "Zu spät erfahren", unaware: "Liga nicht gekannt", final_date: "Finaltermin", motivation: "Fehlende Motivation" };
const quantity: Record<string, string> = { more: "Mehr", same: "Anzahl passt", fewer: "Weniger", unsure: "Kann ich nicht beurteilen" };
const yesNo: Record<string, string> = { yes: "Ja", no: "Nein", unsure: "Unklar / noch offen" };
export const feedbackDate = (value: string | null, dateOnly = false) => value
  ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }) }).format(new Date(value))
  : "Noch keine";

export function feedbackPerspective(entry: SeasonFeedbackEntry) {
  if (entry.survey_version < 4) return { active: "Mitgeklettert", followed: "Liga verfolgt", not_participated: "Nicht teilgenommen" }[entry.participation] ?? entry.participation;
  return feedbackPerspectives[entry.participation] ?? entry.participation;
}
export function feedbackPreview(entry: SeasonFeedbackEntry) {
  const d = entry.details ?? {};
  for (const key of ["top_wish", "keep_aspect", "season_positive", "season_difficult", "spectator_note", "awareness_source", "barrier_detail", "non_participation_detail"]) {
    if (typeof d[key] === "string" && d[key].trim()) return d[key] as string;
  }
  return entry.comment?.trim() || "Auswahlantworten – vollständige Rückmeldung öffnen.";
}

/** Show original answers in question context; do not infer sentiment or identify respondents. */
export function feedbackSections(entry: SeasonFeedbackEntry): Section[] {
  const d = entry.details ?? {};
  const sections: Section[] = [];
  const add = (title: string, fields: [string, string, Record<string, string>?][]) => {
    const answers = fields.flatMap(([key, label, mapping]) => {
      const raw = d[key];
      if (Array.isArray(raw)) {
        const values = raw.filter((v): v is string => typeof v === "string" && Boolean(v.trim()));
        return values.length ? [{ label, value: values.map(v => mapping?.[v] ?? v).join(" · ") }] : [];
      }
      return typeof raw === "string" && raw.trim() ? [{ label, value: mapping?.[raw] ?? raw }] : [];
    });
    if (answers.length) sections.push({ title, answers });
  };
  if (entry.survey_version === 1) {
    sections.push({ title: "Saisonrückblick", answers: [
      ...(entry.overall_rating !== null ? [{ label: "Gesamtbewertung", value: `${entry.overall_rating} von 5` }] : []),
      ...(entry.best_aspect ? [{ label: "Was war besonders gut?", value: ({ halls: "Hallen", flexibility: "Flexibilität", ranking_app: "Rangliste / App", community: "Gemeinschaft", other: "Anderes" }[entry.best_aspect] ?? entry.best_aspect) }] : []),
      ...(entry.improve_aspect ? [{ label: "Was sollte besser werden?", value: ({ rules: "Regeln", communication: "Kommunikation", app: "App", halls_routes: "Hallen / Routen", nothing: "Nichts", other: "Anderes" }[entry.improve_aspect] ?? entry.improve_aspect) }] : []),
    ] });
  }
  add("Rückblick & Wunsch für 2027", [["top_wish", "Wichtigste Änderung / Wunsch für 2027"], ["keep_aspect", "Was sollte bleiben?"], ["season_positive", "Was war gut?"], ["season_difficult", "Was war schwierig?"], ["awareness_source", "Wie wurde die Liga entdeckt?"], ["spectator_note", "Blick von außen"]]);
  add("Saisonteilnahme", [["main_barrier", "Wichtigster Grund für Nichtteilnahme", reasons], ["barrier_detail", "Weitere Gründe / konkreter Auslöser"], ["non_participation_reasons", "Gründe für Nichtteilnahme", reasons], ["non_participation_detail", "Erläuterung"], ["registration_detail", "Was hat bei Anmeldung / App nicht funktioniert?"]]);
  add(entry.survey_version === 4 ? "Halbfinale am 3. Oktober" : "Finaltag", [["finale_eligibility", "Fürs Halbfinale startberechtigt?", yesNo], ["finale_attendance", "Teilnahme am Finaltag?", yesNo], ["finale_reason", "Wichtigster Grund für Nichtteilnahme", reasons], ["finale_reasons", "Gründe für Nichtteilnahme", reasons], ["finale_detail", "Erläuterung"]]);
  add("Routen", [["route_quantity", "Gewünschte Routenzahl", quantity], ["route_ideas", "Schwierigkeit, Stil & Auswahl"]]);
  add("Hallen & Wege", [["hall_pool", "Größe des Hallenpools", quantity], ["hall_visits", "Welche Hallen müssen besucht werden?", { all: "Alle teilnehmenden Hallen", choose: "Feste Anzahl aus größerem Hallenpool wählen", regions: "Regionale Hallengruppen wählen", unsure: "Kann ich nicht beurteilen" }], ["hall_quantity", "Gewünschte Hallenzahl", quantity], ["hall_choice", "Hallenauswahl", { more_choice: "Mehr Auswahl", same: "Passt", fixed_halls: "Feste Hallen", unsure: "Kann ich nicht beurteilen" }], ["hall_ideas", "Hallen, Regionen & Auswahlregeln"]]);
  add("Zeitplan", [["season_distribution", entry.survey_version === 4 ? "Zeit pro Hallenstation" : "Saisonverteilung", { more: "Mehr Zeit", same: "Passt", less: "Kürzere Stationen", spread: "Länger verteilen", compact: "Kompakter", unsure: "Kann ich nicht beurteilen" }], ["distribution_ideas", "Vorschlag zum Saisonablauf"]]);
  add("Wertung & Streichstationen", [["dropped_score", "Schwache Hallenwertung streichen?", { none: "Alle Hallenwertungen zählen", one: "Schwächste Hallenwertung streichen", multiple: "Mehr als eine Hallenwertung streichen", unsure: "Kann ich nicht beurteilen" }], ["scoring_ideas", "Begründung / andere Idee"], ["drop_stations", "Streichstationen (ältere Frage)", yesNo], ["drop_stations_ideas", "Idee zu Streichstationen"]]);
  if (entry.comment?.trim()) sections.push({ title: "Kommentar", answers: [{ label: "Freier Kommentar", value: entry.comment }] });
  return sections;
}
