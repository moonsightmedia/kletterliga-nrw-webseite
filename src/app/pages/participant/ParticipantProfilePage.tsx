import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { useSeasonSettings } from "@/services/seasonSettings";
import { buildParticipantProfileData } from "./participantData";
import ReadonlyParticipantProfileContent from "./ReadonlyParticipantProfileContent";
import { useParticipantCompetitionData } from "./useParticipantCompetitionData";

const ParticipantProfilePage = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const { getClassName } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error } = useParticipantCompetitionData();

  const profileData = useMemo(() => {
    if (!profileId) return null;
    const selectedProfile = profiles.find((item) => item.id === profileId) ?? null;
    return buildParticipantProfileData({
      selectedProfile,
      allProfiles: profiles,
      results,
      routes,
      gyms,
      getClassName,
    });
  }, [profileId, profiles, results, routes, gyms, getClassName]);

  if (loading) {
    return (
      <ParticipantStateCard
        title="Teilnehmerprofil lädt"
        description="Die Teilnehmerdaten werden gerade für die neue Profilansicht vorbereitet."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Teilnehmerprofil nicht verfügbar" description={error} />;
  }

  if (!profileData) {
    return (
      <ParticipantStateCard
        title="Teilnehmerprofil nicht gefunden"
        description="Zu diesem Teilnehmer konnte kein Profil geladen werden."
      />
    );
  }

  return (
    <ReadonlyParticipantProfileContent
      data={profileData}
      historyHref={`/app/rankings/profile/${profileData.profile.id}/history`}
    />
  );
};

export default ParticipantProfilePage;
