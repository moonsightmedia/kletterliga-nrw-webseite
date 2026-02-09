import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { listRoutesByGym, upsertResult, checkGymCodeRedeemed, listResultsForUser } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Route, Result } from "@/services/appTypes";
import { Lock, AlertCircle } from "lucide-react";

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
    });
    setLoading(false);
    if (error) {
      toast({ title: "Fehler", description: error.message });
      return;
    }
    toast({ title: "Ergebnis gespeichert", description: flash ? "Top mit Flash-Bonus gespeichert!" : "Dein Punktestand wurde aktualisiert." });
    navigate(`/app/gyms/${gymId}/routes`);
  };

  if (checkingCode) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-headline text-2xl text-primary">Ergebnis eintragen</h2>
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
      </Card>

      <Button className="w-full md:w-auto md:mx-auto md:block" size="lg" onClick={handleSave} disabled={loading}>
        {loading ? "Speichern..." : selectedOption === "flash" ? "Top mit Flash speichern" : "Ergebnis speichern"}
      </Button>
    </div>
  );
};

export default ResultEntry;
