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
      <PageHeader
        title="DATENSCHUTZ"
        subtitle="Hier findest du die Datenschutzhinweise der Kletterliga NRW mit der klaren Trennung zwischen notwendigen Teilnahme-Mails und freiwilligen E-Mail-Infos."
      />

      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up">
            <div className="mx-auto max-w-4xl space-y-8">
              <div className="rounded-lg border border-border bg-muted/40 p-6">
                <h2 className="font-headline text-2xl text-primary">1. Verantwortliche Stelle</h2>
                <p className="mt-4 text-muted-foreground">
                  Verantwortlich für die Datenverarbeitung auf dieser Website und im Teilnehmerbereich ist:
                </p>
                <p className="mt-4 text-muted-foreground">
                  {legalInfo.organizationName}
                  <br />
                  {legalInfo.addressLines[0]}
                  <br />
                  {legalInfo.addressLines[1]}
                  <br />
                  E-Mail: {legalInfo.privacyEmail}
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">2. Hosting und technische Bereitstellung</h2>
                <p className="mt-4 text-muted-foreground">{legalInfo.hostingNote}</p>
                <p className="mt-4 text-muted-foreground">
                  Zusätzlich verarbeitet unser Hosting- und Infrastruktursetup technische Zugriffsdaten wie IP-Adresse,
                  Zeitpunkt des Zugriffs, Referrer, Browsertyp und Betriebssystem, um die Website sicher und stabil
                  bereitzustellen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">3. Registrierung und Nutzerkonto</h2>
                <p className="mt-4 text-muted-foreground">
                  Wenn du ein Konto für die Kletterliga NRW anlegst, verarbeiten wir insbesondere Name, E-Mail-Adresse,
                  Geburtsdatum, Geschlecht, Ligawahl, optional die Heimathalle sowie technisch notwendige Accountdaten.
                  Diese Daten benötigen wir, um deinen Account bereitzustellen, die Teilnahme zu organisieren und
                  deine Ergebnisse zu verwalten.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da diese Verarbeitung für die Durchführung deiner
                  Teilnahme und die Nutzung des Teilnehmerbereichs erforderlich ist.
                </p>
              </div>

              <div className="rounded-lg border border-primary/10 bg-primary/5 p-6">
                <h2 className="font-headline text-2xl text-primary">4. Notwendige E-Mails zur Teilnahme</h2>
                <p className="mt-4 text-muted-foreground">
                  Deine E-Mail-Adresse verwenden wir für notwendige Informationen zu deinem Account und deiner Teilnahme.
                  Dazu gehören insbesondere:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>E-Mail-Bestätigung und Login-bezogene Nachrichten</li>
                  <li>Passwort-Reset und sicherheitsrelevante Hinweise</li>
                  <li>wichtige Informationen zur Qualifikation, zu Halbfinale und Finale</li>
                  <li>Fristen, organisatorische Änderungen und wesentliche Hinweise zum Saisonablauf</li>
                </ul>
                <p className="mt-4 text-muted-foreground">
                  Diese Nachrichten sind Bestandteil der Durchführung deiner Teilnahme. Rechtsgrundlage ist Art. 6 Abs. 1
                  lit. b DSGVO. Sie sind nicht von einer freiwilligen Marketing- oder Info-Einwilligung abhängig.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">5. Freiwillige Liga- und Partnerinfos per E-Mail</h2>
                <p className="mt-4 text-muted-foreground">
                  Zusätzlich kannst du freiwillig einwilligen, per E-Mail Neuigkeiten, Termine, Informationen zu
                  kommenden Saisons sowie Informationen zu Aktionen, Veranstaltungen und ausgewählten Angeboten der
                  Kletterliga NRW und ihrer Partner zu erhalten.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Rechtsgrundlage hierfür ist Art. 6 Abs. 1 lit. a DSGVO. Die Einwilligung ist vollständig freiwillig
                  und hat keine Auswirkungen auf deinen Account oder deine Teilnahme.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Wir setzen für diese freiwilligen E-Mails ein Double-Opt-In-Verfahren ein. Das bedeutet: Erst wenn du
                  den Bestätigungslink aus der gesonderten E-Mail anklickst, senden wir dir freiwillige Informationsmails.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Deine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen, zum Beispiel über den
                  Abmeldelink in einer E-Mail oder in den Benachrichtigungseinstellungen deines Profils.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">6. Ergebniseintragung und öffentliche Ranglisten</h2>
                <p className="mt-4 text-muted-foreground">
                  Wenn du Kletterergebnisse in der App einträgst, verarbeiten wir Angaben zu besuchten Hallen, gekletterten
                  Routen, erreichten Zonen, Flash-Status und Zeitpunkten der Eintragung. Diese Daten werden für
                  Ranglisten, Saisonwertung und die Durchführung des Wettbewerbs verwendet.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Soweit Ergebnisse, Ranglisten oder Profile öffentlich
                  sichtbar sind, erfolgt dies als wesentlicher Bestandteil des sportlichen Wettkampfformats.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">7. Kontaktaufnahme</h2>
                <p className="mt-4 text-muted-foreground">
                  Wenn du uns per Kontaktformular oder E-Mail kontaktierst, verarbeiten wir deine Angaben zur Bearbeitung
                  der Anfrage und für mögliche Rückfragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit es um
                  vorvertragliche oder vertragliche Kommunikation geht, ansonsten Art. 6 Abs. 1 lit. f DSGVO.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">8. Speicherdauer</h2>
                <p className="mt-4 text-muted-foreground">
                  Wir speichern personenbezogene Daten nur so lange, wie sie für den jeweiligen Zweck erforderlich sind
                  oder gesetzliche Aufbewahrungspflichten bestehen. Pflichtbezogene Kontodaten und sportbezogene
                  Wertungsdaten können für die Durchführung und Dokumentation der Liga länger gespeichert werden als
                  freiwillige Marketing-Einwilligungen.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">9. Deine Rechte</h2>
                <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
                  <li>Recht auf Auskunft nach Art. 15 DSGVO</li>
                  <li>Recht auf Berichtigung nach Art. 16 DSGVO</li>
                  <li>Recht auf Löschung nach Art. 17 DSGVO</li>
                  <li>Recht auf Einschränkung der Verarbeitung nach Art. 18 DSGVO</li>
                  <li>Recht auf Datenübertragbarkeit nach Art. 20 DSGVO</li>
                  <li>Widerspruchsrecht nach Art. 21 DSGVO</li>
                  <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft</li>
                  <li>Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde</li>
                </ul>
                <p className="mt-4 text-muted-foreground">
                  Für Datenschutzanfragen erreichst du uns jederzeit unter{" "}
                  <a href={`mailto:${legalInfo.privacyEmail}`} className="text-primary underline">
                    {legalInfo.privacyEmail}
                  </a>
                  .
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Datenschutz;
