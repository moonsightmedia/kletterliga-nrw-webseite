import { ideasSurveySteps, visibleAnswerValue, type DraftAnswers, type SurveyQuestion } from "./ideasSurvey2027";
import type { IdeasReportField, IdeasSurveyEntry, IdeasQuestionReport } from "@/services/ideasSurveyAdminApi";

// The public question text/options stay authoritative. Additional labels retain
// accepted older schema values instead of silently losing them from the report.
const historicalOptions: Partial<Record<IdeasReportField, Record<string, string>>> = {
  team_mode: { unsure: "Noch unentschieden", yes_unspecified: "Ja – Wertungsart noch offen" },
  team_size: { either: "Zwei oder vier Personen", unsure: "Noch unentschieden" },
  shirt_interest: { unsure: "Noch unentschieden", yes_unspecified: "Ja – Pflicht oder freiwillig noch offen" },
  pro_league: { unsure: "Noch unentschieden", yes_unspecified: "Ja – Teilnahmebedingungen noch offen" },
  league_changes: { age_middle: "Zusätzliche mittlere Altersklasse (frühere Option)", age_more: "Mehr Altersklassen (frühere Option)", unsure: "Noch unentschieden" },
  qual_weight: { same: "Bisherige Gewichtung beibehalten (frühere Option)", unsure: "Noch unentschieden" },
};
export const ideasReportSections = ideasSurveySteps.map(step => ({ ...step, questions: step.questions.map(q => ({ ...q, field: q.field as IdeasReportField })) }));
export function reportOptionLabels(q: SurveyQuestion): Record<string, string> {
  return { ...Object.fromEntries(q.options.map(o => [o.value, o.label])), ...historicalOptions[q.field as IdeasReportField] };
}
export function reportOptionRows(q: SurveyQuestion, report: IdeasQuestionReport) {
  const labels = reportOptionLabels(q);
  const keys = [...q.options.map(o => o.value), ...Object.keys(report.counts).filter(key => !q.options.some(o => o.value === key))];
  return keys.map(key => ({ key, label: labels[key] ?? `Unbekannte Option (${key})`, count: report.counts[key] ?? 0,
    percent: report.answered ? (report.counts[key] ?? 0) / report.answered * 100 : null }));
}
export function entryAnswer(entry: IdeasSurveyEntry, q: SurveyQuestion): string | null {
  if (q.when && entry.answers[q.when.field] !== q.when.value) return null;
  const answers = { ...entry.answers, league_changes: entry.answers.league_changes ?? [] } as DraftAnswers;
  const labels = reportOptionLabels(q);
  if (q.multiple) return answers.league_changes.length ? answers.league_changes.map(v => labels[v] ?? v).join(" · ") : null;
  const selected = visibleAnswerValue(q.field, answers) ?? (entry.answers[q.field] === "yes" ? "yes_unspecified" : undefined);
  return selected ? labels[selected] ?? selected : null;
}
export function ideasReportDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "–";
}
export const ideasPercent = (value: number | null) => value === null ? "–" : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} %`;
