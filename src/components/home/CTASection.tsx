import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTASection = () => {
  return (
    <section className="section-padding bg-gradient-kl relative overflow-hidden">
      {/* Background Patterns */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-primary-foreground/10" />
        <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full border-2 border-primary-foreground/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary-foreground/5" />
      </div>

      <div className="container-kl relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary-foreground mb-6">
            BEREIT FÜR DIE CHALLENGE?
          </h2>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 leading-relaxed">
            Werde Teil der Kletterliga NRW und erlebe Wettkampf-Atmosphäre 
            in deinem eigenen Tempo. Registriere dich jetzt und starte 
            in die Saison 2026!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-10 py-6 text-lg font-semibold"
            >
              <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer">
                Jetzt registrieren
                <ArrowRight className="ml-2" size={20} />
              </a>
            </Button>
            
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-accent text-accent hover:bg-accent hover:text-primary rounded-full px-10 py-6 text-lg font-semibold"
            >
              <a href="/modus">
                Regeln & Modus
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
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
        </div>
      </div>
    </section>
  );
};
