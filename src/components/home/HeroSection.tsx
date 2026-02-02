import { ArrowRight, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-kl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full border-4 border-primary-foreground" />
        <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full border-4 border-primary-foreground" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-primary-foreground/20" />
      </div>

      {/* Content */}
      <div className="container-kl relative z-10 pt-24 pb-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in-up">
            <Mountain size={16} />
            <span>Saison 2026 startet bald</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-primary-foreground leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            DIE KLETTERLIGA NRW
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl md:text-3xl text-accent font-medium mb-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            Der landesweite Hallenkletter-Wettkampf
          </p>

          {/* Tagline */}
          <p className="text-lg sm:text-xl text-primary-foreground/80 mb-12 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            Mehrere Hallen. Eine Liga. Ein Finale.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <Button
              asChild
              size="lg"
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-8 py-6 text-lg font-semibold"
            >
              <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer">
                Jetzt teilnehmen
                <ArrowRight className="ml-2" size={20} />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary rounded-full px-8 py-6 text-lg font-semibold"
            >
              <a href="#so-funktionierts">
                So funktioniert die Liga
              </a>
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
