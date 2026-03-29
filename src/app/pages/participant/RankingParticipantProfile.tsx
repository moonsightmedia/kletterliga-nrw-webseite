import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { buildParticipantProfileData } from "@/app/pages/participant/participantData";
import { useParticipantDataBundle } from "@/app/pages/participant/useParticipantDataBundle";
import { useSeasonSettings } from "@/services/seasonSettings";
import ReadonlyParticipantProfileContent from "./ReadonlyParticipantProfileContent";

const RankingParticipantProfile = () => {
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
        title="Profil lädt"
        description="Die Teilnehmerdaten werden gerade für die neue Profilansicht vorbereitet."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Profil nicht verfügbar" description={error} />;
  }

  if (!participantData) {
    return (
      <ParticipantStateCard
        title="Profil nicht gefunden"
        description="Zu diesem Teilnehmer konnte kein Profil geladen werden."
      />
    );
  }

  return (
    <ReadonlyParticipantProfileContent
      data={participantData}
      historyHref={`/app/rankings/profile/${participantData.profile.id}/history`}
    />
  );
};

export default RankingParticipantProfile;
