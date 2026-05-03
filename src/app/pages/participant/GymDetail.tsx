import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock3, Globe, Lock, MapPin, Mountain, Star } from "lucide-react";
import { useAuth } from "@/app/auth/AuthProvider";
import { RouteHighlightCard } from "@/app/components/RouteHighlightCard";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { useParticipantGymDetailQuery } from "@/app/pages/participant/participantQueries";
import { Progress } from "@/components/ui/progress";
import { StarRating } from "@/components/ui/star-rating";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import type { Gym, Result, Route } from "@/services/appTypes";

const buildDirectionsLink = (address: string | null) => {
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const buildMapEmbedLink = (address: string | null) => {
  if (!address) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=k&z=18&ie=UTF8&iwloc=&output=embed`;
};

const parseCodeValue = (value: string) => Number(value.replace(/\D/g, "")) || 0;

const formatWebsiteLabel = (website: string | null) => {
  if (!website) return "Website folgt";
  return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

const getResultScore = (result: Result | undefined) => (result?.points ?? 0) + (result?.flash ? 1 : 0);

const formatAverageMetric = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

const GymDetail = () => {
  const { gymId } = useParams();
  const { profile } = useAuth();
  const { gym, routes, results, allResults, codeRedeemed, loading, error } =
    useParticipantGymDetailQuery(gymId, profile?.id);

  const resultMap = useMemo(
    () =>
      results.reduce<Record<string, Result>>((acc, result) => {
        acc[result.route_id] = result;
        return acc;
      }, {}),
    [results],
  );

  const visibleRoutes = useMemo(() => {
    const activeRoutes = routes.filter((route) => route.active);
    return activeRoutes.length > 0 ? activeRoutes : routes;
  }, [routes]);

  const loggedRoutes = useMemo(
    () => visibleRoutes.filter((route) => Boolean(resultMap[route.id])).length,
    [visibleRoutes, resultMap],
  );

  const earnedPoints = useMemo(
    () => visibleRoutes.reduce((acc, route) => acc + getResultScore(resultMap[route.id]), 0),
    [visibleRoutes, resultMap],
  );

  const progress = visibleRoutes.length > 0 ? Math.round((loggedRoutes / visibleRoutes.length) * 100) : 0;

  const visibleRouteIds = useMemo(() => new Set(visibleRoutes.map((route) => route.id)), [visibleRoutes]);

  const hallRatedResults = useMemo(
    () =>
      allResults.filter(
        (result) => visibleRouteIds.has(result.route_id) && result.rating !== null && result.rating !== undefined,
      ),
    [allResults, visibleRouteIds],
  );

  const averageRating = useMemo(() => {
    if (hallRatedResults.length === 0) return null;
    const sum = hallRatedResults.reduce((acc, result) => acc + (result.rating ?? 0), 0);
    return sum / hallRatedResults.length;
  }, [hallRatedResults]);

  const routeHighlights = useMemo(() => {
    const visibleRoutesById = new Map(visibleRoutes.map((route) => [route.id, route]));
    const resultsByRoute = allResults.reduce<Record<string, Result[]>>((acc, result) => {
      const route = visibleRoutesById.get(result.route_id);
      if (!route) return acc;
      acc[result.route_id] = [...(acc[result.route_id] ?? []), result];
      return acc;
    }, {});

    const sortedRoutes = [...visibleRoutes].sort((a, b) => {
      const codeDiff = parseCodeValue(a.code) - parseCodeValue(b.code);
      if (codeDiff !== 0) return codeDiff;
      return a.code.localeCompare(b.code);
    });

    const ratedCandidates = sortedRoutes
      .map((route) => {
        const ratings = (resultsByRoute[route.id] ?? [])
          .map((result) => result.rating)
          .filter((rating): rating is number => rating !== null && rating !== undefined);

        if (ratings.length === 0) return null;

        return {
          route,
          average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
          count: ratings.length,
        };
      })
      .filter((candidate): candidate is { route: Route; average: number; count: number } => candidate !== null)
      .sort((a, b) => {
        if (b.average !== a.average) return b.average - a.average;
        if (b.count !== a.count) return b.count - a.count;
        const codeDiff = parseCodeValue(a.route.code) - parseCodeValue(b.route.code);
        if (codeDiff !== 0) return codeDiff;
        return a.route.code.localeCompare(b.route.code);
      });

    const climbedCandidates = sortedRoutes
      .map((route) => ({ route, count: (resultsByRoute[route.id] ?? []).length }))
      .filter((candidate) => candidate.count > 0)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const codeDiff = parseCodeValue(a.route.code) - parseCodeValue(b.route.code);
        if (codeDiff !== 0) return codeDiff;
        return a.route.code.localeCompare(b.route.code);
      });

    return [
      {
        key: "favorite",
        label: "Beliebteste Route",
        emptyText: "Noch keine bewertete Route in dieser Halle.",
        route: ratedCandidates[0]?.route ?? null,
        subtitle: ratedCandidates[0]
          ? `${ratedCandidates[0].route.discipline === "lead" ? "Vorstieg" : "Toprope"} | ${ratedCandidates[0].count} Bewertung${ratedCandidates[0].count === 1 ? "" : "en"}`
          : "",
        eyebrow: "Ø Bewertung",
        value: ratedCandidates[0] ? `Ø ${formatAverageMetric(ratedCandidates[0].average)}` : "",
      },
      {
        key: "most-climbed",
        label: "Meistbegangenste Route",
        emptyText: "Noch keine eingetragene Route in dieser Halle.",
        route: climbedCandidates[0]?.route ?? null,
        subtitle: climbedCandidates[0]
          ? `${climbedCandidates[0].route.discipline === "lead" ? "Vorstieg" : "Toprope"}`
          : "",
        eyebrow: "Eintragungen",
        value: climbedCandidates[0] ? `${climbedCandidates[0].count}x` : "",
      },
    ];
  }, [allResults, visibleRoutes]);

  const ratingCount = hallRatedResults.length;
  const directionsLink = buildDirectionsLink(gym?.address ?? null);
  const mapEmbedLink = buildMapEmbedLink(gym?.address ?? null);

  if (loading) {
    return (
      <ParticipantStateCard
        title="Hallenansicht lädt"
        description="Die Details dieser Partnerhalle werden gerade vorbereitet."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Hallenansicht nicht verfügbar" description={error} />;
  }

  if (!gym) {
    return (
      <StitchCard tone="navy" className="mx-4 mt-6 rounded-xl p-6">
        <div className="stitch-headline text-2xl text-[#f2dcab]">Halle nicht gefunden</div>
        <p className="mt-3 text-sm leading-6 text-[rgba(242,220,171,0.74)]">
          Diese Halle konnte nicht geladen werden oder ist aktuell nicht verfügbar.
        </p>
      </StitchCard>
    );
  }

  return (
    <div className="pb-40">
      <section className="relative h-[25.5rem] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(122,168,196,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(161,85,35,0.28),transparent_30%),linear-gradient(180deg,#06324a_0%,#002637_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,38,55,0.62)_72%,#002637_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(0,38,55,0.82)_100%)]" />

        <div className="absolute inset-0 flex items-center justify-center px-8 pt-4">
          {gym.logo_url ? (
            <img
              src={gym.logo_url}
              alt={gym.name}
              className="max-h-[9.5rem] w-full object-contain drop-shadow-[0_22px_38px_rgba(0,0,0,0.28)]"
            />
          ) : (
            <div className="stitch-headline text-5xl text-[#f2dcab]">{gym.name}</div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-11">
          <div className="space-y-2">
            <StitchBadge tone="terracotta">{gym.city || "NRW"}</StitchBadge>
            <div className="stitch-headline text-[2.35rem] leading-[0.94] text-[#f2dcab]">{gym.name}</div>
            <div className="flex items-start gap-1.5 text-[0.78rem] font-medium text-[rgba(242,220,171,0.74)]">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{gym.address || gym.city || "Partnerhalle der Kletterliga NRW"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-4 px-4">
        <StitchCard
          tone="surface"
          className="overflow-hidden rounded-xl border border-[rgba(242,220,171,0.24)] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.14)]"
        >
          <div className="relative h-48 overflow-hidden bg-[linear-gradient(180deg,rgba(0,61,85,0.12),rgba(0,38,55,0.24))]">
            {mapEmbedLink ? (
              <iframe
                title={`Google Maps ${gym.name}`}
                src={mapEmbedLink}
                loading="lazy"
                className="h-full w-full border-0"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-[#003d55]">
                <div className="space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#a15523] text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold">Adresse für diese Halle folgt noch.</div>
                </div>
              </div>
            )}

            {mapEmbedLink ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.18)_100%)]" />
            ) : null}

            {mapEmbedLink ? (
              <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/88 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#002637] shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
                Satellit
              </div>
            ) : null}
          </div>

          <div className="space-y-4 bg-[linear-gradient(180deg,#f2dcab_0%,#ecd39a_100%)] p-5">
            <div>
              <div className="stitch-kicker text-[#a15523]">Route planen</div>
              <div className="stitch-headline mt-2 text-[2rem] leading-[0.98] text-[#002637]">So findest du hin</div>
            </div>

            <div className="space-y-4 text-sm leading-8 text-[rgba(0,38,55,0.78)]">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#a15523]" />
                <span>{gym.address || "Adresse folgt"}</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 h-4 w-4 shrink-0 text-[#a15523]" />
                <span>{gym.opening_hours || "Öffnungszeiten werden in Kürze ergänzt."}</span>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="mt-1 h-4 w-4 shrink-0 text-[#a15523]" />
                <span>{formatWebsiteLabel(gym.website)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {directionsLink ? (
                <StitchButton asChild variant="navy" size="sm" className="flex-1">
                  <a href={directionsLink} target="_blank" rel="noreferrer">
                    Route planen
                  </a>
                </StitchButton>
              ) : null}
              {gym.website ? (
                <StitchButton asChild variant="outline" size="sm" className="flex-1">
                  <a href={gym.website} target="_blank" rel="noreferrer">
                    Website öffnen
                  </a>
                </StitchButton>
              ) : null}
            </div>
          </div>
        </StitchCard>
      </section>

      <section className="mt-4 px-4">
        <StitchCard
          tone="navy"
          className="rounded-xl border border-[rgba(242,220,171,0.08)] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.18)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-xl bg-[#fd9f66] p-3 text-[#002637]">
              <Mountain className="h-4 w-4" />
            </div>
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[rgba(242,220,171,0.48)]">
              Dein Hallenstatus
            </div>
          </div>

          <div className="mt-5">
            <div className="stitch-metric text-6xl text-[#f2dcab]">{progress}%</div>
            <p className="mt-2 text-sm italic text-[rgba(242,220,171,0.68)]">
              {loggedRoutes} von {visibleRoutes.length} Routen eingetragen
            </p>
            <p className="mt-1 text-sm font-semibold text-[rgba(242,220,171,0.84)]">{earnedPoints} Punkte erzielt</p>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[rgba(242,220,171,0.08)]">
            <Progress value={progress} className="h-full rounded-full bg-transparent [&>*]:bg-[#a15523]" />
          </div>
        </StitchCard>
      </section>

      <section className="mt-8 px-4">
        <StitchCard
          tone="cream"
          className="rounded-xl border border-[rgba(161,85,35,0.12)] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Routen-Bewertung</div>
              <div className="stitch-headline mt-2 text-[2rem] leading-[0.98] text-[#002637]">
                Durchschnitt pro Route
              </div>
            </div>
            <Star className="mt-1 h-5 w-5 text-[#a15523]" />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <StarRating value={averageRating ?? 0} readonly size="sm" />
            <div className="text-lg font-semibold text-[#002637]">
              {averageRating !== null ? averageRating.toFixed(1) : "Noch keine Bewertungen"}
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-[rgba(0,38,55,0.68)]">
            {ratingCount > 0
              ? `Basierend auf ${ratingCount} abgegebenen Bewertung${ratingCount === 1 ? "" : "en"} in dieser Halle.`
              : "Sobald Routen bewertet wurden, erscheint hier der echte Hallendurchschnitt."}
          </p>
        </StitchCard>
      </section>

      <section className="mt-8 px-4">
        <div className="stitch-headline text-[2rem] text-[#f2dcab]">Routen-Highlights</div>

        <div className="mt-5 space-y-4">
          {routeHighlights.map((highlight) => (
            <div key={highlight.key} className="space-y-2">
              <div className="stitch-kicker text-[#a15523]">{highlight.label}</div>
              {highlight.route ? (
                <RouteHighlightCard
                  routeCode={highlight.route.code}
                  discipline={highlight.route.discipline}
                  title={highlight.route.name || highlight.route.code}
                  subtitle={highlight.subtitle}
                  eyebrow={highlight.eyebrow}
                  value={highlight.value}
                />
              ) : (
                <div className="stitch-glass-card rounded-xl p-5 text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                  {highlight.emptyText}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {!codeRedeemed ? (
        <section className="mt-8 px-4">
          <StitchCard
            tone="cream"
            className="rounded-xl border border-[rgba(161,85,35,0.12)] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.08)]"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(161,85,35,0.12)] text-[#a15523]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="stitch-kicker text-[#a15523]">Freischaltung</div>
                  <div className="mt-1 text-lg font-semibold text-[#002637]">
                    Diese Halle wartet noch auf deinen Code
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[rgba(0,38,55,0.68)]">
                    Mit der Freischaltung kannst du die Routen öffnen, bewerten und deine Ergebnisse direkt eintragen.
                  </p>
                </div>
              </div>
            </div>
          </StitchCard>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 px-4">
        <div className="mx-auto max-w-md">
          <StitchButton
            asChild
            size="lg"
            className="h-16 w-full rounded-xl px-6 text-sm tracking-[0.18em] shadow-[0_18px_36px_rgba(161,85,35,0.32)]"
          >
            <Link to={codeRedeemed ? `/app/gyms/${gym.id}/routes` : `/app/gyms/redeem?gymId=${encodeURIComponent(gym.id)}`}>
              {codeRedeemed ? "Routen öffnen" : "Halle freischalten"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </StitchButton>
        </div>
      </div>
    </div>
  );
};

export default GymDetail;
