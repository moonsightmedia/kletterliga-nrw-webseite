import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { useSeasonSettings } from "@/services/seasonSettings";
import { useAuth } from "@/app/auth/AuthProvider";
import { registerForFinale, unregisterFromFinale, getFinaleRegistration } from "@/services/appApi";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";

const Finale = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getSeasonYear, getFinaleDate, getQualificationEnd, getFinaleRegistrationDeadline, getFinaleEnabled, loading } = useSeasonSettings();
  const seasonYear = getSeasonYear();
  const finaleDate = getFinaleDate();
  const qualEnd = getQualificationEnd();
  const registrationDeadline = getFinaleRegistrationDeadline();
  const finaleEnabled = getFinaleEnabled();
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!loading && !finaleEnabled) {
      // Weiterleitung zur Home-Seite, wenn Finale nicht aktiviert ist
      navigate("/app", { replace: true });
    }
  }, [loading, finaleEnabled, navigate]);

  useEffect(() => {
    const checkRegistration = async () => {
      if (!profile?.id || !finaleEnabled) {
        setCheckingRegistration(false);
        return;
      }
      setCheckingRegistration(true);
      const { data } = await getFinaleRegistration(profile.id);
      setIsRegistered(!!data);
      setCheckingRegistration(false);
    };
    checkRegistration();
  }, [profile?.id, finaleEnabled]);

  const formatDate = (date: string | null) => {
    if (!date) return "Termin folgt";
    return new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // Zeige nichts, wenn noch geladen wird oder Finale nicht aktiviert ist
  if (loading || !finaleEnabled) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-headline text-2xl text-primary">Finale {seasonYear}</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "Lade..." : "Das Finale ist noch nicht freigeschaltet."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-2xl text-primary">Finale {seasonYear}</h2>
        <p className="text-sm text-muted-foreground">
          Alle Infos zum Finalevent und zur Anmeldung.
        </p>
      </div>

      <Card className="p-5 border-border/60 space-y-3">
        <div className="text-xs uppercase tracking-widest text-secondary">Termin</div>
        <div className="text-lg font-semibold text-primary">{formatDate(finaleDate)}</div>
        <p className="text-sm text-muted-foreground">
          Finale der Kletterliga NRW. Qualifikation endet am {formatDate(qualEnd)}.
        </p>
      </Card>

      {registrationDeadline && (
        <Card className="p-5 border-border/60 space-y-3">
          <div className="text-xs uppercase tracking-widest text-secondary">Anmeldeschluss</div>
          <div className="text-lg font-semibold text-primary">{formatDate(registrationDeadline)}</div>
        </Card>
      )}
      <Card className="p-5 border-border/60 space-y-3">
        <div className="text-xs uppercase tracking-widest text-secondary">Anmeldung</div>
        {checkingRegistration ? (
          <p className="text-sm text-muted-foreground">Prüfe Anmeldestatus...</p>
        ) : isRegistered ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Angemeldet
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Du bist für das Finale angemeldet. Wir freuen uns auf dich!
            </p>
            <Button
              variant="outline"
              className="w-full"
              disabled={registering}
              onClick={async () => {
                if (!profile?.id) return;
                setRegistering(true);
                const { error } = await unregisterFromFinale(profile.id);
                setRegistering(false);
                if (error) {
                  toast({ title: "Fehler", description: error.message });
                  return;
                }
                setIsRegistered(false);
                toast({ title: "Abgemeldet", description: "Du hast dich vom Finale abgemeldet." });
              }}
            >
              <X className="h-4 w-4 mr-2" />
              <span className="skew-x-6">{registering ? "Abmelden..." : "Vom Finale abmelden"}</span>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Melde dich hier für das Finale an.
            </p>
            <Button
              className="w-full"
              disabled={registering || !profile?.id}
              onClick={async () => {
                if (!profile?.id) return;
                setRegistering(true);
                const { error } = await registerForFinale(profile.id);
                setRegistering(false);
                if (error) {
                  toast({ title: "Fehler", description: error.message });
                  return;
                }
                setIsRegistered(true);
                toast({ title: "Angemeldet", description: "Du hast dich erfolgreich für das Finale angemeldet!" });
              }}
            >
              <span className="skew-x-6">{registering ? "Anmelden..." : "Finale anmelden"}</span>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default Finale;
