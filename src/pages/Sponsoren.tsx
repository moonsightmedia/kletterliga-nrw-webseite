import { Clock, ExternalLink, Facebook, Heart, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { mainSponsors, partnerSponsors } from "@/data/sponsors";
import { usePageMeta } from "@/hooks/usePageMeta";

const Sponsoren = () => {
  usePageMeta({
    title: "Sponsoren & Partner",
    description:
      "Unsere Unterstützer der Kletterliga NRW – Sponsoren und Partner, die den Wettkampf möglich machen.",
    canonicalPath: "/sponsoren",
  });

  return (
    <PageLayout>
      <PageHeader
        title="SPONSOREN & PARTNER"
        subtitle="Die Unterstützer, die die Kletterliga NRW möglich machen."
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl text-primary md:text-4xl">
              HAUPTSPONSOREN
            </h2>
          </AnimatedSection>

          <StaggeredAnimation
            className="grid grid-cols-1 gap-8 max-w-3xl mx-auto"
            staggerDelay={150}
            animation="scale"
          >
            {mainSponsors.map((sponsor) => (
              <div
                key={sponsor.name}
                className="card-kl group flex flex-col gap-8 rounded-sm p-8 text-left md:p-10"
              >
                <div className="relative bg-muted/40 px-6 py-8">
                  <div className="absolute right-6 top-6 h-12 w-12 bg-secondary/15 -skew-x-6" />
                  <div className="absolute bottom-6 left-6 h-10 w-20 bg-accent/80 -skew-x-6" />
                  <div className="relative flex justify-center">
                    <div className="flex w-full max-w-[440px] items-center justify-center bg-accent px-5 py-6 -skew-x-6 shadow-lg">
                      <img
                        src={sponsor.logoSrc}
                        alt={`Logo ${sponsor.name}`}
                        className="mx-auto max-h-24 w-full max-w-[420px] object-contain skew-x-6"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-headline text-2xl text-primary md:text-3xl">
                      {sponsor.name}
                    </h3>
                    <span className="inline-block -skew-x-6 bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                      <span className="inline-block skew-x-6">{sponsor.tier}</span>
                    </span>
                  </div>

                  {sponsor.claim && (
                    <p className="text-lg leading-8 text-muted-foreground">
                      {sponsor.claim}
                    </p>
                  )}

                  <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    {sponsor.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>{sponsor.address}</span>
                      </div>
                    )}
                    {sponsor.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="mt-1 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>{sponsor.phone}</span>
                      </div>
                    )}
                    {sponsor.openingHours && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <Clock className="mt-1 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>{sponsor.openingHours}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {sponsor.website && (
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 bg-accent px-4 py-2 font-medium text-accent-foreground -skew-x-6 transition-colors hover:bg-accent/90"
                    >
                      <span className="inline-flex items-center gap-2 skew-x-6">
                        Website
                        <ExternalLink size={16} />
                      </span>
                    </a>
                  )}
                  {sponsor.instagramUrl && (
                    <a
                      href={sponsor.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 border border-border bg-background px-4 py-2 font-medium text-primary -skew-x-6 transition-colors hover:bg-accent/40"
                    >
                      <span className="inline-flex items-center gap-2 skew-x-6">
                        <Instagram size={16} />
                        Instagram
                      </span>
                    </a>
                  )}
                  {sponsor.facebookUrl && (
                    <a
                      href={sponsor.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 border border-border bg-background px-4 py-2 font-medium text-primary -skew-x-6 transition-colors hover:bg-accent/40"
                    >
                      <span className="inline-flex items-center gap-2 skew-x-6">
                        <Facebook size={16} />
                        Facebook
                      </span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </section>

      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl text-primary md:text-4xl">
              WEITERE PARTNER
            </h2>
          </AnimatedSection>

          {partnerSponsors.length === 0 ? (
            <AnimatedSection animation="fade-up" className="text-center text-muted-foreground">
              Weitere Partner werden in Kürze veröffentlicht.
            </AnimatedSection>
          ) : (
            <StaggeredAnimation
              className="grid grid-cols-1 gap-6 max-w-5xl mx-auto md:grid-cols-2"
              staggerDelay={75}
              animation="fade-up"
            >
              {partnerSponsors.map((sponsor) => (
                <div
                  key={sponsor.name}
                  className="card-kl group flex flex-col gap-5 rounded-sm p-6 text-left"
                >
                  <div className="relative overflow-hidden bg-muted/40 px-5 py-6">
                    <div className="absolute right-4 top-4 h-8 w-8 bg-secondary/15 -skew-x-6" />
                    <div className="absolute bottom-4 left-4 h-7 w-16 bg-accent/80 -skew-x-6" />
                    <div className="relative flex justify-center">
                      <div className="flex h-24 w-full items-center justify-center bg-accent px-4 -skew-x-6 shadow-md">
                        {sponsor.logoSrc ? (
                          <img
                            src={sponsor.logoSrc}
                            alt={`Logo ${sponsor.name}`}
                            className="max-h-14 w-full object-contain skew-x-6"
                            loading="lazy"
                          />
                        ) : (
                          <span className="font-headline text-2xl text-primary skew-x-6">
                            {sponsor.name.charAt(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-headline text-xl text-primary md:text-2xl">
                        {sponsor.name}
                      </h3>
                      <span className="inline-block -skew-x-6 bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                        <span className="inline-block skew-x-6">{sponsor.tier}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-accent-foreground -skew-x-6 transition-colors hover:bg-accent/90"
                        >
                          <span className="inline-flex items-center gap-2 skew-x-6">
                            Website
                            <ExternalLink size={15} />
                          </span>
                        </a>
                      )}
                      {sponsor.instagramUrl && (
                        <a
                          href={sponsor.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 border border-border bg-background px-4 py-2 text-sm font-medium text-primary -skew-x-6 transition-colors hover:bg-accent/40"
                        >
                          <span className="inline-flex items-center gap-2 skew-x-6">
                            <Instagram size={15} />
                            Instagram
                          </span>
                        </a>
                      )}
                      {sponsor.facebookUrl && (
                        <a
                          href={sponsor.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 border border-border bg-background px-4 py-2 text-sm font-medium text-primary -skew-x-6 transition-colors hover:bg-accent/40"
                        >
                          <span className="inline-flex items-center gap-2 skew-x-6">
                            <Facebook size={15} />
                            Facebook
                          </span>
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

      <section className="section-padding bg-gradient-kl">
        <div className="container-kl">
          <div className="mx-auto max-w-3xl text-center text-primary-foreground">
            <AnimatedSection animation="scale">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-accent -skew-x-6">
                <Heart className="skew-x-6 text-primary" size={28} />
              </div>
              <h2 className="font-headline mb-6 text-3xl md:text-4xl">SPONSOR WERDEN?</h2>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <p className="mb-8 text-lg text-primary-foreground/80">
                Du möchtest die Kletterliga NRW unterstützen und Teil unserer Community
                werden? Wir bieten verschiedene Sponsoring-Pakete mit attraktiven
                Gegenleistungen – von Logo-Platzierung bis zu Event-Präsenz.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <a
                href="mailto:info@kletterliga-nrw.de"
                className="inline-flex items-center gap-2 bg-accent px-8 py-4 font-medium text-accent-foreground -skew-x-6 transition-colors hover:bg-accent/90"
              >
                <Mail className="skew-x-6" size={20} />
                <span className="skew-x-6">Kontakt aufnehmen</span>
              </a>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Sponsoren;
