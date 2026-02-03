import { Target, Users, Trophy } from "lucide-react";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Target,
    title: "Wettkampf",
    description: "Jede Route zählt. Sammle Punkte in deinem eigenen Tempo und miss dich mit Kletterer:innen aus ganz NRW.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Werde Teil einer wachsenden Klettergemeinschaft. Lerne neue Hallen kennen und triff Gleichgesinnte.",
  },
  {
    icon: Trophy,
    title: "Das Finale",
    description: "Die Besten qualifizieren sich für das große Finale. Ein einzigartiges Event mit Live-Atmosphäre.",
  },
];

export const AboutSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-kl">
        <div className="max-w-4xl mx-auto text-center">
          {/* Section Header */}
          <AnimatedSection animation="fade-up">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-6">
              WAS IST DIE KLETTERLIGA NRW?
            </h2>
          </AnimatedSection>
          
          <AnimatedSection animation="fade-up" delay={100}>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12">
              Die Kletterliga NRW ist ein landesweiter Hallenkletter-Wettkampf, der 
              Kletterer:innen aller Leistungsstufen zusammenbringt. Über mehrere 
              Monate hinweg sammelst du in verschiedenen Kletterhallen Punkte und 
              qualifizierst dich für das große Finale. Ob Einsteiger oder ambitionierter 
              Sportkletterer – bei uns findest du die passende Herausforderung.
            </p>
          </AnimatedSection>

          {/* Feature Cards */}
          <StaggeredAnimation 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
            staggerDelay={150}
            animation="scale"
          >
            {features.map((feature) => (
              <div key={feature.title} className="card-kl group">
                <div className="w-16 h-16 mx-auto mb-4 -skew-x-6 bg-accent flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
                  <feature.icon className="skew-x-6 text-primary group-hover:text-secondary-foreground transition-colors duration-300" size={28} />
                </div>
                <h3 className="font-headline text-xl text-primary mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </StaggeredAnimation>
        </div>
      </div>
    </section>
  );
};
