import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, Medal, Trophy, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProfiles, listResults, listRoutes, listGyms } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import { useSeasonSettings } from "@/services/seasonSettings";
import type { Result, Route, Gym } from "@/services/appTypes";

type RankingRow = { rank: number; name: string; points: number; profile_id: string };

const getStageRange = (stageKey: string, stages: Array<{ key: string; start: string; end: string }>) => {
  const stage = stages.find((item) => item.key === stageKey);
  if (!stage) return null;
  return {
    start: new Date(`${stage.start}T00:00:00Z`),
    end: new Date(`${stage.end}T23:59:59Z`),
  };
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
  const { getClassName, getStages } = useSeasonSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const userLeague = (profile?.league || (user?.user_metadata?.league as string | undefined) || "toprope") as
    | "toprope"
    | "lead";
  const [leagueFilter, setLeagueFilter] = useState<"toprope" | "lead">(userLeague);
  const [className, setClassName] = useState("U16-m");
  const [genderFilter, setGenderFilter] = useState<"m" | "w">("m");
  const [ageFilter, setAgeFilter] = useState<"U16" | "Ü16" | "Ü40">("U16");
  const classInitializedRef = useRef(false);
  const stages = getStages();
  const [tab, setTab] = useState(searchParams.get("tab") === "stage" ? "stage" : "overall");
  const [stageKey, setStageKey] = useState(searchParams.get("stage") || stages[0]?.key || "");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      const [{ data: profiles }, { data: resultsData }, { data: routesData }, { data: gymsData }] = await Promise.all([
        listProfiles(),
        listResults(),
        listRoutes(),
        listGyms(),
      ]);
      if (!profiles || !resultsData || !routesData) {
        setRankings([]);
        return;
      }
      setResults(resultsData);
      setRoutes(routesData);
      if (gymsData) setGyms(gymsData);
      const routeMap = new Map(routesData.map((route) => [route.id, route.discipline]));
      const range = tab === "stage" && stages.length > 0 ? getStageRange(stageKey, stages) : null;
      const totals = resultsData.reduce<Record<string, number>>((acc, result) => {
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
          // Filtere Admin-Accounts heraus
          if (profile.role === "gym_admin" || profile.role === "league_admin") {
            return false;
          }
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
      setRankings(rows.map((row, index) => ({ rank: index + 1, name: row.name, points: row.points, profile_id: row.id })));
    };
    load();
  }, [className, leagueFilter, tab, stageKey, stages]);

  const userName = useMemo(() => {
    if (!profile) return "";
    return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  }, [profile]);

  const leagueLabel = leagueFilter === "lead" ? "Vorstieg" : "Toprope";
  const classLabel = getClassLabel(className);

  // Berechne Details für alle Teilnehmer
  const getParticipantDetails = (profileId: string) => {
    if (!results.length || !routes.length || !gyms.length) return null;

    const routeMap = new Map(routes.map((r) => [r.id, r]));
    const gymMap = new Map(gyms.map((g) => [g.id, g]));
    const range = tab === "stage" && stages.length > 0 ? getStageRange(stageKey, stages) : null;

    // Filtere Ergebnisse für diesen Teilnehmer und die aktuelle Liga/Etappe
    const participantResults = results.filter((result) => {
      if (result.profile_id !== profileId) return false;
      const route = routeMap.get(result.route_id);
      if (!route) return false;
      const normalized = route.discipline === "vorstieg" ? "lead" : route.discipline === "toprope" ? "toprope" : route.discipline;
      if (normalized !== leagueFilter) return false;
      if (range) {
        const createdAt = result.created_at ? new Date(result.created_at) : null;
        if (!createdAt || createdAt < range.start || createdAt > range.end) return false;
      }
      return true;
    });

    // Gruppiere nach Halle
    const gymGroups = new Map<string, { gym: Gym; routes: Array<{ route: Route; result: Result; points: number }>; totalPoints: number }>();

    participantResults.forEach((result) => {
      const route = routeMap.get(result.route_id);
      if (!route) return;
      const gym = gymMap.get(route.gym_id);
      if (!gym) return;

      const points = result.points + (result.flash ? 1 : 0);
      
      if (!gymGroups.has(gym.id)) {
        gymGroups.set(gym.id, { gym, routes: [], totalPoints: 0 });
      }
      const group = gymGroups.get(gym.id)!;
      group.routes.push({ route, result, points });
      group.totalPoints += points;
    });

    return Array.from(gymGroups.values()).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const renderRankingList = () => {
    if (rankings.length === 0) {
      return <div className="p-4 text-sm text-muted-foreground">Noch keine Rangliste verfügbar.</div>;
    }

    const toggleRow = (profileId: string) => {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(profileId)) {
          next.delete(profileId);
        } else {
          next.add(profileId);
        }
        return next;
      });
    };

    // Desktop Table View with Expandable Rows
    const renderDesktopTable = () => (
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rang</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Punkte</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankings.map((row) => {
              const isUser = userName && row.name.includes(userName);
              const Icon =
                row.rank === 1 ? Trophy : row.rank === 2 ? Medal : row.rank === 3 ? Award : null;
              const isExpanded = expandedRows.has(row.profile_id);
              const participantDetails = getParticipantDetails(row.profile_id);
              
              return (
                <>
                  <TableRow
                    key={`${row.rank}-${row.name}`}
                    className={`cursor-pointer hover:bg-muted/50 ${isUser ? "bg-accent/20" : ""}`}
                    onClick={() => toggleRow(row.profile_id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {Icon ? (
                          <Icon className={`h-5 w-5 ${
                            row.rank === 1 ? "text-yellow-600" :
                            row.rank === 2 ? "text-gray-400" :
                            row.rank === 3 ? "text-amber-600" : ""
                          }`} />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">{row.rank}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{row.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-lg font-semibold text-primary">{row.points}</div>
                      <div className="text-xs text-muted-foreground">Punkte</div>
                    </TableCell>
                    <TableCell>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </TableCell>
                  </TableRow>
                  {isExpanded && participantDetails && participantDetails.length > 0 && (
                    <TableRow key={`${row.profile_id}-details`} className="bg-muted/20">
                      <TableCell colSpan={4} className="p-4">
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground mb-2">
                            Punkteverteilung nach Hallen {tab === "stage" ? `(${stages.find((s) => s.key === stageKey)?.label || stageKey})` : "(Gesamtwertung)"}
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {participantDetails.map((group) => (
                              <div key={group.gym.id} className="border border-border/60 rounded-lg p-3 bg-background">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <h3 className="font-semibold text-sm text-primary">{group.gym.name}</h3>
                                  </div>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <div className="text-base font-bold text-primary">{group.totalPoints}</div>
                                    <div className="text-[10px] text-muted-foreground leading-none">Pkt</div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {group.routes.map(({ route, result, points }) => (
                                    <div
                                      key={result.id}
                                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                                        result.flash
                                          ? "bg-yellow-500/20 border-yellow-500/40"
                                          : "bg-background border-border/40"
                                      }`}
                                    >
                                      <span className={`font-medium ${result.flash ? "text-yellow-700" : ""}`}>
                                        {route.code}
                                      </span>
                                      <span className={`font-semibold ${result.flash ? "text-yellow-700" : "text-primary"}`}>
                                        {points}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );

    // Mobile Accordion View
    const renderMobileAccordion = () => (
      <div className="md:hidden">
        <Accordion type="single" collapsible className="space-y-3">
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
          const participantDetails = getParticipantDetails(row.profile_id);

          return (
            <AccordionItem
              key={`${row.rank}-${row.name}`}
              value={row.profile_id}
              className={`border-0 ${isUser ? "bg-accent/20" : "bg-transparent"}`}
            >
              <AccordionTrigger
                className="px-5 py-4 hover:no-underline [&>svg]:text-muted-foreground [&>svg]:ml-4"
                style={{ backgroundColor: palette.barBg }}
              >
                <div className="flex items-center justify-between gap-4 w-full">
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
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-3 pt-0">
                <div className="pt-3 border-t border-border/50">
                  {participantDetails && participantDetails.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        Punkteverteilung nach Hallen {tab === "stage" ? `(${stages.find((s) => s.key === stageKey)?.label || stageKey})` : "(Gesamtwertung)"}
                      </div>
                      {participantDetails.map((group) => (
                        <div key={group.gym.id} className="border border-border/60 rounded p-2 bg-muted/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <h3 className="font-semibold text-sm text-primary truncate">{group.gym.name}</h3>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-base font-bold text-primary">{group.totalPoints}</div>
                              <div className="text-[10px] text-muted-foreground leading-none">Pkt</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {group.routes.map(({ route, result, points }) => (
                              <div
                                key={result.id}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${
                                  result.flash
                                    ? "bg-yellow-500/20 border-yellow-500/40"
                                    : "bg-background border-border/40"
                                }`}
                              >
                                <span className={`font-medium text-[11px] ${result.flash ? "text-yellow-700" : ""}`}>
                                  {route.code}
                                </span>
                                <span className={`font-semibold text-[11px] ${result.flash ? "text-yellow-700" : "text-primary"}`}>
                                  {points}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      Keine Ergebnisse gefunden.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
        </Accordion>
      </div>
    );

    return (
      <>
        {renderDesktopTable()}
        {renderMobileAccordion()}
      </>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8">
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
