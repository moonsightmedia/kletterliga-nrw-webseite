import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { MapPin, ExternalLink } from "lucide-react";

// Placeholder gyms - will be replaced with real data
const gyms = [
  { 
    name: "Kletterhalle Köln", 
    city: "Köln",
    address: "Musterstraße 1, 50667 Köln",
    website: "https://example.com",
    leagues: ["Toprope", "Vorstieg"],
  },
  { 
    name: "Boulderbar Düsseldorf", 
    city: "Düsseldorf",
    address: "Beispielweg 12, 40210 Düsseldorf",
    website: "https://example.com",
    leagues: ["Vorstieg"],
  },
  { 
    name: "Kletterzentrum Essen", 
    city: "Essen",
    address: "Kletterplatz 5, 45127 Essen",
    website: "https://example.com",
    leagues: ["Toprope", "Vorstieg"],
  },
  { 
    name: "Boulderwelt Dortmund", 
    city: "Dortmund",
    address: "Sportstraße 23, 44135 Dortmund",
    website: "https://example.com",
    leagues: ["Toprope"],
  },
  { 
    name: "Klettermax Münster", 
    city: "Münster",
    address: "Bergweg 7, 48143 Münster",
    website: "https://example.com",
    leagues: ["Toprope", "Vorstieg"],
  },
  { 
    name: "DAV Kletterzentrum Bonn", 
    city: "Bonn",
    address: "Alpinstraße 15, 53111 Bonn",
    website: "https://example.com",
    leagues: ["Toprope", "Vorstieg"],
  },
  { 
    name: "Kletterfabrik Wuppertal", 
    city: "Wuppertal",
    address: "Industriestraße 88, 42103 Wuppertal",
    website: "https://example.com",
    leagues: ["Vorstieg"],
  },
  { 
    name: "Stuntwerk Köln", 
    city: "Köln",
    address: "Mediapark 6, 50670 Köln",
    website: "https://example.com",
    leagues: ["Toprope"],
  },
];

const Hallen = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="TEILNEHMENDE HALLEN" 
        subtitle="Alle Kletterhallen, in denen du Punkte für die Liga sammeln kannst."
      />

      {/* Map Section Placeholder */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              HALLEN IN NRW
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {gyms.length} Hallen in ganz Nordrhein-Westfalen nehmen teil
            </p>
          </AnimatedSection>

          {/* Gyms Grid */}
          <StaggeredAnimation 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            staggerDelay={100}
            animation="fade-up"
          >
            {gyms.map((gym) => (
              <div 
                key={gym.name}
                className="card-kl group flex gap-6"
              >
                {/* Logo Placeholder */}
                <div className="w-20 h-20 flex-shrink-0 -skew-x-6 bg-accent/50 flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
                  <span className="skew-x-6 font-headline text-2xl text-primary group-hover:text-secondary-foreground transition-colors duration-300">
                    {gym.name.charAt(0)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline text-xl text-primary mb-1 truncate">
                    {gym.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                    <MapPin size={14} />
                    <span>{gym.address}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {gym.leagues.map((league) => (
                      <span 
                        key={league}
                        className="inline-block bg-accent text-accent-foreground text-xs px-2 py-1 -skew-x-6"
                      >
                        <span className="skew-x-6 inline-block">{league}</span>
                      </span>
                    ))}
                  </div>

                  <a 
                    href={gym.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-secondary hover:text-secondary/80 text-sm font-medium transition-colors"
                  >
                    Website besuchen
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </section>

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
