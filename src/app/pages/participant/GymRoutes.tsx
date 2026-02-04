import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGym, listResultsForUser, listRoutesByGym } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Gym, Result, Route } from "@/services/appTypes";

const GymRoutes = () => {
  const { gymId } = useParams();
  const { profile, user } = useAuth();
  const league = profile?.league || (user?.user_metadata?.league as string | undefined);
  const [gym, setGym] = useState<Gym | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!gymId) return;
    getGym(gymId).then(({ data }) => setGym(data ?? null));
    listRoutesByGym(gymId).then(({ data }) => setRoutes(data ?? []));
  }, [gymId]);

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
  }, [profile?.id]);

  const resultMap = useMemo(() => {
    return results.reduce<Record<string, Result>>((acc, result) => {
      acc[result.route_id] = result;
      return acc;
    }, {});
  }, [results]);

  const sortByCode = (a: Route, b: Route) => {
    const numA = Number(a.code.replace(/\D/g, "")) || 0;
    const numB = Number(b.code.replace(/\D/g, "")) || 0;
    return numA - numB;
  };

  const toprope = routes.filter((route) => route.discipline === "toprope").sort(sortByCode);
  const lead = routes.filter((route) => route.discipline === "lead").sort(sortByCode);
  const activeLeague = league === "lead" || league === "toprope" ? league : null;

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

  const renderRoute = (route: Route) => {
    const result = resultMap[route.id];
    const colorKey = (route.color || "").toLowerCase();
    const colorClass = colorClassMap[colorKey] ?? "bg-muted";
    return (
      <Card key={route.id} className="p-4 border-border/60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-primary">
              {route.code} - {route.name || "Route"}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${colorClass}`} aria-hidden="true" />
                <span>Farbe: {route.color || "folgt"}</span>
              </span>
              <span> · Routenschrauber: {route.setter || "folgt"}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm font-semibold text-secondary">
              {result ? `${(result.points ?? 0) + (result.flash ? 1 : 0)} Punkte` : "Nicht geklettert"}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link to={`/app/gyms/${gymId}/routes/${route.id}/result`}>
            <span className="skew-x-6">Ergebnis eintragen</span>
          </Link>
        </Button>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl text-primary">{gym?.name ?? "Routen"}</h2>
        <p className="text-sm text-muted-foreground">Toprope und Vorstieg im Überblick.</p>
      </div>
      {activeLeague === "toprope" ? (
        <section className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-secondary">Toprope</div>
          <div className="space-y-3">
            {toprope.map(renderRoute)}
            {toprope.length === 0 && <div className="text-sm text-muted-foreground">Keine Toprope-Routen.</div>}
          </div>
        </section>
      ) : activeLeague === "lead" ? (
        <section className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-secondary">Vorstieg</div>
          <div className="space-y-3">
            {lead.map(renderRoute)}
            {lead.length === 0 && <div className="text-sm text-muted-foreground">Keine Vorstiegsrouten.</div>}
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-secondary">Toprope</div>
            <div className="space-y-3">
              {toprope.map(renderRoute)}
              {toprope.length === 0 && <div className="text-sm text-muted-foreground">Keine Toprope-Routen.</div>}
            </div>
          </section>
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-secondary">Vorstieg</div>
            <div className="space-y-3">
              {lead.map(renderRoute)}
              {lead.length === 0 && <div className="text-sm text-muted-foreground">Keine Vorstiegsrouten.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default GymRoutes;
