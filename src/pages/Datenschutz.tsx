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
                übermittelt. Dies sind: Browsertyp und Browserversion, verwendetes 
                Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit 
                der Serveranfrage und IP-Adresse. Eine Zusammenführung dieser Daten mit 
                anderen Datenquellen wird nicht vorgenommen. Die Erfassung dieser Daten 
                erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">5. Registrierung und Nutzerkonto</h2>
              <p className="text-muted-foreground">
                Wenn Sie sich für ein Nutzerkonto registrieren, erheben und speichern wir 
                folgende Daten: E-Mail-Adresse, Name, Geburtsdatum, Geschlecht, gewählte Liga 
                (Toprope oder Lead) und optional ein Profilbild. Diese Daten werden benötigt, 
                um Ihnen die Teilnahme an der Kletterliga NRW zu ermöglichen und Ihre 
                Ergebnisse zu verwalten. Die Rechtsgrundlage für die Verarbeitung ist Art. 6 
                Abs. 1 lit. b DSGVO (Vertragserfüllung).
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">6. Ergebniseintragung und Ranglisten</h2>
              <p className="text-muted-foreground">
                Wenn Sie Kletterergebnisse in der App eintragen, werden diese Daten gespeichert 
                und in den öffentlichen Ranglisten veröffentlicht. Dazu gehören: gekletterte 
                Routen, erreichte Zonen, Flash-Status und Zeitpunkt der Eintragung. Diese Daten 
                werden öffentlich angezeigt, um die Wettbewerbsfunktion der Liga zu gewährleisten. 
                Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Ihr 
                Einverständnis durch die Teilnahme an der Liga.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">7. Kontaktformular und E-Mail-Kommunikation</h2>
              <p className="text-muted-foreground">
                Wenn Sie uns per Kontaktformular oder E-Mail kontaktieren, werden Ihre Angaben 
                aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten 
                zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns 
                gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die 
                Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, 
                sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur 
                Durchführung vorvertraglicher Maßnahmen erforderlich ist.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">8. Speicherdauer</h2>
              <p className="text-muted-foreground">
                Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer 
                genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck 
                für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen 
                geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden 
                Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für 
                die Speicherung Ihrer personenbezogenen Daten haben.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">9. SSL- bzw. TLS-Verschlüsselung</h2>
              <p className="text-muted-foreground">
                Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung 
                vertraulicher Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie 
                an uns als Seitenbetreiber senden, eine SSL- bzw. TLS-Verschlüsselung. Eine 
                verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers 
                von "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer 
                Browserzeile.
              </p>

              <h2 className="font-headline text-2xl text-primary mt-8 mb-4">10. Ihre Rechte</h2>
              <p className="text-muted-foreground">
                Sie haben folgende Rechte:
              </p>
              <ul className="text-muted-foreground list-disc list-inside space-y-2">
                <li>
                  <strong>Recht auf Auskunft</strong> (Art. 15 DSGVO): Sie haben das Recht, 
                  Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu erhalten.
                </li>
                <li>
                  <strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO): Sie haben das Recht, 
                  die Berichtigung unrichtiger oder die Vervollständigung Ihrer bei uns gespeicherten 
                  personenbezogenen Daten zu verlangen.
                </li>
                <li>
                  <strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Sie haben das Recht, die 
                  Löschung Ihrer personenbezogenen Daten zu verlangen, soweit nicht gesetzliche 
                  Aufbewahrungspflichten bestehen.
                </li>
                <li>
                  <strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO): 
                  Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen 
                  Daten zu verlangen.
                </li>
                <li>
                  <strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO): Sie haben das 
                  Recht, Ihre personenbezogenen Daten in einem strukturierten, gängigen und 
                  maschinenlesbaren Format zu erhalten.
                </li>
                <li>
                  <strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Sie haben das Recht, aus 
                  Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die 
                  Verarbeitung Sie betreffender personenbezogener Daten, die aufgrund von Art. 6 
                  Abs. 1 lit. e oder f DSGVO erfolgt, Widerspruch einzulegen.
                </li>
                <li>
                  <strong>Widerruf der Einwilligung</strong>: Wenn Sie uns eine Einwilligung erteilt 
                  haben, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.
                </li>
                <li>
                  <strong>Beschwerderecht</strong>: Sie haben das Recht, sich bei einer 
                  Aufsichtsbehörde über unsere Datenverarbeitung zu beschweren. Zuständig ist die 
                  Aufsichtsbehörde des Bundeslandes, in dem Sie wohnen oder arbeiten, oder die 
                  Aufsichtsbehörde unseres Unternehmenssitzes.
                </li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Um Ihre Rechte auszuüben, können Sie sich jederzeit an uns wenden unter:{" "}
                <a href={`mailto:${legalInfo.privacyEmail}`} className="text-primary underline">
                  {legalInfo.privacyEmail}
                </a>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Datenschutz;
