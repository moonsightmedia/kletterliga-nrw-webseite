import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { Mail, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";

const contactMethods = [
  {
    icon: Mail,
    title: "E-Mail",
    description: "Für allgemeine Anfragen",
    value: "info@kletterliga-nrw.de",
    href: "mailto:info@kletterliga-nrw.de",
  },
  {
    icon: Instagram,
    title: "Instagram",
    description: "Folge uns für Updates",
    value: "@kletterliga_nrw",
    href: "https://www.instagram.com/kletterliga_nrw/",
  },
];

const Kontakt = () => {
  usePageMeta({
    title: "Kontakt",
    description:
      "So erreichst du die Kletterliga NRW – Fragen, Feedback oder Partnerschaften.",
    canonicalPath: "/kontakt",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = formData.subject || "Kontaktanfrage";
    const body = [
      `Name: ${formData.name}`,
      `E-Mail: ${formData.email}`,
      "",
      formData.message,
    ].join("\n");
    const mailto = `mailto:info@kletterliga-nrw.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <PageLayout>
      <PageHeader 
        title="KONTAKT" 
        subtitle="Fragen, Anregungen oder Feedback? Wir freuen uns von dir zu hören!"
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {contactMethods.map((method, index) => (
              <AnimatedSection key={method.title} animation="fade-up" delay={index * 100}>
                <a 
                  href={method.href}
                  target={method.href.startsWith("http") ? "_blank" : undefined}
                  rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="card-kl flex flex-col items-center text-center p-8 group cursor-pointer h-full"
                >
                  <div className="w-16 h-16 mb-4 -skew-x-6 bg-accent flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
                    <method.icon className="skew-x-6 text-primary group-hover:text-secondary-foreground transition-colors duration-300" size={28} />
                  </div>
                  <h3 className="font-headline text-xl text-primary mb-1">{method.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{method.description}</p>
                  <span className="text-secondary font-medium">{method.value}</span>
                </a>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection animation="fade-up" className="text-center mb-8">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
                SCHREIB UNS
              </h2>
              <p className="text-muted-foreground">
                Nutze das Formular und wir melden uns so schnell wie möglich.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <form onSubmit={handleSubmit} className="card-kl space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-primary" htmlFor="contact-name">
                      Name
                    </label>
                    <Input
                      id="contact-name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Dein Name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-primary" htmlFor="contact-email">
                      E-Mail
                    </label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="name@email.de"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-primary" htmlFor="contact-subject">
                    Betreff
                  </label>
                  <Input
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(event) => setFormData((prev) => ({ ...prev, subject: event.target.value }))}
                    placeholder="Worum geht es?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-primary" htmlFor="contact-message">
                    Nachricht
                  </label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Deine Nachricht"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="secondary">
                    Nachricht senden
                  </Button>
                </div>
              </form>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Additional Contact Info */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-6">
                SPEZIFISCHE ANFRAGEN
              </h2>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-lg text-primary mb-2">Für Hallen</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Interesse als Partner-Halle teilzunehmen?
                  </p>
                  <a 
                    href="mailto:hallen@kletterliga-nrw.de"
                    className="text-secondary hover:underline font-medium"
                  >
                    hallen@kletterliga-nrw.de
                  </a>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-lg text-primary mb-2">Für Sponsoren</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Interesse an einer Partnerschaft?
                  </p>
                  <a 
                    href="mailto:sponsoring@kletterliga-nrw.de"
                    className="text-secondary hover:underline font-medium"
                  >
                    sponsoring@kletterliga-nrw.de
                  </a>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-lg text-primary mb-2">Presse</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Medienanfragen und Pressematerial
                  </p>
                  <a 
                    href="mailto:presse@kletterliga-nrw.de"
                    className="text-secondary hover:underline font-medium"
                  >
                    presse@kletterliga-nrw.de
                  </a>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-lg text-primary mb-2">Technischer Support</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Probleme mit der App oder Ergebniswertung?
                  </p>
                  <a 
                    href="mailto:support@kletterliga-nrw.de"
                    className="text-secondary hover:underline font-medium"
                  >
                    support@kletterliga-nrw.de
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Kontakt;
