import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, Medal, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listProfiles, listResults, listRoutes } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";

type RankingRow = { rank: number; name: string; points: number };

const seasonStart = new Date(Date.UTC(2026, 4, 1));
const stages = [
  { key: "2026-05", label: "Etappe 1 (Mai)", start: "2026-05-01", end: "2026-05-31" },
  { key: "2026-06", label: "Etappe 2 (Juni)", start: "2026-06-01", end: "2026-06-30" },
  { key: "2026-07", label: "Etappe 3 (Juli)", start: "2026-07-01", end: "2026-07-31" },
  { key: "2026-08", label: "Etappe 4 (August)", start: "2026-08-01", end: "2026-08-31" },
];

const getStageRange = (stageKey: string) => {
  const stage = stages.find((item) => item.key === stageKey);
  if (!stage) return null;
  return {
    start: new Date(`${stage.start}T00:00:00Z`),
    end: new Date(`${stage.end}T23:59:59Z`),
  };
};

const getAgeAt = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  let age = seasonStart.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = seasonStart.getUTCMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && seasonStart.getUTCDate() < date.getUTCDate())) {
    age -= 1;
  }
  return age;
};

const getClassName = (birthDate?: string | null, gender?: "m" | "w" | null) => {
  const age = getAgeAt(birthDate);
  if (age === null || !gender) return null;
  if (age < 16) return `U16-${gender}`;
  if (age < 40) return `Ü16-${gender}`;
  return `Ü40-${gender}`;
};

const getClassLabel = (value: string) => {
  switch (value) {
    case "U16-m":
      return "U16 männlich";
    case "U16-w":
      return "U16 weiblich";
    case "Ü16-m":
      return "Ü16 männlich";
    case "Ü16-w":
      return "Ü16 weiblich";
    case "Ü40-m":
      return "Ü40 männlich";
    case "Ü40-w":
      return "Ü40 weiblich";
    default:
      return value;
  }
};

