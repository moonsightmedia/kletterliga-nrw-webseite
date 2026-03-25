import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { StitchCard } from "@/app/components/StitchPrimitives";
import { useSeasonSettings } from "@/services/seasonSettings";
import { buildParticipantProfileData } from "./participantData";
import { ParticipantProfileContent } from "./ParticipantProfileContent";
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
      <StitchCard tone="surface" className="p-6 text-sm text-[rgba(27,28,26,0.64)]">
        Teilnehmerprofil wird geladen...
      </StitchCard>
    );
  }

  if (error) {
    return (
      <StitchCard tone="surface" className="p-6 text-sm text-[rgba(27,28,26,0.64)]">
        {error}
      </StitchCard>
    );
  }

  if (!profileData) {
    return (
      <StitchCard tone="surface" className="p-6 text-sm text-[rgba(27,28,26,0.64)]">
        Teilnehmerprofil konnte nicht gefunden werden.
      </StitchCard>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <ParticipantProfileContent
        data={profileData}
        mode="readonly"
        historyHref={`/app/rankings/profile/${profileData.profile.id}/history`}
      />
    </div>
  );
};

export default ParticipantProfilePage;
