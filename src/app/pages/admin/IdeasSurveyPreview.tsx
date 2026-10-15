import { AdminShell } from "@/app/layouts/AdminLayout";
import { IdeasSurveyDashboard } from "./LeagueIdeasSurvey";
import { ideasPreviewSource } from "./ideasSurveyPreviewData";

export default function IdeasSurveyPreview() {
  return <AdminShell role="league_admin" previewPath="/app/admin/league/ideas-2027"><div className="mb-5 rounded-xl bg-[#f2dcab]/60 px-4 py-3 text-sm text-[#003d55]">Lokale Vorschau · 4 erfundene Einsendungen, keine echten Teilnehmerdaten.</div><IdeasSurveyDashboard source={ideasPreviewSource} /></AdminShell>;
}
