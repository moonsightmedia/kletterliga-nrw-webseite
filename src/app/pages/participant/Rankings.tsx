import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BarChart3, Flame, MapPin, TrendingUp } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import {
  buildRankingRowsForScope,
  type RankingAgeScope,
  type RankingGenderScope,
  type RankingLeagueScope,
  type RankingRowData,
} from "@/app/pages/participant/participantData";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { useSeasonSettings } from "@/services/seasonSettings";
import { cn } from "@/lib/utils";

const rankFormatter = new Intl.NumberFormat("de-DE");
const pointsFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const formatPoints = (value: number) => pointsFormatter.format(value);

const getDateBoundaryTime = (value: string, boundary: "start" | "end") => {
  const suffix = boundary === "end" ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const time = new Date(`${value}${suffix}`).getTime();
  return Number.isNaN(time) ? null : time;
};

const getCreatedAtTime = (value: string | null | undefined) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const formatPlaceDelta = (value: number) => `${value} ${value === 1 ? "Platz" : "Plätze"}`;

type RankingLeagueFilterValue = Exclude<RankingLeagueScope, "all">;
type RankingAgeFilterValue = Exclude<RankingAgeScope, "all">;

const getLeagueScopeFromValue = (value: string | null | undefined): RankingLeagueFilterValue => {
  if (value === "toprope") return "toprope";
  return "lead";
};

const getAgeScopeFromClassName = (className: string | null): RankingAgeFilterValue => {
  if (className?.startsWith("U15-")) return "U15";
  if (className?.startsWith("\u00dc15-")) return "UE15";
  if (className?.startsWith("\u00dc40-")) return "UE40";
  return "U15";
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

  const firstWindowRow = currentWindowRows.find((row) => !podiumRows.some((podiumRow) => podiumRow.profileId === row.profileId));

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
}: {
  row: RankingRowData;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
  profileHref?: string | null;
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

        <div className="flex min-w-0 flex-1 items-center gap-4">{profileSummary}</div>

        {profileHref ? (
          <Link
            to={profileHref}
            onClick={(event) => event.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#A15523] transition-colors hover:bg-[#A15523]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A15523]/30"
            aria-label={`${row.name} Profil ansehen`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}

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
        </div>
      ) : null}
    </div>
  );
};

const leagueOptions: Array<{ value: RankingLeagueFilterValue; label: string }> = [
  { value: "lead", label: "VORSTIEG" },
  { value: "toprope", label: "TOP-ROPE" },
];

const genderOptions: Array<{ value: RankingGenderScope; label: string }> = [
  { value: "m", label: "M" },
  { value: "w", label: "W" },
];

const ageOptions: Array<{ value: RankingAgeFilterValue; label: string }> = [
  { value: "U15", label: "U15" },
  { value: "UE15", label: "\u00dc15" },
  { value: "UE40", label: "\u00dc40" },
];

const filterGroupClassName =
  "flex min-w-0 items-center gap-0.5 rounded-sm bg-[#003D55]/5 p-0.5";

const filterButtonClassName =
  "inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-sm px-2 py-1.5 font-['Space_Grotesk'] text-[7px] font-bold uppercase leading-none tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003D55]/18 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf9f6] min-[420px]:text-[8px]";

const filterActiveClassName =
  "bg-[#A15523] text-[#F2DCAB] shadow-sm";

const filterInactiveClassName = "text-[#003D55]/40 hover:text-[#003D55]";

