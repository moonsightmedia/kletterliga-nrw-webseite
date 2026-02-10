import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  BookOpen,
  Scale,
  Users,
  Trophy,
  Target,
  Award,
  Calendar,
  FileCheck,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Regelwerk = () => {
  usePageMeta({
    title: "Regelwerk",
    description:
      "Offizielles Regelwerk der Kletterliga NRW – Wertung, Teilnahme, Qualifikation und Fair Play.",
    canonicalPath: "/regelwerk",
  });

  return (
    <PageLayout>
      <PageHeader
        title="REGELWERK"
        subtitle="Offizielles Regelwerk der Kletterliga NRW – alle Bestimmungen im Überblick."
      />

      <div className="max-w-4xl mx-auto container-kl section-padding space-y-16">
        {/* §1 Geltungsbereich */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 1 Geltungsbereich und Zweck
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Geltungsbereich · Verbindlichkeit
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13">
              <p>
                Dieses Regelwerk gilt für alle Teilnehmer:innen der Kletterliga NRW (im Folgenden „Liga“)
                sowie für alle Partnerhallen und die Organisatoren. Es regelt die sportliche Durchführung,
                die Wertung, die Teilnahmevoraussetzungen und das Verhalten aller Beteiligten. Mit der
                Anmeldung und Teilnahme an der Liga erkennen die Teilnehmer:innen dieses Regelwerk
                verbindlich an. Abweichungen oder Sonderregelungen bedürfen der ausdrücklichen
                schriftlichen Zustimmung der Liga-Organisation.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §2 Begriffsbestimmungen */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 2 Begriffsbestimmungen
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Liga · Qualifikation · Wertungsklasse · Route · Zone
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-3">
              <p>
                <strong className="text-foreground">Liga:</strong> Eine der beiden Wettkampfdisziplinen
                (Toprope oder Vorstieg), in der Ergebnisse gesammelt und getrennt gewertet werden.
              </p>
              <p>
                <strong className="text-foreground">Qualifikationsphase:</strong> Der festgelegte Zeitraum,
                in dem gekletterte Routen für die Rangliste und die Qualifikation zu Halbfinale/Finale
                zählen.
              </p>
              <p>
                <strong className="text-foreground">Wertungsklasse:</strong> Eine nach Geschlecht und
                Altersgruppe definierte Kategorie (z. B. U15 weiblich, Ü15 männlich, Ü40 weiblich),
                in der eine eigene Rangliste geführt wird.
              </p>
              <p>
                <strong className="text-foreground">Route:</strong> Eine in einer Partnerhalle ausgehängte
                und von der Liga freigegebene Kletterroute mit fester Zoneneinteilung (Start, Zone 1–3, Top).
              </p>
              <p>
                <strong className="text-foreground">Zone:</strong> Ein definierter Abschnitt einer Route;
                die erreichte Zone bestimmt die vergebenen Punkte (Start 0, Zone 1–3 und Top mit
                jeweils festen Punktwerten).
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §3 Ligen und Disziplinen */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 3 Ligen und Disziplinen
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Toprope · Vorstieg
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Die Liga wird in zwei getrennten <strong className="text-foreground">Ligen</strong> durchgeführt:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Toprope-Liga:</strong> Klettern mit von oben
                  gesichertem Seil. Das Seil läuft durch die Umlenkung; es wird nicht im Vorstieg
                  eingeklippt. Geeignet für Einsteiger:innen und alle, die sich auf Technik und
                  Routenlösung konzentrieren möchten. Schwierigkeitsbereich typischerweise UIAA 5–9.
                </li>
                <li>
                  <strong className="text-foreground">Vorstiegs-Liga (Lead):</strong> Klettern im
                  Vorstieg; das Seil wird vom Kletternden selbst in die Zwischen Sicherungen
                  eingeklippt. Klassischer Wettkampfmodus mit höherem Anspruch. Schwierigkeitsbereich
                  typischerweise UIAA 5–10.
                </li>
              </ul>
              <p>
                Eine Teilnehmer:in nimmt pro Saison in genau einer Liga teil. Ein Wechsel der Liga
                während der Saison ist nur in Ausnahmefällen und nach Rücksprache mit der
                Liga-Organisation möglich (z. B. über ein offizielles Änderungsverfahren).
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §4 Wertungssystem */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 4 Wertungssystem
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Zonenpunkte · Flash-Bonus · Höchstwertung
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Die Wertung erfolgt ausschließlich nach der <strong className="text-foreground">erreichten Zone</strong> einer
                Route. Es zählt die höchste Zone, die mit Kontakt (Halten oder Nutzen des Griffes bzw.
                der Zone) erreicht und gehalten wurde. Die Punkte pro Zone sind:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Start: 0 Punkte</li>
                <li>Zone 1: 2,5 Punkte</li>
                <li>Zone 2: 5 Punkte</li>
                <li>Zone 3: 7,5 Punkte</li>
                <li>Top: 10 Punkte</li>
              </ul>
              <p>
                <strong className="text-foreground">Flash-Bonus:</strong> Wird eine Route im ersten
                Versuch (ohne vorherigen Sturz oder Abbruch an derselben Route in derselben Session)
                bis mindestens zur Zone 1 oder höher geklettert, wird ein pauschaler Zusatzpunkt
                (+1) gutgeschrieben. Der Flash-Bonus wird pro Route maximal einmal vergeben.
              </p>
              <p>
                Pro Route wird nur das <strong className="text-foreground">beste Ergebnis</strong> einer
                Teilnehmer:in innerhalb der Qualifikationsphase gewertet. Spätere Verbesserungen
                ersetzen das vorherige Ergebnis für diese Route. Es werden nur Routen gewertet, die
                in Partnerhallen der Kletterliga NRW ausgehängt und im System der Liga erfasst sind.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §5 Wertungsklassen */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 5 Wertungsklassen
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Altersgruppen · Geschlecht · Finalrelevanz
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Die Ranglisten werden nach <strong className="text-foreground">Geschlecht</strong> (weiblich/männlich)
                und <strong className="text-foreground">Altersgruppen</strong> getrennt geführt. Das Alter wird
                auf den Stichtag der Saison (z. B. Jahresbeginn oder Start der Qualifikation)
                berechnet. Es gelten unter anderem:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>U15: unter 15 Jahre</li>
                <li>Ü15: 15 bis unter 40 Jahre</li>
                <li>Ü40: 40 Jahre und älter</li>
              </ul>
              <p>
                Zusätzlich können weitere Altersklassen (z. B. U9, U11, U13, Ü50) für Ranglisten
                ohne Finalrelevanz geführt werden. Für die Qualifikation zu Halbfinale und Finale
                sind nur die in der Ausschreibung als „finalrelevant“ bezeichneten Wertungsklassen
                maßgeblich (in der Regel U15 w/m, Ü15 w/m, Ü40 w/m).
              </p>
              <p>
                Die Zuordnung zu Liga und Wertungsklasse erfolgt bei der Registrierung. Änderungen
                (z. B. Liga- oder Geschlechtswechsel) sind nur über das von der Liga bereitgestellte
                Verfahren (z. B. Änderungsantrag) und nach Prüfung durch die Organisation möglich.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §6 Qualifikation, Wildcards, Halbfinale und Finale */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 6 Qualifikation, Wildcards, Halbfinale und Finale
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Top 30 · Wildcard · Anmeldung · Ablauf
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                <strong className="text-foreground">Qualifikation:</strong> Am Ende der Qualifikationsphase
                qualifizieren sich die <strong className="text-foreground">Top 30</strong> jeder finalrelevanten
                Wertungsklasse (nach Gesamtpunkten) direkt für das Halbfinale. Die genaue Anzahl und
                die Fristen werden pro Saison in der Ausschreibung bekannt gegeben.
              </p>
              <p>
                <strong className="text-foreground">Wildcard-Plätze:</strong> Zusätzlich werden pro
                Wertungsklasse und Geschlecht eine festgelegte Anzahl Wildcard-Plätze (z. B. 10)
                vergeben. Teilnahmeberechtigt sind Teilnehmer:innen, die nicht unter die Top 30
                gekommen sind, aber eine Mindestanzahl verschiedener Hallen (z. B. 8) während der
                Qualifikation besucht haben. Die Vergabe erfolgt per Verlosung unter allen
                Berechtigten. Details (Mindesthallen, Anzahl Wildcards) stehen in der
                Saison-Ausschreibung.
              </p>
              <p>
                <strong className="text-foreground">Anmeldung Halbfinale:</strong> Qualifizierte und
                Wildcard-Gewinner:innen müssen sich bis zu einer festgelegten Frist verbindlich zum
                Halbfinale anmelden. Ohne rechtzeitige Anmeldung verfällt der Startplatz; Nachrücker
                können berücksichtigt werden.
              </p>
              <p>
                <strong className="text-foreground">Halbfinale:</strong> Im Halbfinale sind eine
                festgelegte Anzahl Routen (z. B. 5) in einem vorgegebenen Zeitfenster zu klettern.
                Pro Route gilt ein Zeitlimit (z. B. 5 Minuten). Die Besten (z. B. Top 6) pro
                Wertungsklasse ziehen ins Finale ein.
              </p>
              <p>
                <strong className="text-foreground">Finale:</strong> Im Finale wird je Wertungsklasse
                eine Finalroute geklettert. Die genaue Durchführung (Format, Zeit, Sicherung) wird
                von der Organisation festgelegt und den Teilnehmer:innen vorher mitgeteilt.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §7 Teilnahme, Anmeldung, Mastercode und Hallen-Codes */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center flex-shrink-0">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 7 Teilnahme, Anmeldung, Mastercode und Hallen-Codes
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Registrierung · Teilnahmegebühr · Freischaltung
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                <strong className="text-foreground">Registrierung:</strong> Die Teilnahme setzt eine
                Registrierung im offiziellen Teilnehmerbereich der Kletterliga NRW voraus. Dabei
                sind u. a. Name, E-Mail, Geburtsdatum, Geschlecht und die gewählte Liga anzugeben.
                Unvollständige oder falsche Angaben können zum Ausschluss führen.
              </p>
              <p>
                <strong className="text-foreground">Teilnahmegebühr und Mastercode:</strong> Um in
                den Ranglisten gewertet zu werden, muss die Teilnahme durch Einlösen eines
                <strong className="text-foreground"> Mastercodes</strong> freigeschaltet werden. Den
                Mastercode erhalten Teilnehmer:innen nach Zahlung der ausgeschriebenen
                Teilnahmegebühr (z. B. 15 €) in einer der teilnehmenden Hallen. Der Mastercode ist
                einmalig pro Saison und Account einzulösen. Ohne gültig eingelösten Mastercode
                werden keine Ergebnisse in den Ranglisten berücksichtigt.
              </p>
              <p>
                <strong className="text-foreground">Hallen-Codes:</strong> Um Ergebnisse in einer
                bestimmten Partnerhalle eintragen zu können, muss die Halle für den Account
                freigeschaltet sein. Dafür ist der jeweilige <strong className="text-foreground">Hallen-Code</strong> vor
                Ort (kostenfrei) zu erhalten und einmalig im Account einzugeben. Pro Halle ist nur
                ein Code pro Teilnehmer:in nötig. Ohne Freischaltung der Halle können keine Routen
                dieser Halle gewertet werden.
              </p>
              <p>
                Die Teilnahmegebühr und die Modalitäten des Mastercodes können je Saison angepasst
                werden; die gültigen Beträge und Schritte sind der aktuellen Ausschreibung und der
                Website zu entnehmen.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §8 Ergebniseintragung und Fristen */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 8 Ergebniseintragung und Fristen
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Selbständige Eintragung · Wertungszeitraum
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Ergebnisse werden von den Teilnehmer:innen <strong className="text-foreground">selbstständig</strong> über
                die bereitgestellte App bzw. den Teilnehmerbereich eingetragen. Es sind die
                tatsächlich erreichte Zone sowie ggf. die Angabe „Flash“ (erster Versuch) zu
                wählen. Nachträgliche Korrekturen sind nur innerhalb der von der Liga gesetzten
                Fristen und unter Einhaltung der Fair-Play-Grundsätze zulässig.
              </p>
              <p>
                Nur Routen, die <strong className="text-foreground">innerhalb des offiziellen
                Wertungszeitraums</strong> (Qualifikationsphase) geklettert werden, zählen für die
                Rangliste und die Qualifikation. Das Kletterdatum ist bei der Eintragung anzugeben.
                Die Organisation behält sich vor, bei Verdacht auf Manipulation Nachweise zu
                verlangen oder Eintragungen zu streichen.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §9 Fair Play und Integrität */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 9 Fair Play und Integrität
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Ehrlichkeit · Konsequenzen
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Die Liga basiert auf dem Grundsatz der <strong className="text-foreground">Ehrlichkeit und
                Selbstverantwortung</strong>. Alle Teilnehmer:innen verpflichten sich, nur reale
                Ergebnisse einzutragen und die Regeln (Zonendefinition, Flash, Wertungszeitraum)
                einzuhalten. Falschangaben, manipulierte Eintragungen oder unsportliches Verhalten
                können zum Ausschluss von der Liga und von Halbfinale/Finale führen; bereits
                vergebene Plätze können aberkannt werden.
              </p>
              <p>
                Bei Unklarheiten über die Zoneneinteilung einer Route entscheidet die
                Darstellung in der Halle bzw. durch die Halle. Die Organisatoren behalten sich
                vor, stichprobenartige Kontrollen oder Rückfragen durchzuführen.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §10 Ausschluss, Nachmeldungen, Änderungen */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 10 Ausschluss, Nachmeldungen, Änderungen
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Ausschluss · Regeländerungen
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Die Liga-Organisation kann Teilnehmer:innen bei Verstößen gegen dieses Regelwerk,
                bei Falschangaben oder bei unsportlichem Verhalten von der weiteren Teilnahme
                ausschließen. Ein Anspruch auf Teilnahme oder auf einen Startplatz im Halbfinale
                oder Finale besteht nicht.
              </p>
              <p>
                <strong className="text-foreground">Regeländerungen:</strong> Die Organisatoren
                behalten sich vor, dieses Regelwerk zu ergänzen oder zu ändern, insbesondere bei
                Anpassungen des Formats, der Wertung oder der Saisonabläufe. Wesentliche
                Änderungen werden auf der offiziellen Website bekannt gegeben. Für laufende Saison
                gilt die jeweils veröffentlichte Fassung.
              </p>
            </div>
          </article>
        </AnimatedSection>

        {/* §11 Schlussbestimmungen */}
        <AnimatedSection animation="fade-up">
          <article className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-2xl md:text-3xl text-primary">
                  § 11 Schlussbestimmungen
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Kontakt · Gerichtsstand
                </p>
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground pl-0 md:pl-13 space-y-4">
              <p>
                Bei Fragen zum Regelwerk oder zur Teilnahme ist die Liga unter der auf der Website
                angegebenen Kontaktadresse (z. B. info@kletterliga-nrw.de) erreichbar. Für
                Streitigkeiten aus oder im Zusammenhang mit der Teilnahme an der Liga ist – soweit
                gesetzlich zulässig – der Sitz der verantwortlichen Organisation maßgeblich.
              </p>
              <p>
                Sollten einzelne Bestimmungen dieses Regelwerks unwirksam sein oder werden, bleibt
                die Gültigkeit der übrigen Bestimmungen unberührt.
              </p>
              <p className="text-sm text-muted-foreground/80 pt-4">
                Stand: Angabe gemäß Veröffentlichung auf der Website. Es gilt die jeweils aktuelle
                Fassung unter kletterliga-nrw.de.
              </p>
            </div>
          </article>
        </AnimatedSection>
      </div>

      {/* CTA */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <div className="max-w-2xl mx-auto text-center">
            <AnimatedSection animation="fade-up">
              <p className="text-muted-foreground mb-6">
                Noch Fragen? Wir helfen dir gern weiter.
              </p>
              <Button asChild className="-skew-x-6">
                <Link to="/kontakt">
                  <span className="skew-x-6">Kontakt</span>
                </Link>
              </Button>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Regelwerk;
