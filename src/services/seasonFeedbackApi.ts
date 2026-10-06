import { z } from "zod";
import { supabase } from "./supabase";

const counts = z.record(z.number().int().nonnegative());
const entrySchema = z.object({
  id: z.string(), created_at: z.string(), survey_version: z.number().int(),
  participation: z.string(), next_year: z.string().nullable(),
  overall_rating: z.number().nullable(), best_aspect: z.string().nullable(),
  improve_aspect: z.string().nullable(), comment: z.string().nullable(),
  details: z.record(z.unknown()).nullable(), topics: z.array(z.string()),
});
const pageSchema = z.object({
  total: z.number().int().nonnegative(), matched: z.number().int().nonnegative(),
  latest_at: z.string().nullable(),
  summary: z.object({ perspectives: counts, next_year: counts, topics: counts }),
  entries: z.array(entrySchema),
});
export type SeasonFeedbackEntry = z.infer<typeof entrySchema>;
export type SeasonFeedbackPage = z.infer<typeof pageSchema>;
export type SeasonFeedbackFilters = { participation: string; topic: string; nextYear: string; search: string; offset: number };
export const FEEDBACK_PAGE_SIZE = 20;
export const emptyFeedbackFilters: SeasonFeedbackFilters = { participation: "all", topic: "all", nextYear: "all", search: "", offset: 0 };
export type SeasonFeedbackSource = (filters: SeasonFeedbackFilters, signal: AbortSignal) => Promise<SeasonFeedbackPage>;

export const loadSeasonFeedback: SeasonFeedbackSource = async (filters, signal) => {
  const { data, error } = await supabase.rpc("admin_season_feedback_2026", {
    p_participation: filters.participation === "all" ? null : filters.participation,
    p_topic: filters.topic === "all" ? null : filters.topic,
    p_next_year: filters.nextYear === "all" ? null : filters.nextYear,
    p_search: filters.search.trim() || null,
    p_offset: filters.offset,
    p_limit: FEEDBACK_PAGE_SIZE,
  }).abortSignal(signal);
  if (error) throw new Error(error.code === "42501" ? "Für die Feedbackansicht brauchst du einen aktiven Liga-Adminzugang." : "Das Saisonfeedback konnte nicht geladen werden. Bitte versuche es erneut.");
  const parsed = pageSchema.safeParse(data);
  if (!parsed.success) throw new Error("Die Feedbackantwort ist unvollständig. Bitte prüfe den Stand der Datenbankmigration.");
  return parsed.data;
};
