import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { listGyms, listResultsForUser, listRoutes, checkGymCodeRedeemed } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Gym, Result, Route } from "@/services/appTypes";

const OFFICIAL_GYMS = new Set([
  "2T Lindlar",
  "OWL",
  "Canyon Chorweiler",
  "DAV Alpinzentrum Bielefeld",
  "KletterBar Münster",
  "Kletterwelt Sauerland",
  "Kletterfabrik Köln",
  "Chimpanzodrome Frechen",
]);

const LOGO_FALLBACKS: Record<string, string> = {
  "2T Lindlar": "/gym-logos-real/2t-lindlar.png",
  "Canyon Chorweiler": "/gym-logos-real/canyon-chorweiler.jpg",
  "Chimpanzodrome Frechen": "/gym-logos-real/chimpanzodrome-frechen.png",
  "DAV Alpinzentrum Bielefeld": "/gym-logos-real/dav-bielefeld.svg",
  "KletterBar Münster": "/gym-logos-real/kletterbar-muenster.png",
  "Kletterfabrik Köln": "/gym-logos-real/kletterfabrik-koeln.png",
  "Kletterwelt Sauerland": "/gym-logos-real/kletterwelt-sauerland.jpg",
  "OWL": "/gym-logos-real/owl.jpg",
};

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

const normalizeGymName = (name: string) => {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (cleaned === "Kletterzentrum OWL" || cleaned === "DAV Kletterzentrum Siegerland") return "OWL";
  return cleaned;
};

const gymKey = (name: string) => normalizeGymName(name).toLocaleLowerCase("de");

const Gyms = () => {
  const { profile } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [unlockedGyms, setUnlockedGyms] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [gymsResult, routesResult] = await Promise.all([listGyms(), listRoutes()]);
        if (!active) return;

        const cleaned = (gymsResult.data ?? [])
          .map((gym) => {
            const normalizedName = normalizeGymName(gym.name);
            return {
              ...gym,
              name: normalizedName,
              logo_url: LOGO_FALLBACKS[normalizedName] ?? gym.logo_url,
            };
          })
          .filter((gym) => OFFICIAL_GYMS.has(gym.name))
          .reduce<Gym[]>((acc, gym) => {
            const idx = acc.findIndex((g) => gymKey(g.name) === gymKey(gym.name));
            if (idx === -1) acc.push(gym);
            return acc;
          }, []);

        setGyms(cleaned.sort((a, b) => a.name.localeCompare(b.name, "de")));
        setRoutes(routesResult.data ?? []);
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Failed to load participant gyms", error);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;

    listResultsForUser(profile.id)
      .then(({ data }) => {
        if (active) {
          setResults(data ?? []);
        }
      })
      .catch((error) => {
        if (!isAbortError(error)) {
          console.error("Failed to load user results", error);
        }
      });

    if (gyms.length > 0) {
      const checkUnlocked = async () => {
        const unlocked = new Set<string>();
        await Promise.all(
          gyms.map(async (gym) => {
            const { data } = await checkGymCodeRedeemed(gym.id, profile.id);
            if (data) {
              unlocked.add(gym.id);
            }
          }),
        );

        if (active) {
          setUnlockedGyms(unlocked);
        }
      };

      void checkUnlocked().catch((error) => {
        if (!isAbortError(error)) {
          console.error("Failed to check unlocked gyms", error);
        }
      });
    }

    return () => {
      active = false;
    };
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-5">
        {gyms.map((gym) => {
          const gymRoutes = routeByGym[gym.id] ?? [];
          const completed = gymRoutes.filter((route) => resultMap[route.id]).length;
          const unlocked = unlockedGyms.has(gym.id);
          const progress = gymRoutes.length ? Math.round((completed / gymRoutes.length) * 100) : 0;
          const hasProgress = completed > 0;

          return (
            <Link key={gym.id} to={`/app/gyms/${gym.id}`}>
              <Card
                className={`relative h-full overflow-hidden border-2 p-4 transition-all md:p-5 lg:p-6 ${
                  unlocked
                    ? "border-secondary/40 bg-gradient-to-br from-background to-secondary/5 hover:border-secondary hover:shadow-lg"
                    : "border-border/60 bg-background opacity-90 hover:border-border hover:shadow-md"
                }`}
              >
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl md:h-16 md:w-16 ${
                        unlocked
                          ? "border-2 border-secondary/30 bg-secondary/10"
                          : "border border-border/60 bg-muted/50"
                      }`}
                    >
                      {gym.logo_url ? (
                        <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <span
                          className={`text-sm font-bold md:text-base ${
                            unlocked ? "text-secondary" : "text-muted-foreground"
                          }`}
                        >
                          KL
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 pt-1">
                      {unlocked ? (
                        <Unlock className="h-5 w-5 text-secondary md:h-6 md:w-6" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground/60 md:h-6 md:w-6" />
                      )}
                    </div>
                  </div>

                  <div>
                    <div
                      className={`mb-1 text-sm font-medium leading-tight md:text-base ${
                        unlocked ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {gym.name}
                    </div>
                    <div className="text-xs text-muted-foreground md:text-sm">{gym.city || ""}</div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Routen geklettert</span>
                      <span
                        className={`text-xs font-bold ${
                          hasProgress ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {completed}/{gymRoutes.length || 0}
                      </span>
                    </div>
                    {gymRoutes.length > 0 ? (
                      <div className="relative">
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted/60">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              hasProgress ? "bg-primary" : "bg-muted"
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
                      <div className="h-2.5 rounded-full bg-muted/40">
                        <div className="h-full w-full rounded-full bg-muted/60" />
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
