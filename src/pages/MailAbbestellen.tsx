import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLayout } from "@/components/layout/PageLayout";
import { unsubscribeMarketingOptInToken } from "@/services/appApi";
import { usePageMeta } from "@/hooks/usePageMeta";

type Status = "loading" | "success" | "error";

const MailAbbestellen = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Wir prüfen gerade deinen Abmeldelink.");

  usePageMeta({
    title: "E-Mail abbestellen",
    description: "Hier meldest du freiwillige Kletterliga-Infos per E-Mail wieder ab.",
    canonicalPath: "/mail/abbestellen",
  });

  useEffect(() => {
    let active = true;
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Der Abmeldelink ist unvollständig.");
      return () => {
        active = false;
      };
    }

    void (async () => {
      const result = await unsubscribeMarketingOptInToken(token);
      if (!active) return;

      if (result.error) {
        setStatus("error");
        setMessage(result.error.message);
        return;
      }

      setStatus("success");
      setMessage(result.data?.message ?? "Die freiwilligen Kletterliga-Infos per E-Mail wurden abbestellt.");
    })();

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <PageLayout>
      <PageHeader
        title="E-MAIL ABBESTELLEN"
        subtitle="Hier kannst du freiwillige E-Mail-Infos der Kletterliga NRW und ihrer Partner mit sofortiger Wirkung beenden."
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <div className="mx-auto max-w-2xl rounded-lg bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/30 text-primary">
              {status === "loading" ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : status === "success" ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <MailX className="h-7 w-7" />
              )}
            </div>

            <div className="font-headline text-2xl text-primary">
              {status === "loading"
                ? "Abmeldelink wird geprüft"
                : status === "success"
                  ? "Freiwillige E-Mails beendet"
                  : "Abmeldung nicht möglich"}
            </div>
            <p className="mt-4 text-muted-foreground">{message}</p>

            <p className="mt-4 text-sm text-muted-foreground">
              Wichtige Teilnahme- und Organisationsmails zu Account, Qualifikation, Halbfinale, Finale und wesentlichen Änderungen bleiben davon unberührt.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/app/login">
                  <span className="skew-x-6">Zum Login</span>
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">
                  <span className="skew-x-6">Zur Startseite</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default MailAbbestellen;
