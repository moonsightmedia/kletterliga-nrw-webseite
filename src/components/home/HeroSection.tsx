import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoColor from "@/assets/logo-color.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-accent">
      {/* Geometric Background Elements - inspired by brand guidelines */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large blue block - bottom left */}
        <div className="absolute -bottom-20 -left-20 w-[45%] h-[70%] bg-primary rounded-tr-[4rem]" />
        
        {/* Brown accent block - top of blue */}
        <div className="absolute bottom-[55%] left-[5%] w-[25%] h-[30%] bg-secondary rounded-tr-[2rem]" />
        
        {/* Decorative circles */}
        <div className="absolute top-[15%] right-[10%] w-32 h-32 rounded-full border-4 border-primary/20" />
        <div className="absolute bottom-[20%] right-[25%] w-20 h-20 rounded-full border-4 border-secondary/30" />
        
        {/* Abstract climbing hold shape - right side */}
        <svg 
          className="absolute right-[5%] top-1/2 -translate-y-1/2 w-64 h-80 opacity-10"
          viewBox="0 0 200 300"
          fill="none"
        >
          <path 
            d="M50 20 L150 40 L180 120 L160 200 L120 280 L60 260 L20 180 L30 80 Z" 
            fill="hsl(var(--primary))"
          />
          <path 
            d="M70 60 L120 70 L140 120 L130 170 L100 200 L70 190 L50 150 L55 90 Z" 
            fill="hsl(var(--accent))"
          />
        </svg>
        
        {/* Rope/knot decorative element - subtle */}
        <svg 
          className="absolute left-[42%] bottom-[10%] w-8 h-40 opacity-20"
          viewBox="0 0 30 150"
          fill="none"
        >
          <path 
            d="M15 0 L15 40 C15 50 25 55 25 65 C25 75 5 80 5 90 C5 100 25 105 25 115 C25 125 15 130 15 150" 
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            fill="none"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="container-kl relative z-10 pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-left">
            {/* Year Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold mb-6 animate-fade-in-up">
              <span>SAISON 2026</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-primary leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              KLETTERLIGA
              <br />
              <span className="text-secondary">NRW</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-primary/80 mb-4 max-w-lg animate-fade-in-up leading-relaxed" style={{ animationDelay: "200ms" }}>
              Der landesweite Hallenkletter-Wettkampf mit digitaler Ergebniswertung und großem Finale.
            </p>

            {/* Tagline */}
            <p className="text-xl md:text-2xl font-headline text-secondary mb-10 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              Mehrere Hallen. Eine Liga. Ein Finale.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
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
          </div>

          {/* Right Column - Logo & Visual */}
          <div className="hidden lg:flex items-center justify-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <div className="relative">
              {/* Decorative ring behind logo */}
              <div className="absolute inset-0 scale-125 rounded-full border-4 border-dashed border-primary/20 animate-[spin_30s_linear_infinite]" />
              
              {/* Logo */}
              <img 
                src={logoColor} 
                alt="Kletterliga NRW Logo" 
                className="w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain relative z-10 drop-shadow-2xl"
              />
              
              {/* Stats below logo */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-8 text-center">
                <div>
                  <span className="font-headline text-3xl text-primary">6+</span>
                  <p className="text-sm text-primary/70">Hallen</p>
                </div>
                <div className="w-px h-12 bg-primary/20" />
                <div>
                  <span className="font-headline text-3xl text-primary">2</span>
                  <p className="text-sm text-primary/70">Ligen</p>
                </div>
                <div className="w-px h-12 bg-primary/20" />
                <div>
                  <span className="font-headline text-3xl text-primary">5+</span>
                  <p className="text-sm text-primary/70">Klassen</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Logo - shown only on mobile */}
        <div className="lg:hidden flex justify-center mt-12 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <img 
            src={logoColor} 
            alt="Kletterliga NRW Logo" 
            className="w-48 h-48 object-contain drop-shadow-xl"
          />
        </div>

        {/* Bottom Stats - Mobile */}
        <div className="lg:hidden flex justify-center gap-8 mt-8 text-center animate-fade-in-up" style={{ animationDelay: "500ms" }}>
          <div>
            <span className="font-headline text-2xl text-primary">6+</span>
            <p className="text-xs text-primary/70">Hallen</p>
          </div>
          <div className="w-px h-10 bg-primary/20" />
          <div>
            <span className="font-headline text-2xl text-primary">2</span>
            <p className="text-xs text-primary/70">Ligen</p>
          </div>
          <div className="w-px h-10 bg-primary/20" />
          <div>
            <span className="font-headline text-2xl text-primary">5+</span>
            <p className="text-xs text-primary/70">Klassen</p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <div className="w-6 h-10 rounded-full border-2 border-primary/50 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};
