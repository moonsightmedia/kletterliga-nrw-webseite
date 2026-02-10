import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { listRoutesByGym, upsertResult, checkGymCodeRedeemed, listResultsForUser } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Route, Result } from "@/services/appTypes";
import { Lock, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

const colorClassMap: Record<string, string> = {
  rot: "bg-red-500",
  blau: "bg-blue-500",
  gelb: "bg-yellow-400",
  grün: "bg-green-500",
  orange: "bg-orange-500",
  pink: "bg-pink-500",
  lila: "bg-purple-500",
  schwarz: "bg-black",
  weiß: "bg-white",
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
  const [feedback, setFeedback] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeRedeemed, setCodeRedeemed] = useState<boolean | null>(null);
  const [checkingCode, setCheckingCode] = useState(true);

  const colorClass = useMemo(() => {
    if (!route?.color) return "bg-muted";
    const colorKey = route.color.toLowerCase();
    return colorClassMap[colorKey] ?? "bg-muted";
  }, [route?.color]);

  useEffect(() => {
    if (!gymId || !routeId || !profile?.id) return;
    
    // Prüfe, ob ein Code für diese Halle eingelöst wurde
    checkGymCodeRedeemed(gymId, profile.id).then(({ data, error }) => {
      setCheckingCode(false);
      if (error) {
        console.error("Error checking code:", error);
        setCodeRedeemed(false);
      } else {
        setCodeRedeemed(data !== null);
      }
    });

    listRoutesByGym(gymId).then(({ data }) => {
      const found = data?.find((item) => item.id === routeId) ?? null;
      setRoute(found);
    });

    // Lade bestehendes Ergebnis für diese Route
    listResultsForUser(profile.id).then(({ data }) => {
      const result = data?.find((r) => r.route_id === routeId) ?? null;
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
    
    // Prüfe erneut, ob Code eingelöst wurde
    if (!codeRedeemed) {
      toast({ 
        title: "Halle nicht freigeschaltet", 
        description: "Du musst zuerst einen Hallen-Code einlösen, bevor du Ergebnisse eintragen kannst.",
        variant: "destructive"
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
      rating: rating,
      feedback: feedback || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    toast({ title: "Ergebnis gespeichert", description: flash ? "Top mit Flash-Bonus gespeichert!" : "Dein Punktestand wurde aktualisiert." });
    navigate(`/app/gyms/${gymId}/routes`);
  };

  const pageTitle = existingResult ? "Ergebnis bearbeiten" : "Ergebnis eintragen";

  if (checkingCode) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-headline text-2xl text-primary">{pageTitle}</h2>
          <p className="text-sm text-muted-foreground">Lade...</p>
        </div>
      </div>
    );
  }

  if (!codeRedeemed) {
    return (
      <div className="space-y-5">
        {route && (
          <Card className="p-5 border-border/60">
            <div className="flex items-start gap-4">
              {route.color && (
                <div className={`h-6 w-6 rounded-full ${colorClass} border-2 border-border/50 flex-shrink-0 mt-1`} />
              )}
              <div className="flex-1">
                <div className="font-headline text-xl text-primary mb-1">
                  {route.code} {route.name && `· ${route.name}`}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {route.color && <div>Farbe: {route.color}</div>}
                  {route.setter && <div>Routenschrauber: {route.setter}</div>}
                  {route.grade_range && <div>Schwierigkeit: {route.grade_range}</div>}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 border-2 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-destructive mb-1">Halle nicht freigeschaltet</h3>
                <p className="text-sm text-muted-foreground">
                  Du musst zuerst einen Hallen-Code einlösen, bevor du Ergebnisse für diese Halle eintragen kannst.
                </p>
              </div>
              <Button asChild variant="default" className="w-full sm:w-auto">
                <Link to="/app/gyms/redeem">
                  Code einlösen
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 max-w-2xl mx-auto">
      {route && (
        <Card className="p-5 md:p-6 lg:p-8 border-border/60">
          <div className="flex items-start gap-4 md:gap-6">
            {route.color && (
              <div className={`h-6 w-6 md:h-8 md:w-8 rounded-full ${colorClass} border-2 border-border/50 flex-shrink-0 mt-1`} />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="font-headline text-xl md:text-2xl lg:text-3xl text-primary">
                  {route.code} {route.name && `· ${route.name}`}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-2xl md:text-3xl font-bold text-secondary">
                    {selectedOption === "flash" ? 11 : selectedOption}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground">Punkte</div>
                </div>
              </div>
              <div className="text-sm md:text-base text-muted-foreground space-y-1">
                {route.color && <div>Farbe: {route.color}</div>}
                {route.setter && <div>Routenschrauber: {route.setter}</div>}
                {route.grade_range && <div>Schwierigkeit: {route.grade_range}</div>}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 md:p-6 lg:p-8 border-border/60">
        <div className="text-xs md:text-sm uppercase tracking-widest text-secondary mb-3 md:mb-4">Ergebnis</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {POINTS_OPTIONS.map((value) => (
            <Button
              key={value}
              variant={selectedOption === value ? "default" : "outline"}
              size="sm"
              className="md:text-base"
              onClick={() => setSelectedOption(value)}
              type="button"
            >
              <span className="skew-x-6">
                {value === "flash" ? "Flash (11 Pkt)" : `${value} Punkte`}
              </span>
            </Button>
          ))}
        </div>
        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border/60">
          <div className="text-xs md:text-sm uppercase tracking-widest text-secondary mb-3">Bewertung</div>
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>
        {existingResult?.feedback && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Feedback bereits eingereicht</span>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button className="w-full sm:flex-1" size="lg" onClick={handleSave} disabled={loading}>
          {loading 
            ? "Speichern..." 
            : existingResult 
              ? "Änderungen speichern"
              : selectedOption === "flash" 
                ? "Top mit Flash speichern" 
                : "Ergebnis speichern"}
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => setShowFeedbackDialog(true)}
          className="w-full sm:w-auto relative"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          {existingResult?.feedback ? "Feedback bearbeiten" : "Feedback geben"}
          {existingResult?.feedback && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              Vorhanden
            </Badge>
          )}
        </Button>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-2xl flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">Feedback zur Route</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Hast du ein Problem mit dieser Route bemerkt oder etwas, das gestört hat? Teile uns dein Feedback mit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 py-4 min-h-0">
            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-sm">Dein Feedback</Label>
              <Textarea
                id="feedback"
                placeholder="Beschreibe das Problem oder was dich gestört hat..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                className="resize-none text-sm sm:text-base min-h-[120px] sm:min-h-[140px] focus-visible:ring-offset-0 focus-visible:ring-inset"
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 flex-col gap-2 sm:flex-row sm:gap-2 pt-2 sm:pt-0 pb-safe sm:pb-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFeedbackDialog(false);
                // Setze Feedback zurück auf den ursprünglichen Wert, falls vorhanden
                if (existingResult?.feedback) {
                  setFeedback(existingResult.feedback);
                } else {
                  setFeedback("");
                }
              }}
              className="w-full sm:w-auto"
            >
              Abbrechen
            </Button>
            <Button 
              onClick={() => {
                setShowFeedbackDialog(false);
                toast({
                  title: "Feedback gespeichert",
                  description: "Dein Feedback wird zusammen mit dem Ergebnis gespeichert.",
                });
              }}
              className="w-full sm:w-auto"
            >
              Feedback speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultEntry;
