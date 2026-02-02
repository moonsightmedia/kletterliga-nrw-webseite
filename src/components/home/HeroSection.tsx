import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoColor from "@/assets/logo-color.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-accent">
      {/* Geometric Background Elements - positioned to not overlap content */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large blue block - bottom left, behind content */}
        <div 
          className="absolute bottom-0 left-0 w-[40%] md:w-[35%] lg:w-[30%] h-[65%] bg-primary"
          style={{ borderTopRightRadius: '3rem' }}
        />
        
        {/* Brown accent block - on top of blue */}
        <div 
          className="absolute bottom-[50%] left-0 w-[20%] md:w-[18%] lg:w-[15%] h-[25%] bg-secondary"
          style={{ borderTopRightRadius: '2rem' }}
        />
        
        {/* Decorative elements - right side */}
        <div className="hidden lg:block absolute top-[12%] right-[8%] w-36 h-36 rounded-full border-[3px] border-primary/15" />
        <div className="hidden lg:block absolute top-[45%] right-[3%] w-24 h-24 rounded-full border-[3px] border-primary/10" />
        
        {/* Dashed decorative arc */}
        <svg 
          className="hidden lg:block absolute right-[15%] top-[30%] w-48 h-64 opacity-30"
          viewBox="0 0 100 150"
          fill="none"
        >
          <path 
            d="M90 10 C 100 60, 80 120, 50 145" 
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="6 4"
            fill="none"
          />
        </svg>
        
        {/* Subtle rope element */}
        <svg 
          className="hidden md:block absolute left-[38%] bottom-[5%] w-6 h-32 opacity-20"
          viewBox="0 0 24 120"
          fill="none"
        >
          <path 
            d="M12 0 L12 35 C12 45 20 50 20 60 C20 70 4 75 4 85 C4 95 20 100 20 110 L12 120" 
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      {/* Content - with proper z-index and padding */}
      <div className="container-kl relative z-10 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Column - Text Content */}
          <div className="pl-4 md:pl-8 lg:pl-12">
            {/* Year Badge */}
            <div className="inline-flex items-center bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold mb-8 animate-fade-in-up">
              SAISON 2026
            </div>

            {/* Main Headline */}
            <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-primary leading-[0.95] mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              KLETTERLIGA
              <br />
              <span className="text-secondary">NRW</span>
            </h1>

            {/* Description */}
            <p className="text-base md:text-lg text-primary/70 mb-3 max-w-md animate-fade-in-up leading-relaxed" style={{ animationDelay: "200ms" }}>
              Der landesweite Hallenkletter-Wettkampf mit digitaler Ergebniswertung und großem Finale.
            </p>

            {/* Tagline */}
            <p className="text-lg md:text-xl font-headline text-secondary mb-10 animate-fade-in-up tracking-wide" style={{ animationDelay: "250ms" }}>
              MEHRERE HALLEN. EINE LIGA. EIN FINALE.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <Button
                asChild
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer">
                  Jetzt teilnehmen
                  <ArrowRight className="ml-2" size={18} />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-full px-8 py-6 text-base font-semibold transition-all"
              >
                <a href="#so-funktionierts">
                  So funktioniert's
                </a>
              </Button>
            </div>
          </div>

          {/* Right Column - Logo */}
          <div className="hidden lg:flex items-center justify-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
            <div className="relative flex flex-col items-center">
              {/* Dashed rotating ring */}
              <div 
                className="absolute w-[380px] h-[380px] rounded-full border-2 border-dashed border-primary/25"
                style={{ animation: 'spin 40s linear infinite' }}
              />
              
              {/* Logo */}
              <img 
                src={logoColor} 
                alt="Kletterliga NRW Logo" 
                className="w-72 h-72 lg:w-80 lg:h-80 object-contain relative z-10"
              />
              
              {/* Stats below logo */}
              <div className="flex gap-10 mt-10 text-center">
                <div>
                  <span className="font-headline text-3xl text-primary">6+</span>
                  <p className="text-sm text-primary/60 mt-1">Hallen</p>
                </div>
                <div className="w-px h-12 bg-primary/20 self-center" />
                <div>
                  <span className="font-headline text-3xl text-secondary">2</span>
                  <p className="text-sm text-primary/60 mt-1">Ligen</p>
                </div>
                <div className="w-px h-12 bg-primary/20 self-center" />
                <div>
                  <span className="font-headline text-3xl text-primary">5+</span>
                  <p className="text-sm text-primary/60 mt-1">Klassen</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Logo & Stats */}
        <div className="lg:hidden flex flex-col items-center mt-16 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <img 
            src={logoColor} 
            alt="Kletterliga NRW Logo" 
            className="w-44 h-44 object-contain"
          />
          
          <div className="flex gap-8 mt-8 text-center">
            <div>
              <span className="font-headline text-2xl text-primary">6+</span>
              <p className="text-xs text-primary/60">Hallen</p>
            </div>
            <div className="w-px h-10 bg-primary/20 self-center" />
            <div>
              <span className="font-headline text-2xl text-secondary">2</span>
              <p className="text-xs text-primary/60">Ligen</p>
            </div>
            <div className="w-px h-10 bg-primary/20 self-center" />
            <div>
              <span className="font-headline text-2xl text-primary">5+</span>
              <p className="text-xs text-primary/60">Klassen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
        <div className="w-6 h-10 rounded-full border-2 border-primary/40 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary/40 rounded-full" />
        </div>
      </div>
    </section>
  );
};
