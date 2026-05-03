import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, ChevronDown, Flame, TrendingUp } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import {
  buildRankingRows,
  buildRankingVisibilityWindow,
  formatRankingStageBoundaryDateDe,
  formatRankingStagePeriodSentenceDe,
  getCreatedAtTimeRanking,
  getDateBoundaryTimeRanking,
  getStageRange,
  stageRankingPeriodHasBegun,
  stageRankingPeriodHasEnded,
} from "@/app/pages/participant/participantData";
import { RankingRowCard, rankFormatter, formatRankingPointsDisplay as formatPoints } from "@/app/pages/participant/RankingRowCard";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { useSeasonSettings } from "@/services/seasonSettings";
import { cn } from "@/lib/utils";

type LeagueFilter = "toprope" | "lead";

const formatPlaceDelta = (value: number) => `${value} ${value === 1 ? "Platz" : "Plätze"}`;

const getLeagueFromProfileValue = (value: string | null | undefined): LeagueFilter =>
  value === "toprope" ? "toprope" : "lead";

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

const ageGroups = ["U9", "U11", "U13", "U15", "Ü15", "Ü40", "Ü50"] as const;

const leagueOptions: Array<{ value: LeagueFilter; label: string }> = [
  { value: "lead", label: "VORSTIEG" },
  { value: "toprope", label: "TOP-ROPE" },
];

const filterGroupClassName =
  "flex min-w-0 items-center gap-0.5 rounded-sm bg-[#003D55]/5 p-0.5";

const filterButtonClassName =
  "inline-flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-sm px-2 py-1.5 font-['Space_Grotesk'] text-[7px] font-bold uppercase leading-none tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003D55]/18 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf9f6] min-[420px]:text-[8px]";

const filterActiveClassName = "bg-[#A15523] text-[#F2DCAB] shadow-sm";

const filterInactiveClassName = "text-[#003D55]/40 hover:text-[#003D55]";

/** Wie `filterButtonClassName`, aber ohne durchgängiges `flex-1` — bei 7 Chips bricht das auf schmalen Viewports das Layout; ab `sm` gleiche Verteilung wie die drei Alters-Pills der normalen Rangliste. */
const ageRowButtonClassName = cn(
  filterButtonClassName,
  "shrink-0 min-w-[1.95rem] sm:min-w-0 sm:flex-1 sm:basis-0",
);

