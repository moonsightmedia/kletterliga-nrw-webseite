import { useEffect, useMemo, useState } from "react";
import { BarChart3, Flame, MapPin, TrendingUp } from "lucide-react";
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

const buildRankingWindow = (rows: RankingRowData[], currentProfileId: string | null) => {
  if (rows.length === 0) {
    return {
      visibleRows: [] as RankingRowData[],
      separatorBeforeProfileId: null as string | null,
    };
  }

  const currentIndex = currentProfileId ? rows.findIndex((row) => row.profileId === currentProfileId) : -1;
  if (currentIndex < 0) {
    return {
      visibleRows: rows.slice(0, 3),
      separatorBeforeProfileId: null,
    };
  }

  if (currentIndex <= 1) {
    return {
      visibleRows: rows.slice(0, Math.min(3, rows.length)),
      separatorBeforeProfileId: null,
    };
  }

  const uniqueProfileIds = new Set<string>();
  const visibleRows = [rows[0], rows[1], rows[currentIndex], rows[currentIndex + 1]]
    .filter((row): row is RankingRowData => Boolean(row))
    .filter((row) => {
      if (uniqueProfileIds.has(row.profileId)) return false;
      uniqueProfileIds.add(row.profileId);
      return true;
    });

  return {
    visibleRows,
    separatorBeforeProfileId: rows[currentIndex]?.profileId ?? null,
  };
};

