import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Lock, MessageSquareText, Star, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/app/auth/AuthProvider";
import { StitchBadge, StitchButton, StitchCard } from "@/app/components/StitchPrimitives";
import { checkGymCodeRedeemed, listResultsForUser, listRoutesByGym, upsertResult } from "@/services/appApi";
import type { Result, Route } from "@/services/appTypes";

const colorClassMap: Record<string, string> = {
  rot: "bg-red-500",
  blau: "bg-blue-500",
  gelb: "bg-yellow-400",
  grün: "bg-green-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  lila: "bg-purple-500",
  schwarz: "bg-black",
  weiß: "bg-white border border-[rgba(0,38,55,0.12)]",
  grau: "bg-gray-400",
};

type PointsOption = 0 | 2.5 | 5 | 7.5 | 10 | "flash";

const POINTS_OPTIONS: PointsOption[] = [0, 2.5, 5, 7.5, 10, "flash"];

const ResultEntry = () => {
  const { gymId, routeId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [route, setRoute] = useState<Route | null>(null);
  const [existingResult, setExistingResult] = useState<Result | null>(null);
  const [selectedOption, setSelectedOption] = useState<PointsOption>(0);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeRedeemed, setCodeRedeemed] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(true);

  const colorClass = useMemo(() => {
    if (!route?.color) return "bg-[rgba(0,38,55,0.12)]";
    return colorClassMap[route.color.toLowerCase()] ?? "bg-[rgba(0,38,55,0.12)]";
  }, [route?.color]);

  useEffect(() => {
    if (!gymId || !routeId || !profile?.id) return;

    checkGymCodeRedeemed(gymId, profile.id).then(({ data, error }) => {
      setCheckingCode(false);
      if (error) {
        console.error("Error checking code:", error);
        setCodeRedeemed(false);
      } else {
        setCodeRedeemed(Boolean(data));
      }
    });

    listRoutesByGym(gymId).then(({ data }) => {
      const found = data?.find((item) => item.id === routeId) ?? null;
      setRoute(found);
    });

    listResultsForUser(profile.id).then(({ data }) => {
      const result = data?.find((item) => item.route_id === routeId) ?? null;
      setExistingResult(result);
      if (result) {
        if (result.flash && result.points === 10) {
          setSelectedOption("flash");
        } else {
          setSelectedOption((result.points ?? 0) as PointsOption);
        }
        setRating(result.rating ?? null);
        setFeedback(result.feedback ?? "");
      }
    });
  }, [gymId, routeId, profile?.id]);

  const handleSave = async () => {
    if (!profile?.id || !routeId) return;

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
      feedback: feedback || null,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }

    toast({
      title: "Ergebnis gespeichert",
      description: flash ? "Top mit Flash-Bonus gespeichert." : "Dein Ergebnis wurde aktualisiert.",
      variant: "success",
    });
    navigate(`/app/gyms/${gymId}/routes`);
  };

  const pageTitle = existingResult ? "Ergebnis bearbeiten" : "Ergebnis eintragen";
  const pointsLabel = selectedOption === "flash" ? 11 : selectedOption;

  if (checkingCode) {
    return <div className="text-sm text-[rgba(27,28,26,0.6)]">Ergebnisformular wird geladen...</div>;
  }

  if (!codeRedeemed) {
    return (
      <div className="space-y-5">
        {route ? (
          <StitchCard tone="navy" className="p-5">
            <div className="flex items-start gap-4">
              <div className={`mt-1 h-10 w-10 rounded-[0.9rem] ${colorClass}`} />
              <div className="space-y-2">
                <div className="stitch-headline text-2xl text-[#f2dcab]">{route.code}</div>
                <div className="text-sm text-[rgba(242,220,171,0.72)]">
                  {(route.name || "Route") + (route.grade_range ? ` • ${route.grade_range}` : "")}
                </div>
              </div>
            </div>
          </StitchCard>
        ) : null}

        <StitchCard tone="cream" className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(161,85,35,0.1)] text-[#a15523]">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xl font-semibold text-[#002637]">Halle noch gesperrt</div>
                <p className="mt-1 text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                  Du brauchst zuerst einen Hallencode, bevor du ein Ergebnis für diese Route speichern kannst.
                </p>
              </div>
              <StitchButton asChild size="sm">
                <Link to="/app/gyms/redeem">Code einlösen</Link>
              </StitchButton>
            </div>
          </div>
        </StitchCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {route ? (
        <StitchCard tone="navy" className="p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StitchBadge tone="cream">{pageTitle}</StitchBadge>
                {route.grade_range ? <StitchBadge tone="ghost">{route.grade_range}</StitchBadge> : null}
                <StitchBadge tone="ghost">{route.discipline === "lead" ? "Vorstieg" : "Toprope"}</StitchBadge>
              </div>

              <div className="flex items-start gap-4">
                <div className={`mt-1 h-12 w-12 rounded-[1rem] ${colorClass}`} />
                <div>
                  <div className="stitch-headline text-4xl text-[#f2dcab]">{route.code}</div>
                  <p className="mt-2 text-sm leading-6 text-[rgba(242,220,171,0.72)]">
                    {(route.name || "Route") + (route.setter ? ` • gesetzt von ${route.setter}` : "")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-[rgba(242,220,171,0.12)] bg-[rgba(242,220,171,0.08)] p-4 text-right">
              <div className="stitch-kicker text-[rgba(242,220,171,0.62)]">Aktuelle Wertung</div>
              <div className="stitch-metric mt-3 text-5xl text-[#f2dcab]">{pointsLabel}</div>
              <p className="mt-2 text-sm text-[rgba(242,220,171,0.72)]">Punkte</p>
            </div>
          </div>
        </StitchCard>
      ) : null}

      <StitchCard tone="surface" className="p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <div className="stitch-kicker text-[#a15523]">Ergebnis</div>
            <div className="mt-2 text-lg font-semibold text-[#002637]">Wähle deinen erreichten Status</div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {POINTS_OPTIONS.map((value) => {
              const active = selectedOption === value;
              const label = value === "flash" ? "Flash" : `${value} Punkte`;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedOption(value)}
                  className={cn(
                    "rounded-[1.1rem] border px-4 py-4 text-left transition-all",
                    active
                      ? "border-[#a15523] bg-[#a15523] text-white shadow-[0_14px_24px_rgba(161,85,35,0.24)]"
                      : "border-[rgba(0,38,55,0.08)] bg-[#f5efe5] text-[#003d55] hover:bg-[#ece2d3]",
                  )}
                >
                  <div className="stitch-headline text-lg">{value === "flash" ? "11" : value}</div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-[0.22em]">{label}</div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <StitchCard tone="muted" className="p-4">
              <div className="flex items-start gap-3">
                <Zap className="mt-0.5 h-5 w-5 text-[#a15523]" />
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-[#002637]">Punkte-Logik</div>
                  <p className="text-sm leading-6 text-[rgba(27,28,26,0.64)]">
                    Flash wird intern als Top mit Bonus gespeichert. Alle anderen Auswahlstufen bleiben unverändert.
                  </p>
                </div>
              </div>
            </StitchCard>

            {existingResult?.feedback ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(161,85,35,0.08)] px-4 py-2 text-sm font-semibold text-[#a15523]">
                <CheckCircle2 className="h-4 w-4" />
                Feedback vorhanden
              </div>
            ) : null}
          </div>
        </div>
      </StitchCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <StitchCard tone="surface" className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Bewertung</div>
              <div className="mt-2 text-lg font-semibold text-[#002637]">Wie hat sich die Route angefühlt?</div>
            </div>
            <div className="rounded-[1.2rem] bg-[#f5efe5] p-4">
              <StarRating value={rating} onChange={setRating} size="md" />
              <div className="mt-3 flex items-center gap-2 text-sm text-[rgba(27,28,26,0.64)]">
                <Star className="h-4 w-4 text-[#a15523]" />
                Optional, aber hilfreich für spätere Auswertungen.
              </div>
            </div>
          </div>
        </StitchCard>

        <StitchCard tone="cream" className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <div className="stitch-kicker text-[#a15523]">Feedback</div>
              <div className="mt-2 text-lg font-semibold text-[#002637]">Hinweis zur Route ergänzen</div>
            </div>

            <p className="text-sm leading-6 text-[rgba(27,28,26,0.68)]">
              Wenn dir etwas an der Route aufgefallen ist, kannst du dein Feedback direkt mit dem Ergebnis speichern.
            </p>

            <StitchButton type="button" variant="navy" size="sm" onClick={() => setShowFeedbackDialog(true)}>
              <MessageSquareText className="h-4 w-4" />
              {existingResult?.feedback ? "Feedback bearbeiten" : "Feedback hinzufügen"}
            </StitchButton>
          </div>
        </StitchCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <StitchButton asChild variant="outline">
          <Link to={`/app/gyms/${gymId}/routes`}>Abbrechen</Link>
        </StitchButton>
        <StitchButton type="button" onClick={handleSave} disabled={loading}>
          {loading ? "Speichern..." : existingResult ? "Änderungen speichern" : "Ergebnis speichern"}
        </StitchButton>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback zur Route</DialogTitle>
            <DialogDescription>
              Teile mit, ob etwas nicht gepasst hat oder dir beim Klettern aufgefallen ist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="feedback">Dein Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Beschreibe kurz dein Feedback zur Route..."
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <StitchButton type="button" variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Schließen
            </StitchButton>
            <StitchButton
              type="button"
              onClick={() => {
                setShowFeedbackDialog(false);
                toast({
                  title: "Feedback übernommen",
                  description: "Dein Hinweis wird zusammen mit dem Ergebnis gespeichert.",
                });
              }}
            >
              <AlertTriangle className="h-4 w-4" />
              Feedback übernehmen
            </StitchButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default ResultEntry;
