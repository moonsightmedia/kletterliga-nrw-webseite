import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, Zap, Target, BarChart3, Calendar, Award } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, listGymCodesByGym, listRoutesByGym, listResults, listProfiles } from "@/services/appApi";
import type { Result, Profile, GymCode, Route } from "@/services/appTypes";
import { StitchBadge, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { AdminStatCard } from "@/app/pages/admin/_components/AdminStatCard";

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
          Promise.all([listResults(), listProfiles()]).then(([{ data: resultsData }, { data: profilesData }]) => {
            const routeIds = gymRoutes.map((r) => r.id);
            const gymResults = (resultsData ?? []).filter((r) => routeIds.includes(r.route_id));
            setResults(gymResults);

            const profileMap = new Map<string, Profile>();
            (profilesData ?? []).forEach((p) => profileMap.set(p.id, p));
            setProfiles(profileMap);
          });
        });
      }
    });
  }, [profile?.id]);

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

  const topRoutesByPoints = useMemo(() => {
    const routeStats = routes.map((route) => {
      const routeResults = results.filter((r) => r.route_id === route.id);
      const avgPoints =
        routeResults.length > 0 ? routeResults.reduce((sum, r) => sum + r.points, 0) / routeResults.length : 0;
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

  const popularRoutes = useMemo(() => {
    const routeCounts = routes.map((route) => ({
      route,
      count: results.filter((r) => r.route_id === route.id).length,
    }));
    return routeCounts.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [routes, results]);

  const flashStats = useMemo(() => {
    const flashCount = results.filter((r) => r.flash).length;
    const totalCount = results.length;
    return {
      flash: flashCount,
      normal: totalCount - flashCount,
      rate: totalCount > 0 ? Math.round((flashCount / totalCount) * 100) : 0,
    };
  }, [results]);

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

  const codeRedemptionRate = useMemo(() => {
    const totalCodes = codes.length;
    const redeemedCodes = codes.filter((c) => c.redeemed_by).length;
    return totalCodes > 0 ? Math.round((redeemedCodes / totalCodes) * 100) : 0;
  }, [codes]);

  const avgPoints = useMemo(() => {
    return results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.points, 0) / results.length) : 0;
  }, [results]);

  if (!gymId) {
    return <p className="text-sm text-[rgba(27,28,26,0.64)]">Keine Halle zugewiesen.</p>;
  }

  const maxCodeRedemptions = Math.max(...codeRedemptionsTimeline.map((d) => d.count), 1);
  const maxResults = Math.max(...resultsTimeline.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Statistik"
        title="Hallen-Statistiken"
        description="Detaillierte Analyse der Hallen-Aktivität und Nutzung."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <AdminStatCard
          icon={BarChart3}
          label="Ergebnisse gesamt"
          value={results.length}
          hint={`Ø ${avgPoints} Punkte`}
        />
        <AdminStatCard
          icon={Zap}
          label="Flash-Rate"
          value={`${flashStats.rate}%`}
          hint={`${flashStats.flash} von ${results.length}`}
          iconWrapClassName="bg-emerald-600/12 group-hover:bg-emerald-600/18"
          iconClassName="text-emerald-700"
          valueClassName="stitch-metric text-3xl text-emerald-700"
        />
        <AdminStatCard
          icon={Target}
          label="Code-Einlösung"
          value={`${codeRedemptionRate}%`}
          hint={`${codes.filter((c) => c.redeemed_by).length} von ${codes.length}`}
          iconWrapClassName="bg-[#003d55]/10 group-hover:bg-[#003d55]/16"
          iconClassName="text-[#003d55]"
          valueClassName="stitch-metric text-3xl text-[#003d55]"
        />
        <AdminStatCard
          icon={Users}
          label="Routen gesamt"
          value={routes.length}
          hint="Aktive Routen"
          iconWrapClassName="bg-[#a15523]/12 group-hover:bg-[#a15523]/18"
          iconClassName="text-[#a15523]"
          valueClassName="stitch-metric text-3xl text-[#a15523]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <StitchCard tone="surface" className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#003d55]" />
            <div className="stitch-kicker text-[#a15523]">Code-Einlösungen (30 Tage)</div>
          </div>
          <div className="space-y-2">
            {codeRedemptionsTimeline.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="w-14 shrink-0 text-xs text-[rgba(27,28,26,0.55)] sm:w-20">
                  {new Date(day.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="relative h-4 flex-1 rounded bg-[rgba(0,61,85,0.08)]">
                  <div
                    className="h-4 rounded bg-[#003d55] transition-all"
                    style={{ width: `${(day.count / maxCodeRedemptions) * 100}%` }}
                  />
                </div>
                <div className="w-6 shrink-0 text-right text-xs text-[rgba(27,28,26,0.55)] sm:w-8">{day.count}</div>
              </div>
            ))}
          </div>
        </StitchCard>

        <StitchCard tone="surface" className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#003d55]" />
            <div className="stitch-kicker text-[#a15523]">Ergebnisse (30 Tage)</div>
          </div>
          <div className="space-y-2">
            {resultsTimeline.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="w-14 shrink-0 text-xs text-[rgba(27,28,26,0.55)] sm:w-20">
                  {new Date(day.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="relative h-4 flex-1 rounded bg-[rgba(0,61,85,0.08)]">
                  <div
                    className="h-4 rounded bg-emerald-600 transition-all"
                    style={{ width: `${(day.count / maxResults) * 100}%` }}
                  />
                </div>
                <div className="w-6 shrink-0 text-right text-xs text-[rgba(27,28,26,0.55)] sm:w-8">{day.count}</div>
              </div>
            ))}
          </div>
        </StitchCard>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <StitchCard tone="surface" className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#003d55]" />
            <div className="stitch-kicker text-[#a15523]">Top-Routen nach Punkten</div>
          </div>
          <div className="space-y-3">
            {topRoutesByPoints.length > 0 ? (
              topRoutesByPoints.map((item, idx) => (
                <div
                  key={item.route.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,38,55,0.08)] bg-white/70 p-3 transition-colors hover:bg-white/95"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003d55]/10 text-sm font-bold text-[#003d55]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#002637] break-words">
                        {item.route.code} {item.route.name ? `· ${item.route.name}` : ""}
                      </div>
                      <div className="text-xs text-[rgba(27,28,26,0.55)]">{item.count} Ergebnisse</div>
                    </div>
                  </div>
                  <StitchBadge tone="ghost" className="shrink-0 font-mono normal-case tracking-normal">
                    Ø {item.avgPoints.toFixed(1)}
                  </StitchBadge>
                </div>
              ))
            ) : (
              <p className="text-sm text-[rgba(27,28,26,0.64)]">Noch keine Ergebnisse vorhanden.</p>
            )}
          </div>
        </StitchCard>

        <StitchCard tone="surface" className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#003d55]" />
            <div className="stitch-kicker text-[#a15523]">Beliebte Routen</div>
          </div>
          <div className="space-y-3">
            {popularRoutes.length > 0 ? (
              popularRoutes.map((item, idx) => (
                <div
                  key={item.route.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,38,55,0.08)] bg-white/70 p-3 transition-colors hover:bg-white/95"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003d55]/10 text-sm font-bold text-[#003d55]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#002637] break-words">
                        {item.route.code} {item.route.name ? `· ${item.route.name}` : ""}
                      </div>
                      <StitchBadge tone="ghost" className="mt-1 normal-case tracking-normal">
                        {item.route.discipline === "toprope" ? "Toprope" : "Lead"}
                      </StitchBadge>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-[#002637]">{item.count}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[rgba(27,28,26,0.64)]">Noch keine Ergebnisse vorhanden.</p>
            )}
          </div>
        </StitchCard>
      </div>

      {topParticipants.length > 0 ? (
        <StitchCard tone="surface" className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#003d55]" />
            <div className="stitch-kicker text-[#a15523]">Aktivste Teilnehmer</div>
          </div>
          <div className="space-y-3">
            {topParticipants.map((item, idx) => (
              <div
                key={item.profile?.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,38,55,0.08)] bg-white/70 p-3 transition-colors hover:bg-white/95"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003d55]/10 text-sm font-bold text-[#003d55]">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#002637] break-words">
                      {item.profile?.first_name} {item.profile?.last_name}
                    </div>
                    <div className="break-all text-xs text-[rgba(27,28,26,0.55)]">{item.profile?.email}</div>
                  </div>
                </div>
                <StitchBadge tone="ghost" className="shrink-0 font-mono normal-case tracking-normal">
                  {item.count} Ergebnisse
                </StitchBadge>
              </div>
            ))}
          </div>
        </StitchCard>
      ) : null}
    </div>
  );
};

export default GymStats;
