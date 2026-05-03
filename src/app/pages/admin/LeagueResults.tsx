import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { listAuditEntries, listGyms, listProfiles, listResults, listRoutes } from "@/services/appApi";
import type { DataChangeAudit, Gym, Profile, Result, Route } from "@/services/appTypes";
import { ClipboardList, History, MessageCircle, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type ResultWithDetails = Result & {
  profile: Profile | null;
  route: Route | null;
  gym: Gym | null;
};

const AUDIT_LABELS: Record<string, string> = {
  points: "Punkte",
  flash: "Flash",
  status: "Status",
  rating: "Bewertung",
  feedback: "Feedback",
};

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("de-DE") : "—";

const formatAuditValue = (value: unknown) => {
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const getAuditChanges = (entry: DataChangeAudit) => {
  const before = entry.before_data ?? {};
  const after = entry.after_data ?? {};

  if (entry.action === "insert") {
    return ["Ergebnis angelegt"];
  }

  return Object.entries(AUDIT_LABELS)
    .filter(([key]) => (before as Record<string, unknown>)[key] !== (after as Record<string, unknown>)[key])
    .map(([key, label]) => {
      const previous = formatAuditValue((before as Record<string, unknown>)[key]);
      const next = formatAuditValue((after as Record<string, unknown>)[key]);
      return `${label}: ${previous} → ${next}`;
    });
};

const LeagueResults = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [routes, setRoutes] = useState<Map<string, Route>>(new Map());
  const [gyms, setGyms] = useState<Map<string, Gym>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<{ text: string; route: string; profile: string } | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<{ result: ResultWithDetails; entries: DataChangeAudit[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [{ data: resultsData }, { data: profilesData }, { data: routesData }, { data: gymsData }] = await Promise.all([
        listResults(),
        listProfiles({ includeArchived: true }),
        listRoutes({ includeArchived: true }),
        listGyms({ includeArchived: true }),
      ]);

      setResults(resultsData ?? []);
      setProfiles(new Map((profilesData ?? []).map((profile) => [profile.id, profile])));
      setRoutes(new Map((routesData ?? []).map((route) => [route.id, route])));
      setGyms(new Map((gymsData ?? []).map((gym) => [gym.id, gym])));
      setLoading(false);
    };

    void loadData();
  }, []);

  const resultsWithDetails = useMemo<ResultWithDetails[]>(
    () =>
      results.map((result) => {
        const profile = profiles.get(result.profile_id) ?? null;
        const route = routes.get(result.route_id) ?? null;
        const gym = route ? gyms.get(route.gym_id) ?? null : null;
        return { ...result, profile, route, gym };
      }),
    [results, profiles, routes, gyms],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filteredResults = !query
      ? resultsWithDetails
      : resultsWithDetails.filter((result) => {
          const profileName = `${result.profile?.first_name ?? ""} ${result.profile?.last_name ?? ""}`.toLowerCase();
          const email = (result.profile?.email ?? "").toLowerCase();
          const gymName = (result.gym?.name ?? "").toLowerCase();
          const routeCode = (result.route?.code ?? "").toLowerCase();
          const feedback = (result.feedback ?? "").toLowerCase();
          return (
            profileName.includes(query) ||
            email.includes(query) ||
            gymName.includes(query) ||
            routeCode.includes(query) ||
            feedback.includes(query)
          );
        });

    return [...filteredResults].sort((a, b) => {
      const dateA = a.updated_at || a.created_at;
      const dateB = b.updated_at || b.created_at;
      return new Date(dateB ?? 0).getTime() - new Date(dateA ?? 0).getTime();
    });
  }, [resultsWithDetails, search]);

  const openHistory = async (result: ResultWithDetails) => {
    setHistoryLoading(true);
    setSelectedHistory({ result, entries: [] });
    const { data, error } = await listAuditEntries({
      entityType: "result",
      entityId: result.id,
      limit: 20,
    });
    if (error) {
      setSelectedHistory({
        result,
        entries: [],
      });
    } else {
      setSelectedHistory({
        result,
        entries: data ?? [],
      });
    }
    setHistoryLoading(false);
  };

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[rgba(242,220,171,0.25)] bg-white/10 md:h-16 md:w-16">
              <ClipboardList className="h-6 w-6 text-[#f2dcab]/85 md:h-8 md:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="stitch-headline text-xl text-[#f2dcab] md:text-2xl lg:text-3xl break-words">Ergebnisse</h1>
                <StitchBadge tone="cream" className="shrink-0">
                  Liga
                </StitchBadge>
              </div>
              <p className="text-sm text-white/90 md:text-base break-words">
                Aktive Ergebnisse mit Verlauf · {results.length} gesamt
              </p>
            </div>
          </div>
        </div>
      </StitchCard>

      <StitchCard tone="surface" className="p-4 md:p-6 border-2 border-border/60">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Suche nach Name, E-Mail, Halle oder Route..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 touch-manipulation"
          />
          {search ? (
            <button onClick={() => setSearch("")} className="p-2 hover:bg-accent rounded-md transition-colors touch-manipulation">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </StitchCard>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            {search ? `Suchergebnisse (${filtered.length})` : `Alle Ergebnisse (${filtered.length})`}
          </h2>
        </div>

        {loading ? (
          <StitchCard tone="surface" className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Lade Ergebnisse...</p>
          </StitchCard>
        ) : filtered.length === 0 ? (
          <StitchCard tone="surface" className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">
              {search ? "Keine Ergebnisse gefunden." : "Noch keine aktiven Ergebnisse vorhanden."}
            </p>
          </StitchCard>
        ) : (
          <div className="space-y-3">
            {filtered.map((result) => {
              const profileName =
                result.profile
                  ? `${result.profile.first_name ?? ""} ${result.profile.last_name ?? ""}`.trim() || result.profile.email || "Unbekannt"
                  : "Unbekannt";
              const gymName = result.gym?.name ?? "Unbekannte Halle";
              const routeCode = result.route?.code ?? "Unbekannte Route";
              const displayDate = result.updated_at || result.created_at;
              const isEdited = Boolean(result.updated_at && result.updated_at !== result.created_at);

              return (
                <StitchCard
                  key={result.id}
                  tone="surface"
                  className="border-2 border-border/60 p-4 transition-all hover:border-[var(--stitch-navy)]/35 hover:shadow-lg md:p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="font-semibold text-primary text-base md:text-lg break-words">{profileName}</div>
                        {result.flash ? (
                          <StitchBadge tone="ghost" className="border border-yellow-500/20 bg-yellow-500/10 text-xs font-semibold normal-case tracking-normal text-yellow-700">
                            Flash
                          </StitchBadge>
                        ) : null}
                        {isEdited ? (
                          <StitchBadge tone="ghost" className="text-xs font-semibold normal-case tracking-normal">
                            Bearbeitet
                          </StitchBadge>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground break-words">
                        {gymName} · Route {routeCode} · {formatDateTime(displayDate)}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.feedback ? (
                          <StitchButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedFeedback({
                                text: result.feedback ?? "",
                                route: `${gymName} · Route ${routeCode}`,
                                profile: profileName,
                              })
                            }
                            className="gap-2"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Feedback
                          </StitchButton>
                        ) : null}
                        <StitchButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openHistory(result)}
                          className="gap-2"
                          aria-label={`Verlauf fuer Ergebnis ${routeCode} von ${profileName} anzeigen`}
                        >
                          <History className="h-4 w-4" />
                          Verlauf
                        </StitchButton>
                      </div>
                    </div>

                    <div className="text-left md:text-right flex-shrink-0">
                      <div className="text-lg font-semibold text-secondary">{result.points}</div>
                      <div className="text-xs text-muted-foreground">Punkte</div>
                      {result.rating !== null && result.rating !== undefined ? (
                        <div className="mt-1 flex items-center justify-end gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div
                              key={star}
                              className={star <= result.rating ? "h-3 w-3 text-yellow-400" : "h-3 w-3 text-gray-300"}
                            >
                              ★
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </StitchCard>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selectedFeedback)} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
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
            <StitchCard tone="muted" className="border-border/60 p-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{selectedFeedback?.text}</p>
            </StitchCard>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedHistory)} onOpenChange={(open) => !open && setSelectedHistory(null)}>
        <DialogContent className="max-w-3xl p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2 text-left">
              <History className="h-5 w-5 text-primary flex-shrink-0" />
              Ergebnisverlauf
            </DialogTitle>
            <DialogDescription className="text-left">
              {selectedHistory
                ? `${selectedHistory.result.gym?.name ?? "Unbekannte Halle"} · Route ${selectedHistory.result.route?.code ?? "?"}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {historyLoading ? (
              <StitchCard tone="surface" className="p-6 border border-border/60">
                <p className="text-sm text-muted-foreground">Verlauf wird geladen...</p>
              </StitchCard>
            ) : selectedHistory?.entries.length ? (
              selectedHistory.entries.map((entry) => {
                const changes = getAuditChanges(entry);
                return (
                  <StitchCard tone="surface" key={entry.id} className="p-4 border border-border/60 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StitchBadge tone="ghost" className="text-xs font-semibold normal-case tracking-normal">
                        {entry.action === "insert" ? "Angelegt" : "Aktualisiert"}
                      </StitchBadge>
                      <div className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</div>
                    </div>
                    <div className="space-y-1 text-sm text-foreground">
                      {changes.length ? changes.map((change) => <p key={change}>{change}</p>) : <p>Keine Feldänderungen protokolliert.</p>}
                    </div>
                  </StitchCard>
                );
              })
            ) : (
              <StitchCard tone="surface" className="p-6 border border-border/60">
                <p className="text-sm text-muted-foreground">Für dieses Ergebnis liegt noch kein Verlauf vor.</p>
              </StitchCard>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeagueResults;
