import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, MapPinned, Trophy, Unlock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StitchBadge, StitchButton, StitchCard, StitchSectionHeading } from "@/app/components/StitchPrimitives";
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
  OWL: "/gym-logos-real/owl.jpg",
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
            const index = acc.findIndex((existing) => gymKey(existing.name) === gymKey(gym.name));
            if (index === -1) acc.push(gym);
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

  const routeByGym = useMemo(
    () =>
      routes.reduce<Record<string, Route[]>>((acc, route) => {
        acc[route.gym_id] = acc[route.gym_id] ?? [];
        acc[route.gym_id].push(route);
        return acc;
      }, {}),
    [routes],
  );

  const resultMap = useMemo(
    () =>
      results.reduce<Record<string, Result>>((acc, result) => {
        acc[result.route_id] = result;
        return acc;
      }, {}),
    [results],
  );

  const unlockedCount = unlockedGyms.size;
  const totalRoutes = routes.length;
  const climbedRoutes = results.filter((result) => result.points > 0).length;
  const overallProgress = totalRoutes > 0 ? Math.round((climbedRoutes / totalRoutes) * 100) : 0;

  return (
    <div className="space-y-6">
      <StitchCard tone="navy" className="p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StitchBadge tone="cream">Hallen Übersicht</StitchBadge>
              <StitchBadge tone="terracotta">{gyms.length} offizielle Hallen</StitchBadge>
            </div>

            <StitchSectionHeading
              eyebrow="Partnerhallen"
              title="Alle Hallen in einem vertikalen Flow"
              description="Unlock-Status, Logos und persönlicher Fortschritt sind auf Stitch-Karten abgebildet."
              className="[&_.stitch-headline]:text-[#f2dcab] [&_.stitch-kicker]:text-[rgba(242,220,171,0.66)] [&_p]:text-[rgba(242,220,171,0.76)]"
            />

            <StitchButton asChild variant="cream">
              <Link to="/app/gyms/redeem">
                Code einlösen
                <ArrowRight className="h-4 w-4" />
              </Link>
            </StitchButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Freigeschaltet</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">{unlockedCount}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">Hallen offen</p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Routen</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">{climbedRoutes}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">bereits geklettert</p>
            </div>
            <div className="rounded-[1.35rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Gesamtfortschritt</div>
              <div className="stitch-metric mt-3 text-4xl text-[#f2dcab]">{overallProgress}%</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">über alle Routen</p>
            </div>
          </div>
        </div>
      </StitchCard>

      <div className="space-y-3">
        {gyms.map((gym) => {
          const gymRoutes = routeByGym[gym.id] ?? [];
          const completed = gymRoutes.filter((route) => resultMap[route.id]).length;
          const unlocked = unlockedGyms.has(gym.id);
          const progress = gymRoutes.length ? Math.round((completed / gymRoutes.length) * 100) : 0;
          const hasProgress = completed > 0;

          return (
            <Link key={gym.id} to={`/app/gyms/${gym.id}`} className="block">
              <StitchCard tone={unlocked ? "surface" : "muted"} className="p-5 transition-transform hover:-translate-y-0.5">
                <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] ${
                        unlocked ? "bg-[#f5efe5]" : "bg-white/70"
                      }`}
                    >
                      {gym.logo_url ? (
                        <img src={gym.logo_url} alt={gym.name} className="h-full w-full object-contain p-2.5" />
                      ) : (
                        <span className="stitch-headline text-xl text-[#003d55]">KL</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="stitch-headline text-2xl text-[#002637]">{gym.name}</div>
                        <StitchBadge tone={unlocked ? "terracotta" : "ghost"}>
                          {unlocked ? "Besucht" : "Offen"}
                        </StitchBadge>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm text-[rgba(27,28,26,0.62)]">
                        <MapPinned className="h-4 w-4 text-[#003d55]" />
                        {gym.city || "NRW"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#002637]">Fortschritt in dieser Halle</span>
                      <span className="text-[rgba(27,28,26,0.62)]">
                        {completed}/{gymRoutes.length || 0} Routen
                      </span>
                    </div>

                    <Progress
                      value={progress}
                      className="h-3 rounded-full bg-[rgba(0,38,55,0.08)] [&>*]:bg-[#a15523]"
                    />

                    <div className="flex flex-wrap gap-2">
                      <StitchBadge tone="ghost">{progress}% abgeschlossen</StitchBadge>
                      <StitchBadge tone="ghost">{hasProgress ? "Mit Aktivität" : "Noch offen"}</StitchBadge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#003d55]">
                      {unlocked ? <Unlock className="h-5 w-5 text-[#a15523]" /> : <Lock className="h-5 w-5" />}
                      {unlocked ? "Freigeschaltet" : "Gesperrt"}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-[#003d55] px-4 py-2 text-sm font-semibold text-[#f2dcab]">
                      <Trophy className="h-4 w-4" />
                      Halle öffnen
                    </div>
                  </div>
                </div>
              </StitchCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Gyms;
