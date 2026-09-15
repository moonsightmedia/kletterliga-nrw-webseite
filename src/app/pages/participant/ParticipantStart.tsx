import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { useQualificationPhase } from "@/services/useQualificationPhase";
import { ParticipantStateCard } from "./ParticipantProfileContent";
import { useSeasonSettings } from "@/services/seasonSettings";
import QualificationTransition from "./QualificationTransition";

const Home = lazy(() => import("./Home"));
const Finale = lazy(() => import("./Finale"));

export default function ParticipantStart() {
  const { role, profile } = useAuth();
  const { phase, hasEnded } = useQualificationPhase();
  const { settings, getStages } = useSeasonSettings();
  if (role === "league_admin") return <Navigate to="/app/admin/league" replace />;
  if (role === "gym_admin") return <Navigate to="/app/admin/gym" replace />;
  if (phase === "loading") return <ParticipantStateCard title="Saisonstatus wird geladen" description="Deine Übersicht wird vorbereitet." />;
  if (phase === "unavailable") return <ParticipantStateCard title="Saisonstatus nicht verfügbar" description="Bitte lade die Seite erneut. Deine gespeicherten Daten bleiben unverändert; Ranglisten und Ergebnisse erreichst du über die Navigation." />;
  if (!hasEnded) return <Home />;
  const end = settings?.qualification_end;
  const season = settings?.season_year;
  return profile?.id && end && season ? <QualificationTransition key={`${profile.id}:${season}:${end}`} profileId={profile.id} season={season} end={end} stages={getStages()}><Finale /></QualificationTransition> : <Finale />;
}
