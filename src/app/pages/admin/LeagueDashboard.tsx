import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { listProfiles, listGyms, listResults, listRoutes } from "@/services/appApi";
import { Users, Building2, BarChart3, Flag } from "lucide-react";

const LeagueDashboard = () => {
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalGyms: 0,
    totalResults: 0,
    totalRoutes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listProfiles(), listGyms(), listResults(), listRoutes()]).then(
      ([profilesResult, gymsResult, resultsResult, routesResult]) => {
        const participants = (profilesResult.data ?? []).filter((p) => p.role === "participant").length;
        const gyms = (gymsResult.data ?? []).length;
        const results = (resultsResult.data ?? []).length;
        const activeRoutes = (routesResult.data ?? []).filter((r) => r.active === true).length;

        setStats({
          totalParticipants: participants,
          totalGyms: gyms,
          totalResults: results,
          totalRoutes: activeRoutes,
        });
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-3xl text-primary">Liga-Übersicht</h1>
          <p className="text-sm text-muted-foreground mt-2">Globale Kennzahlen der Saison.</p>
        </div>
        <div className="text-sm text-muted-foreground">Lade Statistiken...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Liga-Verwaltung</h1>
        <p className="text-sm text-muted-foreground mt-2">Detaillierte Übersicht und Verwaltung der Liga.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Teilnehmer</p>
              <div className="font-headline text-3xl text-primary">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">Gesamt registriert</p>
            </div>
          </div>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Hallen</p>
              <div className="font-headline text-3xl text-blue-500">{stats.totalGyms}</div>
              <p className="text-xs text-muted-foreground">Aktive Partnerhallen</p>
            </div>
          </div>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-green-500/10 transition-colors"></div>
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <BarChart3 className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Ergebnisse</p>
              <div className="font-headline text-3xl text-green-500">{stats.totalResults}</div>
              <p className="text-xs text-muted-foreground">Einträge gesamt</p>
            </div>
          </div>
        </Card>

        <Card className="group relative overflow-hidden border-2 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Flag className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Routen</p>
              <div className="font-headline text-3xl text-purple-500">{stats.totalRoutes}</div>
              <p className="text-xs text-muted-foreground">Aktive Routen</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeagueDashboard;
