import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { Target, Users, MapPin, Trophy, Zap, Heart } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

const values = [
  {
    icon: Target,
    title: "Leistung",
    description: "Wir fördern sportlichen Ehrgeiz und fairen Wettbewerb auf allen Leistungsstufen.",
  },
  {
    icon: Users,
    title: "Gemeinschaft",
    description: "Die Liga bringt Kletterer:innen aus ganz NRW zusammen und schafft Verbindungen.",
  },
  {
    icon: MapPin,
    title: "Regional",
    description: "Wir stärken die Kletterszene in Nordrhein-Westfalen und unterstützen lokale Hallen.",
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "Digitale Ergebniswertung und moderne Wettkampfformate für ein zeitgemäßes Erlebnis.",
  },
  {
    icon: Heart,
    title: "Leidenschaft",
    description: "Klettern ist mehr als Sport – es ist Leidenschaft, die wir teilen und feiern.",
  },
  {
    icon: Trophy,
    title: "Anerkennung",
    description: "Jede Leistung zählt. Vom Einsteiger bis zum Profi – alle verdienen ihren Moment.",
  },
];

const Liga = () => {
  usePageMeta({
    title: "Die Liga",
    description:
      "Die Vision, Werte und das Team hinter der Kletterliga NRW.",
    canonicalPath: "/liga",
  });

  return (
    <PageLayout>
      <PageHeader 
        title="DIE LIGA" 
        subtitle="Die Vision hinter der Kletterliga NRW – ein Wettkampf, der verbindet."
      />

      {/* Vision Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-6">
                UNSERE VISION
              </h2>
            </AnimatedSection>
            
            <AnimatedSection animation="fade-up" delay={100}>
              <div className="prose prose-lg text-muted-foreground">
                <p className="text-lg leading-relaxed mb-6">
                  Die Kletterliga NRW wurde gegründet, um die vielfältige Kletterszene 
                  Nordrhein-Westfalens zu vereinen. Unser Ziel ist es, einen inklusiven 
                  Wettkampf zu schaffen, bei dem Kletterer:innen aller Leistungsstufen 
                  teilnehmen können – vom ambitionierten Anfänger bis zum erfahrenen 
                  Sportkletterer.
                </p>
                <p className="text-lg leading-relaxed mb-6">
                  Mit der digitalen Ergebniswertung ermöglichen wir flexibles Klettern: 
                  Du entscheidest, wann und wo du kletterst. Keine festen Wettkampftermine, 
                  keine Startgebühren pro Event – einfach in die Halle gehen und Punkte sammeln.
                </p>
                <p className="text-lg leading-relaxed">
                  Das große Finale bringt dann die besten Kletterer:innen zusammen – 
                  ein echtes Community-Event mit Live-Atmosphäre, Siegerehrung und 
                  der Chance, Teil von etwas Besonderem zu sein.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-16">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              UNSERE WERTE
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Was uns antreibt und die Liga besonders macht
            </p>
          </AnimatedSection>

          <StaggeredAnimation 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            staggerDelay={100}
            animation="scale"
          >
            {values.map((value) => (
              <div key={value.title} className="card-kl group">
                <div className="w-14 h-14 mb-4 -skew-x-6 bg-accent flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
                  <value.icon className="skew-x-6 text-primary group-hover:text-secondary-foreground transition-colors duration-300" size={24} />
                </div>
                <h3 className="font-headline text-xl text-primary mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </section>

      {/* Team/Organization Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-6">
                DAS TEAM
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Die Kletterliga NRW wird von einem engagierten Team aus Kletterbegeisterten 
                organisiert. Wir arbeiten ehrenamtlich daran, die Liga weiterzuentwickeln 
                und das beste Erlebnis für alle Teilnehmer:innen zu schaffen.
              </p>
              <p className="text-muted-foreground">
                Bei Fragen oder Anregungen erreichst du uns unter{" "}
                <a href="mailto:info@kletterliga-nrw.de" className="text-secondary hover:underline">
                  info@kletterliga-nrw.de
                </a>
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Liga;
