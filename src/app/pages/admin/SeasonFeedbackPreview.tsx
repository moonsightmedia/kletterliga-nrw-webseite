import { AdminShell } from "@/app/layouts/AdminLayout";
import { SeasonFeedbackDashboard } from "./LeagueSeasonFeedback";
import { FEEDBACK_PAGE_SIZE, type SeasonFeedbackEntry, type SeasonFeedbackSource } from "@/services/seasonFeedbackApi";

// Development-only synthetic examples. Never copy private production feedback here.
const entries: SeasonFeedbackEntry[] = [
  { id: "demo-1", created_at: "2026-10-06T13:10:00Z", survey_version: 4, participation: "active", next_year: "yes", overall_rating: null, best_aspect: null, improve_aspect: null, comment: null, topics: ["halls", "scoring"], details: { top_wish: "Eine flexible Auswahl an Hallen würde mir helfen, die Saison besser mit meinem Alltag zu verbinden.", keep_aspect: "Die gemeinsame Herausforderung und die unterschiedlichen Routenstile.", finale_eligibility: "yes", finale_attendance: "yes", hall_pool: "more", hall_visits: "choose", hall_ideas: "Eine feste Zahl von Hallen aus einem größeren Pool wählen.\nSo bleibt die Liga auch mit längeren Anfahrten gut machbar.", dropped_score: "one", scoring_ideas: "Eine Streichwertung könnte Urlaub oder Krankheit ausgleichen." } },
  { id: "demo-2", created_at: "2026-10-05T09:30:00Z", survey_version: 4, participation: "followed", next_year: "maybe", overall_rating: null, best_aspect: null, improve_aspect: null, comment: null, topics: ["timing"], details: { top_wish: "Frühere Infos zu den Terminen.", main_barrier: "time", barrier_detail: "Meine Arbeitszeiten ließen sich dieses Jahr nicht gut mit der Liga vereinbaren.", season_distribution: "more", distribution_ideas: "Etwas mehr Zeit pro Station, besonders über die Sommerferien." } },
  { id: "demo-3", created_at: "2026-10-04T15:00:00Z", survey_version: 4, participation: "active", next_year: "yes", overall_rating: null, best_aspect: null, improve_aspect: null, comment: null, topics: ["routes"], details: { keep_aspect: "Abwechslungsreiche Routen in vielen Hallen.", route_quantity: "same", route_ideas: "Die Anzahl passt. Ein breiterer Mix an technischen Routen wäre schön." } },
];
const previewSource: SeasonFeedbackSource = async filters => {
  const matched = entries.filter(e => (filters.participation === "all" || e.participation === filters.participation) && (filters.topic === "all" || e.topics.includes(filters.topic)) && (filters.nextYear === "all" || (e.next_year || "unanswered") === filters.nextYear) && JSON.stringify(e.details).toLowerCase().includes(filters.search.toLowerCase()));
  return { total: entries.length, matched: matched.length, latest_at: entries[0].created_at, summary: { perspectives: { active: 2, followed: 1, not_participated: 0, spectator: 0 }, next_year: { yes: 2, maybe: 1, no: 0, unanswered: 0 }, topics: { routes: 1, halls: 1, timing: 1, scoring: 1 } }, entries: matched.slice(filters.offset, filters.offset + FEEDBACK_PAGE_SIZE) };
};
export default function SeasonFeedbackPreview() {
  return <AdminShell role="league_admin" signOut={async () => {}} previewPath="/app/admin/league/season-feedback"><div className="mb-5 rounded-xl bg-[#f2dcab]/60 px-4 py-3 text-sm text-[#003d55]">Lokale Vorschau · 3 erfundene Beispielantworten, keine echten Teilnehmerdaten.</div><SeasonFeedbackDashboard source={previewSource} /></AdminShell>;
}
