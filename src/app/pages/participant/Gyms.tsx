import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listGyms, listResultsForUser, listRoutes, checkGymCodeRedeemed } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Gym, Result, Route } from "@/services/appTypes";

const Gyms = () => {
  const { profile } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [unlockedGyms, setUnlockedGyms] = useState<Set<string>>(new Set());

  useEffect(() => {
    listGyms().then(({ data }) => setGyms(data ?? []));
    listRoutes().then(({ data }) => setRoutes(data ?? []));
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    listResultsForUser(profile.id).then(({ data }) => setResults(data ?? []));
    
    // Prüfe für jede Halle, ob ein Code eingelöst wurde
    if (gyms.length > 0 && profile.id) {
      const checkUnlocked = async () => {
        const unlocked = new Set<string>();
        await Promise.all(
          gyms.map(async (gym) => {
            const { data } = await checkGymCodeRedeemed(gym.id, profile.id!);
            if (data) {
              unlocked.add(gym.id);
            }
          })
        );
        setUnlockedGyms(unlocked);
      };
      checkUnlocked();
    }
  }, [profile?.id, gyms]);

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
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {gyms.map((gym) => {
          const gymRoutes = routeByGym[gym.id] ?? [];
          const completed = gymRoutes.filter((route) => resultMap[route.id]).length;
          const unlocked = unlockedGyms.has(gym.id);
          const progress = gymRoutes.length ? Math.round((completed / gymRoutes.length) * 100) : 0;
          const hasProgress = completed > 0;
          
          return (
            <Link key={gym.id} to={`/app/gyms/${gym.id}`}>
              <Card className={`relative p-4 border-2 transition-all h-full overflow-hidden ${
                unlocked 
                  ? "border-secondary/40 hover:border-secondary hover:shadow-lg bg-gradient-to-br from-background to-secondary/5" 
                  : "border-border/60 hover:border-border hover:shadow-md bg-background"
              } ${!unlocked ? "opacity-90" : ""}`}>
                <div className="space-y-3">
                  {/* Logo und Lock Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${
                      unlocked 
                        ? "bg-secondary/10 border-2 border-secondary/30" 
                        : "bg-muted/50 border border-border/60"
                    }`}>
                      {gym.logo_url ? (
                        <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <span className={`text-sm font-bold ${unlocked ? "text-secondary" : "text-muted-foreground"}`}>
                          KL
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 pt-1">
                      {unlocked ? (
                        <Unlock className="h-5 w-5 text-secondary" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                  </div>

                  {/* Gym Name und Stadt */}
                  <div>
                    <div className={`text-sm leading-tight mb-1 font-medium ${unlocked ? "text-primary" : "text-muted-foreground"}`}>
                      {gym.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{gym.city || ""}</div>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Routen geklettert</span>
                      <span className={`text-xs font-bold ${hasProgress ? "text-primary" : "text-muted-foreground"}`}>
                        {completed}/{gymRoutes.length || 0}
                      </span>
                    </div>
                    {gymRoutes.length > 0 ? (
                      <div className="relative">
                        <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              hasProgress 
                                ? "bg-primary" 
                                : "bg-muted"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        {progress > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-semibold text-primary-foreground drop-shadow-sm">
                              {progress}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-2.5 bg-muted/40 rounded-full">
                        <div className="h-full w-full bg-muted/60 rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Gyms;
