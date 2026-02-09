import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { MapPin, ExternalLink } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";
import { GymDetailDialog } from "@/components/gyms/GymDetailDialog";

/** Link zu Google Maps Suche nach Adresse */
const mapSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const Hallen = () => {
  usePageMeta({
    title: "Teilnehmende Hallen",
    description:
      "Alle Kletterhallen, in denen du Punkte für die Kletterliga NRW sammeln kannst.",
    canonicalPath: "/hallen",
  });

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  useEffect(() => {
    listGyms()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message ?? "Hallen konnten nicht geladen werden.");
          setGyms([]);
        } else {
          setGyms(data ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="TEILNEHMENDE HALLEN"
        subtitle="Alle Kletterhallen, in denen du Punkte für die Liga sammeln kannst."
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              HALLEN IN NRW
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {loading
                ? "Lade Hallen …"
                : error
                  ? "Hallenliste konnte nicht geladen werden."
                  : `${gyms.length} Hallen in ganz Nordrhein-Westfalen nehmen teil`}
            </p>
          </AnimatedSection>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Lade Hallen …</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : (
            <StaggeredAnimation
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              staggerDelay={100}
              animation="fade-up"
            >
              {gyms.map((gym) => (
                <div
                  key={gym.id}
                  className="card-kl group flex gap-6 cursor-pointer hover:shadow-lg transition-shadow h-full min-h-[180px]"
                  onClick={() => setSelectedGym(gym)}
                >
                  <div className="w-20 h-20 flex-shrink-0 -skew-x-6 bg-accent/50 flex items-center justify-center group-hover:bg-secondary transition-colors duration-300 overflow-hidden">
                    {gym.logo_url ? (
                      <img src={gym.logo_url} alt={gym.name} className="skew-x-6 h-full w-full object-contain p-1" />
                    ) : (
                      <span className="skew-x-6 font-headline text-2xl text-primary group-hover:text-secondary-foreground transition-colors duration-300">
                        {gym.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-headline text-xl text-primary mb-1 truncate">
                      {gym.name}
                    </h3>

                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3 min-h-[20px]">
                      {(gym.address ?? gym.city) && (
                        <>
                          <MapPin size={14} className="flex-shrink-0" />
                          <span className="truncate">{gym.address ?? gym.city ?? ""}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3 min-h-[20px]">
                      <span className="inline-block bg-accent text-accent-foreground text-xs px-2 py-1 -skew-x-6">
                        <span className="skew-x-6 inline-block">Liga-Partner</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-auto">
                      {(gym.address ?? gym.city) && (
                        <a
                          href={mapSearchUrl(gym.address ?? gym.city ?? "")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-secondary hover:text-secondary/80 text-sm font-medium transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Adresse in Karte anzeigen
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {gym.website && (
                        <a
                          href={gym.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-secondary hover:text-secondary/80 text-sm font-medium transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Website besuchen
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </StaggeredAnimation>
          )}
        </div>
      </section>

      {/* Gym Detail Dialog */}
      <GymDetailDialog
        gym={selectedGym}
        open={selectedGym !== null}
        onOpenChange={(open) => !open && setSelectedGym(null)}
      />

      {/* Become Partner Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-6">
                DEINE HALLE IST NOCH NICHT DABEI?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Wir freuen uns über weitere Partner-Hallen! Wenn deine Lieblingshalle
                noch nicht teilnimmt, sprich sie gerne an oder kontaktiere uns direkt.
              </p>
              <a
                href="mailto:hallen@kletterliga-nrw.de"
                className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-8 py-4 -skew-x-6 font-medium hover:bg-secondary/90 transition-colors"
              >
                <span className="skew-x-6">Halle anmelden →</span>
              </a>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Hallen;
