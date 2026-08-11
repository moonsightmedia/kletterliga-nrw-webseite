import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, Zap, Target, BarChart3, Calendar, Award, Star } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymCodesByGym } from "@/services/appApi";
import type { GymCode, Route } from "@/services/appTypes";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { AdminStatCard } from "@/app/pages/admin/_components/AdminStatCard";
import { useGymAdminOverviewQuery } from "@/app/pages/admin/gymAdminQueries";

const GymStats = () => {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useGymAdminOverviewQuery(profile?.id);
  const [codes, setCodes] = useState<GymCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);

  useEffect(() => {
    if (!data.gymId) return;
    let cancelled = false;
    setCodes([]);
    setCodesLoading(true);
    setCodesError(null);
    void listGymCodesByGym(data.gymId)
      .then((codesResponse) => {
        if (cancelled) return;
        if (codesResponse.error) {
          setCodesError(codesResponse.error.message);
          return;
        }
        setCodes(codesResponse.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCodesError("Hallencodes konnten nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setCodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data.gymId]);

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
    const countsByDate = new Map(
      (data.results?.daily_results ?? []).map((day) => [day.date, day.count]),
    );
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });
    return last30Days.map((date) => ({
      date,
      count: countsByDate.get(date) ?? 0,
    }));
  }, [data.results]);

  const topRoutesByPoints = useMemo(() => {
    const routeMap = new Map(data.routes.map((route) => [route.id, route]));
    return (data.results?.route_stats ?? [])
      .map((routeStats) => ({
        route: routeMap.get(routeStats.route_id),
        avgPoints: routeStats.average_score ?? 0,
        count: routeStats.result_count,
      }))
      .filter(
        (item): item is { route: Route; avgPoints: number; count: number } =>
          Boolean(item.route) && item.count > 0,
      )
      .sort((a, b) => b.avgPoints - a.avgPoints)
      .slice(0, 5);
  }, [data.results, data.routes]);

  const popularRoutes = useMemo(() => {
    const routeMap = new Map(data.routes.map((route) => [route.id, route]));
    return (data.results?.route_stats ?? [])
      .map((routeStats) => ({
        route: routeMap.get(routeStats.route_id),
        count: routeStats.result_count,
      }))
      .filter(
        (item): item is { route: Route; count: number } =>
          Boolean(item.route) && item.count > 0,
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data.results, data.routes]);

  const flashStats = useMemo(() => {
    const flashCount = data.results?.flash_count ?? 0;
    const totalCount = data.results?.result_count ?? 0;
    return {
      flash: flashCount,
      normal: totalCount - flashCount,
      rate: totalCount > 0 ? Math.round((flashCount / totalCount) * 100) : 0,
    };
  }, [data.results]);

  const codeRedemptionRate = useMemo(() => {
    const totalCodes = codes.length;
    const redeemedCodes = codes.filter((c) => c.redeemed_by).length;
    return totalCodes > 0 ? Math.round((redeemedCodes / totalCodes) * 100) : 0;
  }, [codes]);

  const avgPoints = useMemo(() => {
    return data.results?.average_score === null || data.results?.average_score === undefined
      ? 0
      : Math.round(data.results.average_score);
  }, [data.results]);

  if (loading) {
    return <p className="text-sm text-[rgba(27,28,26,0.64)]">Hallen-Statistiken werden geladen…</p>;
  }

  if (error) {
    return (
      <StitchCard tone="surface" className="space-y-4 p-5 md:p-6">
        <p className="text-sm font-semibold text-[#b42318]">{error}</p>
        <StitchButton type="button" variant="outline" size="sm" onClick={() => void reload()}>
          Erneut versuchen
        </StitchButton>
      </StitchCard>
    );
  }

  if (!data.gymId || !data.results) {
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-5">
        <AdminStatCard
          icon={BarChart3}
          label="Ergebnisse gesamt"
          value={data.results.result_count}
          hint={`Ø ${avgPoints} Punkte`}
        />
        <AdminStatCard
          icon={Users}
          label="Aktive Teilnehmende"
          value={data.results.participant_count}
          hint="Anonym zusammengefasst"
        />
        <AdminStatCard
          icon={Zap}
          label="Flash-Rate"
          value={`${flashStats.rate}%`}
          hint={`${flashStats.flash} von ${data.results.result_count}`}
          iconWrapClassName="bg-emerald-600/12 group-hover:bg-emerald-600/18"
          iconClassName="text-emerald-700"
          valueClassName="stitch-metric text-3xl text-emerald-700"
        />
        <AdminStatCard
          icon={Star}
          label="Routenbewertung"
          value={
            data.highlights?.average_rating === null || data.highlights?.average_rating === undefined
              ? "–"
              : data.highlights.average_rating.toLocaleString("de-DE", { maximumFractionDigits: 1 })
          }
          hint={
            data.highlightsError
              ? "Derzeit nicht verfügbar"
              : `${data.highlights?.rating_count ?? 0} Bewertungen`
          }
          iconWrapClassName="bg-amber-500/14 group-hover:bg-amber-500/20"
          iconClassName="text-amber-600"
          valueClassName="stitch-metric text-3xl text-amber-600"
        />
        <AdminStatCard
          icon={Target}
          label="Code-Einlösung"
          value={codesLoading ? "…" : codesError ? "–" : `${codeRedemptionRate}%`}
          hint={
            codesLoading
              ? "Hallencodes werden geladen"
              : codesError
                ? "Hallencodes derzeit nicht verfügbar"
                : `${codes.filter((c) => c.redeemed_by).length} von ${codes.length}`
          }
          iconWrapClassName="bg-[#003d55]/10 group-hover:bg-[#003d55]/16"
          iconClassName="text-[#003d55]"
          valueClassName="stitch-metric text-3xl text-[#003d55]"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <StitchCard tone="surface" className="p-4 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#003d55]" />
            <div className="stitch-kicker text-[#a15523]">Code-Einlösungen (30 Tage)</div>
          </div>
          {codesLoading ? (
            <p className="text-sm text-[rgba(27,28,26,0.64)]">Hallencodes werden geladen…</p>
          ) : codesError ? (
            <p className="text-sm font-semibold text-[#b42318]">{codesError}</p>
          ) : (
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
          )}
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

    </div>
  );
};

export default GymStats;
