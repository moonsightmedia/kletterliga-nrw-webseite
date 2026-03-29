import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, MapPin, Users } from "lucide-react";
import { StitchCard } from "@/app/components/StitchPrimitives";
import { useAuth } from "@/app/auth/AuthProvider";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import {
  useParticipantUnlockedGymsQuery,
} from "@/app/pages/participant/participantQueries";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { cn } from "@/lib/utils";
import { useSeasonSettings } from "@/services/seasonSettings";
import type { Gym, Route } from "@/services/appTypes";

const OFFICIAL_GYMS = new Set([
  "2T Lindlar",
  "Canyon Chorweiler",
  "Chimpanzodrom",
  "KletterBar Münster",
  "Kletterfabrik Köln",
  "Kletterhalle Bielefeld",
  "Kletterwelt Sauerland",
  "OWL",
]);

const LOGO_FALLBACKS: Record<string, string> = {
  "2T Lindlar": "/gym-logos-real/2t-lindlar.png",
  "Canyon Chorweiler": "/gym-logos-real/canyon-chorweiler.jpg",
  Chimpanzodrom: "/gym-logos-real/chimpanzodrome-frechen.png",
  "KletterBar Münster": "/gym-logos-real/kletterbar-muenster.png",
  "Kletterfabrik Köln": "/gym-logos-real/kletterfabrik-koeln.png",
  "Kletterhalle Bielefeld": "/gym-logos-real/dav-bielefeld.svg",
  "Kletterwelt Sauerland": "/gym-logos-real/kletterwelt-sauerland.jpg",
  OWL: "/gym-logos-real/owl.jpg",
};

const GYM_NAME_ALIASES: Record<string, string> = {
  "2t": "2T Lindlar",
  "2t lindlar": "2T Lindlar",
  "canyon chorweiler": "Canyon Chorweiler",
  chimpanzodrom: "Chimpanzodrom",
  "chimpanzodrome frechen": "Chimpanzodrom",
  "dav alpinzentrum bielefeld": "Kletterhalle Bielefeld",
  "kletterhalle bielefeld": "Kletterhalle Bielefeld",
  "kletterbar münster": "KletterBar Münster",
  "kletterfabrik köln": "Kletterfabrik Köln",
  "kletterwelt sauerland": "Kletterwelt Sauerland",
  owl: "OWL",
  "kletterzentrum owl": "OWL",
  "dav kletterzentrum siegerland": "OWL",
};

const getCanonicalGymName = (name: string) => {
  const cleaned = name.trim().replace(/\s+/g, " ");
  const aliasKey = cleaned.toLocaleLowerCase("de");
  return GYM_NAME_ALIASES[aliasKey] ?? cleaned;
};

const gymKey = (name: string) => getCanonicalGymName(name).toLocaleLowerCase("de");

const getDisciplineLabel = (routes: Route[]) => {
  const hasLead = routes.some((route) => route.discipline === "lead");
  const hasToprope = routes.some((route) => route.discipline === "toprope");

  if (hasLead && hasToprope) return "Klettern";
  if (hasLead) return "Vorstieg";
  if (hasToprope) return "Toprope";
  return "Partnerhalle";
};

const getDisciplineBadgeClass = (routes: Route[]) => {
  const hasLead = routes.some((route) => route.discipline === "lead");
  const hasToprope = routes.some((route) => route.discipline === "toprope");

  if (hasLead && hasToprope) return "bg-[#003d55] text-[#f2dcab]";
  if (hasLead) return "bg-[#003d55] text-white";
  if (hasToprope) return "bg-[#a15523] text-white";
  return "bg-[rgba(0,38,55,0.68)] text-[#f2dcab]";
};

const getGymInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatAverage = (value: number | null) =>
  value === null
    ? "-"
    : value.toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

type CommunityStats = {
  visitors: number;
  averagePoints: number | null;
};

type DisplayGym = Gym & {
  canonicalName: string;
};

