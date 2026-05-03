import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Flag,
  MapPinned,
  QrCode,
  Timer,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { RouteHighlightCard } from "@/app/components/RouteHighlightCard";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { useParticipantUserResultsQuery } from "@/app/pages/participant/participantQueries";
import { StitchBadge, StitchButton } from "@/app/components/StitchPrimitives";
import { toast } from "@/components/ui/use-toast";
import { formatUnlockDate, useLaunchSettings } from "@/config/launch";
import type { Gym, Result, Route, Stage } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";

const WILDCARD_TARGET = 8;

const LOGO_FALLBACKS: Record<string, string> = {
  "2T Lindlar": "/gym-logos-real/2t-lindlar.png",
  "Canyon Chorweiler": "/gym-logos-real/canyon-chorweiler.jpg",
  "Chimpanzodrome Frechen": "/gym-logos-real/chimpanzodrome-frechen.png",
  "DAV Alpinzentrum Bielefeld": "/gym-logos-real/dav-bielefeld.svg",
  "KletterBar Münster": "/gym-logos-real/kletterbar-muenster.png",
  "Kletterfabrik Köln": "/gym-logos-real/kletterfabrik-koeln.png",
  "Kletterwelt Sauerland": "/gym-logos-real/kletterwelt-sauerland.jpg",
  OWL: "/gym-logos-real/owl.jpg",
};

const normalizeGymName = (name: string) => {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (cleaned === "Kletterzentrum OWL" || cleaned === "DAV Kletterzentrum Siegerland") return "OWL";
  return cleaned;
};

type StageItem = Stage & { range: string };

type RecentRouteEntry = {
  id: string;
  name: string;
  routeCode: string | null;
  discipline: "toprope" | "lead" | null;
  gymName: string;
  timestamp: string | null;
  points: number;
  flash: boolean;
  top: boolean;
};

type WildcardSlot = {
  id: string;
  gym: Gym | null;
  status: "done" | "open" | "empty";
  lastActivity: string | null;
};

const formatDateLabel = (value: string | null) => {
  if (!value) return "Kein Datum";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Kein Datum";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatRelativeLabel = (value: string | null) => {
  if (!value) return "Ohne Datum";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ohne Datum";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffHours < 1) return "Gerade eben";
  if (diffHours < 24) return `Vor ${diffHours} Std.`;
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  return formatDateLabel(value);
};

const getResultTimestamp = (result: Result) => result.updated_at || result.created_at || null;

