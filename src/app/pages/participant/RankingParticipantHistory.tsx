import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { ParticipantHistoryContent } from "@/app/pages/participant/ParticipantHistoryContent";
import { buildParticipantProfileData } from "@/app/pages/participant/participantData";
import { useParticipantDataBundle } from "@/app/pages/participant/useParticipantDataBundle";
import { useSeasonSettings } from "@/services/seasonSettings";

const RankingParticipantHistory = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const { getClassName } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error } = useParticipantDataBundle();

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === profileId) ?? null,
    [profileId, profiles],
  );

  const participantData = useMemo(
    () =>
      buildParticipantProfileData({
        selectedProfile,
        allProfiles: profiles,
        results,
        routes,
        gyms,
        getClassName,
      }),
    [selectedProfile, profiles, results, routes, gyms, getClassName],
  );

  if (loading) {
    return (
      <ParticipantStateCard
        title="Verlauf lädt"
        description="Die letzten Einträge werden für die Chronik vorbereitet."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Verlauf nicht verfügbar" description={error} />;
  }

  if (!participantData) {
    return (
      <ParticipantStateCard
        title="Profil nicht gefunden"
        description="Zu diesem Teilnehmer konnte keine Chronik geladen werden."
      />
    );
  }

  return <ParticipantHistoryContent data={participantData} />;
};

export default RankingParticipantHistory;
