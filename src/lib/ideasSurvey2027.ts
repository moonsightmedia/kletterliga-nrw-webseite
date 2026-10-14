import type { IdeasSurveyAnswers } from "../../supabase/functions/submit-ideas-survey-2027/validation";

export type SurveyField = keyof IdeasSurveyAnswers;
export type DraftAnswers = Partial<Record<Exclude<SurveyField, "league_changes">, string>> & { league_changes: string[] };
export type SurveyOption = { value: string; label: string; description?: string };
export type SurveyQuestion = {
  field: SurveyField;
  title: string;
  description?: string;
  options: SurveyOption[];
  multiple?: boolean;
  noteField?: "league_idea" | "weighting_idea";
  noteLabel?: string;
  when?: { field: SurveyField; value: string };
};
export type SurveyStep = { title: string; questions: SurveyQuestion[] };

const yesNo = (yes: string, no: string): SurveyOption[] => [
  { value: "yes", label: yes }, { value: "no", label: no },
  { value: "unsure", label: "Noch unentschieden" },
];

export const ideasSurveySteps: SurveyStep[] = [
  {
    title: "Digital & Papier",
    questions: [
      { field: "digitalization", title: "Findest du digitale Ergebnisse und Ranglisten gut?", options: yesNo("Ja, das finde ich gut", "Nein, das finde ich nicht gut") },
      { field: "paper_cards", title: "Papier-Scorecards in der Qualifikation behalten?", description: "Karten zum Notieren deiner Routenergebnisse – zusätzlich zur digitalen Eingabe.", options: yesNo("Ja, Papierkarten behalten", "Nein, die digitale Eingabe reicht mir") },
    ],
  },
  {
    title: "Teammodus",
    questions: [
      { field: "team_mode", title: "Möchtest du eine Teamwertung?", options: [{ value: "both", label: "Ja, Team- und Einzelwertung" }, { value: "team_only", label: "Ja, nur Teamwertung" }, { value: "no", label: "Nein, keine Teamwertung" }] },
      { field: "team_size", title: "Wie groß sollte ein Team sein?", when: { field: "team_mode", value: "yes" }, options: [{ value: "two", label: "Zwei Personen" }, { value: "four", label: "Vier Personen" }] },
    ],
  },
  {
    title: "Liga-Shirt",
    questions: [
      { field: "shirt_interest", title: "Ein Kletterliga-Shirt zur Teilnahme?", description: "Design und Preis stehen noch nicht fest. Ein Pflicht-Shirt würde in die Teilnahmegebühr eingerechnet.", options: [{ value: "mandatory", label: "Ja, ein Shirt verpflichtend" }, { value: "optional", label: "Ja, ein Shirt freiwillig" }, { value: "no", label: "Nein, kein Shirt" }] },
    ],
  },
  {
    title: "Ligen & Klassen",
    questions: [
      { field: "pro_league", title: "Eine eigene Profi-Liga?", description: "Eine separate Wertung für Kaderathleten und alle, die sich auf hohem Leistungsniveau messen wollen. Leistungsstarke Kletternde treten untereinander an; die übrigen Klassen bekommen eigene Podestplätze, ohne gegen diese Gruppe antreten zu müssen. Geklettert werden dieselben Liga-Routen.", options: [{ value: "squad_required", label: "Ja, für Kaderathleten verpflichtend", description: "Für andere leistungsstarke Kletternde freiwillig." }, { value: "voluntary", label: "Ja, eine freiwillige Profi-Liga" }, { value: "no", label: "Nein, keine Profi-Liga" }] },
      { field: "league_changes", title: "Wie sollten die übrigen Klassen aufgeteilt sein?", multiple: true, description: "Unabhängig von der Profi-Liga. Mehrere Änderungen sind möglich; „so beibehalten“ steht für sich.", noteField: "league_idea", noteLabel: "Deine Idee für eine andere Aufteilung", options: [{ value: "age_classes", label: "Mehr Altersunterteilungen" }, { value: "skill_classes", label: "Mehr Leistungsunterteilungen" }, { value: "fewer_classes", label: "Weniger Unterteilungen" }, { value: "other", label: "Eine andere Aufteilung" }, { value: "keep", label: "So beibehalten" }] },
    ],
  },
  {
    title: "Qualifikation",
    questions: [
      { field: "qual_weight", title: "Qualifikation stärker im Endergebnis gewichten?", description: "Die Ergebnisse werden selbst eingetragen. Eine durchgängige Kontrolle durch Schiedsrichter ist nicht gewährleistet. Möchtest du sie trotzdem stärker gewichten?", options: [{ value: "stronger", label: "Ja, trotzdem stärker gewichten" }, { value: "controlled_only", label: "Nein, Kontrolle ist wichtiger" }] },
    ],
  },
  {
    title: "Hallen & Wege",
    questions: [
      { field: "hall_model", title: "Wie sollten die Hallenbesuche organisiert werden?", description: "Die Beispiele erklären die Modelle. Es gibt noch keine festgelegten Gruppen oder bestätigten Partnerhallen für 2027.", options: [{ value: "all", label: "Alle Hallen der Liga besuchen", description: "Für alle gilt dieselbe Hallenrunde. Alle Hallen dieser Runde gehören zur Qualifikation." }, { value: "regions", label: "Regionale Hallengruppen", description: "Du wählst eine feste Gruppe von Hallen in einer Region und sammelst dort deine Qualifikationspunkte." }, { value: "choose", label: "Hallen frei aus einem größeren Pool wählen", description: "Du wählst selbst eine feste Anzahl aus allen teilnehmenden Hallen – ohne feste Regionalgruppe." }, { value: "unsure", label: "Noch unentschieden" }] },
      { field: "hall_count", title: "Wie viele unterschiedliche Hallen möchtest du für die Qualifikation besuchen müssen?", description: "Gemeint ist der gewünschte Umfang deiner Pflichtbesuche. Beim Modell „alle Hallen“ wäre das die Größe der gemeinsamen Hallenrunde, bei Regionalgruppen die Größe deiner Gruppe. Die Antwort ist keine Zusage, dass so viele Hallen teilnehmen.", options: [{ value: "4", label: "4 Hallen" }, { value: "6", label: "6 Hallen" }, { value: "8", label: "8 Hallen" }, { value: "10", label: "10 Hallen" }, { value: "unsure", label: "Noch unentschieden" }] },
    ],
  },
  {
    title: "Community-Events",
    questions: [
      { field: "community_events", title: "Welche gemeinsamen Events wünschst du dir?", description: "Zum Beispiel ein Kick-off zum Start oder Hallentreffen während der Saison. Ein Tag mit kostenfreiem Eintritt wäre eine mögliche Idee, ist aber noch nicht mit den Hallen vereinbart.", options: [{ value: "kickoff", label: "Ein Kick-off zum Saisonstart" }, { value: "during", label: "Gemeinsame Termine während der Saison" }, { value: "both", label: "Beides: Kick-off und Saison-Treffen" }, { value: "none", label: "Keine zusätzlichen Events" }, { value: "unsure", label: "Noch unentschieden" }] },
    ],
  },
  {
    title: "Wertungsvarianten",
    questions: [
      { field: "weighting", title: "Welche Zusatzregel wünschst du dir?", description: "Streichen oder doppelt werten verändert die Vergleichbarkeit. Die genauen Regeln wären noch festzulegen.", noteField: "weighting_idea", noteLabel: "Deine Idee für eine weitere Wertungsregel", options: [{ value: "none", label: "Keine Zusatzregeln", description: "Alle Hallen werden gleich gewichtet; keine Hallenwertung wird gestrichen." }, { value: "drop_one", label: "Eine Hallenwertung streichen dürfen", description: "Eine Halle geht nicht in die Qualifikationssumme ein." }, { value: "double_one", label: "Eine Halle doppelt werten dürfen", description: "Eine gewählte Halle zählt mit dem doppelten Gewicht." }, { value: "both", label: "Beide Möglichkeiten kombinieren" }, { value: "unsure", label: "Noch unentschieden" }] },
    ],
  },
];

