import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { usePageMeta } from "@/hooks/usePageMeta";
import { PARTICIPATION_TERMS_VERSION } from "@/data/participationConsent";

const sections = [
  "Die Teilnahme an der Kletterliga NRW setzt eine Registrierung im offiziellen Teilnehmerbereich und die Angabe wahrheitsgemäßer Daten voraus.",
  "Bestandteil der Teilnahme sind diese Teilnahmebedingungen, das veröffentlichte Regelwerk der Kletterliga NRW sowie die Datenschutzhinweise in ihrer jeweils gültigen Fassung.",
  "Die Teilnahme setzt voraus, dass Teilnehmer:innen die geltenden Hallen- und Sicherheitsregeln einhalten, vor jedem Versuch einen vollständigen Partnercheck durchführen und nur mit Sicherungsgeräten sichern, deren Bedienung sie sicher beherrschen. Ergänzend verweist die Kletterliga NRW auf die Sicherheitshinweise des DAV zum sicheren Klettern.",
  "Für die Anlage und Nutzung des Accounts verarbeitet die Kletterliga NRW die bei der Registrierung angegebenen Daten, insbesondere Name, E-Mail-Adresse, Geburtsdatum, Wertungsklasse und Ligazugehörigkeit.",
  "Die von dir angegebene E-Mail-Adresse wird für notwendige Informationen im Zusammenhang mit deinem Account und deiner Teilnahme verwendet. Dazu zählen insbesondere E-Mail-Bestätigung, Passwort-Reset, wichtige Informationen zur Qualifikation, zu Halbfinale und Finale, Fristen, organisatorische Änderungen sowie wesentliche Hinweise zum Ablauf der Saison.",
  "Diese verpflichtenden E-Mails sind Teil der Durchführung deiner Teilnahme. Sie sind nicht von der freiwilligen Anmeldung zu weiteren Informationen abhängig.",
  "Zusätzlich kannst du freiwillig einwilligen, per E-Mail Neuigkeiten, Termine, Informationen zu kommenden Saisons sowie Informationen zu Aktionen, Veranstaltungen und ausgewählten Angeboten der Kletterliga NRW und ihrer Partner zu erhalten.",
  "Die freiwillige Einwilligung wird erst wirksam, wenn du sie über den Link in der Bestätigungs-E-Mail gesondert bestätigst. Ohne diese Bestätigung erhältst du keine freiwilligen Informationsmails.",
  "Die freiwillige Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen, ohne dass dies Auswirkungen auf deinen Account oder deine Teilnahme an der Kletterliga NRW hat.",
  "Für die sportliche Wertung, Fair-Play-Regeln, Qualifikation, Halbfinale, Finale, Sanktionen und Ausschlüsse gilt das veröffentlichte Regelwerk der Kletterliga NRW.",
  "Bei falschen Angaben, Missbrauch des Accounts, Manipulationen oder schweren Verstößen gegen Regelwerk oder Hallenregeln kann ein Ausschluss von der Liga sowie von Halbfinale oder Finale erfolgen.",
  "Die jeweils aktuelle Fassung dieser Teilnahmebedingungen wird auf der Website veröffentlicht. Wesentliche Änderungen werden in geeigneter Form bekannt gegeben.",
] as const;

const Teilnahmebedingungen = () => {
  usePageMeta({
    title: "Teilnahmebedingungen",
    description:
      "Teilnahmebedingungen der Kletterliga NRW mit Trennung zwischen verpflichtenden Teilnahme-Mails und freiwilligen E-Mail-Infos.",
    canonicalPath: "/teilnahmebedingungen",
  });

  return (
    <PageLayout>
      <PageHeader
        title="TEILNAHMEBEDINGUNGEN"
        subtitle="Die verbindlichen Bedingungen für Registrierung, Teilnahme und die getrennte Nutzung deiner E-Mail-Adresse in der Kletterliga NRW."
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up">
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="rounded-lg border border-border bg-muted/40 p-6">
                <div className="font-headline text-xl text-primary">Kurz erklärt</div>
                <p className="mt-3 text-muted-foreground">
                  Deine E-Mail-Adresse wird für notwendige Informationen rund um Account, Teilnahme, Qualifikation,
                  Halbfinale, Finale und organisatorische Änderungen verwendet. Weitere Liga- und Partnerinfos per
                  E-Mail erhältst du nur, wenn du das freiwillig anforderst und anschließend per Bestätigungslink
                  separat bestätigst.
                </p>
                <p className="mt-3 text-muted-foreground">
                  <strong className="text-primary">Sicheres Klettern ist Pflicht:</strong> Partnercheck,
                  Hallenregeln und die sichere Bedienung des verwendeten Sicherungsgeräts sind verbindliche
                  Voraussetzung für die Teilnahme.
                </p>
                <a
                  href="https://www.alpenverein.de/artikel/sicher-klettern-sicherungsgeraete-richtig-bedienen_406d5638-0681-4e5e-8c12-c42e82e2ac59"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
                >
                  DAV-Sicherheitshinweise ansehen
                </a>
                <p className="mt-4 text-sm text-muted-foreground">
                  Aktuelle Fassung: <strong className="text-primary">{PARTICIPATION_TERMS_VERSION}</strong>
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <ol className="space-y-4 text-muted-foreground">
                  {sections.map((section, index) => (
                    <li key={section} className="flex items-start gap-4">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="pt-1 leading-7">{section}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                <div className="font-headline text-xl text-primary">Weiterführende Dokumente</div>
                <p className="mt-3 text-muted-foreground">
                  Für die sportliche Durchführung und die datenschutzrechtlichen Details sind diese Seiten ergänzend
                  maßgeblich:
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to="/regelwerk" className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    Regelwerk
                  </Link>
                  <Link to="/datenschutz" className="inline-flex items-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary">
                    Datenschutzhinweise
                  </Link>
                  <Link to="/modus" className="inline-flex items-center rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary">
                    Modus & Regeln
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Teilnahmebedingungen;
