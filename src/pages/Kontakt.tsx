import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { Mail, Instagram, Facebook } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/services/supabase";

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
  {
    icon: Facebook,
    title: "Facebook",
    description: "Besuch uns auf Facebook",
    value: "Kletterliga NRW",
    href: "https://www.facebook.com/KletterligaNRW",
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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSending(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject || "Kontaktanfrage",
          message: formData.message,
        },
      });

      if (fnError) {
        setError(fnError.message || "Nachricht konnte nicht gesendet werden. Bitte versuche es per E-Mail.");
        return;
      }

      if (data?.error) {
        setError(typeof data.error === "string" ? data.error : "Senden fehlgeschlagen. Bitte per E-Mail versuchen.");
        return;
      }

      setSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (e) {
      setError("Nachricht konnte nicht gesendet werden. Bitte versuche es per E-Mail (info@kletterliga-nrw.de).");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader 
        title="KONTAKT" 
        subtitle="Fragen, Anregungen oder Feedback? Wir freuen uns von dir zu hören!"
      />

      {/* Die Gesichter hinter der Kletterliga */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <div className="max-w-3xl mx-auto">
            <AnimatedSection animation="fade-up" className="text-center mb-8">
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-2">
                DIE GESICHTER HINTER DER KLETTERLIGA
              </h2>
              <p className="text-muted-foreground">
                Organisation, Technik und Ansprechpartner für alle Fragen rund um die Liga
              </p>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                <div className="card-kl p-6 flex flex-col items-center text-center w-full min-w-0">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 flex-shrink-0 shrink-0">
                    <img
                      src="/images/rene-brehm.png"
                      alt="René Brehm"
                      className="absolute inset-0 size-full object-cover object-[50%_10%]"
                    />
                  </div>
                  <h3 className="font-headline text-xl text-primary mb-1">René Brehm</h3>
                  <p className="text-muted-foreground text-sm">
                    Organisation, Technik und Ansprechpartner für alle Fragen rund um die Liga.
                  </p>
                </div>

                <div className="card-kl p-6 flex flex-col items-center text-center w-full min-w-0">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 flex-shrink-0 shrink-0">
                    <img
                      src="/images/janosch-althoff.png"
                      alt="Janosch Althoff"
                      className="absolute inset-0 size-full object-cover object-center"
                    />
                  </div>
                  <h3 className="font-headline text-xl text-primary mb-1">Janosch Althoff</h3>
                  <p className="text-muted-foreground text-sm">
                    Organisation, Technik und Ansprechpartner für alle Fragen rund um die Liga.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/50">
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
              {sent ? (
                <div className="card-kl p-8 text-center">
                  <p className="text-primary font-medium mb-2">Nachricht gesendet!</p>
                  <p className="text-muted-foreground text-sm">
                    Vielen Dank. Wir melden uns so schnell wie möglich bei dir.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSent(false)}
                  >
                    Weitere Nachricht senden
                  </Button>
                </div>
              ) : (
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
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <div className="flex flex-col items-end gap-2">
                    <Button type="submit" variant="secondary" disabled={sending}>
                      {sending ? "Wird gesendet …" : "Nachricht senden"}
                    </Button>
                  </div>
                </form>
              )}
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Kontakt;
