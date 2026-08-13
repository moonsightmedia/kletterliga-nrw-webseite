import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Layers3,
  ListFilter,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { AdminPageHeader } from "@/app/pages/admin/_components/AdminPageHeader";
import { AdminStatCard } from "@/app/pages/admin/_components/AdminStatCard";
import { useGymAdminOverviewQuery } from "@/app/pages/admin/gymAdminQueries";
import {
  StitchBadge,
  StitchButton,
  StitchCard,
  StitchSelectField,
  StitchTextField,
} from "@/app/components/StitchPrimitives";
import { StarRating } from "@/components/ui/star-rating";
import { getGymAdminResults } from "@/services/appApi";
import type { GymAdminResultItem } from "@/services/appTypes";
import {
  buildGymRouteResultSummaries,
  compareGymRoutes,
  filterAndSortGymRouteSummaries,
  filterAndSortLoadedGymResults,
  isGymResultClimbed,
  type GymDisciplineFilter,
  type GymRatingFilter,
  type GymResultSortMode,
  type GymResultStatusFilter,
  type GymRouteSortMode,
} from "@/app/pages/admin/gymResultsView";

const formatDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T12:00:00.000Z`).toLocaleDateString("de-DE") : "–";

const formatAverage = (value: number | null) =>
  value === null
    ? "–"
    : value.toLocaleString("de-DE", {
        maximumFractionDigits: 1,
      });

const getResultStatusLabel = (result: GymAdminResultItem) =>
  isGymResultClimbed(result) ? "Geklettert" : "Nicht geklettert";

const GymResults = () => {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useGymAdminOverviewQuery(profile?.id);
  const [view, setView] = useState<"routes" | "results">("routes");

  const [routeSearch, setRouteSearch] = useState("");
  const [routeDiscipline, setRouteDiscipline] = useState<GymDisciplineFilter>("all");
  const [routeRatingFilter, setRouteRatingFilter] = useState<GymRatingFilter>("all");
  const [routeSort, setRouteSort] = useState<GymRouteSortMode>("route");

  const [resultSearch, setResultSearch] = useState("");
  const [resultRouteId, setResultRouteId] = useState("all");
  const [resultDiscipline, setResultDiscipline] = useState<GymDisciplineFilter>("all");
  const [resultStatusFilter, setResultStatusFilter] = useState<GymResultStatusFilter>("all");
  const [resultRatingFilter, setResultRatingFilter] = useState<GymRatingFilter>("all");
  const [resultSort, setResultSort] = useState<GymResultSortMode>("newest");

  const [additionalResults, setAdditionalResults] = useState<GymAdminResultItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const paginationGymIdRef = useRef<string | null>(null);
  const routeTabRef = useRef<HTMLButtonElement | null>(null);
  const resultTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (paginationGymIdRef.current === data.gymId) return;
    paginationGymIdRef.current = data.gymId;
    setAdditionalResults([]);
    setNextCursor(data.results?.next_cursor ?? null);
    setLoadMoreError(null);
  }, [data.gymId, data.results?.next_cursor]);

  useEffect(() => {
    if (!data.highlightsError) return;
    setRouteRatingFilter("all");
    setRouteSort((current) => (current === "rating" ? "route" : current));
  }, [data.highlightsError]);

  const routeMap = useMemo(
    () => new Map(data.routes.map((route) => [route.id, route])),
    [data.routes],
  );

  const sortedRoutes = useMemo(() => [...data.routes].sort(compareGymRoutes), [data.routes]);

  const routeSummaries = useMemo(
    () =>
      buildGymRouteResultSummaries({
        routes: data.routes,
        resultStats: data.results?.route_stats ?? [],
        ratingStats: data.highlights?.route_stats ?? [],
      }),
    [data.highlights, data.results, data.routes],
  );

  const filteredRouteSummaries = useMemo(
    () =>
      filterAndSortGymRouteSummaries({
        summaries: routeSummaries,
        search: routeSearch,
        discipline: routeDiscipline,
        ratingFilter: routeRatingFilter,
        sortMode: routeSort,
      }),
    [routeDiscipline, routeRatingFilter, routeSearch, routeSort, routeSummaries],
  );

  const allLoadedResults = useMemo(
    () => [...(data.results?.results ?? []), ...additionalResults],
    [additionalResults, data.results],
  );

  const filteredResults = useMemo(
    () =>
      filterAndSortLoadedGymResults({
        results: allLoadedResults,
        routeMap,
        search: resultSearch,
        routeId: resultRouteId,
        discipline: resultDiscipline,
        statusFilter: resultStatusFilter,
        ratingFilter: resultRatingFilter,
        sortMode: resultSort,
      }),
    [
      allLoadedResults,
      resultDiscipline,
      resultRatingFilter,
      resultRouteId,
      resultSearch,
      resultSort,
      resultStatusFilter,
      routeMap,
    ],
  );

  const routeFiltersActive =
    routeSearch !== "" || routeDiscipline !== "all" || routeRatingFilter !== "all" || routeSort !== "route";
  const resultFiltersActive =
    resultSearch !== "" ||
    resultRouteId !== "all" ||
    resultDiscipline !== "all" ||
    resultStatusFilter !== "all" ||
    resultRatingFilter !== "all" ||
    resultSort !== "newest";

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
      setLoadMoreError(response.error?.message ?? "Weitere Ergebnisse konnten nicht geladen werden.");
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

  const resetRouteFilters = () => {
    setRouteSearch("");
    setRouteDiscipline("all");
    setRouteRatingFilter("all");
    setRouteSort("route");
  };

  const resetResultFilters = () => {
    setResultSearch("");
    setResultRouteId("all");
    setResultDiscipline("all");
    setResultStatusFilter("all");
    setResultRatingFilter("all");
    setResultSort("newest");
  };

  const selectViewAndFocus = (nextView: "routes" | "results") => {
    setView(nextView);
    (nextView === "routes" ? routeTabRef : resultTabRef).current?.focus();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      selectViewAndFocus(view === "routes" ? "results" : "routes");
    } else if (event.key === "Home") {
      event.preventDefault();
      selectViewAndFocus("routes");
    } else if (event.key === "End") {
      event.preventDefault();
      selectViewAndFocus("results");
    }
  };

  const pageHeader = (
    <AdminPageHeader
      eyebrow="Hallenansicht"
      title="Ergebnisse & Bewertungen"
      description="Alle Routen im Überblick oder einzelne, anonymisierte Ergebnisse – direkt filterbar und sortierbar."
    />
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <StitchCard tone="surface" className="p-6" role="status" aria-live="polite" aria-busy="true">
          <p className="text-sm text-[rgba(27,28,26,0.68)]">Hallenergebnisse werden geladen…</p>
        </StitchCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <StitchCard tone="surface" className="space-y-4 p-5 md:p-6" role="alert">
          <p className="text-sm font-semibold text-[#b42318]">{error}</p>
          <StitchButton type="button" variant="outline" size="sm" onClick={() => void reload()}>
            Erneut versuchen
          </StitchButton>
        </StitchCard>
      </div>
    );
  }

  if (!data.gymId || !data.results) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <StitchCard tone="surface" className="p-6">
          <p className="text-sm text-[rgba(27,28,26,0.68)]">
            Keine Halle zugewiesen. Bitte kontaktiere einen Liga-Admin.
          </p>
        </StitchCard>
      </div>
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
      {pageHeader}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
        <AdminStatCard
          icon={ClipboardList}
          label="Ergebnisse gesamt"
          value={data.results.result_count}
          hint={`${allLoadedResults.length} Einzelergebnisse geladen`}
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
          value={formatAverage(averageRating)}
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

      <div className="flex items-start gap-3 rounded-xl border border-[rgba(0,61,85,0.12)] bg-[rgba(0,61,85,0.04)] p-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#003d55]" />
        <p className="text-sm leading-6 text-[rgba(27,28,26,0.72)]">
          Namen, E-Mail-Adressen, Profil-IDs, exakte Uhrzeiten und Freitext-Kommentare werden Hallen-Admins nicht angezeigt.
        </p>
      </div>

      <div>
        <div
          role="tablist"
          aria-label="Ergebnisansicht"
          className="grid h-auto w-full grid-cols-2 rounded-xl bg-[rgba(0,61,85,0.07)] p-1"
        >
          <button
            ref={routeTabRef}
            type="button"
            role="tab"
            id="gym-results-routes-tab"
            aria-controls="gym-results-routes-panel"
            aria-selected={view === "routes"}
            tabIndex={view === "routes" ? 0 : -1}
            onClick={() => setView("routes")}
            onKeyDown={handleTabKeyDown}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              view === "routes" ? "bg-white text-[#002637] shadow-sm" : "text-[rgba(0,38,55,0.72)]"
            }`}
          >
            <Layers3 className="hidden h-4 w-4 min-[360px]:block" aria-hidden />
            Nach Routen
          </button>
          <button
            ref={resultTabRef}
            type="button"
            role="tab"
            id="gym-results-results-tab"
            aria-label="Einzelergebnisse"
            aria-controls="gym-results-results-panel"
            aria-selected={view === "results"}
            tabIndex={view === "results" ? 0 : -1}
            onClick={() => setView("results")}
            onKeyDown={handleTabKeyDown}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              view === "results" ? "bg-white text-[#002637] shadow-sm" : "text-[rgba(0,38,55,0.72)]"
            }`}
          >
            <ListFilter className="hidden h-4 w-4 min-[360px]:block" aria-hidden />
            <span className="hidden min-[390px]:inline">Einzelergebnisse</span>
            <span className="min-[390px]:hidden">Einträge</span>
          </button>
        </div>

        {view === "routes" ? (
          <section
            id="gym-results-routes-panel"
            role="tabpanel"
            aria-labelledby="gym-results-routes-tab"
            className="mt-5 space-y-5"
          >
          <StitchCard tone="surface" className="space-y-4 p-4 md:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StitchTextField
                label="Route suchen"
                value={routeSearch}
                onChange={(event) => setRouteSearch(event.target.value)}
                placeholder="Code oder Name"
                icon={<Search className="h-4 w-4" />}
              />
              <StitchSelectField
                label="Disziplin"
                value={routeDiscipline}
                onChange={(event) => setRouteDiscipline(event.target.value as GymDisciplineFilter)}
              >
                <option value="all">Alle Disziplinen</option>
                <option value="toprope">Toprope</option>
                <option value="lead">Vorstieg</option>
              </StitchSelectField>
              <StitchSelectField
                label="Bewertung"
                value={routeRatingFilter}
                onChange={(event) => setRouteRatingFilter(event.target.value as GymRatingFilter)}
                disabled={Boolean(data.highlightsError)}
                hint={data.highlightsError ? "Bewertungen sind derzeit nicht verfügbar." : undefined}
              >
                <option value="all">Alle Routen</option>
                <option value="rated">Nur bewertet</option>
                <option value="unrated">Noch nicht bewertet</option>
              </StitchSelectField>
              <StitchSelectField
                label="Sortierung"
                value={routeSort}
                onChange={(event) => setRouteSort(event.target.value as GymRouteSortMode)}
              >
                <option value="route">Route A–Z</option>
                <option value="results">Meiste Ergebnisse</option>
                <option value="rating" disabled={Boolean(data.highlightsError)}>
                  Beste Bewertung
                </option>
                <option value="score">Höchste Ø-Punktzahl</option>
              </StitchSelectField>
            </div>
            {routeFiltersActive ? (
              <StitchButton type="button" variant="ghost" size="sm" onClick={resetRouteFilters}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Filter & Sortierung zurücksetzen
              </StitchButton>
            ) : null}
          </StitchCard>

          <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
            <div>
              <div className="stitch-kicker text-[#a15523]">Routenübersicht</div>
              <h2 className="mt-1 text-lg font-semibold text-[#002637]">
                {filteredRouteSummaries.length} von {data.routes.length} Routen
              </h2>
            </div>
            <StitchBadge tone="ghost" className="normal-case tracking-normal">
              Gesamter Datenbestand
            </StitchBadge>
          </div>

          {filteredRouteSummaries.length === 0 ? (
            <StitchCard tone="surface" className="p-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-[rgba(0,61,85,0.46)]" aria-hidden />
              <p className="mt-3 text-sm text-[rgba(27,28,26,0.68)]">
                {data.routes.length === 0
                  ? "Für diese Halle wurden noch keine Routen angelegt."
                  : "Für diese Filter wurden keine passenden Routen gefunden."}
              </p>
            </StitchCard>
          ) : (
            <div className="space-y-3">
              {filteredRouteSummaries.map((item) => {
                const routeFlashRate =
                  item.resultCount > 0 ? Math.round((item.flashCount / item.resultCount) * 100) : null;
                return (
                  <StitchCard key={item.route.id} tone="surface" className="p-4 md:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 lg:max-w-[38%] lg:flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[#002637] md:text-lg">
                            Route {item.route.code}
                            {item.route.name ? ` · ${item.route.name}` : ""}
                          </h3>
                          <StitchBadge tone="ghost" className="normal-case tracking-normal">
                            {item.route.discipline === "toprope" ? "Toprope" : "Vorstieg"}
                          </StitchBadge>
                          {!item.route.active ? (
                            <StitchBadge tone="cream" className="normal-case tracking-normal">
                              Inaktiv
                            </StitchBadge>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[32rem]">
                        <div>
                          <div className="stitch-metric text-xl text-[#003d55]">{item.resultCount}</div>
                          <div className="text-xs text-[rgba(27,28,26,0.68)]">Ergebnisse</div>
                        </div>
                        <div>
                          <div className="stitch-metric text-xl text-[#003d55]">
                            {routeFlashRate === null ? "–" : `${routeFlashRate}%`}
                          </div>
                          <div className="text-xs text-[rgba(27,28,26,0.68)]">Flash-Rate</div>
                        </div>
                        <div>
                          <div className="stitch-metric text-xl text-[#003d55]">
                            {formatAverage(item.averageScore)}
                          </div>
                          <div className="text-xs text-[rgba(27,28,26,0.68)]">Ø Wertungspunkte*</div>
                        </div>
                        <div>
                          {data.highlightsError ? (
                            <div className="text-xs text-[rgba(27,28,26,0.68)]">Nicht verfügbar</div>
                          ) : !item.ratingAvailable ? (
                            <div className="text-xs text-[rgba(27,28,26,0.68)]">
                              Für inaktive Route nicht verfügbar
                            </div>
                          ) : item.averageRating === null ? (
                            <div className="text-xs text-[rgba(27,28,26,0.68)]">Keine Bewertung</div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-sm font-semibold text-amber-700">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                                {formatAverage(item.averageRating)} von 5
                              </div>
                              <div className="text-xs text-[rgba(27,28,26,0.68)]">
                                {item.ratingCount} {item.ratingCount === 1 ? "Bewertung" : "Bewertungen"}
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

          <p className="text-xs leading-5 text-[rgba(27,28,26,0.68)]">
            * Ø Wertungspunkte enthalten den Flashbonus.
          </p>
          </section>
        ) : (
          <section
            id="gym-results-routes-panel"
            role="tabpanel"
            aria-labelledby="gym-results-routes-tab"
            hidden
          />
        )}

        {view === "results" ? (
          <section
            id="gym-results-results-panel"
            role="tabpanel"
            aria-labelledby="gym-results-results-tab"
            className="mt-5 space-y-5"
          >
          <StitchCard tone="surface" className="space-y-4 p-4 md:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StitchTextField
                label="Route suchen"
                value={resultSearch}
                onChange={(event) => setResultSearch(event.target.value)}
                placeholder="Code oder Name"
                icon={<Search className="h-4 w-4" />}
              />
              <StitchSelectField
                label="Route"
                value={resultRouteId}
                onChange={(event) => setResultRouteId(event.target.value)}
              >
                <option value="all">Alle Routen</option>
                {sortedRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.code}{route.name ? ` · ${route.name}` : ""}
                  </option>
                ))}
              </StitchSelectField>
              <StitchSelectField
                label="Disziplin"
                value={resultDiscipline}
                onChange={(event) => setResultDiscipline(event.target.value as GymDisciplineFilter)}
              >
                <option value="all">Alle Disziplinen</option>
                <option value="toprope">Toprope</option>
                <option value="lead">Vorstieg</option>
              </StitchSelectField>
              <StitchSelectField
                label="Status"
                value={resultStatusFilter}
                onChange={(event) => setResultStatusFilter(event.target.value as GymResultStatusFilter)}
              >
                <option value="all">Alle Status</option>
                <option value="climbed">Geklettert</option>
                <option value="not_climbed">Nicht geklettert</option>
              </StitchSelectField>
              <StitchSelectField
                label="Bewertung"
                value={resultRatingFilter}
                onChange={(event) => setResultRatingFilter(event.target.value as GymRatingFilter)}
              >
                <option value="all">Alle Bewertungen</option>
                <option value="rated">Nur bewertet</option>
                <option value="unrated">Nicht bewertet</option>
              </StitchSelectField>
              <StitchSelectField
                label="Sortierung"
                value={resultSort}
                onChange={(event) => setResultSort(event.target.value as GymResultSortMode)}
              >
                <option value="newest">Datum: neu nach alt</option>
                <option value="oldest">Datum: alt nach neu</option>
                <option value="route">Route A–Z</option>
                <option value="points">Höchste Punkte</option>
                <option value="rating">Beste Bewertung</option>
              </StitchSelectField>
            </div>
            {resultFiltersActive ? (
              <StitchButton type="button" variant="ghost" size="sm" onClick={resetResultFilters}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Filter & Sortierung zurücksetzen
              </StitchButton>
            ) : null}
          </StitchCard>

          <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
            <div>
              <div className="stitch-kicker text-[#a15523]">Einzelergebnisse</div>
              <h2 className="mt-1 text-lg font-semibold text-[#002637]">
                {filteredResults.length} von {allLoadedResults.length} geladenen Ergebnissen
              </h2>
              {nextCursor ? (
                <p className="mt-1 text-xs text-[rgba(27,28,26,0.68)]">
                  Suche, Filter und Sortierung gelten für die aktuell geladenen Ergebnisse. Weitere Einträge können unten
                  nachgeladen werden.
                </p>
              ) : null}
            </div>
            <StitchBadge tone="ghost" className="normal-case tracking-normal">
              Nur Lesen
            </StitchBadge>
          </div>

          {filteredResults.length === 0 ? (
            <StitchCard tone="surface" className="p-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-[rgba(0,61,85,0.46)]" aria-hidden />
              <p className="mt-3 text-sm text-[rgba(27,28,26,0.68)]">
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
                    key={`${result.route_id}-${result.submitted_on}-${result.points}-${index}`}
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
                        <p className="mt-1 text-sm text-[rgba(27,28,26,0.68)]">
                          {formatDate(result.submitted_on)} · {getResultStatusLabel(result)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-5 sm:justify-end">
                        <div className="min-w-[5rem] text-left sm:text-right">
                          <div className="stitch-metric text-2xl text-[#003d55]">{result.points}</div>
                          <div className="text-xs text-[rgba(27,28,26,0.68)]">Punkte</div>
                        </div>
                        <div className="w-28 text-right">
                          {result.rating === null ? (
                            <span className="text-xs text-[rgba(27,28,26,0.68)]">Nicht bewertet</span>
                          ) : (
                            <>
                              <StarRating value={result.rating} readonly size="sm" />
                              <div className="text-xs text-[rgba(27,28,26,0.68)]">{result.rating} von 5</div>
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
              <StitchButton type="button" variant="outline" size="sm" onClick={() => void handleReloadResults()}>
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
          </section>
        ) : (
          <section
            id="gym-results-results-panel"
            role="tabpanel"
            aria-labelledby="gym-results-results-tab"
            hidden
          />
        )}
      </div>
    </div>
  );
};

export default GymResults;
