import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Compass, Mail } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  usePageMeta({
    title: "Seite nicht gefunden",
    description: "Diese Seite existiert nicht oder wurde verschoben.",
    canonicalPath: "/404",
    noindex: true,
  });

  return (
    <PageLayout>
      <section className="section-padding bg-background min-h-[70vh] flex items-center">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto card-kl text-center">
            <div className="w-16 h-16 mx-auto mb-6 -skew-x-6 bg-accent flex items-center justify-center">
              <AlertTriangle className="skew-x-6 text-primary" size={28} />
            </div>
            <p className="font-headline text-secondary text-sm md:text-base tracking-[0.2em] uppercase mb-3">
              Fehler 404
            </p>
            <h1 className="font-headline text-4xl md:text-6xl text-primary mb-4">
              DIESE SEITE GIBT ES NICHT
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-3">
              Der Link <span className="font-medium text-foreground">{location.pathname}</span> ist
              ungültig, wurde verschoben oder existiert nicht mehr.
            </p>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Über die folgenden Einstiege kommst du schnell zurück auf die Website.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Button asChild size="lg" className="min-h-12 px-8">
                <Link to="/">
                  <span className="skew-x-6 inline-flex items-center gap-2">
                    <ArrowLeft size={18} />
                    Zur Startseite
                  </span>
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="min-h-12 px-8">
                <Link to="/hallen">
                  <span className="skew-x-6 inline-flex items-center gap-2">
                    <Compass size={18} />
                    Hallen ansehen
                  </span>
                </Link>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/modus"
                className="inline-flex min-h-11 items-center justify-center px-4 py-2 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                Modus & Regeln
              </Link>
              <Link
                to="/kontakt"
                className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                <Mail size={16} />
                Kontakt
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default NotFound;
