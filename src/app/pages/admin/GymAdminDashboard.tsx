import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, listGymCodesByGym, listRoutesByGym, getGym, listProfiles, listResults } from "@/services/appApi";
import { Building2, Users, CheckCircle2, BarChart3, Ticket } from "lucide-react";
import type { Gym } from "@/services/appTypes";

const GymAdminDashboard = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    redeemedCodes: 0,
    totalResults: 0,
    availableCodes: 0,
  });

  useEffect(() => {
    if (!profile?.id) return;
    listGymAdminsByProfile(profile.id).then(({ data }) => {
      const firstGym = data?.[0]?.gym_id ?? null;
      setGymId(firstGym);
      if (firstGym) {
        // Lade Gym-Daten
        getGym(firstGym).then(({ data: gymData }) => {
          if (gymData) {
            setGym(gymData);
          }
        });
        // Lade Codes
        listGymCodesByGym(firstGym).then(({ data: codesData }) => {
          const codes = codesData ?? [];
          const redeemed = codes.filter((c) => c.redeemed_by).length;
          setStats((prev) => ({
            ...prev,
            redeemedCodes: redeemed,
            availableCodes: codes.length - redeemed,
          }));
        });
        // Lade Gesamtteilnehmerzahl
        listProfiles().then(({ data: profilesData }) => {
          const totalParticipants = (profilesData ?? []).filter((p) => p.role === "participant").length;
          setStats((prev) => ({
            ...prev,
            totalParticipants,
          }));
        });
        // Lade Ergebnisse für diese Halle
        Promise.all([listRoutesByGym(firstGym), listResults()]).then(([{ data: routesData }, { data: resultsData }]) => {
          const routes = routesData ?? [];
          const results = resultsData ?? [];
          const routeIds = routes.map((r) => r.id);
          const gymResults = results.filter((r) => routeIds.includes(r.route_id));
          setStats((prev) => ({
            ...prev,
            totalResults: gymResults.length,
          }));
        });
      }
    });
  }, [profile?.id]);

  if (!gymId) {
    return (
      <div className="text-sm text-muted-foreground">Keine Halle zugewiesen. Bitte kontaktiere einen Liga-Admin.</div>
    );
  }

  const participantPercentage = stats.totalParticipants > 0 
    ? Math.round((stats.redeemedCodes / stats.totalParticipants) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero Section mit Logo und Hallenname */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              {gym?.logo_url ? (
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl border-2 border-white/20 flex items-center justify-center overflow-hidden bg-transparent flex-shrink-0">
                  <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 md:h-8 md:w-8 text-white/80" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-headline text-xl md:text-2xl lg:text-3xl text-white break-words">Übersicht</h1>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs flex-shrink-0">
                    Halle
                  </Badge>
                </div>
                <p className="text-white/90 text-xs md:text-sm lg:text-base break-words">
                  {gym?.name || "Meine Halle"}
                  {gym?.city && ` · ${gym.city}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid - Modernes Layout */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gesamtteilnehmer */}
        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Gesamtteilnehmer</p>
              <div className="font-headline text-3xl text-primary">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">In der Liga registriert</p>
            </div>
          </div>
        </Card>

        {/* Codes eingelöst */}
        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-secondary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 group-hover:bg-secondary/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                <CheckCircle2 className="h-5 w-5 text-secondary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Codes eingelöst</p>
              <div className="font-headline text-3xl text-secondary">{stats.redeemedCodes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalParticipants > 0 
                  ? `${participantPercentage}% der Teilnehmer` 
                  : "Noch keine Teilnehmer"}
              </p>
            </div>
          </div>
        </Card>

        {/* Ergebnisse gesamt */}
        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-accent-foreground/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full -mr-16 -mt-16 group-hover:bg-accent/30 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-accent/30 group-hover:bg-accent/40 transition-colors">
                <BarChart3 className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Ergebnisse gesamt</p>
              <div className="font-headline text-3xl text-accent-foreground">{stats.totalResults}</div>
              <p className="text-xs text-muted-foreground">In dieser Halle</p>
            </div>
          </div>
        </Card>

        {/* Codes verfügbar */}
        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Codes verfügbar</p>
              <div className="font-headline text-3xl text-primary">{stats.availableCodes}</div>
              <p className="text-xs text-muted-foreground">Noch nicht eingelöst</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GymAdminDashboard;
