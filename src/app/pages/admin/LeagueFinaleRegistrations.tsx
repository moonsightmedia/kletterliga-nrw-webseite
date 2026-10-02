import { Link } from "react-router-dom";
import { AttendanceDesk } from "@/app/components/AttendanceDesk";
import { StitchButton } from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";

export default function LeagueFinaleRegistrations() {
  const { settings, loading, refreshSettings } = useSeasonSettings();
  const season = settings?.season_year?.trim();
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-primary">Einlass & Anmeldungen</h1>
      <StitchButton asChild variant="outline" className="min-h-11 font-sans text-sm normal-case tracking-normal shadow-none"><Link to="/app/admin/league/wettkampf?bereich=setup&einrichtung=access">Crewzugang einrichten</Link></StitchButton>
    </header>
    {loading ? <p role="status">Lade Saison …</p> : !season ? <div role="alert" className="space-y-3"><p>Die aktuelle Saison konnte nicht geladen werden.</p><StitchButton onClick={() => void refreshSettings()}>Erneut laden</StitchButton></div> : <AttendanceDesk season={season} />}
  </div>;
}
