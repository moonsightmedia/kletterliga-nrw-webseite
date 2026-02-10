import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listResults, listProfiles, listRoutes, listGyms } from "@/services/appApi";
import type { Result, Profile, Route, Gym } from "@/services/appTypes";
import { ClipboardList, Search, X, MessageSquare, AlertTriangle, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ResultWithDetails = Result & {
  profile: Profile | null;
  route: Route | null;
  gym: Gym | null;
};

const LeagueResults = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [routes, setRoutes] = useState<Map<string, Route>>(new Map());
  const [gyms, setGyms] = useState<Map<string, Gym>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<{ text: string; route: string; profile: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [{ data: resultsData }, { data: profilesData }, { data: routesData }, { data: gymsData }] = await Promise.all([
        listResults(),
        listProfiles(),
        listRoutes(),
        listGyms(),
      ]);

      if (resultsData) setResults(resultsData);
      if (profilesData) {
        const profileMap = new Map<string, Profile>();
        profilesData.forEach((p) => profileMap.set(p.id, p));
        setProfiles(profileMap);
      }
      if (routesData) {
        const routeMap = new Map<string, Route>();
        routesData.forEach((r) => routeMap.set(r.id, r));
        setRoutes(routeMap);
      }
      if (gymsData) {
        const gymMap = new Map<string, Gym>();
        gymsData.forEach((g) => gymMap.set(g.id, g));
        setGyms(gymMap);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const resultsWithDetails = useMemo((): ResultWithDetails[] => {
    return results.map((result) => {
      const profile = profiles.get(result.profile_id) ?? null;
      const route = routes.get(result.route_id) ?? null;
      const gym = route ? gyms.get(route.gym_id) ?? null : null;

      return {
        ...result,
        profile,
        route,
        gym,
      };
    });
  }, [results, profiles, routes, gyms]);

  const filtered = useMemo(() => {
    let filteredResults = resultsWithDetails;

    // Suche
    if (search.trim()) {
      const query = search.toLowerCase();
      filteredResults = filteredResults.filter((r) => {
        const profileName = `${r.profile?.first_name ?? ""} ${r.profile?.last_name ?? ""}`.toLowerCase();
        const email = (r.profile?.email ?? "").toLowerCase();
        const gymName = (r.gym?.name ?? "").toLowerCase();
        const routeCode = (r.route?.code ?? "").toLowerCase();
        const feedback = (r.feedback ?? "").toLowerCase();
        return profileName.includes(query) || email.includes(query) || gymName.includes(query) || routeCode.includes(query) || feedback.includes(query);
      });
    }

    // Sortiere nach updated_at oder created_at (neueste zuerst)
    return filteredResults.sort((a, b) => {
      const dateA = a.updated_at || a.created_at;
      const dateB = b.updated_at || b.created_at;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
  }, [resultsWithDetails, search]);

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
              <ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Ergebnisse</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Übersicht aller eingetragenen Ergebnisse · {results.length} {results.length === 1 ? 'Ergebnis' : 'Ergebnisse'} gesamt
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Suche */}
      <Card className="p-4 md:p-6 border-2 border-border/60">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Suche nach Name, E-Mail, Halle oder Route..."
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
      </Card>

      {/* Ergebnisse-Liste */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {search ? `Suchergebnisse (${filtered.length})` : `Alle Ergebnisse (${filtered.length})`}
          </h2>
        </div>

        {loading ? (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Lade Ergebnisse...</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">
              {search ? "Keine Ergebnisse gefunden." : "Noch keine Ergebnisse vorhanden."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((result) => {
              const profileName = result.profile
                ? `${result.profile.first_name ?? ""} ${result.profile.last_name ?? ""}`.trim() || result.profile.email || "Unbekannt"
                : "Unbekannt";
              const gymName = result.gym?.name ?? "Unbekannte Halle";
              const routeCode = result.route?.code ?? "Unbekannte Route";
              const displayDate = result.updated_at || result.created_at;
              const date = displayDate ? new Date(displayDate).toLocaleDateString("de-DE") : "-";
              const isEdited = result.updated_at && result.updated_at !== result.created_at;

              return (
                <Card
                  key={result.id}
                  className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="font-semibold text-primary text-base md:text-lg break-words">{profileName}</div>
                        {result.flash && (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 text-xs flex-shrink-0">
                            Flash
                          </Badge>
                        )}
                        {isEdited && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            Bearbeitet
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground break-words">
                        {gymName} · Route {routeCode} · {date}
                        {isEdited && (
                          <span className="ml-1 text-xs">(bearbeitet)</span>
                        )}
                      </div>
                      {result.feedback && (
                        <button
                          onClick={() => setSelectedFeedback({
                            text: result.feedback!,
                            route: `${gymName} · Route ${routeCode}`,
                            profile: profileName
                          })}
                          className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Feedback anzeigen</span>
                        </button>
                      )}
                    </div>
                    <div className="text-left md:text-right flex-shrink-0">
                      <div className="text-lg font-semibold text-secondary">{result.points}</div>
                      <div className="text-xs text-muted-foreground">Punkte</div>
                      {result.rating !== null && result.rating !== undefined && (
                        <div className="mt-1 flex items-center justify-end gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div
                              key={star}
                              className={`h-3 w-3 ${star <= result.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                            >
                              ★
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
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

export default LeagueResults;
