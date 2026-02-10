import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/services/supabase";
import { toast } from "@/components/ui/use-toast";

// Übersetze Supabase-Fehlermeldungen ins Deutsche
const translateAuthError = (errorMessage: string): string => {
  const errorLower = errorMessage.toLowerCase();
  
  if (errorLower.includes("token") || errorLower.includes("expired") || errorLower.includes("invalid")) {
    if (errorLower.includes("expired")) {
      return "Der Link ist abgelaufen. Bitte fordere einen neuen Link an.";
    }
    return "Ungültiger Link. Bitte fordere einen neuen Link an.";
  }
  
  if (errorLower.includes("password")) {
    if (errorLower.includes("too short") || errorLower.includes("minimum")) {
      return "Das Passwort ist zu kurz. Es muss mindestens 6 Zeichen lang sein.";
    }
    if (errorLower.includes("weak") || errorLower.includes("strength")) {
      return "Das Passwort ist zu schwach. Bitte wähle ein stärkeres Passwort.";
    }
  }
  
  if (errorLower.includes("network") || errorLower.includes("fetch") || errorLower.includes("connection")) {
    return "Verbindungsfehler. Bitte überprüfe deine Internetverbindung und versuche es erneut.";
  }
  
  return errorMessage || "Fehler beim Zurücksetzen des Passworts.";
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Prüfe, ob ein Token vorhanden ist
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    
    if (!token || type !== "recovery") {
      setIsValidToken(false);
    } else {
      setIsValidToken(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Die Passwörter stimmen nicht überein.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Fehler",
        description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        const translatedError = translateAuthError(error.message);
        toast({
          title: "Fehler",
          description: translatedError,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Erfolg",
        description: "Dein Passwort wurde erfolgreich zurückgesetzt.",
        variant: "success",
      });

      // Weiterleitung zum Login nach 2 Sekunden
      setTimeout(() => {
        navigate("/app/login?password_reset=true", { replace: true });
      }, 2000);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-3xl text-primary">Passwort zurücksetzen</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Prüfe den Link...
          </p>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-3xl text-primary">Ungültiger Link</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Der Passwort-Reset-Link ist ungültig oder abgelaufen.
          </p>
          <div className="mt-4 space-y-2">
            <Button
              onClick={() => navigate("/app/login")}
              variant="outline"
              className="w-full"
            >
              Zum Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Passwort zurücksetzen</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Bitte gib ein neues Passwort ein.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Neues Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Wird gespeichert..." : "Passwort zurücksetzen"}
        </Button>
      </form>
    </div>
  );
};

export default ResetPassword;
