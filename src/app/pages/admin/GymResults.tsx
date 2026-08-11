import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ClipboardList, Search, ShieldCheck, Star, Users, Zap } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { AdminStatCard } from "@/app/pages/admin/_components/AdminStatCard";
import { useGymAdminOverviewQuery } from "@/app/pages/admin/gymAdminQueries";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { getGymAdminResults } from "@/services/appApi";
import type { GymAdminResultItem } from "@/services/appTypes";

const formatDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T12:00:00.000Z`).toLocaleDateString("de-DE") : "–";

const getResultStatusLabel = (result: GymAdminResultItem) => {
  if (result.status === "not_climbed") return "Nicht geklettert";
  if (result.status === "climbed") return "Geklettert";
  return result.points > 0 ? "Geklettert" : "Nicht geklettert";
};

const GymResults = () => {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useGymAdminOverviewQuery(profile?.id);
  const [search, setSearch] = useState("");
  const [discipline, setDiscipline] = useState<"all" | "toprope" | "lead">("all");
  const [ratingFilter, setRatingFilter] = useState<"all" | "rated" | "unrated">("all");
  const [additionalResults, setAdditionalResults] = useState<GymAdminResultItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const paginationGymIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (paginationGymIdRef.current === data.gymId) return;
    paginationGymIdRef.current = data.gymId;
    setAdditionalResults([]);
    setNextCursor(data.results?.next_cursor ?? null);
    setLoadMoreError(null);
  }, [data.gymId, data.results?.next_cursor]);

  const routeMap = useMemo(
    () => new Map(data.routes.map((route) => [route.id, route])),
    [data.routes],
  );

  const allLoadedResults = useMemo(() => {
    return [...(data.results?.results ?? []), ...additionalResults];
  }, [additionalResults, data.results]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allLoadedResults.filter((result) => {
      const route = routeMap.get(result.route_id);
      const routeLabel = `${route?.code ?? ""} ${route?.name ?? ""}`.toLowerCase();
      const matchesSearch = !query || routeLabel.includes(query);
      const matchesDiscipline = discipline === "all" || route?.discipline === discipline;
      const hasRating = result.rating !== null;
      const matchesRating =
        ratingFilter === "all" ||
        (ratingFilter === "rated" && hasRating) ||
        (ratingFilter === "unrated" && !hasRating);
      return matchesSearch && matchesDiscipline && matchesRating;
    });
  }, [allLoadedResults, discipline, ratingFilter, routeMap, search]);

  const handleLoadMore = async () => {
    if (!data.gymId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    const response = await getGymAdminResults(data.gymId, {
      limit: 50,
      cursor: nextCursor,
    });
    setLoadingMore(false);

    if (response.error || !response.data) {
      setLoadMoreError(
        response.error?.message ?? "Weitere Ergebnisse konnten nicht geladen werden.",
      );
      return;
    }

    setAdditionalResults((current) => [...current, ...response.data.results]);
    setNextCursor(response.data.next_cursor);
  };

  const handleReloadResults = async () => {
    setLoadingMore(true);
    setLoadMoreError(null);
    const refreshed = await reload();
    setLoadingMore(false);

    if (refreshed.error || !refreshed.data?.results) {
      setLoadMoreError(refreshed.error ?? "Die Ergebnisliste konnte nicht neu geladen werden.");
      return;
    }

    paginationGymIdRef.current = refreshed.data.gymId;
    setAdditionalResults([]);
    setNextCursor(refreshed.data.results.next_cursor);
  };

  if (loading) {
    return <p className="text-sm text-[rgba(27,28,26,0.64)]">Hallenergebnisse werden geladen…</p>;
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
    return (
      <p className="text-sm text-[rgba(27,28,26,0.64)]">
        Keine Halle zugewiesen. Bitte kontaktiere einen Liga-Admin.
      </p>
    );
  }

  const flashRate =
    data.results.result_count > 0
      ? Math.round((data.results.flash_count / data.results.result_count) * 100)
      : 0;
  const averageRating = data.highlights?.average_rating ?? null;
  const ratingCount = data.highlights?.rating_count ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Hallenansicht"
        title="Ergebnisse & Bewertungen"
        description="Ergebnisse deiner Halle – chronologisch, read-only und ohne Teilnehmerprofile oder exakte Uhrzeiten."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <AdminStatCard
          icon={ClipboardList}
          label="Ergebnisse gesamt"
          value={data.results.result_count}
          hint={`${allLoadedResults.length} aktuell geladen`}
        />
        <AdminStatCard
          icon={Users}
          label="Aktive Teilnehmende"
          value={data.results.participant_count}
          hint="Nur als Gesamtzahl"
        />
        <AdminStatCard
          icon={Zap}
          label="Flash-Rate"
          value={`${flashRate}%`}
          hint={`${data.results.flash_count} von ${data.results.result_count}`}
          iconWrapClassName="bg-emerald-600/12 group-hover:bg-emerald-600/18"
          iconClassName="text-emerald-700"
          valueClassName="stitch-metric text-3xl text-emerald-700"
        />
        <AdminStatCard
          icon={Star}
          label="Routenbewertung"
          value={averageRating === null ? "–" : averageRating.toLocaleString("de-DE", { maximumFractionDigits: 1 })}
          hint={
            data.highlightsError
              ? "Bewertungen derzeit nicht verfügbar"
              : `${ratingCount} ${ratingCount === 1 ? "Bewertung" : "Bewertungen"}`
          }
          iconWrapClassName="bg-amber-500/14 group-hover:bg-amber-500/20"
          iconClassName="text-amber-600"
          valueClassName="stitch-metric text-3xl text-amber-600"
        />
      </div>

      <StitchCard tone="surface" className="space-y-4 p-4 md:p-5">
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(0,61,85,0.12)] bg-[rgba(0,61,85,0.04)] p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#003d55]" />
          <p className="text-sm leading-6 text-[rgba(27,28,26,0.72)]">
            Namen, E-Mail-Adressen, Profil-IDs, exakte Uhrzeiten und Freitext-Kommentare werden Hallen-Admins nicht angezeigt.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
          <label className="relative block">
            <span className="sr-only">Nach Route suchen</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(27,28,26,0.48)]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Route suchen…"
              className="min-h-11 pl-9"
            />
          </label>
          <label>
            <span className="sr-only">Disziplin filtern</span>
            <select
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value as typeof discipline)}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Alle Disziplinen</option>
              <option value="toprope">Toprope</option>
              <option value="lead">Vorstieg</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Bewertungen filtern</span>
            <select
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value as typeof ratingFilter)}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Alle Bewertungen</option>
              <option value="rated">Nur bewertet</option>
              <option value="unrated">Nicht bewertet</option>
            </select>
          </label>
        </div>
      </StitchCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="stitch-kicker text-[#a15523]">Einträge</div>
          <h2 className="mt-1 text-lg font-semibold text-[#002637]">
            {filteredResults.length} von {allLoadedResults.length} geladenen Ergebnissen
          </h2>
          {nextCursor ? (
            <p className="mt-1 text-xs text-[rgba(27,28,26,0.55)]">
              Suche und Filter gelten für die aktuell geladenen Ergebnisse. Weitere Einträge können unten nachgeladen werden.
            </p>
          ) : null}
        </div>
        <StitchBadge tone="ghost" className="normal-case tracking-normal">
          Nur Lesen
        </StitchBadge>
      </div>

      {filteredResults.length === 0 ? (
        <StitchCard tone="surface" className="p-8 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-[rgba(0,61,85,0.36)]" />
          <p className="mt-3 text-sm text-[rgba(27,28,26,0.64)]">
            {allLoadedResults.length === 0
              ? "Für diese Halle liegen noch keine Ergebnisse vor."
              : "In den aktuell geladenen Ergebnissen wurden keine passenden Einträge gefunden."}
          </p>
        </StitchCard>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const route = routeMap.get(result.route_id);
            return (
              <StitchCard
                key={`${result.route_id}-${result.submitted_on}-${index}`}
                tone="surface"
                className="p-4 md:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-[#002637] md:text-lg">
                        Route {route?.code ?? "?"}
                        {route?.name ? ` · ${route.name}` : ""}
                      </div>
                      {route ? (
                        <StitchBadge tone="ghost" className="normal-case tracking-normal">
                          {route.discipline === "toprope" ? "Toprope" : "Vorstieg"}
                        </StitchBadge>
                      ) : null}
                      {result.flash ? (
                        <StitchBadge tone="cream" className="normal-case tracking-normal">
                          Flash
                        </StitchBadge>
                      ) : null}
                      {result.edited ? (
                        <StitchBadge tone="ghost" className="normal-case tracking-normal">
                          Bearbeitet
                        </StitchBadge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[rgba(27,28,26,0.56)]">
                      {formatDate(result.submitted_on)} · {getResultStatusLabel(result)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="min-w-[5rem] text-left sm:text-right">
                      <div className="stitch-metric text-2xl text-[#003d55]">{result.points}</div>
                      <div className="text-xs text-[rgba(27,28,26,0.55)]">Punkte</div>
                    </div>
                    <div className="w-28 text-right">
                      {result.rating === null ? (
                        <span className="text-xs text-[rgba(27,28,26,0.55)]">Nicht bewertet</span>
                      ) : (
                        <>
                          <StarRating value={result.rating} readonly size="sm" />
                          <div className="text-xs text-[rgba(27,28,26,0.55)]">
                            {result.rating} von 5
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </StitchCard>
            );
          })}
        </div>
      )}

      {loadMoreError ? (
        <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
          <p className="text-sm font-semibold text-[#b42318]">{loadMoreError}</p>
          <StitchButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleReloadResults()}
          >
            Ergebnisliste neu laden
          </StitchButton>
        </div>
      ) : null}
      {nextCursor ? (
        <div className="flex justify-center">
          <StitchButton
            type="button"
            variant="outline"
            onClick={() => void handleLoadMore()}
            disabled={loadingMore}
            className="w-full whitespace-normal sm:w-auto"
          >
            {loadingMore ? "Wird geladen…" : "Weitere Ergebnisse laden"}
          </StitchButton>
        </div>
      ) : null}
    </div>
  );
};

export default GymResults;