const Rankings = () => {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const userLeague = (profile?.league || (user?.user_metadata?.league as string | undefined) || "toprope") as
    | "toprope"
    | "lead";
  const [leagueFilter, setLeagueFilter] = useState<"toprope" | "lead">(userLeague);
  const [className, setClassName] = useState("U16-m");
  const [genderFilter, setGenderFilter] = useState<"m" | "w">("m");
  const [ageFilter, setAgeFilter] = useState<"U16" | "Ü16" | "Ü40">("U16");
  const classInitializedRef = useRef(false);
  const [tab, setTab] = useState(searchParams.get("tab") === "stage" ? "stage" : "overall");
  const [stageKey, setStageKey] = useState(searchParams.get("stage") || stages[0]?.key || "2026-05");

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    const paramStage = searchParams.get("stage");
    if (paramTab && (paramTab === "stage" || paramTab === "overall")) {
      setTab(paramTab);
    }
    if (paramStage && stages.some((stage) => stage.key === paramStage)) {
      setStageKey(paramStage);
    }
  }, [searchParams]);

  useEffect(() => {
    const birthDate = profile?.birth_date ?? (user?.user_metadata?.birth_date as string | undefined);
    const gender = (profile?.gender || (user?.user_metadata?.gender as string | undefined)) as "m" | "w" | undefined;
    const derived = getClassName(birthDate ?? null, gender ?? null);
    if (!classInitializedRef.current && derived) {
      setClassName(derived);
      const [age, genderValue] = derived.split("-") as ["U16" | "Ü16" | "Ü40", "m" | "w"];
      if (age) setAgeFilter(age);
      if (genderValue) setGenderFilter(genderValue);
      classInitializedRef.current = true;
    }
  }, [profile, user]);

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles }, { data: results }, { data: routes }] = await Promise.all([
        listProfiles(),
        listResults(),
        listRoutes(),
      ]);
      if (!profiles || !results || !routes) {
        setRankings([]);
        return;
      }
      const routeMap = new Map(routes.map((route) => [route.id, route.discipline]));
      const range = tab === "stage" ? getStageRange(stageKey) : null;
      const totals = results.reduce<Record<string, number>>((acc, result) => {
        const discipline = routeMap.get(result.route_id);
        const normalized =
          discipline === "vorstieg" ? "lead" : discipline === "toprope" ? "toprope" : discipline;
        if (normalized !== leagueFilter) return acc;
        if (range) {
          const createdAt = result.created_at ? new Date(result.created_at) : null;
          if (!createdAt || createdAt < range.start || createdAt > range.end) return acc;
        }
        acc[result.profile_id] =
          (acc[result.profile_id] ?? 0) + (result.points ?? 0) + (result.flash ? 1 : 0);
        return acc;
      }, {});
      const rows = profiles
        .filter((profile) => {
          const league = profile.league ?? null;
          return league === null || league === leagueFilter;
        })
        .map((profile) => ({
          id: profile.id,
          className: getClassName(profile.birth_date, profile.gender),
          name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || "Unbekannt",
          points: totals[profile.id] ?? 0,
        }))
        .filter((row) => row.className === className);
      rows.sort((a, b) => b.points - a.points);
      setRankings(rows.map((row, index) => ({ rank: index + 1, name: row.name, points: row.points })));
    };
    load();
  }, [className, leagueFilter, tab, stageKey]);

  const userName = useMemo(() => {
    if (!profile) return "";
    return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  }, [profile]);

  const leagueLabel = leagueFilter === "lead" ? "Vorstieg" : "Toprope";
  const classLabel = getClassLabel(className);

  const renderRankingList = () => (
    <div className="space-y-3">
      {rankings.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">Noch keine Rangliste verfügbar.</div>
      )}
      {rankings.map((row) => {
        const isUser = userName && row.name.includes(userName);
        const palette =
          row.rank === 1
            ? {
                barBg: "#234B61",
                name: "#FFFFFF",
                points: "#E7D4A8",
                label: "#C7D0D8",
                iconBg: "#F0DEB4",
                icon: "#1F3E52",
              }
            : row.rank === 2
            ? {
                barBg: "#E3D6C9",
                name: "#234B61",
                points: "#9B6137",
                label: "#2C5B73",
                iconBg: "#8E5B34",
                icon: "#FFFFFF",
              }
            : row.rank === 3
            ? {
                barBg: "#F0E6CC",
                name: "#234B61",
                points: "#A1693E",
                label: "#2C5B73",
                iconBg: "#234B61",
                icon: "#FFFFFF",
              }
            : {
                barBg: "#FFFFFF",
                name: "#234B61",
                points: "#9B6137",
                label: "#2C5B73",
                iconBg: "#F3F0E8",
                icon: "#234B61",
              };
        const Icon =
          row.rank === 1 ? Trophy : row.rank === 2 ? Medal : row.rank === 3 ? Award : null;

        return (
          <div key={`${row.rank}-${row.name}`} className={`${isUser ? "bg-accent/20" : "bg-transparent"}`}>
            <div className="px-5 py-4" style={{ backgroundColor: palette.barBg }}>
              <div className="flex items-center justify-between gap-4">
                <div className="w-16">
                  <div
                    className="h-12 w-12 flex items-center justify-center -skew-x-6"
                    style={{ backgroundColor: palette.iconBg }}
                  >
                    <div className="skew-x-6">
                      {Icon ? (
                        <Icon className="h-5 w-5" style={{ color: palette.icon }} />
                      ) : (
                        <span className="text-sm font-semibold" style={{ color: palette.icon }}>
                          {row.rank}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-1 font-semibold uppercase tracking-wide" style={{ color: palette.name }}>
                  {row.name}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold" style={{ color: palette.points }}>
                    {row.points}
                  </div>
                  <div className="text-xs" style={{ color: palette.label }}>
                    Punkte
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex border border-border/60 bg-background -skew-x-6 overflow-hidden">
          <button
            type="button"
            className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide skew-x-6 ${
              leagueFilter === "toprope" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
            onClick={() => setLeagueFilter("toprope")}
          >
            <span className="inline-block">Toprope</span>
          </button>
          <button
            type="button"
            className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide skew-x-6 ${
              leagueFilter === "lead" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
            onClick={() => setLeagueFilter("lead")}
          >
            <span className="inline-block">Vorstieg</span>
          </button>
        </div>
      </div>

      <div className="flex w-full justify-center gap-6">
        <div className="inline-flex w-fit justify-center border border-border/60 bg-background -skew-x-6 overflow-hidden">
          <button
            type="button"
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide skew-x-6 ${
              genderFilter === "m" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
            onClick={() => {
              setGenderFilter("m");
              setClassName(`${ageFilter}-m`);
            }}
          >
            <span className="inline-block">M</span>
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide skew-x-6 ${
              genderFilter === "w" ? "bg-primary text-white" : "text-muted-foreground"
            }`}
            onClick={() => {
              setGenderFilter("w");
              setClassName(`${ageFilter}-w`);
            }}
          >
            <span className="inline-block">W</span>
          </button>
        </div>
        <div className="inline-flex w-fit justify-center border border-border/60 bg-background -skew-x-6 overflow-hidden">
          {(["U16", "Ü16", "Ü40"] as const).map((age) => (
            <button
              key={age}
              type="button"
              className={`px-5 py-2 text-xs font-semibold uppercase tracking-wide skew-x-6 ${
                ageFilter === age ? "bg-primary text-white" : "text-muted-foreground"
              }`}
              onClick={() => {
                setAgeFilter(age);
                setClassName(`${age}-${genderFilter}`);
              }}
            >
              <span className="inline-block">{age}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-sm font-semibold uppercase tracking-widest text-secondary">
        {leagueLabel.toUpperCase()}-Liga • {classLabel.toUpperCase()}
      </div>

      <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value, stage: stageKey })}>
        <TabsList className="w-full bg-transparent p-0 gap-3">
          <TabsTrigger
            value="overall"
            className="flex-1 border border-border/60 bg-background py-3 text-sm -skew-x-6 data-[state=active]:bg-secondary/20 data-[state=active]:text-primary data-[state=active]:border-secondary"
          >
            <span className="skew-x-6 inline-block">Gesamtwertung</span>
          </TabsTrigger>
          <TabsTrigger
            value="stage"
            className="flex-1 border border-border/60 bg-background py-3 text-sm -skew-x-6 data-[state=active]:bg-secondary/20 data-[state=active]:text-primary data-[state=active]:border-secondary"
          >
            <span className="skew-x-6 inline-block">Etappenwertung</span>
          </TabsTrigger>
        </TabsList>
        {tab === "stage" && (
          <div className="mt-4">
            <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {stages.map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  className={`flex-none px-4 py-2 text-xs font-semibold uppercase tracking-wide -skew-x-6 border ${
                    stageKey === stage.key
                      ? "bg-secondary/20 text-primary border-secondary"
                      : "bg-background text-muted-foreground border-border/60"
                  }`}
                  onClick={() => {
                    setStageKey(stage.key);
                    setSearchParams({ tab: "stage", stage: stage.key });
                  }}
                >
                  <span className="skew-x-6 inline-block">{stage.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <TabsContent value="overall">{renderRankingList()}</TabsContent>
        <TabsContent value="stage">{renderRankingList()}</TabsContent>
      </Tabs>
    </div>
  );
};

export default Rankings;
