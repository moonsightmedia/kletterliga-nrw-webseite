import { Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import { handlePublicParticipantAccess } from "@/lib/publicParticipantAccess";
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
    { label: "Teilnahmebedingungen", href: "/teilnahmebedingungen" },
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
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] md:gap-10">
          <div>
            <Link to="/" className="mb-6 inline-flex items-center gap-4">
              <img
                src={logo}
                alt="Kletterliga NRW"
                className="h-16 w-16 flex-shrink-0 object-contain md:h-20 md:w-20"
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-headline whitespace-nowrap text-xl tracking-wide text-primary-foreground md:text-2xl">
                  KLETTERLIGA
                </span>
                <span className="font-headline whitespace-nowrap text-xl tracking-wide text-accent md:text-2xl">
                  NRW
                </span>
              </div>
            </Link>
            <p className="max-w-md text-lg leading-relaxed text-primary-foreground/70">
              Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen. Mehrere Hallen. Eine Liga. Ein Finale.
            </p>

            <div className="mt-8 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center -skew-x-6 bg-primary-foreground/10 transition-colors hover:bg-secondary"
                  aria-label={social.label}
                >
                  <social.icon size={18} className="skew-x-6" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:text-right">
            <h4 className="mb-6 font-headline text-xl text-accent md:text-2xl">NAVIGATION</h4>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="block -skew-x-6 px-3 py-3 text-lg text-primary-foreground/80 transition-colors hover:bg-accent/90 hover:text-primary md:text-xl"
                  >
                    <span className="inline-block skew-x-6">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:text-right">
            <h4 className="mb-6 font-headline text-xl text-accent md:text-2xl">RECHTLICHES</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="inline-flex min-h-11 items-center -skew-x-6 px-3 py-3 text-base text-primary-foreground/80 transition-colors hover:bg-accent/90 hover:text-primary"
                  >
                    <span className="inline-block skew-x-6">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container-kl flex flex-col items-center justify-between gap-4 py-6 text-sm md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-primary-foreground/50 md:justify-start md:text-left">
            <p>© {new Date().getFullYear()} Kletterliga NRW</p>
            <span className="hidden md:inline">·</span>
            <p>Mehrere Hallen. Eine Liga. Ein Finale.</p>
          </div>
          <button
            type="button"
            onClick={(event) => handlePublicParticipantAccess(event, "/app")}
            className="inline-flex min-h-11 items-center gap-2 bg-secondary px-4 py-2 -skew-x-6 font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            <span className="skew-x-6">Zum Teilnehmerbereich →</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
