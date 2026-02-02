import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoColor from "@/assets/logo-color.png";

export const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center bg-accent pt-20">
      <div className="container-kl py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <img 
            src={logoColor} 
            alt="Kletterliga NRW Logo" 
            className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-8 animate-fade-in-up"
          />

          {/* Badge */}
          <div className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold mb-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            SAISON 2026
          </div>

          {/* Headline */}
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-primary leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            KLETTERLIGA <span className="text-secondary">NRW</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-primary/80 mb-4 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            Der landesweite Hallenkletter-Wettkampf mit digitaler Ergebniswertung und großem Finale.
          </p>

          {/* Tagline */}
          <p className="font-headline text-xl md:text-2xl text-secondary mb-10 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            Mehrere Hallen. Eine Liga. Ein Finale.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
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
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-full px-8 py-6 text-lg font-semibold"
            >
              <a href="#so-funktionierts">
                So funktioniert's
              </a>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 md:gap-12 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
            <div className="text-center">
              <span className="font-headline text-3xl md:text-4xl text-primary">6+</span>
              <p className="text-sm text-primary/60">Hallen</p>
            </div>
            <div className="w-px h-12 bg-primary/20" />
            <div className="text-center">
              <span className="font-headline text-3xl md:text-4xl text-secondary">2</span>
              <p className="text-sm text-primary/60">Ligen</p>
            </div>
            <div className="w-px h-12 bg-primary/20" />
            <div className="text-center">
              <span className="font-headline text-3xl md:text-4xl text-primary">5+</span>
              <p className="text-sm text-primary/60">Klassen</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
