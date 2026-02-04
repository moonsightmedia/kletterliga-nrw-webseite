import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { listRoutesByGym, upsertResult } from "@/services/appApi";
import { useAuth } from "@/app/auth/AuthProvider";
import type { Route } from "@/services/appTypes";

const pointsOptions = [0, 2.5, 5, 7.5, 10];

const ResultEntry = () => {
  const { gymId, routeId } = useParams();
  const { profile } = useAuth();
  const [route, setRoute] = useState<Route | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [flash, setFlash] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymId || !routeId) return;
    listRoutesByGym(gymId).then(({ data }) => {
      const found = data?.find((item) => item.id === routeId) ?? null;
      setRoute(found);
    });
  }, [gymId, routeId]);

  const handleSave = async () => {
    if (!profile?.id || !routeId) return;
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
    toast({ title: "Ergebnis gespeichert", description: "Dein Punktestand wurde aktualisiert." });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-2xl text-primary">Ergebnis eintragen</h2>
        <p className="text-sm text-muted-foreground">
          {route ? `${route.code} · ${route.grade_range || "UIAA-Bereich"}` : "Route auswählen"}
        </p>
      </div>

      <Card className="p-4 border-border/60">
        <div className="text-xs uppercase tracking-widest text-secondary mb-3">Ergebnis</div>
        <div className="grid grid-cols-2 gap-3">
          {pointsOptions.map((value) => (
            <Button
              key={value}
              variant={points === value ? "default" : "outline"}
              size="sm"
              onClick={() => setPoints(value)}
              type="button"
            >
              <span className="skew-x-6">{value} Punkte</span>
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-primary">Flash-Bonus</div>
            <div className="text-xs text-muted-foreground">Ein Versuch, sofort Top.</div>
          </div>
          <button
            type="button"
            onClick={() => setFlash((prev) => !prev)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border ${
              flash ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-foreground/70"
            }`}
          >
            {flash ? "Flash aktiviert" : "Flash?"}
          </button>
        </div>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={loading}>
        {loading ? "Speichern..." : "Ergebnis speichern"}
      </Button>
    </div>
  );
};

export default ResultEntry;
