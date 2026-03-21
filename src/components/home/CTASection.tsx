import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { handlePublicParticipantAccess } from "@/lib/publicParticipantAccess";
import { listGyms } from "@/services/appApi";
import { useSeasonSettings } from "@/services/seasonSettings";

export const CTASection = () => {
  const { getSeasonYear } = useSeasonSettings();
  const seasonYear = getSeasonYear();
  const [gymCount, setGymCount] = useState<number | null>(null);

  useEffect(() => {
    listGyms().then(({ data }) => setGymCount(data?.length ?? null));
  }, []);

  return (
    <section className="section-padding bg-gradient-kl relative overflow-hidden">
      {/* Background Patterns - Diagonal stripes */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute bg-primary-foreground/[0.03] w-[200%] h-32"
          style={{ top: '20%', left: '-50%', transform: 'rotate(-15deg)' }}
        />
        <div 
          className="absolute bg-primary-foreground/[0.02] w-[200%] h-24"
          style={{ top: '60%', left: '-50%', transform: 'rotate(-15deg)' }}
        />
      </div>

      <div className="container-kl relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection animation="scale">
            <h2 className="font-headline text-2xl sm:text-4xl md:text-5xl text-primary-foreground mb-5 md:mb-6 text-balance">
              BEREIT FÜR DIE CHALLENGE?
            </h2>
          </AnimatedSection>
          
          <AnimatedSection animation="fade-up" delay={100}>
            <p className="text-base leading-7 md:text-xl md:leading-8 text-primary-foreground/80 mb-8 md:mb-10 max-w-2xl mx-auto text-balance">
              Werde Teil der Kletterliga NRW und erlebe Wettkampf-Atmosphäre 
              in deinem eigenen Tempo. Registriere dich jetzt und starte 
              in die Saison {seasonYear}!
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
              <Button
                variant="secondary"
                size="lg"
                className="h-14 min-w-[200px] px-10 text-lg group"
                onClick={(event) => handlePublicParticipantAccess(event, "/app")}
              >
                <span className="flex items-center justify-center">
                  <span className="skew-x-6">Jetzt registrieren</span>
                  <ArrowRight className="ml-2 skew-x-6 group-hover:translate-x-1 transition-transform" size={20} />
                </span>
              </Button>
              
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 min-w-[200px] px-10 text-lg border-accent text-accent hover:bg-accent hover:text-primary"
              >
                <a href="/modus" className="flex items-center justify-center">
                  <span className="skew-x-6">Regeln & Modus</span>
                </a>
              </Button>
            </div>
          </AnimatedSection>

          {/* Trust indicators */}
          <AnimatedSection animation="fade-in" delay={400}>
            <div className="mt-10 md:mt-12 grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap items-center justify-center text-primary-foreground/60 text-sm max-w-xl mx-auto">
              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                <span className="font-headline text-2xl text-accent">{gymCount ?? "…"}</span>
                <span>Hallen</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-primary-foreground/20" />
              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                <span className="font-headline text-2xl text-accent">2</span>
                <span>Ligen</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-primary-foreground/20" />
              <div className="col-span-2 flex items-center justify-center gap-2 whitespace-nowrap">
                <span className="font-headline text-2xl text-accent">6</span>
                <span>Wertungsklassen</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};
