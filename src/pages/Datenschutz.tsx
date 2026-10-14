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
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">Unverbindliches Interesse an Saison 2027</h2>
                <p className="mt-4 text-muted-foreground">Wenn du auf „Ja, ich wäre dabei“ klickst, speichern wir eine zufällige Browserkennung und den Zeitpunkt deiner Antwort, um das Interesse an der Saison 2027 einzuschätzen und doppelte Antworten im selben Browser zu vermeiden. Dafür wird die Kennung in deinem Browser gespeichert. Wir erfassen dabei weder deinen Namen noch deine E-Mail-Adresse oder IP-Adresse in der Interessensliste. Du kannst die lokale Kennung über die Website-Daten deines Browsers löschen. Nach Abschluss der Planung für 2027 löschen wir die Interessensliste. Deine Antwort ist keine Anmeldung. Diese separate Interessensabfrage wird nicht mit deinen Umfrageantworten verknüpft.</p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">Freiwillige Ideen-Abstimmung für 2027</h2>
                <p className="mt-4 text-muted-foreground">Die Umfrage richtet sich an Personen ab 16 Jahren. Mit dem ausdrücklichen Start bestätigst du, dass du mindestens 16 Jahre alt bist. Wir fragen dafür kein Geburtsdatum ab.</p>
                <p className="mt-4 text-muted-foreground">
                  Erst nach deinem Klick auf „Einverstanden – Umfrage starten“ wird deine Auswahl ab der ersten Antwort nach jeder Änderung an unseren Server übertragen
                  und für die Planung der Saison 2027 gespeichert. Auch unvollständige Fragebögen werden
                  ausgewertet; nicht beantwortete Fragen gelten nicht als Zustimmung oder Ablehnung.
                  Gespeichert werden Auswahlantworten, freiwillige Ideentexte (je höchstens 500 Zeichen), Fragebogenversion, eine zufällige Antwort-ID,
                  Bearbeitungsstand und Speicherzeitpunkte sowie die Version des Einwilligungstextes und der serverseitige Zeitpunkt ihres ersten Empfangs. Wir fragen weder Name noch E-Mail-Adresse ab
                  und verknüpfen die Antworten nicht mit deinem Teilnehmerkonto oder der Interessensabfrage.
                  Ein zufälliger Bearbeitungsschlüssel bleibt nur im Arbeitsspeicher der geöffneten Seite;
                  serverseitig wird ausschließlich sein Hash gespeichert. Er schützt Änderungen und Löschung,
                  ist aber kein Nachweis einer einzelnen Person. Die Umfrage setzt keine eigenen Cookies
                  und speichert weder Antworten noch Kennung dauerhaft im Browser.
                  Bitte schreibe keine Namen, Kontaktdaten oder andere personenbezogene Angaben in die Ideentexte.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Zur Begrenzung von Spam wird aus der IP-Adresse und einem kurzlebigen Zufallswert eine
                  Kennung gebildet, die nur im Arbeitsspeicher des Servers bleibt. Sie wird nicht mit den
                  Antworten gespeichert. Technische Zugriffsdaten können außerdem beim Hosting anfallen.
                  Die Antworten sind nur für berechtigte Liga-Admins zugänglich und werden für die
                  Saisonplanung 2027 ausgewertet. Rechtsgrundlage für die Planungsauswertung ist deine
                  freiwillige Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Eine Nichtteilnahme hat keine Auswirkungen auf deine Liga-Teilnahme.
                  Du kannst die Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Die Rechtmäßigkeit der Verarbeitung vor dem Widerruf bleibt unberührt.
                  Solange die Umfrage geöffnet ist, kannst du über „Einwilligung widerrufen & Antworten entfernen“ deine erfassten Antworten mit einem Klick entfernen.
                  Für einen späteren Widerruf kannst du einen vertraulichen Code als Textdatei herunterladen und auf der Seite <a href="/ideen-2027/widerruf" className="underline">Einwilligung widerrufen</a> eingeben. Der Code wird nicht in einer URL, einem Cookie oder im Browser-Storage gespeichert. Er erlaubt die Entfernung deiner Antworten; gib ihn nicht weiter.
                  Ohne diesen Code können wir eine einzelne Antwort nicht sicher wiederfinden;
                  wir verlangen keine zusätzlichen Identitätsdaten nur zur Identifizierung einer Antwort.
                  Für Fragen nutze den unten genannten Datenschutzkontakt. Nach Abschluss der Planung löschen wir die Einzelantworten,
                  spätestens am 31. März 2027; zusammengefasste Ergebnisse ohne Einzelantworten können erhalten bleiben.
                  Zur Verhinderung verspäteter Wiederherstellung bleibt nach dem Entfernen vorübergehend ein gesperrter Datensatz ohne Antworten erhalten; er unterliegt ebenfalls dem Löschprozess.
                  Die Frist gilt für die produktive Umfragetabelle einschließlich dieser Widerrufsdatensätze. Technische Sicherungskopien können bis zum Ende ihrer begrenzten Aufbewahrungsdauer bestehen bleiben; sie werden nicht für die Planung ausgewertet. Nach einer Wiederherstellung müssen die Löschungen erneut angewendet werden, bevor die Antworten wieder genutzt werden.
                  Unvollständige und vollständig abgeschlossene Einsendungen werden getrennt ausgewiesen.
                </p>
              </div>

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
                <h2 className="font-headline text-2xl text-primary">7. Freiwilliges Saisonfeedback 2026</h2>
                <p className="mt-4 text-muted-foreground">
                  Im freiwilligen Feedbackformular fragen wir nach deiner Perspektive auf die Saison 2026.
                  Je nach Antwort kannst du den wichtigsten Grund für eine Nichtteilnahme, Hinweise zur
                  Anmeldung oder zum Halbfinale sowie Wünsche für 2027 angeben. Du kannst freiwillig
                  Routen, Hallen und Besuchspflicht, Zeitplan oder Wertungsregeln vertiefen. Freitextfelder
                  bieten Platz für konkrete Vorschläge; abgesehen von der Perspektive und einem Hauptgrund
                  bei bewusster Nichtteilnahme sind die Angaben freiwillig. Wir fragen weder Name noch E-Mail-Adresse ab und
                  verknüpfen die Antworten nicht mit deinem Teilnehmerkonto. Bitte trage im Freitext keine
                  personenbezogenen Angaben ein.
                </p>
                <p className="mt-4 text-muted-foreground">
                  Wir nutzen die Antworten ausschließlich zur Auswertung der Saison und Planung des nächsten
                  Wettbewerbs. Rechtsgrundlage ist unser berechtigtes Interesse an der Verbesserung der Liga
                  (Art. 6 Abs. 1 lit. f DSGVO). Zur Abwehr von Spam wird die IP-Adresse während der Anfrage
                  kurzzeitig im Arbeitsspeicher verarbeitet, aber nicht mit der Antwort gespeichert. Die Antworten
                  löschen wir nach Abschluss der Auswertung, spätestens am 31. März 2027.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">8. Kontaktaufnahme</h2>
                <p className="mt-4 text-muted-foreground">
                  Wenn du uns per Kontaktformular oder E-Mail kontaktierst, verarbeiten wir deine Angaben zur Bearbeitung
                  der Anfrage und für mögliche Rückfragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit es um
                  vorvertragliche oder vertragliche Kommunikation geht, ansonsten Art. 6 Abs. 1 lit. f DSGVO.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">9. Speicherdauer</h2>
                <p className="mt-4 text-muted-foreground">
                  Wir speichern personenbezogene Daten nur so lange, wie sie für den jeweiligen Zweck erforderlich sind
                  oder gesetzliche Aufbewahrungspflichten bestehen. Pflichtbezogene Kontodaten und sportbezogene
                  Wertungsdaten können für die Durchführung und Dokumentation der Liga länger gespeichert werden als
                  freiwillige Marketing-Einwilligungen.
                </p>
              </div>

              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="font-headline text-2xl text-primary">10. Deine Rechte</h2>
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
