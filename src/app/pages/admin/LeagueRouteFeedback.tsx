import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { listResults, listRoutes, listGyms, listProfiles } from "@/services/appApi";
import type { Result, Route, Gym, Profile } from "@/services/appTypes";
import { MessageCircle, Search, X, Star, Filter, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type RouteFeedback = {
  route: Route;
  gym: Gym;
  results: (Result & { profile: Profile | null })[];
};

const LeagueRouteFeedback = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<{ text: string; route: string; profile: string; rating: number | null } | null>(null);
  
  // Filter States
  const [selectedGymId, setSelectedGymId] = useState<string>("all");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [feedbackType, setFeedbackType] = useState<"all" | "feedback_only" | "rating_only" | "both">("all");
  const [groupBy, setGroupBy] = useState<"gym" | "discipline">("gym");
  const [expandedGyms, setExpandedGyms] = useState<Set<string>>(new Set());
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [{ data: resultsData }, { data: routesData }, { data: gymsData }, { data: profilesData }] = await Promise.all([
        listResults(),
        listRoutes(),
        listGyms(),
        listProfiles(),
      ]);

      if (resultsData) setResults(resultsData);
      if (routesData) setRoutes(routesData);
      if (gymsData) setGyms(gymsData);
      if (profilesData) {
        const profileMap = new Map<string, Profile>();
        profilesData.forEach((p) => profileMap.set(p.id, p));
        setProfiles(profileMap);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Gruppiere Ergebnisse nach Route
  const routesWithFeedback = useMemo(() => {
    const gymMap = new Map(gyms.map((g) => [g.id, g]));
    const routeMap = new Map(routes.map((r) => [r.id, r]));
    
    // Filtere nur Routen mit Feedback oder Bewertung
    const routesWithData = routes.filter((route) => {
      const routeResults = results.filter((r) => r.route_id === route.id);
      return routeResults.some((r) => r.feedback || (r.rating !== null && r.rating !== undefined));
    });

    return routesWithData.map((route) => {
      const gym = gymMap.get(route.gym_id) ?? null;
      const routeResults = results
        .filter((r) => r.route_id === route.id && (r.feedback || (r.rating !== null && r.rating !== undefined)))
        .map((r) => ({
          ...r,
          profile: profiles.get(r.profile_id) ?? null,
        }));

      return {
        route,
        gym,
        results: routeResults,
      };
    }).filter((item) => item.results.length > 0);
  }, [results, routes, gyms, profiles]);

  // Farb-Mapping für farbige Punkte
  const colorClassMap: Record<string, string> = {
    weiß: "bg-white border border-border",
    gelb: "bg-yellow-400",
    grün: "bg-green-500",
    blau: "bg-blue-500",
    rot: "bg-red-500",
    schwarz: "bg-black",
    lila: "bg-purple-500",
    pink: "bg-pink-400",
    orange: "bg-orange-500",
    grau: "bg-gray-400",
  };

  // Berechne Durchschnittsbewertung für eine Route
  const getAverageRating = (routeResults: RouteFeedback["results"]) => {
    const ratings = routeResults.map((r) => r.rating).filter((r): r is number => r !== null && r !== undefined);
    if (ratings.length === 0) return null;
    const sum = ratings.reduce((acc, r) => acc + r, 0);
    return sum / ratings.length;
  };

  // Filtere Routen basierend auf Filtern
  const filteredRoutes = useMemo(() => {
    let filtered = routesWithFeedback;

    // Filter nach Halle
    if (selectedGymId !== "all") {
      filtered = filtered.filter((item) => item.gym?.id === selectedGymId);
    }

    // Filter nach Disziplin
    if (selectedDiscipline !== "all") {
      filtered = filtered.filter((item) => item.route.discipline === selectedDiscipline);
    }

    // Filter nach Feedback-Typ
    if (feedbackType === "feedback_only") {
      filtered = filtered.filter((item) => item.results.some((r) => r.feedback));
    } else if (feedbackType === "rating_only") {
      filtered = filtered.filter((item) => item.results.some((r) => r.rating !== null && r.rating !== undefined));
    } else if (feedbackType === "both") {
      filtered = filtered.filter((item) => 
        item.results.some((r) => r.feedback) && 
        item.results.some((r) => r.rating !== null && r.rating !== undefined)
      );
    }

    // Suche
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((item) => {
        const gymName = (item.gym?.name ?? "").toLowerCase();
        const routeCode = (item.route.code ?? "").toLowerCase();
        const routeName = (item.route.name ?? "").toLowerCase();
        const feedbacks = item.results.map((r) => (r.feedback ?? "").toLowerCase()).join(" ");
        return gymName.includes(query) || routeCode.includes(query) || routeName.includes(query) || feedbacks.includes(query);
      });
    }

    return filtered;
  }, [routesWithFeedback, selectedGymId, selectedDiscipline, feedbackType, search]);

  // Gruppiere nach Halle oder Disziplin
  const grouped = useMemo(() => {
    if (groupBy === "gym") {
      const grouped = new Map<string, RouteFeedback[]>();
      
      filteredRoutes.forEach((item) => {
        if (!item.gym) return;
        const gymId = item.gym.id;
        if (!grouped.has(gymId)) {
          grouped.set(gymId, []);
        }
        grouped.get(gymId)!.push(item);
      });

      return Array.from(grouped.entries()).map(([gymId, routes]) => {
        const gym = gyms.find((g) => g.id === gymId);
        // Sortiere Routen nach Durchschnittsbewertung (niedrigste zuerst, dann ohne Bewertung)
        const sortedRoutes = routes.sort((a, b) => {
          const avgA = getAverageRating(a.results);
          const avgB = getAverageRating(b.results);
          if (avgA === null && avgB === null) return 0;
          if (avgA === null) return 1;
          if (avgB === null) return -1;
          return avgA - avgB;
        });
        return { gym: gym!, routes: sortedRoutes };
      }).sort((a, b) => a.gym.name.localeCompare(b.gym.name));
    } else {
      // Gruppiere nach Disziplin
      const grouped = new Map<string, RouteFeedback[]>();
      
      filteredRoutes.forEach((item) => {
        const discipline = item.route.discipline === "lead" ? "Vorstieg" : "Toprope";
        if (!grouped.has(discipline)) {
          grouped.set(discipline, []);
        }
        grouped.get(discipline)!.push(item);
      });

      return Array.from(grouped.entries()).map(([discipline, routes]) => {
        const sortedRoutes = routes.sort((a, b) => {
          const avgA = getAverageRating(a.results);
          const avgB = getAverageRating(b.results);
          if (avgA === null && avgB === null) return 0;
          if (avgA === null) return 1;
          if (avgB === null) return -1;
          return avgA - avgB;
        });
        return { discipline, routes: sortedRoutes };
      });
    }
  }, [filteredRoutes, groupBy, gyms]);

  // Toggle Gym Expansion
  const toggleGym = (gymId: string) => {
    setExpandedGyms((prev) => {
      const next = new Set(prev);
      if (next.has(gymId)) {
        next.delete(gymId);
      } else {
        next.add(gymId);
      }
      // Force re-render by creating a new Set instance
      return new Set(next);
    });
  };

  // Toggle Route Expansion
  const toggleRoute = (routeId: string) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return new Set(next);
    });
  };

  // Reset hasInitializedExpanded wenn groupBy sich ändert
  useEffect(() => {
    setHasInitializedExpanded(false);
  }, [groupBy]);

  // Expandiere alle Hallen beim ersten Laden
  useEffect(() => {
    if (!loading && groupBy === "gym" && !hasInitializedExpanded && grouped.length > 0) {
      const allGymIds = new Set(grouped.map((g) => ("gym" in g && g.gym) ? g.gym.id : null).filter((id): id is string => id !== null));
      setExpandedGyms(allGymIds);
      setHasInitializedExpanded(true);
    }
  }, [loading, groupBy, grouped, hasInitializedExpanded]);


  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Routenfeedback</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Übersicht aller Routen mit Bewertungen und Feedback
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter und Suche */}
      <Card className="p-4 md:p-6 border-2 border-border/60">
        <div className="space-y-4">
          {/* Suche */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Suche nach Halle, Route oder Feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 touch-manipulation"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="p-2 hover:bg-accent rounded-md transition-colors touch-manipulation flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter - Einklappbar auf mobil */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="md:block">
            <div className="flex items-center justify-between pt-2 border-t border-border/60 md:border-0 md:pt-0">
              <CollapsibleTrigger asChild className="md:hidden">
                <button className="flex items-center gap-2 w-full justify-between py-2 font-medium text-sm hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors touch-manipulation">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span>Filter</span>
                  </span>
                  {filtersOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <div className="hidden md:block text-sm font-medium text-muted-foreground">
                Filter
              </div>
            </div>
            <CollapsibleContent className="md:!block">
              <div className="flex flex-col sm:flex-row gap-3 pt-3 md:pt-2 border-t md:border-t-0 border-border/60">
                <div className="flex items-center gap-2 flex-1">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 touch-manipulation"
                    value={selectedGymId}
                    onChange={(e) => setSelectedGymId(e.target.value)}
                  >
                    <option value="all">Alle Hallen</option>
                    {gyms
                      .filter((gym) => routesWithFeedback.some((item) => item.gym?.id === gym.id))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((gym) => (
                        <option key={gym.id} value={gym.id}>
                          {gym.name} {gym.city ? `(${gym.city})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 touch-manipulation"
                    value={selectedDiscipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                  >
                    <option value="all">Alle Disziplinen</option>
                    <option value="lead">Vorstieg</option>
                    <option value="toprope">Toprope</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 touch-manipulation"
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as typeof feedbackType)}
                  >
                    <option value="all">Alle</option>
                    <option value="feedback_only">Nur mit Feedback</option>
                    <option value="rating_only">Nur mit Bewertung</option>
                    <option value="both">Beides</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 touch-manipulation"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                  >
                    <option value="gym">Nach Halle</option>
                    <option value="discipline">Nach Disziplin</option>
                  </select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Statistiken */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border/60 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{filteredRoutes.length}</strong> {filteredRoutes.length === 1 ? "Route" : "Routen"}
            </span>
            <span>
              <strong className="text-foreground">{filteredRoutes.reduce((sum, item) => sum + item.results.length, 0)}</strong> {filteredRoutes.reduce((sum, item) => sum + item.results.length, 0) === 1 ? "Eintrag" : "Einträge"}
            </span>
          </div>
        </div>
      </Card>

      {/* Routen-Liste */}
      <div className="space-y-6">
        {loading ? (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Lade Daten...</p>
          </Card>
        ) : grouped.length === 0 ? (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">
              {search || selectedGymId !== "all" || selectedDiscipline !== "all" || feedbackType !== "all"
                ? "Keine Routen mit Feedback gefunden."
                : "Noch keine Routen mit Feedback vorhanden."}
            </p>
          </Card>
        ) : (
          grouped.map((group) => {
            const isGymGroup = "gym" in group;
            const groupKey = isGymGroup ? (group.gym?.id ?? "") : group.discipline;
            const gymId = isGymGroup && group.gym ? group.gym.id : null;
            const isExpanded = gymId ? expandedGyms.has(gymId) : true;

            return (
              <Card key={groupKey} className="border-2 border-border/60">
                <div className="p-4 md:p-5">
                  {/* Gruppen-Header */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isGymGroup && gymId) {
                        toggleGym(gymId);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-3 ${isGymGroup ? "cursor-pointer hover:bg-accent/50 -m-2 p-2 rounded-md transition-colors touch-manipulation" : "cursor-default"}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h2 className="text-lg md:text-xl font-semibold text-primary truncate">
                        {isGymGroup && group.gym ? group.gym.name : group.discipline}
                      </h2>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {group.routes.length} {group.routes.length === 1 ? "Route" : "Routen"}
                      </Badge>
                    </div>
                    {isGymGroup && (
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* Routen */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {group.routes.map((item) => {
                        const avgRating = getAverageRating(item.results);
                        const feedbackCount = item.results.filter((r) => r.feedback).length;
                        const ratingCount = item.results.filter((r) => r.rating !== null && r.rating !== undefined).length;
                        const isRouteExpanded = expandedRoutes.has(item.route.id);

                        return (
                          <Card key={item.route.id} className="border border-border/60 hover:border-primary/50 transition-all bg-muted/20">
                            <div className="p-4">
                              {/* Route Header - Klickbar */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleRoute(item.route.id);
                                }}
                                className="w-full text-left"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h3 className="font-semibold text-base md:text-lg text-primary break-words">
                                        {item.route.code} {item.route.name && `· ${item.route.name}`}
                                      </h3>
                                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                                        {item.route.discipline === "lead" ? "Vorstieg" : "Toprope"}
                                      </Badge>
                                      {!isGymGroup && item.gym && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          {item.gym.name}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
                                      {item.route.setter && <span>Routenschrauber: {item.route.setter}</span>}
                                      {item.route.color && (
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className={`h-3 w-3 md:h-3.5 md:w-3.5 rounded-full ${colorClassMap[(item.route.color || "").toLowerCase()] ?? "bg-muted"} border border-border/50`} aria-label={`Farbe: ${item.route.color}`} />
                                          <span className="sr-only">{item.route.color}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {avgRating !== null && (
                                      <div className="flex items-center gap-2">
                                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                        <span className="text-lg font-semibold">{avgRating.toFixed(1)}</span>
                                      </div>
                                    )}
                                    <div className="flex-shrink-0">
                                      {isRouteExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                      ) : (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Statistiken */}
                                <div className="flex flex-wrap gap-4 text-sm mt-3">
                                  {ratingCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <Star className="h-4 w-4 text-yellow-400" />
                                      <span className="text-muted-foreground">{ratingCount} {ratingCount === 1 ? "Bewertung" : "Bewertungen"}</span>
                                    </div>
                                  )}
                                  {feedbackCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <MessageCircle className="h-4 w-4 text-blue-600" />
                                      <span className="text-muted-foreground">{feedbackCount} {feedbackCount === 1 ? "Feedback" : "Feedbacks"}</span>
                                    </div>
                                  )}
                                </div>
                              </button>

                              {/* Bewertungen und Feedbacks - Nur wenn erweitert */}
                              {isRouteExpanded && (
                                <div className="space-y-2 pt-3 mt-3 border-t border-border/60">
                                {item.results.map((result) => {
                                  const profileName = result.profile
                                    ? `${result.profile.first_name ?? ""} ${result.profile.last_name ?? ""}`.trim() || result.profile.email || "Unbekannt"
                                    : "Unbekannt";
                                  const date = result.updated_at || result.created_at;
                                  const displayDate = date ? new Date(date).toLocaleDateString("de-DE") : "-";

                                  return (
                                    <div key={result.id} className="p-2.5 bg-background/50 rounded-md border border-border/40">
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-xs md:text-sm text-primary truncate">{profileName}</div>
                                          <div className="text-xs text-muted-foreground">{displayDate}</div>
                                        </div>
                                        {result.rating !== null && result.rating !== undefined && (
                                          <div className="flex-shrink-0">
                                            <StarRating value={result.rating} readonly size="sm" />
                                          </div>
                                        )}
                                      </div>
                                      {result.feedback && (
                                        <button
                                          onClick={() => setSelectedFeedback({
                                            text: result.feedback!,
                                            route: `${item.route.code} ${item.route.name ? `· ${item.route.name}` : ""}`,
                                            profile: profileName,
                                            rating: result.rating,
                                          })}
                                          className="mt-2 text-left w-full"
                                        >
                                          <div className="p-2 bg-muted/50 rounded border border-border/60 hover:border-primary/50 transition-colors">
                                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                                              {result.feedback}
                                            </p>
                                          </div>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Feedback Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-left">
              <MessageCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              Feedback zur Route
            </DialogTitle>
            <DialogDescription className="text-left">
              {selectedFeedback?.route} · von {selectedFeedback?.profile}
              {selectedFeedback?.rating !== null && selectedFeedback?.rating !== undefined && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  <span>{selectedFeedback.rating}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Card className="p-5 bg-muted/50 border-border/60">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {selectedFeedback?.text}
              </p>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeagueRouteFeedback;
