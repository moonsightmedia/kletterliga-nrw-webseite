import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/app/auth/AuthProvider";
import { listGymAdminsByProfile, listGymCodesByGym, listRoutesByGym, getGym } from "@/services/appApi";
import { Building2 } from "lucide-react";

const GymAdminDashboard = () => {
  const { profile } = useAuth();
  const [gymId, setGymId] = useState<string | null>(null);
  const [gym, setGym] = useState<{ name: string; city: string | null } | null>(null);
  const [stats, setStats] = useState({
    totalCodes: 0,
    redeemedCodes: 0,
    activeRoutes: 0,
    totalRoutes: 0,
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
            setGym({ name: gymData.name, city: gymData.city });
          }
        });
        // Lade Codes
        listGymCodesByGym(firstGym).then(({ data: codesData }) => {
          const codes = codesData ?? [];
          setStats((prev) => ({
            ...prev,
            totalCodes: codes.length,
            redeemedCodes: codes.filter((c) => c.redeemed_by).length,
          }));
        });
        // Lade Routen
        listRoutesByGym(firstGym).then(({ data: routesData }) => {
          const routes = routesData ?? [];
          setStats((prev) => ({
            ...prev,
            totalRoutes: routes.length,
            activeRoutes: routes.filter((r) => r.active).length,
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

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-headline text-3xl text-primary">{gym?.name ?? "Meine Halle"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {gym?.city && `${gym.city} · `}Übersicht deiner Halle
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Codes gesamt</div>
          <div className="font-headline text-2xl text-primary mt-2">{stats.totalCodes}</div>
          <p className="text-xs text-muted-foreground mt-1">Generierte Codes</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Codes eingelöst</div>
          <div className="font-headline text-2xl text-primary mt-2">{stats.redeemedCodes}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalCodes > 0
              ? `${Math.round((stats.redeemedCodes / stats.totalCodes) * 100)}% Einlösungsrate`
              : "Noch keine Codes"}
          </p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Routen aktiv</div>
          <div className="font-headline text-2xl text-primary mt-2">{stats.activeRoutes}</div>
          <p className="text-xs text-muted-foreground mt-1">von {stats.totalRoutes} Routen</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Codes verfügbar</div>
          <div className="font-headline text-2xl text-primary mt-2">{stats.totalCodes - stats.redeemedCodes}</div>
          <p className="text-xs text-muted-foreground mt-1">Noch nicht eingelöst</p>
        </Card>
      </div>
    </div>
  );
};

export default GymAdminDashboard;
