import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Flame,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import {
  buildRankingRows,
  getStageRange,
  type RankingRowData,
} from "@/app/pages/participant/participantData";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import type { Gym, Result, Route } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";
import { cn } from "@/lib/utils";

type TabKey = "overall" | "stage";

type ParticipantGymBreakdown = {
  gym: Gym;
  routes: Array<{ route: Route; result: Result; points: number }>;
  totalPoints: number;
};

const ageGroups = ["U9", "U11", "U13", "U15", "Ü15", "Ü40", "Ü50"] as const;

const rankFormatter = new Intl.NumberFormat("de-DE");
const pointsFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const filterRailClassName = "flex min-w-0 items-center gap-0.5 rounded-sm bg-[#003D55]/5 p-0.5";
const filterButtonClassName =
  "inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-sm px-2 py-1.5 font-['Space_Grotesk'] text-[7px] font-bold uppercase leading-none tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003D55]/18 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf9f6] min-[420px]:text-[8px]";
const filterActiveClassName = "bg-[#A15523] text-[#F2DCAB] shadow-sm";
const filterInactiveClassName = "text-[#003D55]/40 hover:text-[#003D55]";

const formatPoints = (value: number) => pointsFormatter.format(value);

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const getAgeGroupClassLabel = (value: string) => {
  const [ageGroup, gender] = value.split("-");
  const genderLabel = gender === "m" ? "männlich" : "weiblich";

  switch (ageGroup) {
    case "U9":
      return `U9 ${genderLabel}`;
    case "U11":
      return `U11 ${genderLabel}`;
    case "U13":
      return `U13 ${genderLabel}`;
    case "U15":
      return `U15 ${genderLabel}`;
    case "Ü15":
      return `Ü15 ${genderLabel}`;
    case "Ü40":
      return `Ü40 ${genderLabel}`;
    case "Ü50":
      return `Ü50 ${genderLabel}`;
    default:
      return value;
  }
};

const getHomeGymLabel = (row: RankingRowData) =>
  row.homeGymName && row.homeGymCity
    ? `${row.homeGymName} ${row.homeGymCity}`
    : row.homeGymName || row.homeGymCity || "Keine Heimathalle";

const buildRankingWindow = (
  rows: RankingRowData[],
  currentProfileId: string | null,
  expanded: boolean,
) => {
  if (rows.length === 0) {
    return {
      visibleRows: [] as RankingRowData[],
      separatorBeforeProfileId: null as string | null,
      hasHiddenRows: false,
    };
  }

  if (expanded) {
    return {
      visibleRows: rows,
      separatorBeforeProfileId: null,
      hasHiddenRows: false,
    };
  }

  const podiumRows = rows.slice(0, Math.min(3, rows.length));
  const currentIndex = currentProfileId ? rows.findIndex((row) => row.profileId === currentProfileId) : -1;

  if (currentIndex < 0) {
    return {
      visibleRows: podiumRows,
      separatorBeforeProfileId: null,
      hasHiddenRows: rows.length > podiumRows.length,
    };
  }

  const windowStart = Math.max(0, currentIndex - 2);
  const windowEnd = Math.min(rows.length, currentIndex + 3);
  const currentWindowRows = rows.slice(windowStart, windowEnd);

  const visibleRows = [...podiumRows, ...currentWindowRows].filter(
    (row, index, list) => list.findIndex((candidate) => candidate.profileId === row.profileId) === index,
  );

  const firstWindowRow = currentWindowRows.find(
    (row) => !podiumRows.some((podiumRow) => podiumRow.profileId === row.profileId),
  );

  if (windowStart <= podiumRows.length - 1) {
    return {
      visibleRows,
      separatorBeforeProfileId: null,
      hasHiddenRows: visibleRows.length < rows.length,
    };
  }

  return {
    visibleRows,
    separatorBeforeProfileId: firstWindowRow?.profileId ?? null,
    hasHiddenRows: visibleRows.length < rows.length,
  };
};