export const emptyIdeasAnswers: DraftAnswers = { league_changes: [] };
export const visibleQuestions = (step: SurveyStep, answers: DraftAnswers) => step.questions.filter(q => !q.when || answers[q.when.field] === q.when.value);

export function changeIdeasAnswer(current: DraftAnswers, field: SurveyField, value: string): DraftAnswers {
  if (field === "league_changes") {
    const exclusive = value === "keep" || value === "unsure";
    const selected = current.league_changes;
    return { ...current, league_changes: selected.includes(value) ? selected.filter(v => v !== value) : exclusive ? [value] : [...selected.filter(v => v !== "keep" && v !== "unsure"), value] };
  }
  // Combined visible choices retain the explicit, already validated data fields.
  if (field === "team_mode" && (value === "both" || value === "team_only")) return { ...current, team_mode: "yes", team_scoring: value };
  if (field === "shirt_interest" && (value === "mandatory" || value === "optional")) return { ...current, shirt_interest: "yes", shirt_policy: value };
  if (field === "pro_league" && (value === "squad_required" || value === "voluntary")) return { ...current, pro_league: "yes", pro_rule: value };
  const next = { ...current, [field]: value };
  if (field === "team_mode" && value !== "yes") { delete next.team_size; delete next.team_scoring; }
  if (field === "shirt_interest" && value !== "yes") delete next.shirt_policy;
  if (field === "pro_league" && value !== "yes") delete next.pro_rule;
  return next;
}

export function visibleAnswerValue(field: SurveyField, answers: DraftAnswers): string | undefined {
  if (field === "team_mode" && answers.team_mode === "yes") return answers.team_scoring;
  if (field === "shirt_interest" && answers.shirt_interest === "yes") return answers.shirt_policy;
  if (field === "pro_league" && answers.pro_league === "yes") return answers.pro_rule;
  return field === "league_changes" ? undefined : answers[field];
}

export const unansweredQuestions = (step: SurveyStep, answers: DraftAnswers) => visibleQuestions(step, answers).filter(q => q.multiple ? !answers.league_changes.length : !answers[q.field]);

export function selectedIdeaLabels(question: SurveyQuestion, answers: DraftAnswers): string[] {
  const selected = question.multiple ? answers.league_changes : [visibleAnswerValue(question.field, answers)];
  return question.options.filter(o => selected.includes(o.value)).map(o => o.label);
}
