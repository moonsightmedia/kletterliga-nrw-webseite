import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { listFinaleRegistrations, unregisterFromFinale, listProfiles } from "@/services/appApi";
import type { Profile } from "@/services/appTypes";
import { useSeasonSettings } from "@/services/seasonSettings";
import { Trophy, Search, X, Users, Filter, Award, List } from "lucide-react";

type FinaleRegistrationWithProfile = {
  id: string;
  profile_id: string;
  created_at: string;
  profiles: Profile;
};

const LeagueFinaleRegistrations = () => {
  const [registrations, setRegistrations] = useState<FinaleRegistrationWithProfile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Map<string, Profile>>(new Map());
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "byClass" | "byLeague">("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { getSeasonYear, getClassName } = useSeasonSettings();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [{ data: registrationsData }, { data: profilesData }] = await Promise.all([
        listFinaleRegistrations(),
        listProfiles(),
      ]);

      if (registrationsData) {
        setRegistrations(registrationsData as FinaleRegistrationWithProfile[]);
      }
      if (profilesData) {
        const profileMap = new Map<string, Profile>();
        profilesData.forEach((p) => profileMap.set(p.id, p));
        setAllProfiles(profileMap);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Gruppiere nach Wertungsklasse
  const groupedByClass = useMemo(() => {
    const groups: Record<string, FinaleRegistrationWithProfile[]> = {};
    registrations.forEach((reg) => {
      const className = getClassName(reg.profiles.birth_date, reg.profiles.gender) || "Unbekannt";
      if (!groups[className]) {
        groups[className] = [];
      }
      groups[className].push(reg);
    });
    // Sortiere innerhalb jeder Gruppe nach Datum
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    });
    return groups;
  }, [registrations, getClassName]);

  // Gruppiere nach Liga
  const groupedByLeague = useMemo(() => {
    const groups: Record<string, FinaleRegistrationWithProfile[]> = {
      lead: [],
      toprope: [],
      unknown: [],
    };
    registrations.forEach((reg) => {
      const league = reg.profiles.league || "unknown";
      groups[league as keyof typeof groups].push(reg);
    });
    // Sortiere innerhalb jeder Gruppe nach Datum
    Object.keys(groups).forEach((key) => {
      groups[key as keyof typeof groups].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
    });
    return groups;
  }, [registrations]);

  // Statistik berechnen
  const stats = useMemo(() => {
    const classStats: Record<string, number> = {};
    const leagueStats = { lead: 0, toprope: 0, unknown: 0 };
    
    registrations.forEach((reg) => {
      const className = getClassName(reg.profiles.birth_date, reg.profiles.gender) || "Unbekannt";
      classStats[className] = (classStats[className] || 0) + 1;
      
      const league = reg.profiles.league || "unknown";
      leagueStats[league as keyof typeof leagueStats]++;
    });

    return { classStats, leagueStats };
  }, [registrations, getClassName]);

  const filtered = useMemo(() => {
    let filteredRegistrations = registrations;

    if (search.trim()) {
      const query = search.toLowerCase();
      filteredRegistrations = filteredRegistrations.filter((reg) => {
        const profile = reg.profiles;
        const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.toLowerCase();
        const email = (profile.email ?? "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    return filteredRegistrations.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [registrations, search]);

  const handleDelete = async (profileId: string) => {
    const { error } = await unregisterFromFinale(profileId);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    setRegistrations((prev) => prev.filter((r) => r.profile_id !== profileId));
    setDeletingId(null);
    toast({ title: "Entfernt", description: "Anmeldung wurde entfernt." });
  };

  const renderRegistrationCard = (registration: FinaleRegistrationWithProfile) => {
    const profile = registration.profiles;
    const profileName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email || "Unbekannt";
    const email = profile.email ?? "-";
    const className = getClassName(profile.birth_date, profile.gender);
    const league = profile.league === "lead" ? "Vorstieg" : profile.league === "toprope" ? "Toprope" : "-";
    const registrationDate = new Date(registration.created_at).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
                <Card
                  key={registration.id}
                  className="p-4 md:p-5 border-2 border-border/60 hover:border-primary/50 transition-all hover:shadow-lg"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="font-semibold text-primary text-base md:text-lg break-words">{profileName}</div>
                        {className && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {className}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="break-words">{email}</div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          {league !== "-" && <span>Liga: {league}</span>}
                          <span className="text-xs sm:text-sm">Angemeldet: {registrationDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingId(registration.profile_id)}
                        className="touch-manipulation"
                      >
                        <X className="h-4 w-4 mr-1" />
                        <span className="skew-x-6 text-xs md:text-sm">Entfernen</span>
                      </Button>
                    </div>
                  </div>
                </Card>
    );
  };

  const seasonYear = getSeasonYear();
  const totalCount = registrations.length;

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
              <Trophy className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Finale-Anmeldungen</h1>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                  Liga
                </Badge>
              </div>
              <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                Übersicht aller Anmeldungen für das Finale {seasonYear} · {totalCount} {totalCount === 1 ? 'Anmeldung' : 'Anmeldungen'} gesamt
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Statistik */}
      <div className="grid gap-2 md:gap-4 grid-cols-3">
        <Card className="p-3 md:p-4 border-2 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary mb-1">Gesamt</div>
          <div className="text-xl md:text-2xl font-headline text-primary">{totalCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Anmeldungen</div>
        </Card>
        <Card className="p-3 md:p-4 border-2 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary mb-1">Vorstieg</div>
          <div className="text-xl md:text-2xl font-headline text-primary">{stats.leagueStats.lead}</div>
          <div className="text-xs text-muted-foreground mt-1">Teilnehmer</div>
        </Card>
        <Card className="p-3 md:p-4 border-2 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary mb-1">Toprope</div>
          <div className="text-xl md:text-2xl font-headline text-primary">{stats.leagueStats.toprope}</div>
          <div className="text-xs text-muted-foreground mt-1">Teilnehmer</div>
        </Card>
      </div>

      {/* Filter und Suche */}
      <Card className="p-4 md:p-6 border-2 border-border/60">
        <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as typeof filterTab)}>
          <TabsList className="grid w-full grid-cols-3 gap-1 md:gap-0">
            <TabsTrigger value="all" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Alle</span>
              <span className="sm:hidden">Alle</span>
              <span className="hidden md:inline"> ({totalCount})</span>
            </TabsTrigger>
            <TabsTrigger value="byClass" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Award className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Nach Klasse</span>
              <span className="sm:hidden">Klasse</span>
            </TabsTrigger>
            <TabsTrigger value="byLeague" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Nach Liga</span>
              <span className="sm:hidden">Liga</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Suche nach Name oder E-Mail..."
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
        </div>
      </Card>

      {/* Anmeldungen-Liste */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center border-2 border-border/60">
            <p className="text-muted-foreground">Lade Anmeldungen...</p>
          </Card>
        ) : filterTab === "all" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">
                {search ? `Suchergebnisse (${filtered.length})` : `Alle Anmeldungen (${filtered.length})`}
              </h2>
            </div>
            {filtered.length === 0 ? (
              <Card className="p-8 text-center border-2 border-border/60">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search ? "Keine Anmeldungen gefunden." : "Noch keine Anmeldungen vorhanden."}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((registration) => renderRegistrationCard(registration))}
              </div>
            )}
          </>
        ) : filterTab === "byClass" ? (
          <>
            <h2 className="text-lg font-semibold text-primary">Nach Wertungsklasse gruppiert</h2>
            {Object.keys(groupedByClass).length === 0 ? (
              <Card className="p-8 text-center border-2 border-border/60">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Anmeldungen vorhanden.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByClass)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([className, classRegistrations]) => {
                    const filteredClassRegs = search.trim()
                      ? classRegistrations.filter((reg) => {
                          const profile = reg.profiles;
                          const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.toLowerCase();
                          const email = (profile.email ?? "").toLowerCase();
                          const query = search.toLowerCase();
                          return name.includes(query) || email.includes(query);
                        })
                      : classRegistrations;

                    if (filteredClassRegs.length === 0) return null;

                    return (
                      <div key={className} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-headline text-primary">{className}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {filteredClassRegs.length} {filteredClassRegs.length === 1 ? "Teilnehmer" : "Teilnehmer"}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                          {filteredClassRegs.map((registration) => renderRegistrationCard(registration))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-primary">Nach Liga gruppiert</h2>
            {Object.keys(groupedByLeague).length === 0 ? (
              <Card className="p-8 text-center border-2 border-border/60">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Anmeldungen vorhanden.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {[
                  { key: "lead", label: "Vorstieg", count: groupedByLeague.lead.length },
                  { key: "toprope", label: "Toprope", count: groupedByLeague.toprope.length },
                  { key: "unknown", label: "Unbekannt", count: groupedByLeague.unknown.length },
                ]
                  .filter(({ count }) => count > 0)
                  .map(({ key, label }) => {
                    const leagueRegs = groupedByLeague[key as keyof typeof groupedByLeague];
                    const filteredLeagueRegs = search.trim()
                      ? leagueRegs.filter((reg) => {
                          const profile = reg.profiles;
                          const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.toLowerCase();
                          const email = (profile.email ?? "").toLowerCase();
                          const query = search.toLowerCase();
                          return name.includes(query) || email.includes(query);
                        })
                      : leagueRegs;

                    if (filteredLeagueRegs.length === 0) return null;

                    return (
                      <div key={key} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-headline text-primary">{label}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {filteredLeagueRegs.length} {filteredLeagueRegs.length === 1 ? "Teilnehmer" : "Teilnehmer"}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                          {filteredLeagueRegs.map((registration) => renderRegistrationCard(registration))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Löschen-Dialog */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anmeldung entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diese Finale-Anmeldung wirklich entfernen? Der Teilnehmer wird darüber informiert, dass seine Anmeldung storniert wurde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto touch-manipulation">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto touch-manipulation"
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeagueFinaleRegistrations;