const RankingRowCard = ({
  row,
  isCurrentUser,
  expanded,
  onToggle,
}: {
  row: RankingRowData;
  isCurrentUser: boolean;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const progressValue = Math.min(row.visitedGyms, 8);
  const pointsLabel = expanded && isCurrentUser ? "Gesamtpkt" : "Pkt";
  const topRowBackground = isCurrentUser ? "bg-[#003D55]/5" : "bg-white";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "block w-full overflow-hidden rounded-[8px] text-left transition-all duration-300",
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

        <div
            className={cn(
            "h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border-2",
            isCurrentUser ? "border-[#A15523]" : row.rank === 1 ? "border-[#F2DCAB]" : "border-[#F2DCAB]/20",
          )}
        >
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
              { label: "Flash", value: row.flashCount, accent: true },
              { label: "10 Pkt", value: row.points10, accent: false },
              { label: "7.5 Pkt", value: row.points7_5, accent: false },
              { label: "5 Pkt", value: row.points5, accent: false },
              { label: "2.5 Pkt", value: row.points2_5, accent: false },
              { label: "0 Pkt", value: row.points0, accent: false },
            ].map((item) => (
              <div key={`${row.profileId}-${item.label}`} className="flex flex-col">
                <span className="mb-0.5 text-[6.5px] font-bold uppercase text-[#71787D]">{item.label}</span>
                <span
                  className={cn(
                    "font-['Space_Grotesk'] text-[10px] font-bold",
                    item.accent ? "text-[#A15523]" : "text-[#003D55]",
                  )}
                >
                  {formatPoints(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </button>
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

const Rankings = () => {
  const { profile, user } = useAuth();
  const { getClassName } = useSeasonSettings();
  const { profiles, results, routes, gyms, loading, error } = useParticipantCompetitionData();
  const [leagueScope, setLeagueScope] = useState<RankingLeagueFilterValue>("lead");
  const [genderFilter, setGenderFilter] = useState<RankingGenderScope>("m");
  const [ageFilter, setAgeFilter] = useState<RankingAgeFilterValue>("U15");
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  useEffect(() => {
    const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as
      | "m"
      | "w"
      | undefined;
    const league = (profile?.league || (user?.user_metadata?.league as string | undefined)) ?? null;
    const birthDate = (profile?.birth_date || (user?.user_metadata?.birth_date as string | undefined)) ?? null;
    const className = getClassName(birthDate, gender ?? null);

    setLeagueScope(getLeagueScopeFromValue(league));
    setGenderFilter(gender === "w" ? "w" : "m");
    setAgeFilter(getAgeScopeFromClassName(className));
  }, [profile, user, getClassName]);

  useEffect(() => {
    setExpandedProfileId(null);
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
  const currentUserRow = useMemo(
    () => rankingRows.find((row) => row.profileId === currentProfileId) ?? null,
    [rankingRows, currentProfileId],
  );
  const visibleWindow = useMemo(
    () => buildRankingWindow(rankingRows, currentProfileId),
    [rankingRows, currentProfileId],
  );
  const isSparseWindow = visibleWindow.visibleRows.length <= 1;

  if (loading) {
    return (
      <ParticipantStateCard
        title="Rangliste laedt"
        description="Die Stitch-Rangliste wird gerade mit den aktuellen Teilnehmerdaten aufgebaut."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Rangliste nicht verfuegbar" description={error} />;
  }

  return (
    <div className="mx-auto max-w-lg">
      <section className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-[#003D55] p-6 shadow-lg">
          <BarChart3 className="absolute -bottom-7 -right-6 h-32 w-32 rotate-[12deg] text-[#F2DCAB]/5" />

          <h2 className="mb-4 font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.24em] text-[#F2DCAB]/80">
            Dein aktueller Stand
          </h2>

          <div className="relative z-10 flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-['Space_Grotesk'] text-5xl font-bold italic leading-none text-[#F2DCAB]">
                {currentUserRow ? `#${rankFormatter.format(currentUserRow.rank)}` : "#-"}
              </span>
              <span className="font-['Space_Grotesk'] text-lg font-semibold text-[#F2DCAB]/60">
                / {rankFormatter.format(rankingRows.length)}
              </span>
            </div>

            <div className="text-right">
              <p className="font-['Space_Grotesk'] text-2xl font-bold text-[#F2DCAB]">
                {formatPoints(currentUserRow?.points ?? 0)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-tight text-[#F2DCAB]/70">Gesamtpunkte</p>
            </div>
          </div>

          <div className="relative z-10 mt-6 flex gap-3">
            <div className="flex items-center gap-2 rounded-[10px] bg-[#A15523] px-4 py-1.5 text-white shadow-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.15em]">
                {"+3 Pl\u00e4tze"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-[10px] border border-[#F2DCAB]/20 bg-[#F2DCAB]/10 px-4 py-1.5 text-[#F2DCAB] backdrop-blur-md">
              <Flame className="h-4 w-4" />
              <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.15em]">
                Top 5%
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 -mx-4 mb-4 border-b border-[#003D55]/5 bg-[#fbf9f6]/95 px-4 py-2.5 backdrop-blur-xl">
        <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto">
          <div className="inline-flex shrink-0 items-center rounded-[6px] bg-[#003D55]/5 p-0.5">
            {leagueOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLeagueScope(option.value)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 font-['Space_Grotesk'] text-[8px] font-bold uppercase leading-none tracking-[0.08em] transition-all",
                  leagueScope === option.value
                    ? "bg-[#A15523] text-[#F2DCAB] shadow-sm"
                    : "text-[#003D55]/40 hover:text-[#003D55]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="inline-flex shrink-0 items-center rounded-[6px] bg-[#003D55]/5 p-0.5">
            {genderOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setGenderFilter(option.value)}
                className={cn(
                  "min-w-[2.35rem] rounded-[6px] px-3 py-1 font-['Space_Grotesk'] text-[8px] font-bold uppercase leading-none tracking-[0.08em] transition-all",
                  genderFilter === option.value
                    ? "bg-[#A15523] text-[#F2DCAB] shadow-sm"
                    : "text-[#003D55]/40 hover:text-[#003D55]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="inline-flex shrink-0 items-center rounded-[6px] bg-[#003D55]/5 p-0.5">
            {ageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAgeFilter(option.value)}
                className={cn(
                  "rounded-[6px] px-2.5 py-1 font-['Space_Grotesk'] text-[8px] font-bold uppercase leading-none tracking-[0.08em] transition-all",
                  ageFilter === option.value
                    ? "bg-[#A15523] text-[#F2DCAB] shadow-sm"
                    : "text-[#003D55]/40 hover:text-[#003D55]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {rankingRows.length === 0 ? (
        <ParticipantStateCard
          title="Noch keine Rangliste"
          description="Fuer diese Filterkombination gibt es aktuell noch keine sichtbaren Eintraege."
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
                  onToggle={() =>
                    setExpandedProfileId((current) => (current === row.profileId ? null : row.profileId))
                  }
                />
              </div>
            ))}
          </div>

          <div className={cn("text-center", isSparseWindow ? "mt-5" : "mt-7")}>
            <button
              type="button"
              className="rounded-[10px] border border-[#003D55]/10 bg-[#F2DCAB] px-10 py-4 font-['Space_Grotesk'] text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-[#003D55] shadow-sm transition-all hover:shadow-md"
            >
              Weitere laden
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Rankings;
