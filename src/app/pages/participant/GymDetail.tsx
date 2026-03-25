import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe,
  Lock,
  MapPin,
  Mountain,
  Route as RouteIcon,
  Share2,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/app/auth/AuthProvider";
import { Progress } from "@/components/ui/progress";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import {
  checkGymCodeRedeemed,
  getGym,
  getGymCodeByCode,
  listResultsForUser,
  listRoutesByGym,
  updateGymCode,
} from "@/services/appApi";
import type { Gym, Result, Route } from "@/services/appTypes";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

const buildDirectionsLink = (gym: Gym | null) => {
  if (!gym?.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address)}`;
};

const GymDetail = () => {
  const { gymId } = useParams();
  const { profile } = useAuth();
  const [gym, setGym] = useState<Gym | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [codeRedeemed, setCodeRedeemed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymId || !profile?.id) return;
    let active = true;

    const load = async () => {
      setChecking(true);
      try {
        const [gymResult, routesResult, resultsResult, redeemedResult] = await Promise.all([
          getGym(gymId),
          listRoutesByGym(gymId),
          listResultsForUser(profile.id),
          checkGymCodeRedeemed(gymId, profile.id),
        ]);

        if (!active) return;
        setGym(gymResult.data ?? null);
        setRoutes(routesResult.data ?? []);
        setResults(resultsResult.data ?? []);
        setCodeRedeemed(Boolean(redeemedResult.data));
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Failed to load gym detail", error);
        }
      } finally {
        if (active) setChecking(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [gymId, profile?.id]);

  const resultMap = useMemo(
    () =>
      results.reduce<Record<string, Result>>((acc, result) => {
        acc[result.route_id] = result;
        return acc;
      }, {}),
    [results],
  );

  const climbedRoutes = useMemo(
    () => routes.filter((route) => (resultMap[route.id]?.points ?? 0) > 0).length,
    [routes, resultMap],
  );

  const unlockedRoutes = useMemo(
    () => routes.filter((route) => resultMap[route.id]).length,
    [routes, resultMap],
  );

  const gradeSpectrum = useMemo(
    () =>
      Array.from(
        new Set(
          routes
            .map((route) => route.grade_range?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).slice(0, 8),
    [routes],
  );

  const featuredRoutes = useMemo(() => {
    const parseCode = (value: string) => Number(value.replace(/\D/g, "")) || 0;
    return [...routes].sort((a, b) => parseCode(b.code) - parseCode(a.code)).slice(0, 5);
  }, [routes]);

  const disciplineCounts = useMemo(() => {
    const toprope = routes.filter((route) => route.discipline === "toprope").length;
    const lead = routes.filter((route) => route.discipline === "lead").length;
    return { toprope, lead };
  }, [routes]);

  const progress = routes.length > 0 ? Math.round((climbedRoutes / routes.length) * 100) : 0;
  const directionsLink = buildDirectionsLink(gym);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !gymId) return;

    const normalized = code.trim().toUpperCase();
    if (!normalized) return;

    setLoading(true);
    const { data, error } = await getGymCodeByCode(normalized);

    if (error) {
      setLoading(false);
      toast({ title: "Fehler", description: error.message });
      return;
    }

    if (!data) {
      setLoading(false);
      toast({ title: "Ungültiger Code", description: "Dieser Hallencode wurde nicht gefunden." });
      return;
    }

    if (data.gym_id !== gymId) {
      setLoading(false);
      toast({ title: "Falscher Code", description: "Dieser Code gehört nicht zu dieser Halle." });
      return;
    }

    if (data.redeemed_by) {
      setLoading(false);
      toast({ title: "Bereits eingelöst", description: "Dieser Hallencode wurde schon verwendet." });
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setLoading(false);
      toast({ title: "Abgelaufen", description: "Dieser Hallencode ist nicht mehr gültig." });
      return;
    }

    const { error: redeemError } = await updateGymCode(data.id, {
      redeemed_by: profile.id,
      redeemed_at: new Date().toISOString(),
      status: "redeemed",
    });

    setLoading(false);
    if (redeemError) {
      toast({ title: "Fehler", description: redeemError.message });
      return;
    }

    toast({
      title: "Halle freigeschaltet",
      description: gym?.name ? `„${gym.name}“ ist jetzt für dich aktiviert.` : "Die Halle wurde freigeschaltet.",
      variant: "success",
    });

    setCode("");
    setCodeRedeemed(true);
  };

  const handleShare = async () => {
    if (!gym?.name || typeof navigator === "undefined") return;
    const shareText = `${gym.name}${gym.city ? ` in ${gym.city}` : ""} in der Kletterliga NRW`;
    try {
      if (navigator.share) {
        await navigator.share({ title: gym.name, text: shareText, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link kopiert", description: "Der Hallenlink liegt jetzt in deiner Zwischenablage." });
    } catch (error) {
      console.error("Failed to share gym", error);
    }
  };

  if (checking) {
    return <div className="text-sm text-[rgba(27,28,26,0.6)]">Hallenansicht wird geladen...</div>;
  }

  if (!gym) {
    return (
      <StitchCard tone="surface" className="p-6">
        <div className="stitch-headline text-2xl text-[#002637]">Halle nicht gefunden</div>
        <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
          Diese Halle konnte nicht geladen werden oder ist aktuell nicht verfügbar.
        </p>
      </StitchCard>
    );
  }

  return (
    <div className="space-y-6 stitch-page-pad">
      <StitchCard tone="navy" className="overflow-hidden">
        <div className="relative min-h-[20rem] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(161,85,35,0.34),transparent_32%),linear-gradient(180deg,rgba(0,38,55,0.12),rgba(0,38,55,0.76))]" />
          <div className="absolute inset-0 stitch-rope-texture opacity-30" />
          <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StitchBadge tone="terracotta">{gym.city || "NRW"}</StitchBadge>
                <StitchBadge tone="cream">{codeRedeemed ? "Freigeschaltet" : "Code erforderlich"}</StitchBadge>
              </div>
              <div>
                <div className="stitch-headline text-4xl text-[#f2dcab] sm:text-5xl">{gym.name}</div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-[rgba(242,220,171,0.72)]">
                  <MapPin className="h-4 w-4 text-[#f2dcab]" />
                  {gym.address || gym.city || "Partnerhalle der Kletterliga NRW"}
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 lg:justify-end">
              <div className="rounded-[1.5rem] border border-[rgba(242,220,171,0.16)] bg-[rgba(242,220,171,0.08)] p-4 text-right">
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Dein Fortschritt</div>
                <div className="stitch-metric mt-3 text-5xl text-[#f2dcab]">{climbedRoutes}</div>
                <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">{routes.length} Routen insgesamt</p>
              </div>

              <button
                type="button"
                onClick={() => void handleShare()}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(242,220,171,0.16)] bg-[rgba(242,220,171,0.08)] text-[#f2dcab] transition hover:bg-[rgba(242,220,171,0.14)]"
                aria-label="Halle teilen"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </StitchCard>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <StitchCard tone="surface" className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1fr_1fr]">
            <div className="flex min-h-[15rem] items-end bg-[linear-gradient(180deg,rgba(0,61,85,0.12),rgba(0,61,85,0.34))] p-5">
              <div className="rounded-[1.5rem] bg-[#003d55] p-4 text-[#f2dcab] shadow-[0_18px_40px_rgba(0,38,55,0.24)]">
                <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Standort</div>
                <div className="mt-3 text-xl font-semibold">{gym.address || "Adresse folgt"}</div>
                <div className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">{gym.city || "Nordrhein-Westfalen"}</div>
              </div>
            </div>

            <div className="space-y-5 bg-[#f2dcab] p-5">
              <div>
                <div className="stitch-kicker text-[#a15523]">Vor Ort</div>
                <div className="stitch-headline mt-3 text-3xl text-[#002637]">Alles für deine Session</div>
              </div>

              <div className="space-y-4 text-sm text-[rgba(27,28,26,0.7)]">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#a15523]" />
                  <span>{gym.address || "Adresse folgt"}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-[#a15523]" />
                  <span>{gym.opening_hours || "Öffnungszeiten werden in Kürze ergänzt."}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 text-[#a15523]" />
                  <span>{gym.website ? gym.website.replace(/^https?:\/\//, "") : "Website folgt"}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {directionsLink ? (
                  <StitchButton asChild variant="navy" size="sm">
                    <a href={directionsLink} target="_blank" rel="noreferrer">
                      Route planen
                    </a>
                  </StitchButton>
                ) : null}
                {gym.website ? (
                  <StitchButton asChild variant="outline" size="sm">
                    <a href={gym.website} target="_blank" rel="noreferrer">
                      Website öffnen
                    </a>
                  </StitchButton>
                ) : null}
              </div>
            </div>
          </div>
        </StitchCard>

        <StitchCard tone="navy" className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Deine Leistung</div>
              <div className="stitch-metric mt-4 text-6xl text-[#f2dcab]">{progress}%</div>
            </div>
            <div className="rounded-full bg-[rgba(242,220,171,0.1)] p-3 text-[#f2dcab]">
              <Mountain className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Geloggt</div>
              <div className="mt-2 text-2xl font-semibold text-[#f2dcab]">{unlockedRoutes} Einträge</div>
            </div>
            <div>
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Bester Flow</div>
              <div className="mt-2 text-2xl font-semibold text-[#f2dcab]">
                {gradeSpectrum[gradeSpectrum.length - 1] || "Noch offen"}
              </div>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[rgba(242,220,171,0.08)]">
            <Progress value={progress} className="h-full rounded-full bg-transparent [&>*]:bg-[#a15523]" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Toprope</div>
              <div className="mt-2 text-xl font-semibold text-[#f2dcab]">{disciplineCounts.toprope}</div>
            </div>
            <div className="rounded-[1.2rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Vorstieg</div>
              <div className="mt-2 text-xl font-semibold text-[#f2dcab]">{disciplineCounts.lead}</div>
            </div>
          </div>
        </StitchCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <StitchCard tone="navy" className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="stitch-headline text-3xl text-[#f2dcab]">Frische Routen</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">
                Die neuesten oder markantesten Routen dieser Halle als schneller Einstieg in deinen Routen-Flow.
              </p>
            </div>
            <RouteIcon className="h-6 w-6 text-[#f2dcab]" />
          </div>

          <div className="mt-6 space-y-3">
            {featuredRoutes.length > 0 ? (
              featuredRoutes.map((route) => {
                const result = resultMap[route.id];
                return (
                  <div
                    key={route.id}
                    className="rounded-[1.2rem] border border-[rgba(242,220,171,0.08)] bg-[rgba(242,220,171,0.06)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-[#f2dcab]">{route.code}</div>
                          {route.grade_range ? <StitchBadge tone="ghost">{route.grade_range}</StitchBadge> : null}
                        </div>
                        <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">
                          {(route.name || "Route") + (route.setter ? ` • gesetzt von ${route.setter}` : "")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#f2dcab]">
                          {result ? `${result.points + (result.flash ? 1 : 0)} Punkte` : "Noch offen"}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[rgba(242,220,171,0.46)]">
                          {route.discipline === "lead" ? "Vorstieg" : "Toprope"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[rgba(242,220,171,0.72)]">Für diese Halle sind noch keine Routen hinterlegt.</p>
            )}
          </div>
        </StitchCard>

        <StitchCard tone="cream" className="p-5">
          <div className="space-y-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Grad-Spektrum</div>
              <div className="stitch-headline mt-2 text-3xl text-[#002637]">Schwierigkeiten vor Ort</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {gradeSpectrum.length > 0 ? (
                gradeSpectrum.map((grade, index) => (
                  <div
                    key={grade}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                      index === gradeSpectrum.length - 1
                        ? "bg-[#a15523] text-white"
                        : index === 0
                          ? "bg-[#003d55] text-[#f2dcab]"
                          : "bg-white/70 text-[#003d55]"
                    }`}
                  >
                    {grade}
                  </div>
                ))
              ) : (
                <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-[#003d55]">
                  Keine Gradinfos vorhanden
                </div>
              )}
            </div>

            <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
              Die Skala basiert auf den aktuell hinterlegten Routen in der Halle. Zusätzliche Sektor- oder Wanddaten
              ergänzen wir, sobald sie im Produktmodell verfügbar sind.
            </p>
          </div>
        </StitchCard>
      </div>

      {!codeRedeemed ? (
        <StitchCard tone="cream" className="p-5 sm:p-6">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(161,85,35,0.1)] text-[#a15523]">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="stitch-kicker text-[#a15523]">Zugang nötig</div>
                <div className="text-xl font-semibold text-[#002637]">Diese Halle wartet noch auf deinen Code</div>
                <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                  Sobald du den Hallencode einlöst, kannst du hier deine Routen öffnen und Ergebnisse direkt erfassen.
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeem} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-[1.2rem] bg-white px-5 py-4 shadow-[inset_0_-3px_0_rgba(161,85,35,0.22)]">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="HALLENCODE"
                  className="w-full bg-transparent font-['Space_Grotesk'] text-lg font-bold uppercase tracking-[0.18em] text-[#002637] outline-none placeholder:text-[rgba(0,38,55,0.24)]"
                />
              </div>
              <StitchButton type="submit" size="lg" className="w-full sm:w-auto" disabled={loading || !code.trim()}>
                {loading ? "Wird geprüft..." : "Halle freischalten"}
              </StitchButton>
            </form>
          </div>
        </StitchCard>
      ) : (
        <div className="sticky bottom-[5.5rem] z-30">
          <StitchButton asChild size="lg" className="w-full shadow-[0_18px_36px_rgba(161,85,35,0.32)]">
            <Link to={`/app/gyms/${gym.id}/routes`}>
              Routen und Ergebnisse öffnen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </StitchButton>
        </div>
      )}
    </div>
  );
};

export default GymDetail;