const AgeGroupRankings = () => {
  const { profile, user } = useAuth();
  const { getAgeGroupRankingClass, getStages } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error } = useParticipantCompetitionData();
  const [searchParams, setSearchParams] = useSearchParams();

  const profileGender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as
    | "m"
    | "w"
    | undefined;
  const profileLeague = (profile?.league || (user?.user_metadata?.league as string | undefined)) ?? null;
  const profileBirthDate = (profile?.birth_date || (user?.user_metadata?.birth_date as string | undefined)) ?? null;

  const defaultLeague = getLeagueFromProfileValue(profileLeague);
  const defaultClassNameFromProfile =
    getAgeGroupRankingClass(profileBirthDate, profileGender ?? null) ?? "U9-m";

  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>(defaultLeague);
  const [className, setClassName] = useState(defaultClassNameFromProfile);
  const [genderFilter, setGenderFilter] = useState<"m" | "w">(
    () => defaultClassNameFromProfile.split("-")[1] === "w" ? "w" : "m",
  );
  const [ageFilter, setAgeFilter] = useState<(typeof ageGroups)[number]>(
    () => (defaultClassNameFromProfile.split("-")[0] as (typeof ageGroups)[number]) || "U9",
  );

  const classInitializedRef = useRef(false);
  const stages = useMemo(() => getStages(), [getStages]);

  const [tab, setTab] = useState(searchParams.get("tab") === "stage" ? "stage" : "overall");
  const [stageKey, setStageKey] = useState(searchParams.get("stage") || stages[0]?.key || "");

  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [showFullRanking, setShowFullRanking] = useState(false);
  const [stageHelpOpen, setStageHelpOpen] = useState(false);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const paramStage = searchParams.get("stage");
    if (paramTab && (paramTab === "stage" || paramTab === "overall")) {
      setTab(paramTab);
    }
    if (paramStage && stages.some((stage) => stage.key === paramStage)) {
      setStageKey(paramStage);
    }
  }, [searchParams, stages]);

  useEffect(() => {
    const derived = getAgeGroupRankingClass(profileBirthDate, profileGender ?? null);
    if (!classInitializedRef.current && derived) {
      setClassName(derived);
      const [age, genderValue] = derived.split("-") as [(typeof ageGroups)[number], "m" | "w"];
      if (age && ageGroups.includes(age)) setAgeFilter(age);
      if (genderValue === "m" || genderValue === "w") setGenderFilter(genderValue);
      classInitializedRef.current = true;
    }
  }, [profileBirthDate, profileGender, getAgeGroupRankingClass]);

  useEffect(() => {
    setExpandedProfileId(null);
    setShowFullRanking(false);
    setStageHelpOpen(false);
  }, [leagueFilter, className, tab, stageKey]);

  useEffect(() => {
    if (tab !== "stage" || stages.length === 0) return;
    const valid = stages.some((s) => s.key === stageKey);
    if (!valid) setStageKey(stages[0].key);
  }, [tab, stages, stageKey]);

  const stageRange = useMemo(() => {
    if (tab !== "stage" || !stageKey || stages.length === 0) return null;
    return getStageRange(stageKey, stages);
  }, [tab, stageKey, stages]);

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
    [profiles, results, routes, gyms, leagueFilter, className, stageRange, getAgeGroupRankingClass],
  );

  const defaultRankingRows = useMemo(
    () =>
      buildRankingRows({
        profiles,
        results,
        routes,
        gyms,
        league: defaultLeague,
        className: defaultClassNameFromProfile,
        stageRange: null,
        getClassName: getAgeGroupRankingClass,
      }),
    [profiles, results, routes, gyms, defaultLeague, defaultClassNameFromProfile, getAgeGroupRankingClass],
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

  const currentUserStatsRow = useMemo(
    () => defaultRankingRows.find((row) => row.profileId === currentProfileId) ?? null,
    [defaultRankingRows, currentProfileId],
  );

  const previousStage = useMemo(() => {
    if (stages.length < 2) return null;

    const now = Date.now();
    let latestStartedStageIndex = -1;

    stages.forEach((stage, index) => {
      const stageStart = getDateBoundaryTimeRanking(stage.start, "start");
      if (stageStart !== null && stageStart <= now) {
        latestStartedStageIndex = index;
      }
    });

    if (latestStartedStageIndex <= 0) return null;
    return stages[latestStartedStageIndex - 1] ?? null;
  }, [stages]);

  const previousStageResults = useMemo(() => {
    if (!previousStage) return [];

    const cutoffTime = getDateBoundaryTimeRanking(previousStage.end, "end");
    if (cutoffTime === null) return [];

    return results.filter((result) => {
      const createdAtTime = getCreatedAtTimeRanking(result.created_at);
      return createdAtTime !== null && createdAtTime <= cutoffTime;
    });
  }, [results, previousStage]);

  const previousStageRankingRows = useMemo(() => {
    if (!previousStage) return [];

    return buildRankingRows({
      profiles,
      results: previousStageResults,
      routes,
      gyms,
      league: defaultLeague,
      className: defaultClassNameFromProfile,
      stageRange: null,
      getClassName: getAgeGroupRankingClass,
    });
  }, [
    profiles,
    previousStageResults,
    routes,
    gyms,
    previousStage,
    defaultLeague,
    defaultClassNameFromProfile,
    getAgeGroupRankingClass,
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
    () =>
      buildRankingVisibilityWindow(rankingRowsWithCurrentHomeGym, currentProfileId, showFullRanking),
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

  const leagueLabel = leagueFilter === "lead" ? "VORSTIEG" : "TOP-ROPE";
  const classLabel = getAgeGroupClassLabel(className);

  const selectedStage = useMemo(
    () => (stageKey ? stages.find((s) => s.key === stageKey) ?? null : null),
    [stages, stageKey],
  );
  const selectedStageBegun =
    tab === "stage" && selectedStage ? stageRankingPeriodHasBegun(selectedStage) : true;
  const stageTabSelectedButNotBegun = tab === "stage" && selectedStage !== null && !selectedStageBegun;
  const stageTabSelectedEnded =
    tab === "stage" && selectedStage !== null ? stageRankingPeriodHasEnded(selectedStage) : false;

  const setTabAndSyncUrl = (next: "overall" | "stage") => {
    setTab(next);
    let resolvedStage = stageKey;
    if (next === "stage") {
      const valid = Boolean(resolvedStage && stages.some((s) => s.key === resolvedStage));
      resolvedStage = valid ? resolvedStage : (stages[0]?.key ?? "");
      if (resolvedStage && resolvedStage !== stageKey) setStageKey(resolvedStage);
    }
    setSearchParams({ tab: next, stage: resolvedStage });
  };

  const setStageAndSyncUrl = (key: string) => {
    setStageKey(key);
    setSearchParams({ tab: "stage", stage: key });
  };

  if (loading) {
    return <ParticipantStateCard title="Rangliste lädt" description="Die Altersklassen werden gerade aufgebaut." />;
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
        <div className="mx-auto max-w-lg space-y-2">
          <div className="flex items-center gap-1.5 px-0.5">
            <div className={cn(filterGroupClassName, "flex-[1.55_1_0%]")}>
              {leagueOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLeagueFilter(option.value)}
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

            <div className={cn(filterGroupClassName, "flex-[0.78_1_0%]")}>
              <button
                type="button"
                onClick={() => {
                  setGenderFilter("m");
                  setClassName(`${ageFilter}-m`);
                }}
                aria-pressed={genderFilter === "m"}
                className={cn(
                  filterButtonClassName,
                  "px-2.5 py-2",
                  genderFilter === "m" ? filterActiveClassName : filterInactiveClassName,
                )}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenderFilter("w");
                  setClassName(`${ageFilter}-w`);
                }}
                aria-pressed={genderFilter === "w"}
                className={cn(
                  filterButtonClassName,
                  "px-2.5 py-2",
                  genderFilter === "w" ? filterActiveClassName : filterInactiveClassName,
                )}
              >
                W
              </button>
            </div>
          </div>

          <div
            className={cn(filterGroupClassName, "hide-scrollbar w-full overflow-x-auto")}
            role="tablist"
            aria-label="Altersklasse"
          >
            {ageGroups.map((age) => (
              <button
                key={age}
                type="button"
                role="tab"
                aria-selected={ageFilter === age}
                onClick={() => {
                  setAgeFilter(age);
                  setClassName(`${age}-${genderFilter}`);
                }}
                className={cn(
                  ageRowButtonClassName,
                  ageFilter === age ? filterActiveClassName : filterInactiveClassName,
                )}
              >
                {age}
              </button>
            ))}
          </div>

          <div className={filterGroupClassName}>
            <button
              type="button"
              onClick={() => setTabAndSyncUrl("overall")}
              aria-pressed={tab === "overall"}
              className={cn(
                filterButtonClassName,
                "px-2 py-2",
                tab === "overall" ? filterActiveClassName : filterInactiveClassName,
              )}
            >
              Gesamt
            </button>
            <button
              type="button"
              onClick={() => setTabAndSyncUrl("stage")}
              aria-pressed={tab === "stage"}
              className={cn(
                filterButtonClassName,
                "px-2 py-2",
                tab === "stage" ? filterActiveClassName : filterInactiveClassName,
              )}
            >
              Etappe
            </button>
          </div>

          {tab === "stage" && stages.length > 0 ? (
            <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              {stages.map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => setStageAndSyncUrl(stage.key)}
                  aria-pressed={stageKey === stage.key}
                  aria-label={
                    stageRankingPeriodHasEnded(stage) ? `${stage.label}, Etappe abgeschlossen` : stage.label
                  }
                  className={cn(
                    "shrink-0 rounded-sm border px-3 py-2 font-['Space_Grotesk'] text-[8px] font-bold uppercase tracking-[0.1em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003D55]/18 min-[420px]:text-[9px]",
                    stageKey === stage.key
                      ? "border-transparent bg-[#A15523] text-[#F2DCAB] shadow-sm"
                      : "border-[#003D55]/10 bg-white text-[#003D55]/45 hover:text-[#003D55]",
                  )}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto mb-4 max-w-lg text-center">
        <p className="font-['Space_Grotesk'] text-[9px] font-bold uppercase tracking-[0.2em] text-[#003D55]/45">
          {leagueLabel} • {classLabel.toUpperCase()}
          {tab === "stage" && stageKey
            ? ` • ${stages.find((s) => s.key === stageKey)?.label ?? stageKey}`
            : null}
        </p>
        {stageTabSelectedEnded ? (
          <span
            className="mt-2 inline-flex items-center rounded-full border border-[#003D55]/15 bg-[#003D55]/[0.06] px-2.5 py-1 font-['Space_Grotesk'] text-[8px] font-bold uppercase tracking-[0.16em] text-[#003D55]/80"
            title="Für diese Etappe werden keine neuen Ergebnisse mehr gezählt."
          >
            Etappe abgeschlossen
          </span>
        ) : null}
      </div>

      {tab === "stage" && selectedStage ? (
        <div className="mx-auto mb-4 max-w-lg">
          {stageTabSelectedButNotBegun ? (
            <p className="mb-2 text-center font-['Space_Grotesk'] text-[12px] font-semibold leading-snug text-[#A15523]">
              Etappe erst ab {formatRankingStageBoundaryDateDe(selectedStage.start)}
            </p>
          ) : null}
          <Collapsible
            open={stageHelpOpen}
            onOpenChange={setStageHelpOpen}
            className="rounded-xl border border-[#003D55]/10 bg-[#003D55]/[0.04]"
          >
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#003D55]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf9f6]">
              <span className="flex-1 font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-[0.14em] text-[#003D55]">
                Etappenwertung — Kurzinfos
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-[#003D55]/45 transition-transform duration-200 ease-out",
                  stageHelpOpen && "rotate-180",
                )}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden px-4 pb-3.5">
              <div className="space-y-2 border-t border-[#003D55]/10 pt-3 text-[13px] leading-relaxed text-[#003D55]/80">
                <p>
                  Gewertet wird{" "}
                  <span className="font-semibold text-[#003D55]">
                    {formatRankingStagePeriodSentenceDe(selectedStage)}
                  </span>
                  .
                </p>
                <p>Wie oben gefilterte Liga und Altersklasse; Punkte wie in der Gesamtwertung (inkl. Flash).</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : null}

      <div className="mx-auto max-w-lg">
        {stageTabSelectedButNotBegun ? null : rankingRowsWithCurrentHomeGym.length === 0 ? (
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

export default AgeGroupRankings;
