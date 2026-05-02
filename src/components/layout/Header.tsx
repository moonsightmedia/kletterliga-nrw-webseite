import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { handlePublicParticipantAccess } from "@/lib/publicParticipantAccess";
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
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

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
        <div className="container-kl max-[380px]:px-3 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex min-w-0 items-center gap-2 group">
            <img 
              src={logo} 
              alt="Kletterliga NRW" 
              className="hidden sm:block w-10 h-10 md:w-12 md:h-12 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <div className="min-w-0">
              <span className="font-headline text-base sm:text-lg md:text-xl text-primary tracking-wide max-[420px]:text-[1.35rem] max-[380px]:text-[1.12rem]">
                KLETTERLIGA
              </span>
              <span className="font-headline text-base sm:text-lg md:text-xl text-secondary ml-0.5 tracking-wide max-[420px]:text-[1.35rem] max-[380px]:text-[1.12rem]">
                NRW
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 text-sm font-medium transition-colors duration-200 -skew-x-6 whitespace-nowrap",
                    isActive
                      ? "text-primary bg-accent/90"
                      : "text-foreground/80 hover:text-primary hover:bg-accent/90"
                  )
                }
              >
                <span className="skew-x-6 inline-block">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* CTA Button (Desktop) - Inside the corner */}
          <div className="hidden lg:block relative z-10">
            <Button
              className="px-6"
              onClick={(event) => handlePublicParticipantAccess(event, "/app")}
            >
              <span className="skew-x-6">Teilnehmen</span>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden min-h-10 min-w-10 flex-shrink-0 p-2 text-foreground hover:bg-accent/50 rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-primary/15 backdrop-blur-sm pt-24 px-4 pb-4">
            <div
              className="absolute inset-0"
              aria-hidden="true"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav className="relative z-10 container-kl max-w-md ml-auto bg-background rounded-2xl border border-border shadow-2xl p-4 flex flex-col gap-2 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <div className="px-2 pb-2 border-b border-border/70">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Navigation
                </p>
              </div>
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "min-h-12 px-4 py-3 text-base font-medium transition-colors -skew-x-6 flex items-center rounded-sm",
                      isActive
                        ? "text-primary bg-accent/90"
                        : "text-foreground hover:text-primary hover:bg-accent/90"
                    )
                  }
                >
                  <span className="skew-x-6 inline-block">{item.label}</span>
                </NavLink>
              ))}
              <div className="pt-4 mt-2 border-t border-border">
                <Button
                  variant="secondary"
                  className="w-full min-h-12"
                  onClick={(event) => handlePublicParticipantAccess(event, "/app")}
                >
                  <span className="skew-x-6">Jetzt teilnehmen</span>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
