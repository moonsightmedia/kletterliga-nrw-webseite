// Development-only fixtures, never production responses. Imported only by the
// DEV-gated preview route and tests; not by the actual admin dashboard.
import { ideasReportSections } from "@/lib/ideasSurveyReport";
import { visibleAnswerValue, type DraftAnswers } from "@/lib/ideasSurvey2027";
import { IDEAS_REPORT_PAGE_SIZE, type IdeasReportFilters, type IdeasReportSource, type IdeasSurveyEntry, type IdeasSurveyReport } from "@/services/ideasSurveyAdminApi";

const full: IdeasSurveyEntry["answers"] = { digitalization: "yes", paper_cards: "no", team_mode: "yes", team_scoring: "both", team_size: "two", shirt_interest: "yes", shirt_policy: "optional", pro_league: "yes", pro_rule: "voluntary", league_changes: ["age_classes", "skill_classes"], qual_weight: "controlled_only", hall_model: "choose", hall_count: "6", community_events: "both", weighting: "drop_one", league_idea: "Eine zusätzliche Altersklasse ab 40 wäre interessant.\nDie Leistungsbereiche sollten trotzdem vergleichbar bleiben.", weighting_idea: "Die Streichwertung vor der Saison eindeutig erklären." };
export const ideasPreviewEntries: IdeasSurveyEntry[] = [
  { submission_id: "11111111-1111-4111-8111-111111111111", survey_version: 1, created_at: "2026-10-15T08:00:00Z", updated_at: "2026-10-15T08:15:00Z", completed: true, answers: full },
  { submission_id: "22222222-2222-4222-8222-222222222222", survey_version: 1, created_at: "2026-10-15T07:00:00Z", updated_at: "2026-10-15T07:30:00Z", completed: true, answers: { ...full, team_mode: "no", team_size: undefined, team_scoring: undefined, shirt_interest: "no", shirt_policy: undefined, pro_league: "no", pro_rule: undefined, league_changes: ["keep"], hall_model: "regions", hall_count: "4", league_idea: undefined, weighting_idea: undefined } },
  { submission_id: "33333333-3333-4333-8333-333333333333", survey_version: 1, created_at: "2026-10-14T14:00:00Z", updated_at: "2026-10-15T07:00:00Z", completed: false, answers: { digitalization: "no", paper_cards: "yes", team_mode: "yes", team_scoring: "team_only", team_size: "four", shirt_interest: "yes", shirt_policy: "mandatory" } },
  { submission_id: "44444444-4444-4444-8444-444444444444", survey_version: 1, created_at: "2026-10-14T13:00:00Z", updated_at: "2026-10-14T13:05:00Z", completed: false, answers: { digitalization: "unsure", weighting_idea: "Eine Saisonwertung, die auch längere Urlaubszeiten berücksichtigt." } },
];
// JSON transport omits undefined fields; keep fixtures faithful to that contract.
for (const entry of ideasPreviewEntries) entry.answers = Object.fromEntries(Object.entries(entry.answers).filter(([, value]) => value !== undefined));
export function makeIdeasPreviewReport(filters: IdeasReportFilters, entries = ideasPreviewEntries): IdeasSurveyReport {
  const scoped = entries.filter(e => filters.status === "all" || e.completed === (filters.status === "completed"));
  const questions = Object.fromEntries(ideasReportSections.flatMap(s => s.questions).map(q => {
    const eligible = scoped.filter(e => !q.when || e.answers[q.when.field] === q.when.value);
    let answered = 0;
    const counts: Record<string, number> = {};
    for (const e of eligible) {
      const value = visibleAnswerValue(q.field, { ...e.answers, league_changes: e.answers.league_changes ?? [] } as DraftAnswers) ?? (e.answers[q.field] === "yes" ? "yes_unspecified" : undefined);
      const values = q.multiple ? e.answers.league_changes ?? [] : value ? [value] : [];
      if (values.length) answered++;
      values.forEach(v => { counts[v] = (counts[v] ?? 0) + 1; });
    }
    return [q.field, { eligible: eligible.length, answered, counts }];
  })) as IdeasSurveyReport["questions"];
  const details = scoped.filter(e => !filters.textOnly || e.answers.league_idea || e.answers.weighting_idea).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.submission_id.localeCompare(a.submission_id));
  return { total: entries.length, completed: entries.filter(e => e.completed).length, partial: entries.filter(e => !e.completed).length, scoped_total: scoped.length, matched: details.length, latest_at: scoped.map(e => e.updated_at).sort().reverse()[0] ?? null, fetched_at: "2026-10-15T08:30:00Z", questions, entries: details.slice(filters.offset, filters.offset + IDEAS_REPORT_PAGE_SIZE) };
}
export const ideasPreviewSource: IdeasReportSource = async filters => makeIdeasPreviewReport(filters);
