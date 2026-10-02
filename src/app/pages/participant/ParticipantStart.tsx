import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import { useQualificationPhase } from "@/services/useQualificationPhase";
import { ParticipantStateCard } from "./ParticipantProfileContent";

const Home = lazy(() => import("./Home"));

export default function ParticipantStart() {
  const { role } = useAuth();
  const { phase, hasEnded } = useQualificationPhase();
  if (role === "league_admin") return <Navigate to="/app/admin/league" replace />;
  if (role === "gym_admin") return <Navigate to="/app/admin/gym" replace />;
  if (phase === "loading") return <ParticipantStateCard title="Saisonstatus wird geladen" description="Deine Übersicht wird vorbereitet." />;
  if (phase === "unavailable") return <ParticipantStateCard title="Saisonstatus nicht verfügbar" description="Bitte lade die Seite erneut. Deine gespeicherten Daten bleiben unverändert; Ranglisten und Ergebnisse erreichst du über die Navigation." />;
  if (!hasEnded) return <Home />;
  return <Navigate to="/app/wettkampf" replace />;
}
