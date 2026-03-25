import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/app/auth/AuthProvider";
import {
  ParticipantHistoryContent,
  ParticipantStateCard,
} from "@/app/pages/participant/ParticipantProfileContent";
import { buildParticipantProfileData } from "@/app/pages/participant/participantData";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import type { Profile } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";

const buildFallbackProfile = (
  authProfile: Profile | null,
  userId: string | null,
  email: string | null,
  metadata: Record<string, unknown> | undefined,
) => {
  if (authProfile) return authProfile;
  if (!userId) return null;

  return {
    id: userId,
    email,
    first_name: typeof metadata?.first_name === "string" ? metadata.first_name : null,
    last_name: typeof metadata?.last_name === "string" ? metadata.last_name : null,
    avatar_url: typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null,
    birth_date: typeof metadata?.birth_date === "string" ? metadata.birth_date : null,
    gender: metadata?.gender === "m" || metadata?.gender === "w" ? metadata.gender : null,
    home_gym_id: typeof metadata?.home_gym_id === "string" ? metadata.home_gym_id : null,
    league: metadata?.league === "toprope" || metadata?.league === "lead" ? metadata.league : null,
    role: "participant" as const,
    participation_activated_at: null,
  } satisfies Profile;
};

const ParticipantHistoryPage = () => {
  const { profileId } = useParams<{ profileId?: string }>();
  const { profile, user } = useAuth();
  const { getClassName } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error } = useParticipantCompetitionData();

  const selectedProfile = useMemo(() => {
    if (profileId) {
      return profiles.find((item) => item.id === profileId) ?? null;
    }

    const authId = profile?.id ?? user?.id ?? null;
    if (!authId) return null;
    return (
      profiles.find((item) => item.id === authId) ??
      buildFallbackProfile(profile, authId, user?.email ?? null, user?.user_metadata)
    );
  }, [profileId, profile, profiles, user]);

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
        title="Verlauf laedt"
        description="Die Chronik wird gerade mit den letzten geloggten Routen aufgebaut."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Verlauf nicht verfuegbar" description={error} />;
  }

  if (!participantData) {
    return (
      <ParticipantStateCard
        title="Verlauf nicht verfuegbar"
        description="Zu diesem Teilnehmer konnte keine Chronik geladen werden."
      />
    );
  }

  const backHref = profileId ? `/app/rankings/profile/${profileId}` : "/app/profile";

  return <ParticipantHistoryContent data={participantData} backHref={backHref} />;
};

export default ParticipantHistoryPage;
