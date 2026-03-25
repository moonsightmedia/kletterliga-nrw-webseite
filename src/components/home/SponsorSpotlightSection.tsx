import { ExternalLink, MapPin } from "lucide-react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { featuredSponsor } from "@/data/sponsors";

export const SponsorSpotlightSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-kl">
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            UNSER HAUPTSPONSOR
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Mit {featuredSponsor.name} haben wir einen Partner an unserer Seite, der die
            Kletterliga NRW sichtbar mitträgt.
          </p>
        </AnimatedSection>

        <AnimatedSection animation="fade-up" delay={120}>
          <div className="card-kl max-w-5xl mx-auto overflow-hidden rounded-sm p-0">
            <div className="grid items-stretch md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="relative flex items-center justify-center bg-muted/50 px-6 py-10 md:px-8">
                <div className="absolute right-6 top-6 h-16 w-16 bg-secondary/15 -skew-x-6" />
                <div className="absolute bottom-6 left-6 h-12 w-24 bg-accent/70 -skew-x-6" />
                <div className="relative flex w-full max-w-md items-center justify-center bg-accent px-5 py-6 -skew-x-6 shadow-lg">
                  <img
                    src={featuredSponsor.logoSrc}
                    alt={`Logo ${featuredSponsor.name}`}
                    className="w-full max-w-[360px] object-contain skew-x-6"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-center p-8 md:p-10">
                <span className="inline-block bg-secondary text-secondary-foreground text-xs px-3 py-1 -skew-x-6 self-start">
                  <span className="inline-block skew-x-6">HAUPTSPONSOR</span>
                </span>

                <h3 className="mt-6 font-headline text-2xl md:text-4xl text-primary">
                  {featuredSponsor.name}
                </h3>

                <p className="mt-4 text-lg text-muted-foreground leading-8">
                  {featuredSponsor.claim}
                </p>

                <div className="mt-6 flex items-start gap-3 text-sm md:text-base text-muted-foreground">
                  <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-secondary" />
                  <span>{featuredSponsor.address}</span>
                </div>

                <p className="mt-6 text-sm leading-7 text-muted-foreground">
                  Offizieller Partner der Kletterliga NRW für starke Präsenz rund ums
                  Klettern in Nordrhein-Westfalen.
                </p>

                <a
                  href={featuredSponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex min-h-11 items-center gap-2 text-secondary hover:text-secondary/80 font-medium transition-colors self-start"
                >
                  {featuredSponsor.websiteLabel}
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};
