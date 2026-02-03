import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "Start", href: "/" },
  { label: "Die Liga", href: "/liga" },
  { label: "Modus & Regeln", href: "/modus" },
  { label: "Hallen", href: "/hallen" },
  { label: "Ranglisten", href: "/ranglisten" },
  { label: "Sponsoren", href: "/sponsoren" },
];

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Top Corner Accent - Static, doesn't scroll */}
      <div className="absolute top-8 right-0 z-30 overflow-hidden pointer-events-none hidden lg:block">
        <div 
          className="bg-secondary w-[280px] h-[140px]"
          style={{
            clipPath: 'polygon(100% 0, 30% 0, 100% 100%)',
          }}
        />
      </div>

      <header
        className={cn(
          "fixed top-8 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-background/95 backdrop-blur-md shadow-md py-2"
            : "bg-transparent py-4"
        )}
      >
        <div className="container-kl flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="Kletterliga NRW" 
              className="w-10 h-10 md:w-12 md:h-12 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <div className="hidden sm:block">
              <span className="font-headline text-lg md:text-xl text-primary tracking-wide">
                KLETTERLIGA
              </span>
              <span className="font-headline text-lg md:text-xl text-secondary ml-1 tracking-wide">
                NRW
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="px-4 py-2 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-accent/90 transition-colors duration-200 -skew-x-6"
              >
                <span className="skew-x-6 inline-block">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* CTA Button (Desktop) - Inside the corner */}
          <div className="hidden lg:block relative z-10">
            <Button
              asChild
              className="px-6"
            >
              <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer">
                <span className="skew-x-6">Teilnehmen</span>
              </a>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-foreground hover:bg-accent/50 rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "lg:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg transition-all duration-300 overflow-hidden",
            isMobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav className="container-kl py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-3 text-base font-medium text-foreground hover:text-primary hover:bg-accent/90 transition-colors -skew-x-6"
              >
                <span className="skew-x-6 inline-block">{item.label}</span>
              </Link>
            ))}
            <div className="pt-4 mt-2 border-t border-border">
              <Button
                asChild
                variant="secondary"
                className="w-full"
              >
                <a href="https://app.kletterliga-nrw.de" target="_blank" rel="noopener noreferrer">
                  <span className="skew-x-6">Jetzt teilnehmen</span>
                </a>
              </Button>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
};
