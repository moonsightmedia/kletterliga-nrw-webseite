import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { ExternalLink, Trophy, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder leaderboard data
const leaderboardPreview = [
  { rank: 1, name: "Max M.", category: "Ü16 männlich", points: 245, icon: Trophy },
  { rank: 2, name: "Sarah K.", category: "Ü16 weiblich", points: 230, icon: Medal },
  { rank: 3, name: "Tim B.", category: "U16 männlich", points: 218, icon: Award },
  { rank: 4, name: "Laura S.", category: "Ü40 weiblich", points: 205 },
  { rank: 5, name: "Jonas W.", category: "Ü16 männlich", points: 198 },
];

const Ranglisten = () => {
  return (
    <PageLayout>
      <PageHeader 
        title="RANGLISTEN" 
        subtitle="Die aktuellen Platzierungen der Kletterliga NRW."
      />

      {/* Notice Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up">
            <div className="max-w-4xl mx-auto bg-accent/30 p-8 rounded-lg text-center">
              <h2 className="font-headline text-2xl md:text-3xl text-primary mb-4">
                VOLLSTÄNDIGE RANGLISTEN IM TEILNEHMERBEREICH
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Die detaillierten Ranglisten mit allen Teilnehmer:innen, Filter-Optionen 
                nach Wertungsklasse und Halle sowie deine persönlichen Statistiken 
                findest du im Teilnehmerbereich.
              </p>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="px-8"
              >
                <a 
                  href="https://app.kletterliga-nrw.de/ranglisten" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <span className="skew-x-6">Zum Teilnehmerbereich</span>
                  <ExternalLink className="skew-x-6" size={18} />
                </a>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Preview Leaderboard */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              TOP 5 VORSCHAU
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ein Blick auf die aktuellen Spitzenreiter (Beispieldaten)
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100}>
            <div className="max-w-3xl mx-auto">
              {leaderboardPreview.map((entry, index) => (
                <div 
                  key={entry.rank}
                  className={`flex items-center gap-4 p-4 mb-2 rounded-lg ${
                    index === 0 ? 'bg-gradient-kl text-primary-foreground' :
                    index === 1 ? 'bg-secondary/20' :
                    index === 2 ? 'bg-accent/50' :
                    'bg-background'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-12 h-12 flex-shrink-0 -skew-x-6 flex items-center justify-center ${
                    index === 0 ? 'bg-accent' :
                    index === 1 ? 'bg-secondary' :
                    index === 2 ? 'bg-primary' :
                    'bg-muted'
                  }`}>
                    {entry.icon ? (
                      <entry.icon className={`skew-x-6 ${
                        index === 0 ? 'text-primary' :
                        index === 1 ? 'text-secondary-foreground' :
                        'text-primary-foreground'
                      }`} size={20} />
                    ) : (
                      <span className={`skew-x-6 font-headline text-lg ${
                        index < 3 ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Name & Category */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-headline text-lg ${
                      index === 0 ? 'text-primary-foreground' : 'text-primary'
                    }`}>
                      {entry.name}
                    </h3>
                    <p className={`text-sm ${
                      index === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {entry.category}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <span className={`font-headline text-2xl ${
                      index === 0 ? 'text-accent' : 'text-secondary'
                    }`}>
                      {entry.points}
                    </span>
                    <p className={`text-xs ${
                      index === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      Punkte
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-in" delay={300} className="text-center mt-8">
            <p className="text-muted-foreground text-sm italic">
              * Dies sind Beispieldaten. Die echten Ranglisten findest du im Teilnehmerbereich.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Ranglisten;
