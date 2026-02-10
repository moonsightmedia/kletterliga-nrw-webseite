import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/services/supabase";

const EmailConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMagicLink, setIsMagicLink] = useState(false);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      // Prüfe, ob es ein Magic Link ist (type=magiclink) oder E-Mail-Bestätigung (type=signup)
      const type = searchParams.get("type");
      setIsMagicLink(type === "magiclink");

      // Supabase fügt die Token-Parameter automatisch zur URL hinzu
      // Wir müssen die Session aktualisieren, nachdem der Token verarbeitet wurde
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setStatus("error");
          setErrorMessage("Fehler beim Bestätigen der E-Mail. Bitte versuche es erneut.");
          return;
        }

        if (data.session) {
          // Session wurde erfolgreich erstellt - E-Mail wurde bestätigt oder Magic Link wurde verwendet
          setStatus("success");
          // Weiterleitung zum Login mit Bestätigungsnachricht
          setTimeout(() => {
            navigate("/app/login?confirmed=true", { replace: true });
          }, 2000);
        } else {
          // Keine Session - Token könnte abgelaufen sein oder bereits verwendet worden sein
          setStatus("error");
          setErrorMessage("Der Bestätigungslink ist ungültig oder bereits verwendet worden. Bitte fordere einen neuen Link an.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setStatus("error");
        setErrorMessage("Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.");
      }
    };

    handleEmailConfirmation();
  }, [navigate, searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">
          {isMagicLink ? "Magic Link Login" : "E-Mail-Bestätigung"}
        </h1>
        {status === "loading" && (
          <p className="text-sm text-muted-foreground mt-2">
            {isMagicLink ? "Melde dich an..." : "Bestätige deine E-Mail-Adresse..."}
          </p>
        )}
        {status === "success" && (
          <div className="mt-4">
            <p className="text-sm text-green-600 dark:text-green-400">
              {isMagicLink 
                ? "✓ Du wurdest erfolgreich angemeldet!" 
                : "✓ Deine E-Mail-Adresse wurde erfolgreich bestätigt!"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Du wirst weitergeleitet...
            </p>
          </div>
        )}
        {status === "error" && (
          <div className="mt-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => navigate("/app/login")}
                variant="outline"
                className="w-full"
              >
                Zum Login
              </Button>
              <Button
                onClick={() => navigate("/app/register")}
                variant="outline"
                className="w-full"
              >
                Erneut registrieren
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConfirm;
