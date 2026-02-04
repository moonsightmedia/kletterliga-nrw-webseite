import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, listGymCodesByGym, listRoutesByGym, listResults } from "@/services/appApi";
import type { Result } from "@/services/appTypes";

const GymStats = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Array<{ created_at: string }>>([]);
  const [routes, setRoutes] = useState<Array<{ id: string; code: string; name: string | null }>>([]);
  const [results, setResults] = useState<Result[]>([]);

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
          // Lade Ergebnisse nachdem Routen geladen sind
          listResults().then(({ data: resultsData }) => {
            const routeIds = gymRoutes.map((r) => r.id);
            const gymResults = (resultsData ?? []).filter((r) => routeIds.includes(r.route_id));
            setResults(gymResults);
          });
        });
      }
    });
  }, [profile?.id]);

  // Codes im Zeitverlauf (letzte 30 Tage)
  const codeTimeline = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });
    return last30Days.map((date) => ({
      date,
      count: codes.filter((c) => c.created_at?.startsWith(date)).length,
    }));
  }, [codes]);

  // Beliebte Routen (nach Anzahl der Ergebnisse)
  const popularRoutes = useMemo(() => {
    const routeCounts = routes.map((route) => ({
      route,
      count: results.filter((r) => r.route_id === route.id).length,
    }));
    return routeCounts.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [routes, results]);

  if (!gymId) {
    return <div className="text-sm text-muted-foreground">Keine Halle zugewiesen.</div>;
  }

  const maxCodeCount = Math.max(...codeTimeline.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Hallen-Statistiken</h1>
        <p className="text-sm text-muted-foreground mt-2">Übersicht über Codes und Routen-Nutzung.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary mb-4">Codes im Zeitverlauf (30 Tage)</div>
          <div className="space-y-2">
            {codeTimeline.map((day, idx) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground w-20">
                  {new Date(day.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="flex-1 bg-accent/40 rounded h-4 relative">
                  <div
                    className="bg-primary rounded h-4"
                    style={{ width: `${(day.count / maxCodeCount) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground w-8 text-right">{day.count}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary mb-4">Beliebte Routen</div>
          <div className="space-y-3">
            {popularRoutes.length > 0 ? (
              popularRoutes.map((item, idx) => (
                <div key={item.route.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-primary">
                      {idx + 1}. {item.route.code} {item.route.name ? `· ${item.route.name}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{item.count} Ergebnisse</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Noch keine Ergebnisse vorhanden.</div>
            )}
          </div>
        </Card>
      </div>
      <Card className="p-4 border-border/60">
        <div className="text-xs uppercase tracking-widest text-secondary mb-4">Zusammenfassung</div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-2xl font-headline text-primary">{codes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Gesamt Codes</div>
          </div>
          <div>
            <div className="text-2xl font-headline text-primary">{routes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Routen gesamt</div>
          </div>
          <div>
            <div className="text-2xl font-headline text-primary">{results.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Ergebnisse gesamt</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GymStats;