const Rankings = () => {
  const { profile, user } = useAuth();
  const { settings, getClassName, getStages } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error } = useParticipantCompetitionData();
  const [leagueScope, setLeagueScope] = useState<RankingLeagueFilterValue>("lead");
  const [genderFilter, setGenderFilter] = useState<RankingGenderScope>("m");
  const [ageFilter, setAgeFilter] = useState<RankingAgeFilterValue>("U15");
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [showFullRanking, setShowFullRanking] = useState(false);

  const profileGender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as
    | "m"
    | "w"
    | undefined;
  const profileLeague = (profile?.league || (user?.user_metadata?.league as string | undefined)) ?? null;
  const profileBirthDate = (profile?.birth_date || (user?.user_metadata?.birth_date as string | undefined)) ?? null;
  const defaultLeagueScope = getLeagueScopeFromValue(profileLeague);
  const defaultGenderFilter: RankingGenderScope = profileGender === "w" ? "w" : "m";
  const defaultAgeFilter = getAgeScopeFromClassName(getClassName(profileBirthDate, profileGender ?? null));
  const stages = getStages();

  useEffect(() => {
    setLeagueScope(defaultLeagueScope);
    setGenderFilter(defaultGenderFilter);
    setAgeFilter(defaultAgeFilter);
  }, [
    defaultLeagueScope,
    defaultGenderFilter,
    defaultAgeFilter,
    settings?.age_cutoff_date,
    settings?.qualification_start,
    settings?.age_u16_max,
    settings?.age_u40_min,
  ]);

  useEffect(() => {
    setExpandedProfileId(null);
    setShowFullRanking(false);
  }, [leagueScope, genderFilter, ageFilter]);

  const rankingRows = useMemo(
    () =>
      buildRankingRowsForScope({
        profiles,
        results,
        routes,
        gyms,
        leagueScope,
        gender: genderFilter,
        ageScope: ageFilter,
        getClassName,
      }),
    [profiles, results, routes, gyms, leagueScope, genderFilter, ageFilter, getClassName],
  );

  const currentProfileId = profile?.id ?? user?.id ?? null;
  const currentUserHomeGymId =
    profile?.home_gym_id ?? (typeof user?.user_metadata?.home_gym_id === "string" ? user.user_metadata.home_gym_id : null);
  const currentUserHomeGym = useMemo(
    () => (currentUserHomeGymId ? gyms.find((gym) => gym.id === currentUserHomeGymId) ?? null : null),
    [gyms, currentUserHomeGymId],
  );
  const rankingRowsWithCurrentHomeGym = useMemo(() => {
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
  }, [rankingRows, currentProfileId, currentUserHomeGym]);
  const defaultRankingRows = useMemo(
    () =>
      buildRankingRowsForScope({
        profiles,
        results,
        routes,
        gyms,
        leagueScope: defaultLeagueScope,
        gender: defaultGenderFilter,
        ageScope: defaultAgeFilter,
        getClassName,
      }),
    [profiles, results, routes, gyms, defaultLeagueScope, defaultGenderFilter, defaultAgeFilter, getClassName],
  );
  const currentUserStatsRow = useMemo(
    () => defaultRankingRows.find((row) => row.profileId === currentProfileId) ?? null,
    [defaultRankingRows, currentProfileId],
  );
  const previousStage = useMemo(() => {
    if (stages.length < 2) return null;

    const now = Date.now();
    let latestStartedStageIndex = -1;

    stages.forEach((stage, index) => {
      const stageStart = getDateBoundaryTime(stage.start, "start");
      if (stageStart !== null && stageStart <= now) {
        latestStartedStageIndex = index;
      }
    });

    if (latestStartedStageIndex <= 0) return null;
    return stages[latestStartedStageIndex - 1] ?? null;
  }, [stages]);
  const previousStageResults = useMemo(() => {
    if (!previousStage) return [];

    const cutoffTime = getDateBoundaryTime(previousStage.end, "end");
    if (cutoffTime === null) return [];

    return results.filter((result) => {
      const createdAtTime = getCreatedAtTime(result.created_at);
      return createdAtTime !== null && createdAtTime <= cutoffTime;
    });
  }, [results, previousStage]);
  const previousStageRankingRows = useMemo(() => {
    if (!previousStage) return [];

    return buildRankingRowsForScope({
      profiles,
      results: previousStageResults,
      routes,
      gyms,
      leagueScope: defaultLeagueScope,
      gender: defaultGenderFilter,
      ageScope: defaultAgeFilter,
      getClassName,
    });
  }, [
    profiles,
    previousStageResults,
    routes,
    gyms,
    previousStage,
    defaultLeagueScope,
    defaultGenderFilter,
    defaultAgeFilter,
    getClassName,
  ]);
  const previousStageRank = useMemo(
    () => previousStageRankingRows.find((row) => row.profileId === currentProfileId)?.rank ?? null,
    [previousStageRankingRows, currentProfileId],
  );
  const rankDeltaInfo = useMemo(() => {
    if (!currentUserStatsRow) {
      return {
        label: "Keine Wertung",
        tone: "neutral" as const,
      };
    }

    if (!previousStage) {
      return {
        label: "Noch kein Vergleich",
        tone: "neutral" as const,
      };
    }

    if (previousStageRank === null) {
      return {
        label: "Neu in Wertung",
        tone: "neutral" as const,
      };
    }

    const rankDelta = previousStageRank - currentUserStatsRow.rank;

    if (rankDelta > 0) {
      return {
        label: `+${formatPlaceDelta(rankDelta)}`,
        tone: "improved" as const,
      };
    }

    if (rankDelta < 0) {
      return {
        label: `-${formatPlaceDelta(Math.abs(rankDelta))}`,
        tone: "declined" as const,
      };
    }

    return {
      label: "Unverändert",
      tone: "neutral" as const,
    };
  }, [currentUserStatsRow, previousStage, previousStageRank]);
  const topPercentLabel = useMemo(() => {
    if (!currentUserStatsRow || defaultRankingRows.length === 0) return "Top --";

    const percentile = Math.ceil((currentUserStatsRow.rank / defaultRankingRows.length) * 100);
    return `Top ${Math.min(100, Math.max(1, percentile))}%`;
  }, [currentUserStatsRow, defaultRankingRows.length]);
  const visibleWindow = useMemo(
    () => buildRankingWindow(rankingRowsWithCurrentHomeGym, currentProfileId, showFullRanking),
    [rankingRowsWithCurrentHomeGym, currentProfileId, showFullRanking],
  );
  const isSparseWindow = visibleWindow.visibleRows.length <= 1;
  const rankDeltaChipClassName =
    rankDeltaInfo.tone === "improved"
      ? "bg-[#A15523] text-white shadow-sm"
      : rankDeltaInfo.tone === "declined"
        ? "bg-[#8C3B2A] text-white shadow-sm"
        : "bg-[#F2DCAB]/14 text-[#F2DCAB] ring-1 ring-inset ring-[#F2DCAB]/12";
  const rankDeltaIconClassName =
    rankDeltaInfo.tone === "declined"
      ? "rotate-180"
      : rankDeltaInfo.tone === "neutral"
        ? "opacity-70"
        : "";

  if (loading) {
    return (
      <ParticipantStateCard
        title="Rangliste lädt"
        description="Die aktuellen Platzierungen werden gerade mit den neuesten Teilnehmerdaten aufgebaut."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Rangliste nicht verfügbar" description={error} />;
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-lg">
        <section className="mb-6">
          <div className="relative overflow-hidden rounded-xl bg-[#003D55] p-6 shadow-lg">
            <BarChart3 className="absolute -bottom-7 -right-6 h-32 w-32 rotate-[12deg] text-[#F2DCAB]/5" />

            <h2 className="mb-4 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.24em] text-[#F2DCAB]/80">
              Dein aktueller Stand
            </h2>

            <div className="relative z-10 flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-['Space_Grotesk'] text-5xl font-bold italic leading-none text-[#F2DCAB]">
                  {currentUserStatsRow ? `#${rankFormatter.format(currentUserStatsRow.rank)}` : "#-"}
                </span>
                <span className="font-['Space_Grotesk'] text-lg font-semibold text-[#F2DCAB]/60">
                  / {rankFormatter.format(defaultRankingRows.length)}
                </span>
              </div>

              <div className="text-right">
                <p className="font-['Space_Grotesk'] text-2xl font-bold text-[#F2DCAB]">
                  {formatPoints(currentUserStatsRow?.points ?? 0)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-tight text-[#F2DCAB]/70">Gesamtpunkte</p>
              </div>
            </div>

            <div className="relative z-10 mt-6 flex gap-3">
              <div className={cn("flex items-center gap-2 rounded-xl px-4 py-1.5", rankDeltaChipClassName)}>
                <TrendingUp className={cn("h-4 w-4 transition-transform", rankDeltaIconClassName)} />
                <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.15em]">
                  {rankDeltaInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-[#F2DCAB]/20 bg-[#F2DCAB]/10 px-4 py-1.5 text-[#F2DCAB] backdrop-blur-md">
                <Flame className="h-4 w-4" />
                <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.15em]">
                  {topPercentLabel}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="sticky top-16 z-30 -mx-4 mb-4 border-b border-[#003D55]/5 bg-[#fbf9f6]/95 px-4 py-2.5 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-1.5 px-0.5">
            <div className={cn(filterGroupClassName, "flex-[1.55_1_0%]")}>
              {leagueOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLeagueScope(option.value)}
                  aria-pressed={leagueScope === option.value}
                  className={cn(
                    filterButtonClassName,
                    "px-2.5 py-2",
                    leagueScope === option.value ? filterActiveClassName : filterInactiveClassName,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={cn(filterGroupClassName, "flex-[0.78_1_0%]")}>
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGenderFilter(option.value)}
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

            <div className={cn(filterGroupClassName, "flex-[1.12_1_0%]")}>
              {ageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAgeFilter(option.value)}
                  aria-pressed={ageFilter === option.value}
                  className={cn(
                    filterButtonClassName,
                    "px-2 py-2",
                    ageFilter === option.value ? filterActiveClassName : filterInactiveClassName,
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-lg">
        {rankingRowsWithCurrentHomeGym.length === 0 ? (
          <ParticipantStateCard
            title="Noch keine Rangliste"
            description="Für diese Filterkombination gibt es aktuell noch keine sichtbaren Einträge."
          />
        ) : (
          <>
            <div className="space-y-3">
              {visibleWindow.visibleRows.map((row) => (
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
                    expanded={expandedProfileId === row.profileId}
                    profileHref={row.profileId === currentProfileId ? null : `/app/rankings/profile/${row.profileId}`}
                    onToggle={() =>
                      setExpandedProfileId((current) => (current === row.profileId ? null : row.profileId))
                    }
                  />
                </div>
              ))}
            </div>

            {visibleWindow.hasHiddenRows || showFullRanking ? (
              <div className={cn("text-center", isSparseWindow ? "mt-5" : "mt-7")}>
                <button
                  type="button"
                  onClick={() => setShowFullRanking((current) => !current)}
                  className="rounded-xl border border-[#003D55]/10 bg-[#F2DCAB] px-10 py-4 font-['Space_Grotesk'] text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-[#003D55] shadow-sm transition-all hover:shadow-md"
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

export default Rankings;
