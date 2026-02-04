import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, listGymCodesByGym, listRoutesByGym, listResults, listProfiles } from "@/services/appApi";
import type { Result, Profile, GymCode, Route } from "@/services/appTypes";
import { TrendingUp, Users, Zap, Target, BarChart3, Calendar, Award } from "lucide-react";

const GymStats = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [codes, setCodes] = useState<GymCode[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        listGymCodesByGym(firstGym).then(({ data: codesData }) => {
          setCodes(codesData ?? []);
        });
        listRoutesByGym(firstGym).then(({ data: routesData }) => {
          const gymRoutes = routesData ?? [];
          setRoutes(gymRoutes);
          // Lade Ergebnisse nachdem Routen geladen sind
          Promise.all([listResults(), listProfiles()]).then(([{ data: resultsData }, { data: profilesData }]) => {
            const routeIds = gymRoutes.map((r) => r.id);
            const gymResults = (resultsData ?? []).filter((r) => routeIds.includes(r.route_id));
            setResults(gymResults);
            
            // Erstelle Profile-Map
            const profileMap = new Map<string, Profile>();
            (profilesData ?? []).forEach((p) => profileMap.set(p.id, p));
            setProfiles(profileMap);
          });
        });
      }
    });
  }, [profile?.id]);

  // Code-Einlösungen im Zeitverlauf (letzte 30 Tage)
  const codeRedemptionsTimeline = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });
    return last30Days.map((date) => ({
      date,
      count: codes.filter((c) => c.redeemed_at?.startsWith(date)).length,
    }));
  }, [codes]);

  // Ergebnisse im Zeitverlauf (letzte 30 Tage)
  const resultsTimeline = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });
    return last30Days.map((date) => ({
      date,
      count: results.filter((r) => r.created_at?.startsWith(date)).length,
    }));
  }, [results]);

  // Top-Routen nach Durchschnittspunkten
  const topRoutesByPoints = useMemo(() => {
    const routeStats = routes.map((route) => {
      const routeResults = results.filter((r) => r.route_id === route.id);
      const avgPoints = routeResults.length > 0
        ? routeResults.reduce((sum, r) => sum + r.points, 0) / routeResults.length
        : 0;
      return {
        route,
        avgPoints,
        count: routeResults.length,
      };
    });
    return routeStats
      .filter((s) => s.count > 0)
      .sort((a, b) => b.avgPoints - a.avgPoints)
      .slice(0, 5);
  }, [routes, results]);

  // Beliebte Routen (nach Anzahl der Ergebnisse)
  const popularRoutes = useMemo(() => {
    const routeCounts = routes.map((route) => ({
      route,
      count: results.filter((r) => r.route_id === route.id).length,
    }));
    return routeCounts.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [routes, results]);

  // Flash-Rate
  const flashStats = useMemo(() => {
    const flashCount = results.filter((r) => r.flash).length;
    const totalCount = results.length;
    return {
      flash: flashCount,
      normal: totalCount - flashCount,
      rate: totalCount > 0 ? Math.round((flashCount / totalCount) * 100) : 0,
    };
  }, [results]);

  // Aktivste Teilnehmer
  const topParticipants = useMemo(() => {
    const participantCounts = new Map<string, number>();
    results.forEach((r) => {
      const count = participantCounts.get(r.profile_id) || 0;
      participantCounts.set(r.profile_id, count + 1);
    });
    return Array.from(participantCounts.entries())
      .map(([profileId, count]) => ({
        profile: profiles.get(profileId),
        count,
      }))
      .filter((p) => p.profile)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [results, profiles]);

  // Code-Einlösungsrate
  const codeRedemptionRate = useMemo(() => {
    const totalCodes = codes.length;
    const redeemedCodes = codes.filter((c) => c.redeemed_by).length;
    return totalCodes > 0 ? Math.round((redeemedCodes / totalCodes) * 100) : 0;
  }, [codes]);

  // Durchschnittliche Punkte
  const avgPoints = useMemo(() => {
    return results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.points, 0) / results.length)
      : 0;
  }, [results]);

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  const maxCodeRedemptions = Math.max(...codeRedemptionsTimeline.map((d) => d.count), 1);
  const maxResults = Math.max(...resultsTimeline.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-primary">Hallen-Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-2">Detaillierte Analyse der Hallen-Aktivität und Nutzung.</p>
      </div>

      {/* Übersichtskarten */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Ergebnisse gesamt</p>
              <div className="font-headline text-3xl text-primary">{results.length}</div>
              <p className="text-xs text-muted-foreground">Ø {avgPoints} Punkte</p>
            </div>
          </div>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-green-500/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <Zap className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Flash-Rate</p>
              <div className="font-headline text-3xl text-green-500">{flashStats.rate}%</div>
              <p className="text-xs text-muted-foreground">{flashStats.flash} von {results.length}</p>
            </div>
          </div>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Code-Einlösung</p>
              <div className="font-headline text-3xl text-blue-500">{codeRedemptionRate}%</div>
              <p className="text-xs text-muted-foreground">{codes.filter((c) => c.redeemed_by).length} von {codes.length}</p>
            </div>
          </div>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Routen gesamt</p>
              <div className="font-headline text-3xl text-purple-500">{routes.length}</div>
              <p className="text-xs text-muted-foreground">Aktive Routen</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Zeitverläufe */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="p-4 md:p-6 border-2 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-widest text-secondary">Code-Einlösungen (30 Tage)</div>
          </div>
          <div className="space-y-2">
            {codeRedemptionsTimeline.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground w-20">
                  {new Date(day.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="flex-1 bg-accent/40 rounded h-4 relative">
                  <div
                    className="bg-primary rounded h-4 transition-all"
                    style={{ width: `${(day.count / maxCodeRedemptions) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground w-8 text-right">{day.count}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-6 border-2 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-widest text-secondary">Ergebnisse (30 Tage)</div>
          </div>
          <div className="space-y-2">
            {resultsTimeline.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground w-20">
                  {new Date(day.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="flex-1 bg-accent/40 rounded h-4 relative">
                  <div
                    className="bg-green-500 rounded h-4 transition-all"
                    style={{ width: `${(day.count / maxResults) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground w-8 text-right">{day.count}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Routen-Statistiken */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="p-4 md:p-6 border-2 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-widest text-secondary">Top-Routen nach Punkten</div>
          </div>
          <div className="space-y-3">
            {topRoutesByPoints.length > 0 ? (
              topRoutesByPoints.map((item, idx) => (
                <div key={item.route.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-primary">
                        {item.route.code} {item.route.name ? `· ${item.route.name}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.count} Ergebnisse</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    Ø {item.avgPoints.toFixed(1)}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Noch keine Ergebnisse vorhanden.</div>
            )}
          </div>
        </Card>

        <Card className="p-4 md:p-6 border-2 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-widest text-secondary">Beliebte Routen</div>
          </div>
          <div className="space-y-3">
            {popularRoutes.length > 0 ? (
              popularRoutes.map((item, idx) => (
                <div key={item.route.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-primary">
                        {item.route.code} {item.route.name ? `· ${item.route.name}` : ""}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {item.route.discipline === "toprope" ? "Toprope" : "Lead"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-primary">{item.count}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Noch keine Ergebnisse vorhanden.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Aktivste Teilnehmer */}
      {topParticipants.length > 0 && (
        <Card className="p-4 md:p-6 border-2 border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-widest text-secondary">Aktivste Teilnehmer</div>
          </div>
          <div className="space-y-3">
            {topParticipants.map((item, idx) => (
              <div key={item.profile?.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-primary">
                      {item.profile?.first_name} {item.profile?.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.profile?.email}</div>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono">
                  {item.count} Ergebnisse
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GymStats;
