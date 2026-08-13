export type GymAdminRankingLeague = "toprope" | "lead";
export type GymAdminRankingGender = "m" | "w";
export type GymAdminRankingAge = "U15" | "UE15" | "UE40";

export type GymAdminRankingProfileInput = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  gender: GymAdminRankingGender | null;
  league: GymAdminRankingLeague | null;
  role: string | null;
  participation_activated_at: string | null;
  archived_at: string | null;
};

export type GymAdminRankingRouteInput = {
  id: string;
  discipline: GymAdminRankingLeague;
};

export type GymAdminRankingResultInput = {
  profile_id: string;
  route_id: string;
  points: number;
  flash: boolean;
  created_at: string;
};

export type GymAdminRankingSettingsInput = {
  qualification_start: string | null;
  qualification_end: string | null;
  age_cutoff_date: string | null;
  age_u16_max: number | null;
  age_u40_min: number | null;
};

export type GymAdminRankingRow = {
  rank: number;
  display_name: string;
  points: number;
};

const dateBoundary = (value: string, boundary: "start" | "end") => {
  const suffix = boundary === "end" ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const time = new Date(`${value}${suffix}`).getTime();
  return Number.isNaN(time) ? null : time;
};

const getAgeAt = (birthDate: string, cutoffDate: string) => {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  const cutoff = new Date(`${cutoffDate}T00:00:00.000Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(cutoff.getTime())) return null;

  let age = cutoff.getUTCFullYear() - birth.getUTCFullYear();
  const monthDifference = cutoff.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && cutoff.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
};

const getAgeScope = (
  birthDate: string | null,
  cutoffDate: string,
  u15Max: number,
  u40Min: number,
): GymAdminRankingAge | null => {
  if (!birthDate) return null;
  const age = getAgeAt(birthDate, cutoffDate);
  if (age === null) return null;
  if (age <= u15Max) return "U15";
  if (age < u40Min) return "UE15";
  return "UE40";
};

const getDisplayName = (profile: GymAdminRankingProfileInput) =>
  `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unbekannt";

const getCanonicalSortName = (profile: GymAdminRankingProfileInput) =>
  `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || "Unbekannt";

export const filterGymAdminRankingProfiles = ({
  profiles,
  league,
  gender,
  age,
  settings,
}: {
  profiles: GymAdminRankingProfileInput[];
  league: GymAdminRankingLeague;
  gender: GymAdminRankingGender;
  age: GymAdminRankingAge;
  settings: GymAdminRankingSettingsInput;
}) => {
  const cutoffDate = settings.age_cutoff_date ?? settings.qualification_start ?? "2026-05-01";
  const u15Max = settings.age_u16_max ?? 14;
  const u40Min = settings.age_u40_min ?? 40;

  return profiles.filter((profile) => {
    if (profile.archived_at || !profile.participation_activated_at) return false;
    if (profile.role === "gym_admin" || profile.role === "league_admin") return false;
    if (profile.gender !== gender) return false;
    if (profile.league !== null && profile.league !== league) return false;
    return getAgeScope(profile.birth_date, cutoffDate, u15Max, u40Min) === age;
  });
};

export const buildGymAdminRankings = ({
  league,
  gender,
  age,
  profiles,
  routes,
  results,
  settings,
}: {
  league: GymAdminRankingLeague;
  gender: GymAdminRankingGender;
  age: GymAdminRankingAge;
  profiles: GymAdminRankingProfileInput[];
  routes: GymAdminRankingRouteInput[];
  results: GymAdminRankingResultInput[];
  settings: GymAdminRankingSettingsInput;
}): GymAdminRankingRow[] => {
  const qualificationStart = settings.qualification_start;
  const qualificationEnd = settings.qualification_end;
  const startTime = qualificationStart ? dateBoundary(qualificationStart, "start") : null;
  const endTime = qualificationEnd ? dateBoundary(qualificationEnd, "end") : null;
  const hasQualificationRange = startTime !== null && endTime !== null;

  const scopedRouteIds = new Set(
    routes
      .filter((route) => route.discipline === league)
      .map((route) => route.id),
  );

  const pointsByProfile = new Map<string, number>();
  for (const result of results) {
    if (!scopedRouteIds.has(result.route_id)) continue;
    const createdAt = new Date(result.created_at).getTime();
    if (Number.isNaN(createdAt)) continue;
    if (hasQualificationRange && (createdAt < startTime || createdAt > endTime)) continue;

    const points = Number.isFinite(result.points) ? result.points : 0;
    pointsByProfile.set(
      result.profile_id,
      (pointsByProfile.get(result.profile_id) ?? 0) + points + (result.flash ? 1 : 0),
    );
  }

  return filterGymAdminRankingProfiles({ profiles, league, gender, age, settings })
    .map((profile) => ({
      profileId: profile.id,
      display_name: getDisplayName(profile),
      sortName: getCanonicalSortName(profile),
      points: pointsByProfile.get(profile.id) ?? 0,
    }))
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      return left.sortName.localeCompare(right.sortName, "de");
    })
    .map(({ display_name, points }, index) => ({
      rank: index + 1,
      display_name,
      points,
    }));
};
