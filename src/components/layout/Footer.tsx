import { Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

const footerLinks = {
  navigation: [
    { label: "Start", href: "/" },
    { label: "Die Liga", href: "/liga" },
    { label: "Modus & Regeln", href: "/modus" },
    { label: "Hallen", href: "/hallen" },
    { label: "Sponsoren", href: "/sponsoren" },
  ],
  legal: [
    { label: "Impressum", href: "/impressum" },
    { label: "Datenschutz", href: "/datenschutz" },
    { label: "Kontakt", href: "/kontakt" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "https://www.instagram.com/kletterliga_nrw/", label: "Instagram" },
  { icon: Mail, href: "mailto:info@kletterliga-nrw.de", label: "E-Mail" },
];

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-kl py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] gap-12 md:gap-10">
          <div>
            <Link to="/" className="inline-flex items-center gap-4 mb-6">
              <img
                src={logo}
                alt="Kletterliga NRW"
                className="w-16 h-16 md:w-20 md:h-20 object-contain flex-shrink-0"
              />
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-headline text-xl md:text-2xl text-primary-foreground tracking-wide whitespace-nowrap">
                  KLETTERLIGA
                </span>
                <span className="font-headline text-xl md:text-2xl text-accent tracking-wide whitespace-nowrap">
                  NRW
                </span>
              </div>
            </Link>
            <p className="text-primary-foreground/70 text-lg leading-relaxed max-w-md">
              Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen.
              Mehrere Hallen. Eine Liga. Ein Finale.
            </p>

            <div className="flex gap-3 mt-8">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 -skew-x-6 bg-primary-foreground/10 hover:bg-secondary flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon size={18} className="skew-x-6" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:text-right">
            <h4 className="font-headline text-xl md:text-2xl mb-6 text-accent">NAVIGATION</h4>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="block text-primary-foreground/80 hover:text-primary hover:bg-accent/90 transition-colors text-lg md:text-xl px-3 py-3 -skew-x-6"
                  >
                    <span className="skew-x-6 inline-block">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:text-right">
            <h4 className="font-headline text-xl md:text-2xl mb-6 text-accent">RECHTLICHES</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="inline-flex min-h-11 items-center text-primary-foreground/80 hover:text-primary hover:bg-accent/90 transition-colors text-base px-3 py-3 -skew-x-6"
                  >
                    <span className="skew-x-6 inline-block">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container-kl py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-primary-foreground/50 text-center md:text-left">
            <p>© {new Date().getFullYear()} Kletterliga NRW</p>
            <span className="hidden md:inline">·</span>
            <p>Mehrere Hallen. Eine Liga. Ein Finale.</p>
          </div>
          <a
            href="/app"
            className="inline-flex min-h-11 items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 -skew-x-6 font-medium hover:bg-secondary/90 transition-colors"
          >
            <span className="skew-x-6">Zum Teilnehmerbereich →</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