const RankingRowCard = ({
  row,
  isCurrentUser,
  expanded,
  onToggle,
  profileHref,
  participantDetails,
  detailsLabel,
}: {
  row: RankingRowData;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
  profileHref?: string | null;
  participantDetails: ParticipantGymBreakdown[] | null;
  detailsLabel: string;
}) => {
  const progressValue = Math.min(row.visitedGyms, 8);
  const pointsLabel = expanded && isCurrentUser ? "Gesamtpkt" : "Pkt";
  const topRowBackground = isCurrentUser ? "bg-[#003D55]/5" : "bg-white";
  const avatarClassName = cn(
    "h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2",
    isCurrentUser ? "border-[#A15523]" : row.rank === 1 ? "border-[#F2DCAB]" : "border-[#F2DCAB]/20",
  );

  const profileSummary = (
    <>
      <div className={avatarClassName}>
        {row.avatarUrl ? (
          <img src={row.avatarUrl} alt={row.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#003D55] text-sm font-semibold text-[#F2DCAB]">
            {getInitials(row.name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p
            className={cn(
              "truncate font-['Space_Grotesk'] font-bold leading-tight tracking-[-0.04em] text-[#003D55]",
              isCurrentUser ? "text-lg" : "text-base",
            )}
          >
            {row.name}
          </p>
          {isCurrentUser ? (
            <span className="shrink-0 rounded-[3px] bg-[#A15523] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-white">
              DU
            </span>
          ) : profileHref ? (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#A15523]" />
          ) : null}
        </div>

        <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#71787D]">
          <MapPin className="h-3 w-3 shrink-0 text-[#A15523]" />
          <span className="truncate">{getHomeGymLabel(row)}</span>
        </p>
      </div>
    </>
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "block w-full cursor-pointer overflow-hidden rounded-xl text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A15523]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf9f6]",
        isCurrentUser
          ? "bg-white shadow-md ring-2 ring-[#A15523]"
          : "border border-[#F2DCAB]/30 bg-white shadow-sm",
      )}
      aria-expanded={expanded}
    >
      <div className={cn("flex items-center gap-4 p-4", topRowBackground)}>
        <div className="flex w-8 shrink-0 justify-center">
          <span
            className={cn(
              "font-['Space_Grotesk'] text-2xl italic leading-none",
              isCurrentUser || row.rank === 1 ? "font-black text-[#A15523]" : "font-bold text-[#003D55]/40",
            )}
          >
            {String(row.rank).padStart(2, "0")}
          </span>
        </div>

        {profileHref ? (
          <Link
            to={profileHref}
            onClick={(event) => event.stopPropagation()}
            className="flex min-w-0 flex-1 items-center gap-4 rounded-xl transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A15523]/30"
            aria-label={`${row.name} ansehen`}
          >
            {profileSummary}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-4">{profileSummary}</div>
        )}

        <div className="min-w-[4.4rem] shrink-0 text-right">
          <p
            className={cn(
              "font-['Space_Grotesk'] font-extrabold leading-none",
              isCurrentUser ? "text-xl" : "text-base",
              isCurrentUser ? "text-[#A15523]" : "text-[#003D55]",
            )}
          >
            {formatPoints(row.points)}
          </p>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-tight text-[#71787D]">{pointsLabel}</p>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[#003D55]/10 bg-white px-4 pb-3.5 pt-3">
          <div className="mb-3.5">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-['Space_Grotesk'] text-[9px] font-bold uppercase tracking-[0.18em] text-[#003D55]/50">
                Hallen-Fortschritt
              </h4>
              <span className="font-['Space_Grotesk'] text-[10px] font-bold text-[#003D55]">
                {progressValue} / 8
              </span>
            </div>

            <div className="flex gap-1">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={`${row.profileId}-segment-${index}`}
                  className={cn(
                    "h-1 flex-1 rounded-[0.75rem]",
                    index < progressValue ? "bg-[#A15523]" : "bg-[#003D55]/10",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1 border-t border-[#003D55]/5 pt-3 text-center">
            {[
              { label: "Flash", value: row.flashCount, tone: "accent" as const },
              { label: "10 Pkt", value: row.points10, tone: "default" as const },
              { label: "7.5 Pkt", value: row.points7_5, tone: "default" as const },
              { label: "5 Pkt", value: row.points5, tone: "default" as const },
              { label: "2.5 Pkt", value: row.points2_5, tone: "default" as const },
              { label: "Routen", value: row.totalRoutes, tone: "feature" as const },
            ].map((item) => (
              <div
                key={`${row.profileId}-${item.label}`}
                className={cn(
                  "flex min-h-[2.55rem] flex-col justify-center rounded-xl",
                  item.tone === "feature" &&
                    "border border-[#F2DCAB]/80 bg-[#F8F3EA] px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
                )}
              >
                <span
                  className={cn(
                    "mb-0.5 text-[7px] font-bold uppercase",
                    item.tone === "feature" ? "tracking-[0.14em] text-[#A15523]/75" : "text-[#71787D]",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-['Space_Grotesk'] text-[11px] font-bold leading-none",
                    item.tone === "accent" ? "text-[#A15523]" : "text-[#003D55]",
                  )}
                >
                  {formatPoints(item.value)}
                </span>
              </div>
            ))}
          </div>

          {participantDetails && participantDetails.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-[#003D55]/5 pt-3">
              <div className="text-xs text-[#71787D]">{detailsLabel}</div>
              {participantDetails.map((group) => (
                <div
                  key={group.gym.id}
                  className="rounded-lg border border-[#F2DCAB]/60 bg-[#fbfaf7] p-3"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-[#71787D] flex-shrink-0" />
                      <h3 className="truncate text-sm font-semibold text-[#003D55]">{group.gym.name}</h3>
                    </div>
                    <div className="ml-2 flex-shrink-0 text-right">
                      <div className="text-base font-bold text-[#003D55]">
                        {formatPoints(group.totalPoints)}
                      </div>
                      <div className="text-[10px] leading-none text-[#71787D]">Pkt</div>
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {group.routes.map(({ route, result, points }) => (
                      <div
                        key={result.id}
                        className={cn(
                          "flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs",
                          result.flash
                            ? "bg-yellow-500/20 border-yellow-500/40"
                            : "bg-white border-[#003D55]/10",
                        )}
                      >
                        <span className={cn("font-medium text-[11px]", result.flash ? "text-yellow-700" : "")}>
                          {route.code}
                        </span>
                        <span
                          className={cn(
                            "font-semibold text-[11px]",
                            result.flash ? "text-yellow-700" : "text-[#003D55]",
                          )}
                        >
                          {formatPoints(points)}
                        </span>
                        {result.flash ? <Flame className="h-3 w-3 text-yellow-700" /> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 border-t border-[#003D55]/5 pt-3 p-2 text-xs text-[#71787D] text-center">
              Für diese Auswahl liegen noch keine Etappenergebnisse vor.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const AgeGroupRankings = () => {
  const { profile, user } = useAuth();
  const { getAgeGroupRankingClass, getStages } = useSeasonSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profiles, results, routes, gyms, loading, error } = useParticipantCompetitionData();

  const userLeague = (profile?.league || (user?.user_metadata?.league as string | undefined) || "toprope") as
    | "toprope"
    | "lead";

  const [leagueFilter, setLeagueFilter] = useState<"toprope" | "lead">(userLeague);
  const [className, setClassName] = useState("U15-m");
  const [genderFilter, setGenderFilter] = useState<"m" | "w">("m");
  const [ageFilter, setAgeFilter] = useState<(typeof ageGroups)[number]>("U15");
  const [tab, setTab] = useState<TabKey>(searchParams.get("tab") === "stage" ? "stage" : "overall");
  const [stageKey, setStageKey] = useState(searchParams.get("stage") || "");
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [showFullRanking, setShowFullRanking] = useState(false);

  const classInitializedRef = useRef(false);
  const stages = getStages();
  const stageTabAvailable = stages.length > 0;
  const activeTab: TabKey = stageTabAvailable ? tab : "overall";
  const selectedStage = stages.find((stage) => stage.key === stageKey) ?? stages[0] ?? null;

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const paramStage = searchParams.get("stage");

    if (paramTab === "stage" || paramTab === "overall") {
      setTab(paramTab);
    }

    if (paramStage) {
      setStageKey(paramStage);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!stages.length) return;

    if (!stageKey || !stages.some((stage) => stage.key === stageKey)) {
      setStageKey(stages[0].key);
    }
  }, [stageKey, stages]);

  useEffect(() => {
    const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
    const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as
      | "m"
      | "w"
      | undefined;
    const derived = getAgeGroupRankingClass(birthDate ?? null, gender ?? null);

    if (!classInitializedRef.current && derived) {
      setClassName(derived);
      const [age, genderValue] = derived.split("-") as [(typeof ageGroups)[number], "m" | "w"];
      if (age) setAgeFilter(age);
      if (genderValue) setGenderFilter(genderValue);
      classInitializedRef.current = true;
    }
  }, [profile, user, getAgeGroupRankingClass]);

  useEffect(() => {
    setExpandedProfileId(null);
    setShowFullRanking(false);
  }, [leagueFilter, className, activeTab, stageKey]);

  const updateSearchParams = (nextTab: TabKey, nextStageKey = stageKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);

    if (nextStageKey) {
      params.set("stage", nextStageKey);
    } else {
      params.delete("stage");
    }

    setSearchParams(params);
  };

  const stageRange = useMemo(
    () => (activeTab === "stage" && selectedStage ? getStageRange(selectedStage.key, stages) : null),
    [activeTab, selectedStage, stages],
  );

  const rankingRows = useMemo(
    () =>
      buildRankingRows({
        profiles,
        results,
        routes,
        gyms,
        league: leagueFilter,
        className,
        stageRange,
        getClassName: getAgeGroupRankingClass,
      }),
    [className, getAgeGroupRankingClass, gyms, leagueFilter, profiles, results, routes, stageRange],
  );

  const currentProfileId = profile?.id ?? user?.id ?? null;
  const currentUserHomeGymId =
    profile?.home_gym_id ??
    (typeof user?.user_metadata?.home_gym_id === "string" ? user.user_metadata.home_gym_id : null);
  const currentUserHomeGym = useMemo(
    () => (currentUserHomeGymId ? gyms.find((gym) => gym.id === currentUserHomeGymId) ?? null : null),
    [gyms, currentUserHomeGymId],
  );

  const rankingsWithCurrentHomeGym = useMemo(() => {
    if (!currentProfileId || !currentUserHomeGym) return rankingRows;

    return rankingRows.map((row) => {
      if (row.profileId !== currentProfileId) return row;
      if (row.homeGymName || row.homeGymCity) return row;

      return {
        ...row,
        homeGymName: currentUserHomeGym.name,
        homeGymCity: currentUserHomeGym.city ?? null,
      };
    });
  }, [currentProfileId, currentUserHomeGym, rankingRows]);

  const routeMap = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes]);
  const gymMap = useMemo(() => new Map(gyms.map((gym) => [gym.id, gym])), [gyms]);

  const getParticipantDetails = (profileId: string): ParticipantGymBreakdown[] | null => {
    if (!results.length || !routes.length || !gyms.length) return null;

    const participantResults = results.filter((result) => {
      if (result.profile_id !== profileId) return false;

      const route = routeMap.get(result.route_id);
      if (!route) return false;

      const normalized =
        route.discipline === "vorstieg" ? "lead" : route.discipline === "toprope" ? "toprope" : route.discipline;
      if (normalized !== leagueFilter) return false;

      if (stageRange) {
        const createdAt = result.created_at ? new Date(result.created_at) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime()) || createdAt < stageRange.start || createdAt > stageRange.end) {
          return false;
        }
      }

      return true;
    });

    const gymGroups = new Map<string, ParticipantGymBreakdown>();

    participantResults.forEach((result) => {
      const route = routeMap.get(result.route_id);
      if (!route) return;

      const gym = gymMap.get(route.gym_id);
      if (!gym) return;

      const points = (result.points ?? 0) + (result.flash ? 1 : 0);

      if (!gymGroups.has(gym.id)) {
        gymGroups.set(gym.id, { gym, routes: [], totalPoints: 0 });
      }

      const group = gymGroups.get(gym.id);
      if (!group) return;

      group.routes.push({ route, result, points });
      group.totalPoints += points;
    });

    return Array.from(gymGroups.values())
      .map((group) => ({
        ...group,
        routes: [...group.routes].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return a.route.code.localeCompare(b.route.code, "de");
        }),
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.gym.name.localeCompare(b.gym.name, "de");
      });
  };

  const leagueLabel = leagueFilter === "lead" ? "Vorstieg" : "Toprope";
  const classLabel = getAgeGroupClassLabel(className);
  const headerModeLabel =
    activeTab === "stage" ? selectedStage?.label ?? "Etappenwertung" : "Gesamtwertung";
  const visibleWindow = useMemo(
    () => buildRankingWindow(rankingsWithCurrentHomeGym, currentProfileId, showFullRanking),
    [currentProfileId, rankingsWithCurrentHomeGym, showFullRanking],
  );

  if (loading) {
    return (
      <ParticipantStateCard
        title="Altersklassen laden"
        description="Die Altersklassen- und Etappenwertungen werden gerade aufgebaut."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Altersklassen nicht verfügbar" description={error} />;
  }

  return (
    <div className="w-full">
      <section className="sticky top-16 z-30 -mx-4 mb-4 border-b border-[#003D55]/5 bg-[#fbf9f6]/95 px-4 py-2.5 backdrop-blur-xl">
        <div className="mx-auto max-w-lg space-y-2.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <div className={cn(filterRailClassName, "flex-[1.55_1_0%]")}>
              {[
                { value: "lead", label: "VORSTIEG" },
                { value: "toprope", label: "TOP-ROPE" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLeagueFilter(option.value as "toprope" | "lead")}
                  aria-pressed={leagueFilter === option.value}
                  className={cn(
                    filterButtonClassName,
                    "px-2.5 py-2",
                    leagueFilter === option.value ? filterActiveClassName : filterInactiveClassName,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={cn(filterRailClassName, "flex-[0.78_1_0%]")}>
              {[
                { value: "m", label: "M" },
                { value: "w", label: "W" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setGenderFilter(option.value as "m" | "w");
                    setClassName(`${ageFilter}-${option.value}`);
                  }}
                  aria-pressed={genderFilter === option.value}
                  className={cn(
                    filterButtonClassName,
                    "px-2.5 py-2",
                    genderFilter === option.value ? filterActiveClassName : filterInactiveClassName,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-0.5">
            <div className={cn(filterRailClassName, "grid grid-cols-7")}>
              {ageGroups.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => {
                    setAgeFilter(age);
                    setClassName(`${age}-${genderFilter}`);
                  }}
                  aria-pressed={ageFilter === age}
                  className={cn(
                    filterButtonClassName,
                    "w-full px-1 py-2",
                    ageFilter === age ? filterActiveClassName : filterInactiveClassName,
                  )}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setTab("overall");
                updateSearchParams("overall", stageKey);
              }}
              className={cn(
                "rounded-md border px-4 py-3 text-center font-['Space_Grotesk'] text-[0.74rem] font-bold uppercase tracking-[0.06em] transition-all",
                activeTab === "overall"
                  ? "border-[#A15523]/30 bg-[#fff2e8] text-[#A15523] shadow-sm"
                  : "border-[#003D55]/10 bg-white text-[#003D55]/58 hover:text-[#003D55]",
              )}
            >
              Gesamtwertung
            </button>

            <button
              type="button"
              disabled={!stageTabAvailable}
              onClick={() => {
                if (!stageTabAvailable) return;
                setTab("stage");
                updateSearchParams("stage", selectedStage?.key ?? stageKey);
              }}
              className={cn(
                "rounded-md border px-4 py-3 text-center font-['Space_Grotesk'] text-[0.74rem] font-bold uppercase tracking-[0.06em] transition-all disabled:cursor-not-allowed disabled:opacity-50",
                activeTab === "stage"
                  ? "border-[#A15523]/30 bg-[#fff2e8] text-[#A15523] shadow-sm"
                  : "border-[#003D55]/10 bg-white text-[#003D55]/58 hover:text-[#003D55]",
              )}
            >
              Etappenwertung
            </button>
          </div>

          {activeTab === "stage" && selectedStage ? (
            <div className="-mx-0.5 overflow-x-auto px-0.5 hide-scrollbar">
              <div className="flex min-w-max gap-2 pr-1">
                {stages.map((stage) => (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => {
                      setStageKey(stage.key);
                      updateSearchParams("stage", stage.key);
                    }}
                    className={cn(
                      "rounded-md border px-4 py-2.5 font-['Space_Grotesk'] text-[0.66rem] font-bold uppercase tracking-[0.08em] transition-all",
                      selectedStage.key === stage.key
                        ? "border-[#003D55] bg-[#003D55] text-[#F2DCAB] shadow-sm"
                        : "border-[#003D55]/10 bg-white text-[#003D55]/58 hover:text-[#003D55]",
                    )}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-lg">
        <section className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[#A15523]">
              {leagueLabel} • {classLabel}
            </div>
            <div className="mt-1 font-['Space_Grotesk'] text-[1.45rem] font-bold uppercase leading-[0.95] text-[#003D55]">
              {headerModeLabel}
            </div>
          </div>

          <div className="shrink-0 rounded-full bg-[#003D55]/6 px-3 py-1 text-[0.58rem] font-bold uppercase tracking-[0.16em] text-[#003D55]/72">
            {rankFormatter.format(rankingsWithCurrentHomeGym.length)} Einträge
          </div>
        </section>

        {rankingsWithCurrentHomeGym.length === 0 ? (
          <ParticipantStateCard
            title="Noch keine Rangliste"
            description="Für diese Altersklasse und diese Wertung gibt es aktuell noch keine sichtbaren Einträge."
          />
        ) : (
          <>
            <div className="space-y-3">
              {visibleWindow.visibleRows.map((row) => {
                const isExpanded = expandedProfileId === row.profileId;

                return (
                  <div key={row.profileId}>
                    {visibleWindow.separatorBeforeProfileId === row.profileId ? (
                      <div className="flex flex-col items-center gap-1 py-2 opacity-20">
                        <div className="h-1 w-1 rounded-full bg-[#003D55]" />
                        <div className="h-1 w-1 rounded-full bg-[#003D55]" />
                        <div className="h-1 w-1 rounded-full bg-[#003D55]" />
                      </div>
                    ) : null}

                    <RankingRowCard
                      row={row}
                      isCurrentUser={row.profileId === currentProfileId}
                      expanded={isExpanded}
                      participantDetails={isExpanded ? getParticipantDetails(row.profileId) : null}
                      detailsLabel={headerModeLabel}
                      profileHref={row.profileId === currentProfileId ? null : `/app/rankings/profile/${row.profileId}`}
                      onToggle={() =>
                        setExpandedProfileId((current) => (current === row.profileId ? null : row.profileId))
                      }
                    />
                  </div>
                );
              })}
            </div>

            {visibleWindow.hasHiddenRows || showFullRanking ? (
              <div className="mt-7 text-center">
                <button
                  type="button"
                  onClick={() => setShowFullRanking((current) => !current)}
                  className="rounded-[1rem] border border-[#003D55]/10 bg-[#F2DCAB] px-10 py-4 font-['Space_Grotesk'] text-[0.66rem] font-bold uppercase leading-none tracking-[0.24em] text-[#003D55] shadow-sm transition-all hover:shadow-md"
                >
                  {showFullRanking ? "Fokussierte Ansicht" : "Komplette Rangliste anzeigen"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default AgeGroupRankings;
