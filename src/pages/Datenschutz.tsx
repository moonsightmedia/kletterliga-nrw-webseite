import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { legalInfo } from "@/data/legal";
import { usePageMeta } from "@/hooks/usePageMeta";

const Datenschutz = () => {
  usePageMeta({
    title: "Datenschutz",
    description: "Datenschutzhinweise der Kletterliga NRW.",
    canonicalPath: "/datenschutz",
  });

  return (
    <PageLayout>
      <PageHeader title="DATENSCHUTZ" />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up">
            <div className="max-w-3xl mx-auto prose prose-lg">
              <h2 className="font-headline text-2xl text-primary mb-4">1. Datenschutz auf einen Blick</h2>
              
              <h3 className="font-headline text-xl text-primary mt-6 mb-3">Allgemeine Hinweise</h3>
              <p className="text-muted-foreground">
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit 
                Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. 
                Personenbezogene Daten sind alle Daten, mit denen Sie persönlich 
                identifiziert werden können.
              </p>

              <h3 className="font-headline text-xl text-primary mt-6 mb-3">Datenerfassung auf dieser Website</h3>
              <p className="text-muted-foreground">
                <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. 
                Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">2. Hosting</h2>
              <p className="text-muted-foreground">
                {legalInfo.hostingNote}
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
              
              <h3 className="font-headline text-xl text-primary mt-6 mb-3">Datenschutz</h3>
              <p className="text-muted-foreground">
                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten 
                sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und 
                entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser 
                Datenschutzerklärung.
              </p>

              <h3 className="font-headline text-xl text-primary mt-6 mb-3">Hinweis zur verantwortlichen Stelle</h3>
              <p className="text-muted-foreground">
                Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br /><br />
                {legalInfo.organizationName}<br />
                {legalInfo.addressLines[0]}<br />
                {legalInfo.addressLines[1]}<br /><br />
                E-Mail: {legalInfo.privacyEmail}
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">4. Datenerfassung auf dieser Website</h2>
              
              <h3 className="font-headline text-xl text-primary mt-6 mb-3">Cookies</h3>
              <p className="text-muted-foreground">
                Unsere Internetseiten verwenden teilweise so genannte Cookies. Cookies 
                richten auf Ihrem Rechner keinen Schaden an und enthalten keine Viren. 
                Cookies dienen dazu, unser Angebot nutzerfreundlicher, effektiver und 
                sicherer zu machen.
              </p>

              <h3 className="font-headline text-xl text-primary mt-6 mb-3">Server-Log-Dateien</h3>
              <p className="text-muted-foreground">
                Der Provider der Seiten erhebt und speichert automatisch Informationen 
                in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns 
                übermittelt.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">5. Ihre Rechte</h2>
              <p className="text-muted-foreground">
                Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, 
                Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu 
                erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung 
                dieser Daten zu verlangen. Hierzu sowie zu weiteren Fragen zum Thema 
                Datenschutz können Sie sich jederzeit an uns wenden.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Datenschutz;
