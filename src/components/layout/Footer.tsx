import { Link } from "react-router-dom";
import { Instagram, Facebook, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

const footerLinks = {
  navigation: [
    { label: "Start", href: "/" },
    { label: "Die Liga", href: "/liga" },
    { label: "Modus & Regeln", href: "/modus" },
    { label: "Hallen", href: "/hallen" },
    { label: "Ranglisten", href: "/ranglisten" },
    { label: "Sponsoren", href: "/sponsoren" },
  ],
  legal: [
    { label: "Impressum", href: "/impressum" },
    { label: "Datenschutz", href: "/datenschutz" },
    { label: "Kontakt", href: "/kontakt" },
  ],
};

const socialLinks = [
  { icon: Instagram, href: "https://instagram.com/kletterliganrw", label: "Instagram" },
  { icon: Facebook, href: "https://facebook.com/kletterliganrw", label: "Facebook" },
  { icon: Mail, href: "mailto:info@kletterliga-nrw.de", label: "E-Mail" },
];

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer Content */}
      <div className="container-kl section-padding pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-3 mb-4">
              <img 
                src={logo} 
                alt="Kletterliga NRW" 
                className="w-14 h-14 object-contain"
              />
              <div>
                <span className="font-headline text-xl text-primary-foreground tracking-wide">
                  KLETTERLIGA
                </span>
                <span className="font-headline text-xl text-accent ml-1 tracking-wide">
                  NRW
                </span>
              </div>
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Der landesweite Hallenkletter-Wettkampf in Nordrhein-Westfalen.
              Mehrere Hallen. Eine Liga. Ein Finale.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-headline text-lg mb-4 text-accent">Navigation</h4>
            <ul className="space-y-2">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-headline text-lg mb-4 text-accent">Rechtliches</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Partner */}
          <div>
            <h4 className="font-headline text-lg mb-4 text-accent">Folge uns</h4>
            <div className="flex gap-3 mb-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 -skew-x-6 bg-primary-foreground/10 hover:bg-secondary flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon size={18} className="skew-x-6" />
                </a>
              ))}
            </div>
            
            {/* Partner Placeholder */}
            <h4 className="font-headline text-lg mb-3 text-accent">Partner</h4>
            <div className="flex gap-3 flex-wrap">
              <div className="h-10 w-20 -skew-x-6 bg-primary-foreground/10 flex items-center justify-center">
                <span className="skew-x-6 text-xs text-primary-foreground/50">Logo</span>
              </div>
              <div className="h-10 w-20 -skew-x-6 bg-primary-foreground/10 flex items-center justify-center">
                <span className="skew-x-6 text-xs text-primary-foreground/50">Logo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container-kl py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/50">
          <p>© {new Date().getFullYear()} Kletterliga NRW. Alle Rechte vorbehalten.</p>
          <a
            href="https://app.kletterliga-nrw.de"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 -skew-x-6 font-medium hover:bg-secondary/90 transition-colors"
          >
            <span className="skew-x-6">Zum Teilnehmerbereich →</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
