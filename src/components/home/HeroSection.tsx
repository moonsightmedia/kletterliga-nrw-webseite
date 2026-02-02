import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoColor from "@/assets/logo-color.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-accent overflow-hidden">
      {/* Paper Texture Effect */}
      <div 
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Diagonal Stripes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Main diagonal stripe */}
        <div 
          className="absolute bg-accent-foreground/[0.06] w-[200%] h-32 md:h-48"
          style={{
            top: '30%',
            left: '-50%',
            transform: 'rotate(-15deg)',
          }}
        />
        {/* Second diagonal stripe */}
        <div 
          className="absolute bg-accent-foreground/[0.04] w-[200%] h-24 md:h-36"
          style={{
            top: '55%',
            left: '-50%',
            transform: 'rotate(-15deg)',
          }}
        />
      </div>


      <div className="container-kl relative z-10 py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div 
              className="inline-flex items-center bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold mb-8 animate-fade-in-up shadow-lg"
            >
              <span className="w-2 h-2 bg-secondary rounded-full mr-2 animate-pulse" />
              SAISON 2026
            </div>

            {/* Headline */}
            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl xl:text-7xl text-primary leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              KLETTERLIGA{" "}
              <span className="text-secondary block sm:inline">NRW</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-primary/75 mb-4 max-w-xl mx-auto lg:mx-0 animate-fade-in-up leading-relaxed" style={{ animationDelay: "150ms" }}>
              Der landesweite Hallenkletter-Wettkampf mit digitaler Ergebniswertung und großem Finale.
            </p>

            {/* Tagline */}
            <p className="font-headline text-xl md:text-2xl text-secondary mb-10 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              Mehrere Hallen. Eine Liga. Ein Finale.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="px-8 py-6 text-lg shadow-lg hover:shadow-xl"
              >
                <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer">
                  <span className="skew-x-6">Jetzt teilnehmen</span>
                  <ArrowRight className="ml-2 skew-x-6" size={20} />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-6 text-lg"
              >
                <a href="#so-funktionierts">
                  <span className="skew-x-6">So funktioniert's</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Right Content - Logo & Stats */}
          <div className="order-1 lg:order-2 flex flex-col items-center animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            {/* Logo with Glow Effect */}
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-110" />
              <img 
                src={logoColor} 
                alt="Kletterliga NRW Logo" 
                className="relative w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 object-contain drop-shadow-2xl"
              />
            </div>

            {/* Stats Cards */}
            <div className="flex gap-6 md:gap-8">
              <div className="text-center bg-primary/5 backdrop-blur-sm rounded-2xl px-6 py-4 border border-primary/10">
                <span className="font-headline text-3xl md:text-4xl text-primary block">6+</span>
                <p className="text-sm text-primary/60 font-medium">Hallen</p>
              </div>
              <div className="text-center bg-secondary/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-secondary/20">
                <span className="font-headline text-3xl md:text-4xl text-secondary block">2</span>
                <p className="text-sm text-primary/60 font-medium">Ligen</p>
              </div>
              <div className="text-center bg-primary/5 backdrop-blur-sm rounded-2xl px-6 py-4 border border-primary/10">
                <span className="font-headline text-3xl md:text-4xl text-primary block">5+</span>
                <p className="text-sm text-primary/60 font-medium">Klassen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <a href="#so-funktionierts" className="text-primary/40 hover:text-primary transition-colors">
            <ChevronDown size={32} />
          </a>
        </div>
      </div>
    </section>
  );
};
