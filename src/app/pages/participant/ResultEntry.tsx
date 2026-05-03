import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, KeyRound, Lock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/app/auth/AuthProvider";
import { ParticipantStateCard } from "@/app/pages/participant/ParticipantProfileContent";
import { StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import {
  participantQueryKeys,
  useParticipantGymDetailQuery,
} from "@/app/pages/participant/participantQueries";
import { useParticipantCompetitionData } from "@/app/pages/participant/useParticipantCompetitionData";
import { upsertResult } from "@/services/appApi";
import { cn } from "@/lib/utils";

type PointsOption = 0 | 2.5 | 5 | 7.5 | 10 | "flash";

const POINTS_OPTIONS: Array<{
  value: PointsOption;
  eyebrow: string;
  label: string;
}> = [
  { value: "flash", eyebrow: "Bonus", label: "Flash" },
  { value: 10, eyebrow: "Max", label: "10" },
  { value: 7.5, eyebrow: "High", label: "7.5" },
  { value: 5, eyebrow: "Mid", label: "5.0" },
  { value: 2.5, eyebrow: "Low", label: "2.5" },
  { value: 0, eyebrow: "Miss", label: "0" },
];

const ResultEntry = () => {
  const { gymId, routeId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { viewerMasterRedemption } = useParticipantCompetitionData();
  const hasOfficialMasterRedemption = Boolean(viewerMasterRedemption?.redeemed_at);
  const { routes, results, codeRedeemed, loading: pageLoading, error } =
    useParticipantGymDetailQuery(gymId, profile?.id);
  const [selectedOption, setSelectedOption] = useState<PointsOption>(0);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const route = useMemo(
    () => routes.find((item) => item.id === routeId) ?? null,
    [routeId, routes],
  );
  const existingResult = useMemo(
    () => results.find((item) => item.route_id === routeId) ?? null,
    [results, routeId],
  );

  useEffect(() => {
    if (existingResult) {
      setSelectedOption(
        existingResult.flash && existingResult.points === 10
          ? "flash"
          : ((existingResult.points ?? 0) as PointsOption),
      );
      setRating(existingResult.rating ?? null);
      setFeedback(existingResult.feedback ?? "");
      return;
    }

    setSelectedOption(0);
    setRating(null);
    setFeedback("");
  }, [existingResult, routeId]);

  const routeMeta = useMemo(() => {
    if (!route) return null;
    const secondary = route.grade_range || (route.discipline === "lead" ? "Vorstieg" : "Toprope");
    return { title: route.name || route.code, secondary };
  }, [route]);

  const ratingLabel = rating !== null ? `${rating.toFixed(1)} / 5` : "-- / 5";

  const handleSave = async () => {
    if (!profile?.id || !routeId) return;

    if (!hasOfficialMasterRedemption) {
      toast({
        title: "Mastercode fehlt",
        description: "Du musst zuerst deinen Mastercode einlösen, bevor du Ergebnisse eintragen kannst.",
        variant: "destructive",
      });
      return;
    }

    if (!codeRedeemed) {
      toast({
        title: "Halle nicht freigeschaltet",
        description: "Du musst zuerst einen Hallencode einlösen, bevor du Ergebnisse eintragen kannst.",
        variant: "destructive",
      });
      return;
    }

    const points = selectedOption === "flash" ? 10 : selectedOption;
    const flash = selectedOption === "flash";

    setLoading(true);
    const { error } = await upsertResult({
      profile_id: profile.id,
      route_id: routeId,
      points,
      flash,
      status: points === 0 ? "not_climbed" : "climbed",
      rating,
      feedback: feedback.trim() || null,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: participantQueryKeys.competitionData }),
      queryClient.invalidateQueries({
        queryKey: participantQueryKeys.userResults(profile.id),
      }),
      gymId
        ? queryClient.invalidateQueries({
            queryKey: participantQueryKeys.gymDetail(gymId, profile.id),
          })
        : Promise.resolve(),
    ]);

    toast({
      title: "Ergebnis gespeichert",
      description: "Dein Ergebnis wurde erfolgreich aktualisiert.",
      variant: "success",
    });
    navigate(`/app/gyms/${gymId}/routes`);
  };

  if (pageLoading) {
    return (
      <ParticipantStateCard
        title="Ergebnisformular lädt"
        description="Die Route und dein bisheriger Eintrag werden gerade vorbereitet."
      />
    );
  }

  if (error) {
    return <ParticipantStateCard title="Ergebnisformular nicht verfügbar" description={error} />;
  }

  if (!route) {
    return (
      <StitchCard tone="navy" className="mx-4 mt-6 p-6">
        <div className="stitch-headline text-2xl text-[#f2dcab]">Route nicht gefunden</div>
        <p className="mt-3 text-sm leading-6 text-[rgba(242,220,171,0.72)]">
          Für diese Route konnten keine Details geladen werden.
        </p>
      </StitchCard>
    );
  }

  if (!hasOfficialMasterRedemption) {
    return (
      <div className="px-4 pt-6">
        <StitchCard tone="cream" className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(161,85,35,0.12)] text-[#a15523]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="stitch-kicker text-[#a15523]">Teilnahme fehlt</div>
                <div className="stitch-headline mt-2 text-3xl text-[#002637]">Mastercode zuerst einlösen</div>
                <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.66)]">
                  Deine Ergebnisse zählen erst nach der offiziellen Freischaltung. Löse zuerst deinen Mastercode ein.
                </p>
              </div>

              <StitchButton asChild size="sm">
                <Link to="/app/participation/redeem">Zum Mastercode</Link>
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      </div>
    );
  }

  if (!codeRedeemed) {
    return (
      <div className="px-4 pt-6">
        <StitchCard tone="cream" className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(161,85,35,0.12)] text-[#a15523]">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="stitch-kicker text-[#a15523]">Aktuelle Route</div>
                <div className="stitch-headline mt-2 text-3xl text-[#002637]">Punkte eintragen</div>
                <p className="mt-3 text-sm leading-6 text-[rgba(27,28,26,0.66)]">
                  Diese Halle ist noch gesperrt. Löse zuerst den Hallencode ein, bevor du ein Ergebnis für {route.code}
                  {" "}speichern kannst.
                </p>
              </div>

              <StitchButton asChild size="sm">
                <Link to={`/app/gyms/redeem?gymId=${encodeURIComponent(gymId ?? "")}`}>Code einlösen</Link>
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden px-2 pt-3">
      <div className="absolute right-[-5rem] top-[-4rem] h-52 w-52 rounded-full bg-[rgba(161,85,35,0.12)] blur-3xl" />
      <div className="absolute bottom-[-8rem] left-[-8rem] h-72 w-72 rounded-full bg-[rgba(0,38,55,0.22)] blur-3xl" />

      <div className="relative mx-auto w-full max-w-[24rem]">
        <StitchCard
          tone="surface"
          className="rounded-xl border-b-[4px] border-[rgba(161,85,35,0.18)] px-5 pb-6 pt-6 shadow-[0_28px_56px_rgba(0,0,0,0.2)] sm:px-6 sm:pt-7"
        >
          <div className="space-y-8">
            <section className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#a15523]">Aktuelle Route</div>
                <div className="font-['Space_Grotesk'] text-[2.9rem] font-bold uppercase leading-[0.84] tracking-[-0.07em] text-[#002637]">
                  Punkte
                  <br />
                  eintragen
                </div>
                <div className="text-[1.02rem] font-medium text-[rgba(0,38,55,0.76)]">
                  {routeMeta?.title}
                  <span className="mx-2 text-[rgba(0,38,55,0.28)]">|</span>
                  {routeMeta?.secondary}
                </div>
              </div>

              <div className="rounded-xl bg-[#ffdbc9] px-4 py-3 font-['Space_Grotesk'] text-[1.9rem] font-bold leading-none tracking-[-0.05em] text-[#331200]">
                {route.code}
              </div>
            </section>

            <section>
              <div className="text-[0.86rem] font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.52)]">
                Punkte auswählen
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {POINTS_OPTIONS.map((option) => {
                  const isActive = selectedOption === option.value;

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => setSelectedOption(option.value)}
                      className={cn(
                        "rounded-xl border-2 px-2 py-4 text-center transition-all active:scale-[0.98]",
                        isActive
                          ? "border-[#002637] bg-[#002637] text-white shadow-[0_16px_24px_rgba(0,38,55,0.18)]"
                          : "border-transparent bg-[#f5f3f0] text-[#002637] hover:border-[rgba(0,38,55,0.12)] hover:bg-[#efeeeb]",
                      )}
                    >
                      <div
                        className={cn(
                          "text-[0.68rem] font-bold uppercase tracking-[0.08em]",
                          isActive ? "text-white/70" : "text-[rgba(0,38,55,0.44)]",
                        )}
                      >
                        {option.eyebrow}
                      </div>
                      <div className="mt-2 font-['Space_Grotesk'] text-[1.75rem] font-bold leading-none tracking-[-0.05em]">
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="text-[0.86rem] font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.52)]">
                Routenqualität
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[rgba(113,120,125,0.18)] bg-white px-4 py-4">
                <div className="max-w-[12.5rem] flex-1">
                  <StarRating value={rating} onChange={setRating} size="lg" />
                </div>
                <div className="font-['Space_Grotesk'] text-[1.45rem] font-bold tracking-[-0.04em] text-[#002637]">
                  {ratingLabel}
                </div>
              </div>
            </section>

            <section>
              <div className="text-[0.86rem] font-bold uppercase tracking-[0.22em] text-[rgba(0,38,55,0.52)]">
                Feedback & Kommentare
              </div>
              <div className="relative mt-4">
                <div className="rounded-t-xl bg-[#f5f3f0] px-4 pb-6 pt-4">
                  <Textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    rows={4}
                    placeholder="Wie war der Grip? Schwierigkeit passend?"
                    className="min-h-28 resize-none border-0 border-b-2 border-[rgba(113,120,125,0.38)] bg-transparent px-0 py-0 text-base text-[#002637] shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[rgba(113,120,125,0.52)]"
                  />
                </div>
                <div className="absolute bottom-2 right-4 text-[0.56rem] font-bold uppercase tracking-[0.22em] text-[rgba(113,120,125,0.62)]">
                  Optional
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex h-[4.5rem] w-full items-center justify-between rounded-xl bg-[#a15523] px-5 text-left font-['Space_Grotesk'] text-[1.1rem] font-bold uppercase tracking-[0.14em] text-[#f2dcab] shadow-[0_18px_28px_rgba(161,85,35,0.22)] transition-colors hover:bg-[#8f4b20] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? "Speichern..." : "Ergebnis speichern"}</span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#a15523]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </button>

              <p className="text-center text-[0.56rem] font-bold uppercase tracking-[0.2em] text-[rgba(113,120,125,0.74)]">
                Dein Ergebnis wird direkt gespeichert.
              </p>
            </section>
          </div>
        </StitchCard>
      </div>
    </div>
  );
};

export default ResultEntry;
