import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listGyms, listResultsForUser, listRoutes } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Gym, Result, Route } from "@/services/appTypes";

const Gyms = () => {
  const { profile } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listRoutes().then(({ data }) => setRoutes(data ?? []));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
  }, [profile?.id]);

  const routeByGym = useMemo(() => {
    return routes.reduce<Record<string, Route[]>>((acc, route) => {
      acc[route.gym_id] = acc[route.gym_id] ?? [];
      acc[route.gym_id].push(route);
      return acc;
    }, {});
  }, [routes]);

  const resultMap = useMemo(() => {
    return results.reduce<Record<string, Result>>((acc, result) => {
      acc[result.route_id] = result;
      return acc;
    }, {});
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {gyms.map((gym) => {
          const gymRoutes = routeByGym[gym.id] ?? [];
          const completed = gymRoutes.filter((route) => resultMap[route.id]).length;
          const unlocked = completed > 0;
          const progress = gymRoutes.length ? Math.round((completed / gymRoutes.length) * 100) : 0;
          return (
            <Link key={gym.id} to={`/app/gyms/${gym.id}`}>
              <Card className="p-4 border-border/60 hover:shadow-md transition-shadow space-y-3 h-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden">
                    {gym.logo_url ? (
                      <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">KL</span>
                    )}
                  </div>
                  <div
                    className={`border px-3 py-1 text-[11px] uppercase tracking-widest -skew-x-6 ${
                      unlocked ? "border-secondary text-secondary bg-secondary/10" : "border-border text-muted-foreground"
                    }`}
                  >
                    <span className="skew-x-6 inline-block">
                      {unlocked ? "Freigeschaltet" : <Lock className="h-3.5 w-3.5" />}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-primary">{gym.name}</div>
                  <div className="text-xs text-muted-foreground">{gym.city}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Routen geklettert</span>
                  <span>
                    {completed}/{gymRoutes.length || 0}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Gyms;
