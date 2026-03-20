import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { Heart, Mail } from "lucide-react";
import { mainSponsors } from "@/data/sponsors";
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

      {/* Main Sponsors */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              HAUPTSPONSOREN
            </h2>
          </AnimatedSection>

          <StaggeredAnimation 
            className="grid grid-cols-1 gap-8 max-w-xl mx-auto"
            staggerDelay={150}
            animation="scale"
          >
            {mainSponsors.map((sponsor) => {
              const Wrapper = sponsor.website ? "a" : "div";
              return (
                <Wrapper
                  key={sponsor.name}
                  href={sponsor.website}
                  target={sponsor.website ? "_blank" : undefined}
                  rel={sponsor.website ? "noopener noreferrer" : undefined}
                  className="card-kl flex flex-col items-center justify-center text-center p-8 md:p-12 group"
                >
                  <div className="w-32 h-32 -skew-x-6 bg-accent/50 flex items-center justify-center mb-6 group-hover:bg-secondary transition-colors duration-300 overflow-hidden">
                    {sponsor.logoUrl ? (
                      <img
                        src={sponsor.logoUrl}
                        alt={`Logo ${sponsor.name}`}
                        className="skew-x-6 w-24 h-24 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="skew-x-6 font-headline text-4xl text-primary group-hover:text-secondary-foreground transition-colors duration-300">
                        {sponsor.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline text-xl text-primary mb-2">{sponsor.name}</h3>
                  <span className="inline-block bg-secondary text-secondary-foreground text-xs px-3 py-1 -skew-x-6">
                    <span className="skew-x-6 inline-block">{sponsor.tier}</span>
                  </span>
                  {sponsor.details && (
                    <span className="mt-3 text-xs text-muted-foreground text-center max-w-sm">{sponsor.details}</span>
                  )}
                  {sponsor.isPlaceholder && (
                    <span className="mt-3 text-xs text-muted-foreground">
                      Platzhalter – Logo & Link folgen
                    </span>
                  )}
                </Wrapper>
              );
            })}
          </StaggeredAnimation>
        </div>
      </section>


      {/* Become Sponsor Section */}
      <section className="section-padding bg-gradient-kl">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <AnimatedSection animation="scale">
              <div className="w-16 h-16 mx-auto mb-6 -skew-x-6 bg-accent flex items-center justify-center">
                <Heart className="skew-x-6 text-primary" size={28} />
              </div>
              <h2 className="font-headline text-3xl md:text-4xl mb-6">
                SPONSOR WERDEN?
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fade-up" delay={100}>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Du möchtest die Kletterliga NRW unterstützen und Teil unserer Community 
                werden? Wir bieten verschiedene Sponsoring-Pakete mit attraktiven 
                Gegenleistungen – von Logo-Platzierung bis zu Event-Präsenz.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <a 
                href="mailto:info@kletterliga-nrw.de"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-4 -skew-x-6 font-medium hover:bg-accent/90 transition-colors"
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
