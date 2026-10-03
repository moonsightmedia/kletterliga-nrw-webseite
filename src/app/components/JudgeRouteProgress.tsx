import type { CompetitionStaffRoute } from "@/services/competitionDay";

export default function JudgeRouteProgress({ route, stale = false }: { route: CompetitionStaffRoute; stale?: boolean }) {
  if (!route.progress || !route.classes) return <p className="mt-3 text-xs text-[#425967]">Teilnehmerstand noch nicht verfügbar.</p>;
  return <div aria-label={`Teilnehmerstand Route ${route.number}`} className="mt-3 space-y-2 border-t border-[#003d55]/15 pt-3 text-left text-sm text-[#003d55]">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p><strong className="text-lg tabular-nums">{route.progress.remaining}</strong> noch offen</p>
      <span className="text-xs tabular-nums text-[#425967]">{route.progress.completed}/{route.progress.total} erledigt</span>
    </div>
    {route.progress.not_checked_in > 0 && <p className="text-xs text-[#425967]">Davon {route.progress.not_checked_in} noch nicht eingecheckt</p>}
    {route.classes.length ? <ul aria-label="Zugeordnete Klassen" className="space-y-1 text-xs leading-5">{route.classes.map((item) => <li key={`${item.league}|${item.class_label}`} className="flex items-baseline justify-between gap-3"><span className="min-w-0 break-words">{item.league === "lead" ? "Vorstieg" : "Toprope"} · {item.class_label}</span><span className="shrink-0 tabular-nums text-[#425967]">{item.remaining} offen</span></li>)}</ul> : <p className="text-xs text-[#425967]">Keine Klasse zugeordnet</p>}
    {stale && <p className="text-xs font-semibold text-[#803712]">Stand veraltet</p>}
  </div>;
}
