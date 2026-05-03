import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Link2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUnlockDate, hasParticipantLaunchStarted } from "@/config/launch";
import { supabase } from "@/services/supabase";

const EmailConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const unlockDate = formatUnlockDate();
  const participantLaunchStarted = hasParticipantLaunchStarted();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const type = searchParams.get("type");
      setIsMagicLink(type === "magiclink");

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          setStatus("error");
          setErrorMessage("Fehler beim Bestätigen der E-Mail. Bitte versuche es erneut.");
          return;
        }

        if (data.session) {
          setStatus("success");
          setTimeout(() => {
            navigate("/app/profile", { replace: true });
          }, 2000);
        } else {
          setStatus("error");
          setErrorMessage(
            "Der Bestätigungslink ist ungültig oder wurde bereits verwendet. Bitte fordere einen neuen Link an.",
          );
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        setStatus("error");
        setErrorMessage("Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.");
      }
    };

    void handleEmailConfirmation();
  }, [navigate, searchParams]);

  return (
    <div className="overflow-hidden">
      <section className="border-b border-primary/10 bg-[linear-gradient(135deg,rgba(242,220,171,0.28),rgba(255,255,255,0.98)_48%,rgba(0,61,85,0.05)_100%)] px-5 py-6 sm:px-7 sm:py-7">
        <div className="inline-flex -skew-x-6 items-center bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-foreground shadow-sm">
          <span className="skew-x-6">{isMagicLink ? "Magic Link" : "E-Mail bestätigen"}</span>
        </div>
        <div className="mt-5 space-y-3">
          <h1 className="font-headline text-4xl leading-[0.96] text-primary">
            {isMagicLink ? "Wir melden dich gerade an." : "Wir bestätigen gerade deine E-Mail."}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Danach leiten wir dich direkt in dein Profil weiter.
          </p>
        </div>
      </section>

      <section className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        {status === "loading" && (
          <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-4">
            <div className="flex items-center gap-3 text-primary">
              <LoaderCircle className="h-5 w-5 animate-spin text-secondary" />
              <span className="text-sm font-semibold">
                {isMagicLink ? "Wir melden dich gerade an..." : "Wir bestätigen gerade deine E-Mail-Adresse..."}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Einen kurzen Moment bitte. Dein Profil öffnet sich automatisch.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="rounded-xl border border-primary/15 bg-primary/[0.05] px-4 py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">
                  {isMagicLink ? "Du wurdest erfolgreich angemeldet." : "Deine E-Mail-Adresse wurde bestätigt."}
                </p>
                {!isMagicLink && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {participantLaunchStarted
                      ? "Dein Profil ist jetzt direkt nutzbar. Hallen, Codes, Ranglisten und weitere Liga-Bereiche sind bereits offen."
                      : `Dein Profil ist jetzt direkt nutzbar. Hallen, Codes, Ranglisten und weitere Liga-Bereiche werden am ${unlockDate} freigeschaltet.`}
                  </p>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  Du wirst jetzt direkt in dein Profil weitergeleitet...
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-4">
            <p className="text-sm leading-6 text-destructive">{errorMessage}</p>
            <div className="rounded-xl border border-primary/10 bg-background px-4 py-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  {participantLaunchStarted
                    ? "Nach erfolgreicher Bestätigung sind Hallen, Codes, Ranglisten und weitere Liga-Funktionen direkt verfügbar."
                    : `Auch nach erfolgreicher Bestätigung bleiben Hallen, Codes, Ranglisten und weitere Liga-Funktionen bis zum ${unlockDate} gesperrt.`}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate("/app/login")} variant="outline" className="w-full">
                <span className="inline-flex items-center gap-2 skew-x-6">
                  <Link2 className="h-4 w-4" />
                  Zum Login
                </span>
              </Button>
              <Button onClick={() => navigate("/app/register")} variant="outline" className="w-full">
                <span className="skew-x-6">Erneut registrieren</span>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default EmailConfirm;
