import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "Start", href: "/" },
  { label: "Saison 2026", href: "/saison/2026" },
  { label: "Ergebnisse", href: "/ergebnisse/2026" },
];

export const SeasonPreviewHeader = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setIsMobileMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
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

      <Dialog.Root open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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
                    "px-3 py-2 text-sm font-medium transition-colors duration-200 -skew-x-6 whitespace-nowrap xl:px-4",
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
              asChild
              className="px-6"
            >
              <Link to="/saison/2027">
                <span className="skew-x-6">Saison 2027</span>
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Dialog.Trigger asChild><button
            className="lg:hidden min-h-11 min-w-11 flex-shrink-0 p-2 text-foreground hover:bg-accent/50 rounded-lg transition-colors"
            aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button></Dialog.Trigger>
        </div>

        {/* Mobile Navigation */}
        <Dialog.Portal>
          <Dialog.Overlay className="sp-mobile-menu-overlay" />
          <Dialog.Content className="sp-mobile-menu bg-background border border-border shadow-2xl p-4">
              <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/70">
                <Dialog.Title className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Navigation</Dialog.Title>
                <Dialog.Close className="sp-mobile-menu-close" aria-label="Menü schließen"><X size={22} /></Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">Wähle Start, Saisonrückblick, Ergebnisse oder Ausblick.</Dialog.Description>
              <nav id="mobile-navigation" aria-label="Hauptnavigation" className="flex flex-col gap-2 pt-2">
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
                  asChild
                  variant="secondary"
                  className="w-full min-h-12"
                >
                  <Link to="/saison/2027" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="skew-x-6">Ausblick 2027</span>
                  </Link>
                </Button>
              </div>
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </header>
      </Dialog.Root>
    </>
  );
};
