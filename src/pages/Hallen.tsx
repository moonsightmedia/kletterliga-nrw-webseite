import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { MapPin, ExternalLink } from "lucide-react";
import { GymDetailDialog } from "@/components/gyms/GymDetailDialog";
import { formatGymNameLines } from "@/components/gyms/formatGymNameLines";
import { GymLogoBadge } from "@/components/gyms/GymLogoBadge";
import { usePageMeta } from "@/hooks/usePageMeta";
import { preparePublicGyms } from "@/lib/publicGyms";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";

const mapSearchUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

const Hallen = () => {
  usePageMeta({
    title: "Teilnehmende Hallen",
    description:
      "Alle teilnehmenden Kletterhallen der Kletterliga NRW in Nordrhein-Westfalen mit Adressen, Partnerinfos und direktem Einstieg.",
    canonicalPath: "/hallen",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Teilnehmende Hallen der Kletterliga NRW",
      url: "https://kletterliga-nrw.de/hallen",
      description:
        "Übersicht aller teilnehmenden Kletterhallen der Kletterliga NRW in Nordrhein-Westfalen.",
    },
  });

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  useEffect(() => {
    let active = true;

    const loadGyms = async () => {
      try {
        const { data, error: err } = await listGyms();
        if (!active) return;

        if (err) {
          setError(err.message ?? "Hallen konnten nicht geladen werden.");
          setGyms([]);
        } else {
          setGyms(preparePublicGyms(data ?? []));
        }
      } catch (error) {
        if (!active || isAbortError(error)) return;
        console.error("Failed to load public gyms", error);
        setError("Hallen konnten nicht geladen werden.");
        setGyms([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadGyms();

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="TEILNEHMENDE HALLEN"
        subtitle="Alle Kletterhallen in Nordrhein-Westfalen, in denen du Punkte für die Kletterliga NRW sammeln kannst."
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mb-12 text-center">
            <h2 className="mb-4 font-headline text-3xl text-primary md:text-4xl">HALLEN IN NRW</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {loading
                ? "Lade Hallen …"
                : error
                  ? "Hallenliste konnte nicht geladen werden."
                  : `${gyms.length} Hallen in ganz Nordrhein-Westfalen nehmen teil`}
            </p>
          </AnimatedSection>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Lade Hallen …</div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : (
            <StaggeredAnimation
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
              staggerDelay={100}
              animation="fade-up"
            >
              {gyms.map((gym) => (
                <div
                  key={gym.id}
                  className="card-kl group flex h-full min-h-[180px] cursor-pointer gap-6 transition-shadow hover:shadow-lg"
                  onClick={() => setSelectedGym(gym)}
                >
                  <GymLogoBadge
                    name={gym.name}
                    logoUrl={gym.logo_url}
                    className="h-20 w-20 group-hover:bg-secondary"
                    fallbackClassName="text-2xl group-hover:text-secondary-foreground"
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="mb-2 font-headline text-base leading-[1.02] text-primary sm:text-xl md:hidden">
                      {formatGymNameLines(gym.name).map((line) => (
                        <span key={line} className="block text-balance">
                          {line}
                        </span>
                      ))}
                    </h3>

                    <h3 className="mb-2 hidden font-headline text-base leading-[1.02] text-primary sm:text-xl md:block">
                      <span className="block text-balance break-words">{gym.name}</span>
                    </h3>

                    <div className="mb-3 flex min-h-[20px] items-center gap-2 text-sm text-muted-foreground">
                      {(gym.address ?? gym.city) && (
                        <>
                          <MapPin size={14} className="flex-shrink-0" />
                          <span className="truncate">{gym.address ?? gym.city ?? ""}</span>
                        </>
                      )}
                    </div>

                    <div className="mb-3 flex min-h-[20px] flex-wrap gap-2">
                      <span className="inline-block bg-accent px-2 py-1 text-xs text-accent-foreground -skew-x-6">
                        <span className="inline-block skew-x-6">Liga-Partner</span>
                      </span>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-3">
                      {(gym.address ?? gym.city) && (
                        <a
                          href={mapSearchUrl(gym.address ?? gym.city ?? "")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 py-2 text-sm font-medium text-secondary transition-colors hover:text-secondary/80"
                          onClick={(event) => event.stopPropagation()}
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
                          className="inline-flex min-h-11 items-center gap-1 py-2 text-sm font-medium text-secondary transition-colors hover:text-secondary/80"
                          onClick={(event) => event.stopPropagation()}
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

      <GymDetailDialog
        gym={selectedGym}
        open={selectedGym !== null}
        onOpenChange={(open) => !open && setSelectedGym(null)}
      />

      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <div className="mx-auto max-w-3xl text-center">
            <AnimatedSection animation="fade-up">
              <h2 className="mb-6 font-headline text-3xl text-primary md:text-4xl">
                DEINE HALLE IST NOCH NICHT DABEI?
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Wir freuen uns über weitere Partner-Hallen. Wenn deine Lieblingshalle noch nicht
                teilnimmt, sprich sie gerne an oder kontaktiere uns direkt.
              </p>
              <a
                href="mailto:hallen@kletterliga-nrw.de"
                className="inline-flex min-h-12 items-center gap-2 bg-secondary px-8 py-4 -skew-x-6 font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
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
