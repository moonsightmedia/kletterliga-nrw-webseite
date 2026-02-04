import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/app/auth/AuthProvider";

const AdminHome = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  // Automatische Weiterleitung für Gym Admins
  useEffect(() => {
    if (role === "gym_admin") {
      navigate("/app/admin/gym", { replace: true });
    }
  }, [role, navigate]);

  // Wenn Gym Admin, zeige nichts (wird weitergeleitet)
  if (role === "gym_admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Admin-Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {role === "league_admin" ? "Liga-Übersicht" : "Hallen-Übersicht"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Teilnehmer</div>
          <div className="font-headline text-2xl text-primary mt-2">1.248</div>
          <p className="text-xs text-muted-foreground mt-1">Gesamt aktive Nutzer</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Hallen</div>
          <div className="font-headline text-2xl text-primary mt-2">28</div>
          <p className="text-xs text-muted-foreground mt-1">Aktive Partnerhallen</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Ergebnisse</div>
          <div className="font-headline text-2xl text-primary mt-2">9.420</div>
          <p className="text-xs text-muted-foreground mt-1">Einträge diese Saison</p>
        </Card>
      </div>
    </div>
  );
};

export default AdminHome;
