import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/hooks/useScrollAnimation";

export const CTASection = () => {
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
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary-foreground mb-6">
              BEREIT FÜR DIE CHALLENGE?
            </h2>
          </AnimatedSection>
          
          <AnimatedSection animation="fade-up" delay={100}>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 leading-relaxed">
              Werde Teil der Kletterliga NRW und erlebe Wettkampf-Atmosphäre 
              in deinem eigenen Tempo. Registriere dich jetzt und starte 
              in die Saison 2026!
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="h-14 min-w-[200px] px-10 text-lg group"
              >
                <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  <span className="skew-x-6">Jetzt registrieren</span>
                  <ArrowRight className="ml-2 skew-x-6 group-hover:translate-x-1 transition-transform" size={20} />
                </a>
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
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-primary-foreground/60 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-headline text-2xl text-accent">6+</span>
                <span>Hallen</span>
              </div>
              <div className="w-px h-6 bg-primary-foreground/20" />
              <div className="flex items-center gap-2">
                <span className="font-headline text-2xl text-accent">2</span>
                <span>Ligen</span>
              </div>
              <div className="w-px h-6 bg-primary-foreground/20" />
              <div className="flex items-center gap-2">
                <span className="font-headline text-2xl text-accent">5+</span>
                <span>Wertungsklassen</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};