const Gyms = () => {
  const { profile } = useAuth();
  const { getQualificationEnd } = useSeasonSettings();
  const {
    gyms: competitionGyms,
    routes,
    results: allResults,
    profiles,
    loading: competitionLoading,
    error: competitionError,
  } = useParticipantCompetitionData();

  const gyms = useMemo(
    () =>
      competitionGyms
        .map((gym) => {
          const canonicalName = getCanonicalGymName(gym.name);
          return {
            ...gym,
            canonicalName,
            logo_url: gym.logo_url ?? LOGO_FALLBACKS[canonicalName] ?? null,
          };
        })
        .filter((gym) => OFFICIAL_GYMS.has(gym.canonicalName))
        .reduce<DisplayGym[]>((acc, gym) => {
          const index = acc.findIndex(
            (existing) => gymKey(existing.canonicalName) === gymKey(gym.canonicalName),
          );
          if (index === -1) acc.push(gym);
          return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [competitionGyms],
  );
  const gymIds = useMemo(() => gyms.map((gym) => gym.id), [gyms]);

  const {
    unlockedGymIds,
    loading: unlockedGymsLoading,
    error: unlockedGymsError,
  } = useParticipantUnlockedGymsQuery(profile?.id, gymIds);

  const unlockedGyms = useMemo(() => new Set(unlockedGymIds), [unlockedGymIds]);

  const officialGymIds = useMemo(() => new Set(gyms.map((gym) => gym.id)), [gyms]);

  const officialRoutes = useMemo(
    () => routes.filter((route) => officialGymIds.has(route.gym_id)),
    [routes, officialGymIds],
  );

  const routeByGym = useMemo(
    () =>
      officialRoutes.reduce<Record<string, Route[]>>((acc, route) => {
        acc[route.gym_id] = acc[route.gym_id] ?? [];
        acc[route.gym_id].push(route);
        return acc;
      }, {}),
    [officialRoutes],
  );

  const routeMap = useMemo(
    () => new Map(officialRoutes.map((route) => [route.id, route])),
    [officialRoutes],
  );

  const participantIds = useMemo(
    () => new Set(profiles.filter((item) => item.role === "participant").map((item) => item.id)),
    [profiles],
  );

  const communityStatsByGym = useMemo(() => {
    const stats = new Map<string, { visitorIds: Set<string>; totalPoints: number; resultCount: number }>();

    allResults.forEach((result) => {
      if (!participantIds.has(result.profile_id)) return;
      const route = routeMap.get(result.route_id);
      if (!route) return;

      const current = stats.get(route.gym_id) ?? {
        visitorIds: new Set<string>(),
        totalPoints: 0,
        resultCount: 0,
      };

      current.visitorIds.add(result.profile_id);
      current.totalPoints += (result.points ?? 0) + (result.flash ? 1 : 0);
      current.resultCount += 1;
      stats.set(route.gym_id, current);
    });

    return stats;
  }, [allResults, participantIds, routeMap]);

  const qualificationDaysLeft = useMemo(() => {
    const qualificationEnd = getQualificationEnd();
    if (!qualificationEnd) return null;

    const now = new Date();
    const end = new Date(`${qualificationEnd}T23:59:59`);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [getQualificationEnd]);

  const gymsError = competitionError || unlockedGymsError;
  const gymsLoading = competitionLoading || unlockedGymsLoading;

  if (gymsLoading) {
    return (
      <ParticipantStateCard
        title="Partnerhallen laden"
        description="Die Hallenübersicht wird gerade für den Teilnehmerbereich vorbereitet."
      />
    );
  }

  if (gymsError) {
    return <ParticipantStateCard title="Partnerhallen nicht verfügbar" description={gymsError} />;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <section className="space-y-4">
        <StitchCard
          tone="navy"
          className="overflow-hidden rounded-xl border border-[rgba(242,220,171,0.08)] bg-[linear-gradient(180deg,#003d55_0%,#002637_100%)] p-5 shadow-[0_20px_44px_rgba(0,0,0,0.22)]"
          style={{ borderRadius: "0.75rem" }}
        >
          <div className="space-y-3">
            <div className="stitch-headline text-[2rem] uppercase leading-[0.98] text-[#f2dcab]">
              Partnerhallen
            </div>
            <p className="max-w-[17rem] text-sm leading-6 text-[rgba(242,220,171,0.76)]">
              Entdecke die besten Kletterhallen in NRW. Sammel Punkte für die Liga in jeder
              Location.
            </p>
          </div>
        </StitchCard>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white px-3 py-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
            <div className="text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.46)]">
              Hallen
            </div>
            <div className="mt-1 stitch-headline text-[1.65rem] text-[#002637]">{gyms.length}</div>
          </div>

          <div className="rounded-xl bg-white px-3 py-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
            <div className="text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.46)]">
              Besucht
            </div>
            <div className="mt-1 stitch-headline text-[1.65rem] text-[#002637]">{unlockedGyms.size}</div>
          </div>

          <div className="rounded-xl bg-white px-3 py-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
            <div className="text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.46)]">
              Resttage
            </div>
            <div className="mt-1 stitch-headline text-[1.65rem] text-[#002637]">
              {qualificationDaysLeft ?? "-"}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {gyms.map((gym) => {
          const gymRoutes = routeByGym[gym.id] ?? [];
          const unlocked = unlockedGyms.has(gym.id);
          const disciplineLabel = getDisciplineLabel(gymRoutes);
          const community = communityStatsByGym.get(gym.id);
          const communityStats: CommunityStats = {
            visitors: community?.visitorIds.size ?? 0,
            averagePoints:
              community && community.resultCount > 0 ? community.totalPoints / community.resultCount : null,
          };

          return (
            <Link key={gym.id} to={`/app/gyms/${gym.id}`} className="group block">
              <StitchCard
                tone="surface"
                className="overflow-hidden rounded-xl border border-[rgba(242,220,171,0.3)] bg-white shadow-[0_16px_34px_rgba(0,0,0,0.08)] transition-transform duration-200 active:scale-[0.985] group-hover:-translate-y-0.5"
                style={{ borderRadius: "0.75rem" }}
              >
                <div className="relative h-40 overflow-hidden bg-[#f2dcab]">

                  <div className="absolute left-3 top-3 z-10">
                    <div
                      className={`stitch-headline inline-flex items-center rounded-xl px-3 py-1 text-[0.56rem] font-bold tracking-[0.2em] ${getDisciplineBadgeClass(
                        gymRoutes,
                      )}`}
                    >
                      {disciplineLabel}
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center px-6 py-5">
                    {gym.logo_url ? (
                      <img
                        src={gym.logo_url}
                        alt={gym.name}
                        className="h-full max-h-[7.1rem] w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.18)]"
                      />
                    ) : (
                      <div className="stitch-headline text-5xl text-[#003d55]">
                        {getGymInitials(gym.name)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="stitch-headline text-[1.25rem] uppercase leading-[1.02] text-[#002637]">
                        {gym.name}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.18em]",
                        unlocked
                          ? "bg-[#003d55] text-[#f2dcab]"
                          : "bg-[rgba(0,38,55,0.08)] text-[rgba(0,38,55,0.62)]",
                      )}
                    >
                      {unlocked ? "Besucht" : "Offen"}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[rgba(0,38,55,0.46)]">
                    <MapPin className="h-3.5 w-3.5 text-[#a15523]" />
                    <span>{gym.city ? `${gym.city}, NRW` : "Nordrhein-Westfalen"}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-5">
                      <div className="flex flex-col">
                        <span className="text-[0.48rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.4)]">
                          Besucher
                        </span>
                        <span className="mt-1 font-['Space_Grotesk'] text-sm font-bold text-[#002637]">
                          {communityStats.visitors}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[0.48rem] font-bold uppercase tracking-[0.18em] text-[rgba(0,38,55,0.4)]">
                          Ø Punkte/Route
                        </span>
                        <span className="mt-1 font-['Space_Grotesk'] text-sm font-bold text-[#002637]">
                          {formatAverage(communityStats.averagePoints)}
                        </span>
                      </div>
                    </div>

                    {unlocked ? (
                      <ChevronRight className="h-5 w-5 text-[rgba(0,38,55,0.28)] transition-transform duration-200 group-hover:translate-x-0.5" />
                    ) : (
                      <div className="inline-flex items-center gap-1 rounded-xl border border-[rgba(0,38,55,0.12)] px-3 py-2 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[#003d55]">
                        Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </StitchCard>
            </Link>
          );
        })}

        {gyms.length === 0 ? (
          <StitchCard tone="surface" className="rounded-xl p-5 text-[#002637]" style={{ borderRadius: "0.75rem" }}>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 text-[#a15523]" />
              <div>
                <div className="stitch-headline text-xl text-[#002637]">Noch keine Hallen sichtbar</div>
                <p className="mt-2 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                  Sobald die offiziellen Partnerhallen geladen sind, erscheinen sie hier in der
                  Übersicht.
                </p>
              </div>
            </div>
          </StitchCard>
        ) : null}
      </section>
    </div>
  );
};

export default Gyms;