const getTimeValue = (value: string | null) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const Home = () => {
  const { profile, user, role } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.first_name || (user?.user_metadata?.first_name as string | undefined);
  const lastName = profile?.last_name || (user?.user_metadata?.last_name as string | undefined);
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const birthDate =
    profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
  const gender = (
    profile?.gender || (user?.user_metadata?.gender as string | undefined)
  ) as "m" | "w" | undefined;
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const {
    gyms: competitionGyms,
    routes,
    profiles: allProfiles,
    results: allResults,
    loading: competitionLoading,
    error: competitionError,
  } = useParticipantCompetitionData();
  const {
    results,
    loading: userResultsLoading,
    error: userResultsError,
  } = useParticipantUserResultsQuery(profile?.id);
  const {
    getClassName,
    getStages,
    getSeasonYear,
    getPreparationEnd,
    getPreparationStart,
    getFinaleDate,
    getFinaleEnabled,
  } = useSeasonSettings();
  const { participantFeatureLocked: featureLocked, unlockDate } = useLaunchSettings();
  const unlockDateLabel = formatUnlockDate(unlockDate);
  const isParticipationActivated = Boolean(profile?.participation_activated_at);

  useEffect(() => {
    if (role === "gym_admin") {
      navigate("/app/admin/gym", { replace: true });
    } else if (role === "league_admin") {
      navigate("/app/admin/league", { replace: true });
    }
  }, [role, navigate]);

  const gyms = useMemo(
    () =>
      competitionGyms.map((gym) => {
        const normalizedName = normalizeGymName(gym.name);
        return {
          ...gym,
          name: normalizedName,
          logo_url: gym.logo_url ?? LOGO_FALLBACKS[normalizedName] ?? null,
        };
      }),
    [competitionGyms],
  );

  const routeMap = useMemo(
    () => new Map(routes.map((route) => [route.id, route])),
    [routes],
  );
  const gymMap = useMemo(() => new Map(gyms.map((gym) => [gym.id, gym])), [gyms]);
  const activeLeague = league === "lead" || league === "toprope" ? league : null;

  useEffect(() => {
    if (!profile?.id || !allProfiles.length || !allResults.length || !routes.length || !activeLeague) {
      setCurrentRank(null);
      return;
    }

    const classKey = getClassName(birthDate ?? null, gender ?? null);
    if (!classKey) {
      setCurrentRank(null);
      return;
    }

    const disciplineMap = new Map(routes.map((route) => [route.id, route.discipline]));
    const totals = allResults.reduce<Record<string, number>>((acc, result) => {
      if (disciplineMap.get(result.route_id) !== activeLeague) return acc;
      acc[result.profile_id] =
        (acc[result.profile_id] ?? 0) + (result.points ?? 0) + (result.flash ? 1 : 0);
      return acc;
    }, {});

    const rows = allProfiles
      .filter((item) => item.role !== "gym_admin" && item.role !== "league_admin")
      .map((item) => ({
        id: item.id,
        className: getClassName(item.birth_date, item.gender) || null,
        points: totals[item.id] ?? 0,
      }))
      .filter((row) => row.className === classKey)
      .sort((a, b) => b.points - a.points);

    const index = rows.findIndex((row) => row.id === profile.id);
    setCurrentRank(index >= 0 ? index + 1 : null);
  }, [
    profile?.id,
    birthDate,
    gender,
    allProfiles,
    allResults,
    routes,
    activeLeague,
    getClassName,
  ]);

  const filteredResults = useMemo(() => {
    if (!activeLeague) return results;
    return results.filter((result) => routeMap.get(result.route_id)?.discipline === activeLeague);
  }, [results, routeMap, activeLeague]);

  const stats = useMemo(() => {
    const points = filteredResults.reduce(
      (sum, result) => sum + (result.points ?? 0) + (result.flash ? 1 : 0),
      0,
    );
    const routesClimbed = filteredResults.filter((result) => result.points > 0).length;
    const flashCount = filteredResults.filter((result) => result.flash).length;
    const visitedGymIds = new Set(
      filteredResults
        .map((result) => routeMap.get(result.route_id)?.gym_id)
        .filter(Boolean) as string[],
    );

    return {
      points,
      routesClimbed,
      flashCount,
      visitedGyms: visitedGymIds.size,
      avgPointsPerRoute: routesClimbed > 0 ? points / routesClimbed : 0,
    };
  }, [filteredResults, routeMap]);

  const stagesFromSettings = getStages();
  const prepStart = getPreparationStart();
  const prepEnd = getPreparationEnd();
  const finaleDate = getFinaleDate();
  const now = useMemo(() => Date.now(), []);

  const stages: StageItem[] = useMemo(() => {
    const items: StageItem[] = [];

    if (prepStart && prepEnd) {
      const prepStartDate = new Date(prepStart);
      const prepEndDate = new Date(prepEnd);
      items.push({
        key: "preparation",
        label: "Schraubphase",
        start: prepStart,
        end: prepEnd,
        range: `${prepStartDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })} - ${prepEndDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
        })}`,
      });
    }

    stagesFromSettings.forEach((stage) => {
      const startDate = new Date(stage.start);
      const monthName = startDate.toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
      });
      items.push({
        ...stage,
        range: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      });
    });

    if (finaleDate) {
      const finaleDateObj = new Date(finaleDate);
      items.push({
        key: "finale",
        label: "Finale",
        start: finaleDate,
        end: finaleDate,
        range: finaleDateObj.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      });
    }

    return items;
  }, [stagesFromSettings, prepStart, prepEnd, finaleDate]);

  const heroStage = useMemo(() => {
    const today = now;
    const active = stages.find((stage) => {
      const start = new Date(`${stage.start}T00:00:00`);
      const end = new Date(`${stage.end}T23:59:59`);
      return today >= start.getTime() && today <= end.getTime();
    });

    if (active) return active;

    const upcoming = stages.find(
      (stage) => new Date(`${stage.start}T00:00:00`).getTime() > today,
    );
    return upcoming ?? stages.at(-1) ?? null;
  }, [now, stages]);

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    firstName ||
    lastName ||
    "Dein Saisonprofil";
  const heroFirstLine = firstName || fullName;
  const heroSecondLine = firstName && lastName ? lastName : null;
  const classLabel = getClassName(birthDate, gender) || "Klasse offen";
  const leagueLabel =
    league === "lead" ? "Vorstieg" : league === "toprope" ? "Toprope" : "Liga offen";
  const heroStageLabel =
    heroStage?.label || `Saison ${getSeasonYear() || new Date().getFullYear().toString()}`;
  const heroStageRange = heroStage?.range || null;

  const recentRoutes = useMemo<RecentRouteEntry[]>(() => {
    return [...filteredResults]
      .sort((a, b) => getTimeValue(getResultTimestamp(b)) - getTimeValue(getResultTimestamp(a)))
      .slice(0, 3)
      .map((result) => {
        const route = routeMap.get(result.route_id);
        const gym = route ? gymMap.get(route.gym_id) : null;
        return {
          id: result.id,
          name: route?.name || route?.code || "Route",
          routeCode: route?.code ?? null,
          discipline: route?.discipline ?? null,
          gymName: gym?.name || "Halle",
          timestamp: getResultTimestamp(result),
          points: (result.points ?? 0) + (result.flash ? 1 : 0),
          flash: result.flash,
          top: (result.points ?? 0) > 0,
        };
      });
  }, [filteredResults, routeMap, gymMap]);

  const wildcardSlots = useMemo<WildcardSlot[]>(() => {
    const sortedResults = [...filteredResults].sort(
      (a, b) => getTimeValue(getResultTimestamp(b)) - getTimeValue(getResultTimestamp(a)),
    );

    const visitedMap = new Map<string, WildcardSlot>();

    sortedResults.forEach((result) => {
      const route = routeMap.get(result.route_id);
      if (!route) return;

      const gym = gymMap.get(route.gym_id) ?? null;
      const existing = visitedMap.get(route.gym_id);

      if (!existing) {
        visitedMap.set(route.gym_id, {
          id: `done-${route.gym_id}`,
          gym,
          status: "done",
          lastActivity: getResultTimestamp(result),
        });
        return;
      }
    });

    const visited = Array.from(visitedMap.values())
      .sort((a, b) => getTimeValue(b.lastActivity) - getTimeValue(a.lastActivity))
      .slice(0, WILDCARD_TARGET);

    const unvisited = gyms
      .filter((gym) => !visitedMap.has(gym.id))
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .slice(0, Math.max(0, WILDCARD_TARGET - visited.length))
      .map<WildcardSlot>((gym) => ({
        id: `open-${gym.id}`,
        gym,
        status: "open",
        lastActivity: null,
      }));

    const emptySlots = Array.from({
      length: Math.max(0, WILDCARD_TARGET - visited.length - unvisited.length),
    }).map<WildcardSlot>((_, index) => ({
      id: `empty-${index}`,
      gym: null,
      status: "empty",
      lastActivity: null,
    }));

    return [...visited, ...unvisited, ...emptySlots];
  }, [filteredResults, gyms, gymMap, routeMap]);

  const progress = Math.round(
    (Math.min(stats.visitedGyms, WILDCARD_TARGET) / WILDCARD_TARGET) * 100,
  );
  const quickActionTarget = getFinaleEnabled() ? "/app/finale" : "/app/rankings";
  const quickActionLabel = getFinaleEnabled() ? "Finale" : "Rangliste";
  const showLockedFeatureNotice = (featureLabel: string) => {
    toast({
      title: "Bereich noch gesperrt",
      description: `${featureLabel} öffnen am ${unlockDateLabel}. Bis dahin bleibt dein Dashboard für Profil und Vorbereitung offen.`,
    });
  };
  const homeError = competitionError || userResultsError;
  const homeLoading = competitionLoading || userResultsLoading;

  if (homeLoading) {
    return (
      <ParticipantStateCard
        title="Dashboard lädt"
        description="Deine Saisonübersicht wird gerade für den Teilnehmerbereich vorbereitet."
      />
    );
  }

  if (homeError) {
    return <ParticipantStateCard title="Dashboard nicht verfügbar" description={homeError} />;
  }

  return (
    <>
      <div className="space-y-7">
        <section className="space-y-6">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-[0.65rem] bg-[#a15523] px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white">
              <span>{leagueLabel}</span>
              <span className="h-1 w-1 rounded-full bg-white/75" />
              <span>{classLabel}</span>
            </div>

            <div className="space-y-4">
              <div className="stitch-headline text-[3.1rem] uppercase leading-[0.88] tracking-[-0.04em] text-[#f2dcab]">
                <div>{heroFirstLine}</div>
                {heroSecondLine ? <div className="text-[#a15523]">{heroSecondLine}</div> : null}
              </div>
              <p className="flex items-center gap-2 text-sm font-medium text-[rgba(242,220,171,0.76)]">
                <Flag className="h-4 w-4 text-[#f2dcab]" />
                <span>{heroStageLabel}</span>
                {heroStageRange ? <span className="text-[#f2dcab]">|</span> : null}
                {heroStageRange ? <span className="text-[#f2dcab]">{heroStageRange}</span> : null}
              </p>
            </div>

            <StitchButton
              asChild
              className={`w-full justify-center rounded-xl py-4 text-[0.82rem] ${
                featureLocked ? "opacity-80" : ""
              }`}
            >
              <Link
                to={isParticipationActivated ? "/app/gyms/redeem" : "/app/participation/redeem"}
                onClick={(event) => {
                  if (!featureLocked) return;
                  event.preventDefault();
                  showLockedFeatureNotice(isParticipationActivated ? "Hallen-Codes" : "Mastercode");
                }}
                aria-disabled={featureLocked}
              >
                <QrCode className="h-4 w-4" />
                {isParticipationActivated ? "Hallen-Code einlösen" : "Mastercode freischalten"}
              </Link>
            </StitchButton>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="stitch-glass-card relative overflow-hidden rounded-xl border-l-4 border-l-[#a15523] p-6">
              <Trophy className="absolute -bottom-4 -right-4 h-24 w-24 rotate-12 text-[rgba(242,220,171,0.07)]" />
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Gesamtpunkte</div>
              <div className="stitch-metric mt-4 text-[4.3rem] italic leading-none text-[#f2dcab]">
                {stats.points}
              </div>
              <p className="mt-5 flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#a15523]">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>{currentRank ? `Platz ${currentRank} deiner Klasse` : classLabel}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="stitch-glass-card rounded-xl border-l-4 border-l-[rgba(242,220,171,0.18)] p-5">
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Routen</div>
                <div className="stitch-metric mt-4 text-4xl text-[#f2dcab]">{stats.routesClimbed}</div>
                <p className="mt-2 text-[0.62rem] uppercase tracking-[0.18em] text-[rgba(242,220,171,0.44)]">
                  Eingetragen
                </p>
              </div>

              <div className="stitch-glass-card rounded-xl border-l-4 border-l-[#a15523] p-5">
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Flash Count</div>
                <div className="stitch-metric mt-4 text-4xl text-[#a15523]">{stats.flashCount}</div>
                <p className="mt-2 text-[0.62rem] uppercase tracking-[0.18em] text-[rgba(242,220,171,0.44)]">
                  Im ersten Versuch
                </p>
              </div>
            </div>

            <div className="stitch-glass-card rounded-xl border-l-4 border-l-[rgba(242,220,171,0.18)] p-5">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">
                Durchschnittliche Punkte pro Route
              </div>
              <div className="stitch-metric mt-4 text-4xl text-[#f2dcab]">
                {stats.routesClimbed > 0 ? stats.avgPointsPerRoute.toFixed(1) : "0.0"}
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-[#f2dcab]"
                  style={{
                    width: `${Math.max(
                      10,
                      Math.min(100, Math.round((stats.avgPointsPerRoute / 12) * 100)),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="stitch-glass-card rounded-xl p-5">
              <div className="space-y-2">
                <div className="stitch-headline text-[1.7rem] uppercase leading-[1.05] text-[#f2dcab]">
                  <div>Wildcard-</div>
                  <div>Qualifikation</div>
                </div>
                <p className="text-sm leading-6 text-[rgba(242,220,171,0.68)]">
                  Besuche 8 verschiedene Hallen in NRW für das Finale.
                </p>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/20">
                <div className="h-full rounded-full bg-[#a15523]" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(242,220,171,0.45)]">
                <span>Start</span>
                <span className="text-sm text-[#a15523]">
                  {Math.min(stats.visitedGyms, WILDCARD_TARGET)} von 8 Hallen
                </span>
                <span>Finale</span>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3">
                {wildcardSlots.map((slot) => {
                  const logoUrl = slot.gym?.logo_url ?? null;
                  const slotTone =
                    slot.status === "done"
                      ? "border-[#a15523]/60 bg-[#a15523]/16 shadow-[0_16px_28px_rgba(161,85,35,0.18)]"
                      : slot.status === "open"
                        ? "border-[rgba(242,220,171,0.12)] bg-black/20"
                        : "border-[rgba(242,220,171,0.08)] bg-black/10";

                  return (
                    <div
                      key={slot.id}
                      className={`flex aspect-square items-center justify-center overflow-hidden rounded-xl border ${slotTone}`}
                      aria-label={
                        slot.gym
                          ? `${slot.gym.name} ${slot.status === "done" ? "besucht" : "offen"}`
                          : "Leerer Wildcard-Slot"
                      }
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={slot.gym?.name || "Hallenlogo"}
                          className={`h-full w-full object-contain p-2.5 ${
                            slot.status === "done" ? "" : "opacity-45 grayscale"
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center px-2 text-center text-[0.62rem] font-bold uppercase tracking-[0.14em] ${
                            slot.status === "done"
                              ? "text-[#f2dcab]"
                              : "text-[rgba(242,220,171,0.45)]"
                          }`}
                        >
                          {slot.gym?.name ? slot.gym.name : "Offen"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[#a15523]" />
            <div className="stitch-kicker text-[#f2dcab]">Letzte Routen</div>
          </div>

          <div className="space-y-4">
            {recentRoutes.length > 0 ? (
              recentRoutes.map((entry) => (
                <RouteHighlightCard
                  key={entry.id}
                  routeCode={entry.routeCode}
                  discipline={entry.discipline}
                  title={entry.name}
                  subtitle={`${formatRelativeLabel(entry.timestamp)} | ${entry.gymName}`}
                  eyebrow={entry.flash ? "Flash" : entry.top ? "Top" : "Offen"}
                  value={`+${entry.points} pts`}
                  accent={entry.flash}
                  interactive
                />
              ))
            ) : (
              <div className="stitch-glass-card rounded-xl p-5 text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                Sobald du Ergebnisse einträgst, erscheinen hier deine letzten drei Routen
                inklusive Punkte, Route und Hallenbezug.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="stitch-glass-card rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Saison-Timeline</div>
                <div className="stitch-headline mt-2 text-2xl text-[#f2dcab]">
                  Aktuelle und nächste Etappen
                </div>
              </div>
              {getFinaleEnabled() ? (
                <StitchBadge
                  tone="ghost"
                  className="border-[rgba(242,220,171,0.16)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab]"
                >
                  Finale aktiv
                </StitchBadge>
              ) : null}
            </div>

            <div className="stitch-scroll-x mt-5 -mx-1 overflow-x-auto px-1">
              <div className="flex gap-3 pb-1">
                {stages.map((stage) => {
                  const startDate = new Date(`${stage.start}T00:00:00`);
                  const endDate = new Date(`${stage.end}T23:59:59`);
                  const isUpcoming = now < startDate.getTime();
                  const isCurrent =
                    now >= startDate.getTime() &&
                    now <= endDate.getTime();
                  const startsInDays = Math.max(
                    0,
                    Math.ceil((startDate.getTime() - now) / (1000 * 60 * 60 * 24)),
                  );
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((endDate.getTime() - now) / (1000 * 60 * 60 * 24)),
                  );

                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => {
                        if (featureLocked) {
                          showLockedFeatureNotice("Ranglisten und Etappen");
                          return;
                        }
                        navigate(`/app/rankings?tab=stage&stage=${stage.key}`);
                      }}
                      className={`min-w-[210px] rounded-xl border p-4 text-left transition-all ${
                        isCurrent
                          ? "border-[#a15523] bg-[#a15523] text-white shadow-[0_18px_28px_rgba(161,85,35,0.18)]"
                          : "border-[rgba(242,220,171,0.12)] bg-[rgba(0,38,55,0.12)] text-[#f2dcab]"
                      } ${featureLocked ? "opacity-80" : ""}`}
                      aria-disabled={featureLocked}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`stitch-kicker ${
                              isCurrent ? "text-white/72" : "text-[rgba(242,220,171,0.62)]"
                            }`}
                          >
                            {stage.label}
                          </div>
                          <div className="stitch-headline mt-3 text-xl">{stage.range}</div>
                        </div>
                        <Timer
                          className={`h-5 w-5 ${isCurrent ? "text-white/72" : "text-[#f2dcab]"}`}
                        />
                      </div>
                      <p
                        className={`mt-3 text-sm leading-6 ${
                          isCurrent ? "text-white/82" : "text-[rgba(242,220,171,0.72)]"
                        }`}
                      >
                        {isUpcoming
                          ? `Startet in ${startsInDays} Tagen`
                          : isCurrent
                            ? `Läuft noch ${daysLeft} Tage`
                            : "Bereits abgeschlossen"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="stitch-glass-card rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Quick Actions</div>
                <div className="stitch-headline mt-2 text-2xl text-[#f2dcab]">
                  Direkt weiter
                </div>
              </div>
              <CalendarDays className="h-6 w-6 text-[#f2dcab]" />
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                to="/app/gyms"
                onClick={(event) => {
                  if (!featureLocked) return;
                  event.preventDefault();
                  showLockedFeatureNotice("Partnerhallen");
                }}
                className={`flex items-center justify-between rounded-xl bg-[rgba(0,38,55,0.14)] px-4 py-4 text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.08)] ${
                  featureLocked ? "opacity-80" : ""
                }`}
                aria-disabled={featureLocked}
              >
                <span className="flex items-center gap-3 font-semibold">
                  <MapPinned className="h-5 w-5 text-[#f2dcab]" />
                  Hallen ansehen
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to={quickActionTarget}
                onClick={(event) => {
                  if (!featureLocked) return;
                  event.preventDefault();
                  showLockedFeatureNotice(quickActionLabel);
                }}
                className={`flex items-center justify-between rounded-xl bg-[rgba(0,38,55,0.14)] px-4 py-4 text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.08)] ${
                  featureLocked ? "opacity-80" : ""
                }`}
                aria-disabled={featureLocked}
              >
                <span className="flex items-center gap-3 font-semibold">
                  <Trophy className="h-5 w-5 text-[#f2dcab]" />
                  {quickActionLabel}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>

    </>
  );
};

export default Home;

