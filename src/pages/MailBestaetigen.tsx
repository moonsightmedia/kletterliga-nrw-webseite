import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageLayout } from "@/components/layout/PageLayout";
import { confirmMarketingOptInToken } from "@/services/appApi";
import { usePageMeta } from "@/hooks/usePageMeta";

type Status = "loading" | "success" | "error";

const MailBestaetigen = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Wir prüfen gerade deinen Bestätigungslink.");

  usePageMeta({
    title: "E-Mail bestätigen",
    description: "Bestätige deine freiwillige E-Mail-Anmeldung für Kletterliga NRW Infos.",
    canonicalPath: "/mail/bestaetigen",
  });

  useEffect(() => {
    let active = true;
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Der Bestätigungslink ist unvollständig.");
      return () => {
        active = false;
      };
    }

    void (async () => {
      const result = await confirmMarketingOptInToken(token);
      if (!active) return;

      if (result.error) {
        setStatus("error");
        setMessage(result.error.message);
        return;
      }

      setStatus("success");
      setMessage(result.data?.message ?? "Deine freiwilligen E-Mail-Infos sind jetzt bestätigt.");
    })();

    return () => {
      active = false;
    };
  }, [searchParams]);

  return (
    <PageLayout>
      <PageHeader
        title="E-MAIL BESTÄTIGEN"
        subtitle="Hier bestätigst du deine freiwillige Anmeldung für zusätzliche Infos rund um die Kletterliga NRW."
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
                <MailWarning className="h-7 w-7" />
              )}
            </div>

            <div className="font-headline text-2xl text-primary">
              {status === "loading"
                ? "Bestätigungslink wird geprüft"
                : status === "success"
                  ? "Anmeldung bestätigt"
                  : "Bestätigung nicht möglich"}
            </div>
            <p className="mt-4 text-muted-foreground">{message}</p>

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

export default MailBestaetigen;
