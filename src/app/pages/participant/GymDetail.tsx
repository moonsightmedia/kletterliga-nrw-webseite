import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getGym } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";

const GymDetail = () => {
  const { gymId } = useParams();
  const [gym, setGym] = useState<Gym | null>(null);

  useEffect(() => {
    if (!gymId) return;
    getGym(gymId).then(({ data }) => setGym(data ?? null));
  }, [gymId]);

  if (!gym) {
    return <div className="text-muted-foreground">Halle wird geladen…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-2xl text-primary">{gym.name}</h2>
        <p className="text-sm text-muted-foreground">{gym.city}</p>
      </div>

      <Card className="p-4 space-y-2 border-border/60">
        <div className="text-sm text-muted-foreground">Adresse</div>
        <div className="text-sm text-foreground">{gym.address || "Adresse folgt"}</div>
        <div className="text-sm text-muted-foreground mt-2">Öffnungszeiten</div>
        <div className="text-sm text-foreground">Mo–So · 9–22 Uhr (Platzhalter)</div>
        {gym.website && (
          <a href={gym.website} className="text-sm text-primary underline-offset-4 hover:underline">
            Hallen-Webseite
          </a>
        )}
      </Card>

      <div className="grid gap-3">
        <Button asChild>
          <Link to={`/app/gyms/${gym.id}/redeem`}>
            <span className="skew-x-6">Code einlösen</span>
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to={`/app/gyms/${gym.id}/routes`}>
            <span className="skew-x-6">Routen & Ergebnisse</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default GymDetail;
