import { z } from "zod";
import { supabase } from "./supabase";
import { validateIdeasDraftAnswers } from "../../supabase/functions/submit-ideas-survey-2027/validation";
import type { IdeasSurveyAnswers } from "../../supabase/functions/submit-ideas-survey-2027/validation";

const count = z.number().int().nonnegative();
const date = z.string().datetime({ offset: true });
const question = z.object({ eligible: count, answered: count, counts: z.record(count) });
const entry = z.object({
  submission_id: z.string().uuid(), survey_version: z.literal(1),
  answers: z.custom<Partial<IdeasSurveyAnswers>>(validateIdeasDraftAnswers),
  created_at: date, updated_at: date, completed: z.boolean(),
});
export const ideasReportSchema = z.object({
  total: count, completed: count, partial: count, scoped_total: count, matched: count,
  latest_at: date.nullable(), fetched_at: date,
  questions: z.object({
    digitalization: question, paper_cards: question, team_mode: question, team_size: question,
    shirt_interest: question, pro_league: question, league_changes: question, qual_weight: question,
    hall_model: question, hall_count: question, community_events: question, weighting: question,
  }),
  entries: z.array(entry).max(50),
}).superRefine((report, ctx) => {
  const invalid = report.total !== report.completed + report.partial || report.scoped_total > report.total || report.matched > report.scoped_total || report.entries.length > report.matched ||
    new Set(report.entries.map(e => e.submission_id)).size !== report.entries.length ||
    Object.entries(report.questions).some(([field, q]) => q.eligible > report.scoped_total || q.answered > q.eligible || Object.values(q.counts).some(n => n > q.answered) ||
      (field !== "league_changes" && Object.values(q.counts).reduce((a, n) => a + n, 0) !== q.answered));
  if (invalid) ctx.addIssue({ code: "custom", message: "Inconsistent survey report" });
});
export type IdeasSurveyReport = z.infer<typeof ideasReportSchema>;
export type IdeasSurveyEntry = z.infer<typeof entry>;
export type IdeasQuestionReport = z.infer<typeof question>;
export type IdeasReportField = keyof IdeasSurveyReport["questions"];
export type IdeasReportStatus = "all" | "completed" | "partial";
export type IdeasReportFilters = { status: IdeasReportStatus; offset: number; textOnly: boolean };
export const IDEAS_REPORT_PAGE_SIZE = 20;
export const emptyIdeasReportFilters: IdeasReportFilters = { status: "all", offset: 0, textOnly: false };
export type IdeasReportSource = (filters: IdeasReportFilters, signal: AbortSignal) => Promise<IdeasSurveyReport>;

export const loadIdeasSurveyReport: IdeasReportSource = async (filters, signal) => {
  const { data, error } = await supabase.rpc("admin_ideas_survey_2027_report", {
    p_status: filters.status, p_offset: filters.offset, p_limit: IDEAS_REPORT_PAGE_SIZE, p_text_only: filters.textOnly,
  }).abortSignal(signal);
  if (error) throw new Error(error.code === "42501" ? "Für diese Auswertung brauchst du einen aktiven Liga-Adminzugang." : "Die Auswertung konnte nicht geladen werden. Bitte versuche es erneut.");
  const parsed = ideasReportSchema.safeParse(data);
  if (!parsed.success) throw new Error("Die Auswertung ist unvollständig oder nicht kompatibel. Bitte prüfe den Stand der Datenbankmigration.");
  return parsed.data;
};
