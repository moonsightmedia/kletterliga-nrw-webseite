import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  MapPin,
  Medal,
  ShoppingBag,
  Trophy,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const EVENT_DATE_ISO = "2026-10-03";
const QUALIFICATION_END_ISO = "2026-09-13";
const REGISTRATION_DEADLINE_ISO = "2026-09-27T23:59:00+02:00";
const VENUE_ADDRESS = "Rosmarter Allee 12, 58762 Altena";

const eventSchema = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Finale 2026 der Kletterliga NRW",
    url: "https://www.kletterliga-nrw.de/finale",
    description:
      "Informationen zum Finale der Kletterliga NRW 2026 am 3. Oktober in der Kletterwelt Sauerland in Altena.",
  },
  {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "Finale der Kletterliga NRW 2026",
    description:
      "Halbfinale, Finals und Siegerehrung der Kletterliga NRW 2026 in der Kletterwelt Sauerland.",
    startDate: EVENT_DATE_ISO,
    endDate: EVENT_DATE_ISO,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: "https://www.kletterliga-nrw.de/finale",
    image: "https://www.kletterliga-nrw.de/og-image.png",
    sport: "Klettern",
    location: {
      "@type": "Place",
      name: "Kletterwelt Sauerland",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rosmarter Allee 12",
        postalCode: "58762",
        addressLocality: "Altena",
        addressRegion: "Nordrhein-Westfalen",
        addressCountry: "DE",
      },
    },
    organizer: {
      "@type": "SportsOrganization",
      name: "Kletterliga NRW",
      url: "https://www.kletterliga-nrw.de",
    },
  },
];

const keyFacts = [
  {
    icon: CalendarDays,
    label: "Termin",
    value: "Samstag, 3. Oktober 2026",
  },
  {
    icon: MapPin,
    label: "Austragungsort",
    value: "Kletterwelt Sauerland, Altena",
  },
  {
    icon: Trophy,
    label: "Wettkampftag",
    value: "Halbfinale und Finals an einem Tag",
  },
  {
    icon: Users,
    label: "Atmosphäre",
    value: "Live-Wettkampf mit Publikum und Siegerehrung",
  },
];

const milestones = [
  {
    date: "13. September",
    dateTime: QUALIFICATION_END_ISO,
    title: "Qualifikation endet",
    description:
      "Bis einschließlich 13. September zählen deine Ergebnisse für die finalrelevanten Ranglisten.",
  },
  {
    date: "27. September",
    dateTime: REGISTRATION_DEADLINE_ISO,
    title: "Anmeldung schließt",
    description:
      "Qualifizierte Teilnehmende müssen ihren Startplatz bis 23:59 Uhr verbindlich bestätigen.",
  },
  {
    date: "28.–30. September",
    title: "Nachrückerfenster",
    description:
      "Nicht bestätigte Startplätze können in diesem Zeitraum an Nachrücker:innen vergeben werden.",
  },
  {
    date: "3. Oktober",
    dateTime: EVENT_DATE_ISO,
    title: "Finaltag in Altena",
    description:
      "Die Kletterliga NRW kommt für Halbfinale, Finals und Siegerehrung in der Kletterwelt Sauerland zusammen.",
  },
];

const finaleHighlights = [
  {
    icon: Medal,
    title: "Sportlicher Saisonhöhepunkt",
    description:
      "Die stärksten Teilnehmenden der finalrelevanten Ranglisten treten am Finaltag in ihren Wertungsklassen an.",
  },
  {
    icon: Trophy,
    title: "Halbfinale und Finals",
    description:
      "Der Wettkampftag führt vom Halbfinale in die entscheidenden Finalrunden. Der detaillierte Ablauf wird nach Abschluss der Planung veröffentlicht.",
  },
  {
    icon: Users,
    title: "Community und Publikum",
    description:
      "Die Finals sind als Live-Event mit Publikum und gemeinsamer Siegerehrung geplant. Hinweise zu Einlass und Zuschauer:innen folgen hier.",
  },
];

const faqs = [
  {
    question: "Wann und wo findet das Finale 2026 statt?",
    answer:
      "Am Samstag, 3. Oktober 2026, in der Kletterwelt Sauerland, Rosmarter Allee 12 in 58762 Altena.",
  },
  {
    question: "Wie qualifiziere ich mich für den Finaltag?",
    answer:
      "Entscheidend sind die finalrelevanten Ranglisten der Qualifikationsphase. Zusätzlich gibt es einen Wildcard-Weg für besonders aktive Teilnehmende. Die verbindlichen sportlichen Details findest du im Modus und im offiziellen Regelwerk.",
  },
  {
    question: "Wie bestätige ich meinen Startplatz?",
    answer:
      "Nach der finalen Auswertung erhalten qualifizierte Teilnehmende die Informationen zur verbindlichen Anmeldung im Teilnehmerbereich. Anmeldeschluss ist der 27. September 2026 um 23:59 Uhr.",
  },
  {
    question: "Kann ich als Zuschauer:in dabei sein?",
    answer:
      "Ein Live-Wettkampf mit Publikum und Siegerehrung ist geplant. Genaue Angaben zu Einlass, Eintritt und Zuschauerbereichen veröffentlichen wir hier, sobald die Veranstaltungsplanung abgeschlossen ist.",
  },
  {
    question: "Gibt es beim Finale Verpflegung?",
    answer:
      "Ja. Marla & Mathilda’s Genusswerkstatt ist mit einem veganen Foodtruck vor Ort. Auf der Karte stehen Currywurst, Seitan-Döner, Classic- und Tschicken-Burger, Crêpe und Softeis.",
  },
  {
    question: "Ist kletterladen.nrw beim Finale vor Ort?",
    answer:
      "Ja. Unser Hauptsponsor kletterladen.nrw ist mit einem Sale- und Präsentationsstand auf der Empore dabei: 50 % auf alle Wanderschuhe, bis zu 60 % auf ausgewählte Kletterschuhe, ein GRIGRI für 60 € sowie Kletterhosen und Hardware.",
  },
  {
    question: "Wann wird der genaue Zeitplan veröffentlicht?",
    answer:
      "Der minutengenaue Ablauf mit Check-in, Startzeiten und Siegerehrung wird derzeit finalisiert und rechtzeitig vor dem Event auf dieser Seite ergänzt.",
  },
];

export default function Finale() {
  usePageMeta({
    title: "Finale 2026 der Kletterliga NRW – Kletterevent am 3. Oktober in Altena",
    description:
      "Finale der Kletterliga NRW am 3. Oktober 2026 in Altena: Termin, Qualifikation, Foodtruck, Kletterladen-Sale-Stand und Anreise.",
    canonicalPath: "/finale",
    structuredData: eventSchema,
  });

  return (
    <PageLayout>
      <PageHeader
        title="FINALE DER KLETTERLIGA NRW 2026"
        subtitle="Halbfinale, Finals und gemeinsamer Saisonabschluss – am 3. Oktober in der Kletterwelt Sauerland in Altena."
      />

      <section className="section-padding bg-background" aria-labelledby="finale-eckdaten">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <h2 id="finale-eckdaten" className="font-headline text-3xl text-primary md:text-4xl">
              FINALE AUF EINEN BLICK
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Termin, Ort und Rahmen des gemeinsamen Saisonabschlusses der Kletterliga NRW.
            </p>
          </AnimatedSection>
          <StaggeredAnimation
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
            staggerDelay={75}
            animation="scale"
            itemClassName="h-full"
          >
            {keyFacts.map((fact) => (
              <article key={fact.label} className="card-kl group h-full">
                <div className="mb-5 flex h-12 w-12 -skew-x-6 items-center justify-center bg-accent transition-colors duration-300 group-hover:bg-secondary">
                  <fact.icon className="h-5 w-5 skew-x-6 text-primary transition-colors duration-300 group-hover:text-secondary-foreground" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{fact.label}</p>
                <p className="mt-2 font-headline text-xl leading-tight text-primary">{fact.value}</p>
              </article>
            ))}
          </StaggeredAnimation>

          <AnimatedSection animation="fade-up" delay={180} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/modus">
                <span className="skew-x-6">Qualifikation verstehen</span>
                <ArrowRight className="skew-x-6" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/ranglisten">
                <span className="skew-x-6">Ranglisten ansehen</span>
              </Link>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-muted/50" aria-labelledby="finale-weg">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <h2 id="finale-weg" className="font-headline text-3xl text-primary md:text-4xl">
              DEIN WEG NACH ALTENA
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Von der letzten Wertung bis zum Finaltag: Diese vier Termine sind für qualifizierte Teilnehmende entscheidend.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={80}>
            <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-border/50 bg-background shadow-lg">
              {milestones.map((milestone, index) => (
                <article
                  key={milestone.title}
                  className="grid gap-4 border-b border-border/60 p-5 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:p-6 md:gap-8"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-none -skew-x-6 items-center justify-center bg-accent font-headline text-sm text-primary">
                      <span className="skew-x-6">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Schritt {index + 1}</p>
                      {milestone.dateTime ? (
                        <time dateTime={milestone.dateTime} className="mt-1 block font-headline text-base leading-tight text-secondary">
                          {milestone.date}
                        </time>
                      ) : (
                        <p className="mt-1 font-headline text-base leading-tight text-secondary">{milestone.date}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-headline text-xl leading-tight text-primary">{milestone.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{milestone.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={160} className="mx-auto mt-6 max-w-5xl">
            <div className="flex flex-col gap-4 rounded-lg bg-accent/50 p-5 sm:flex-row sm:items-start sm:p-6">
              <Info className="mt-0.5 h-6 w-6 flex-none text-secondary" />
              <div>
                <h3 className="font-headline text-lg leading-tight text-primary">Qualifikation und Wildcards</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
                  Die sportlichen Qualifikationsregeln und der Wildcard-Weg stehen im offiziellen Modus. Die individuelle Einladung folgt nach der finalen Auswertung.
                </p>
                <Link to="/modus" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-secondary hover:underline">
                  Modus und Wildcards ansehen <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-background" aria-labelledby="finale-erwartet">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <h2 id="finale-erwartet" className="font-headline text-3xl text-primary md:text-4xl">
              WAS DICH ERWARTET
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Sportlicher Saisonhöhepunkt, Live-Atmosphäre und ein gemeinsamer Abschluss für die Kletterliga-Community.
            </p>
          </AnimatedSection>
          <StaggeredAnimation
            className="grid gap-6 md:grid-cols-3"
            staggerDelay={90}
            animation="scale"
            itemClassName="h-full"
          >
            {finaleHighlights.map((highlight) => (
              <article key={highlight.title} className="card-kl group h-full">
                <div className="mb-5 flex h-14 w-14 -skew-x-6 items-center justify-center bg-accent transition-colors duration-300 group-hover:bg-secondary">
                  <highlight.icon className="h-6 w-6 skew-x-6 text-primary transition-colors duration-300 group-hover:text-secondary-foreground" />
                </div>
                <h3 className="font-headline text-xl leading-tight text-primary">{highlight.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{highlight.description}</p>
              </article>
            ))}
          </StaggeredAnimation>
          <AnimatedSection animation="fade-up" delay={220} className="mt-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-lg border border-secondary/25 bg-secondary/10 p-5 sm:flex-row sm:items-start sm:p-6">
              <Clock3 className="h-6 w-6 flex-none text-secondary" />
              <div>
                <h3 className="font-headline text-xl text-primary">Zeitplan wird finalisiert</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
                  Check-in, Startzeiten, Reihenfolge der Wertungsklassen und Siegerehrung werden aktuell abgestimmt. Wir veröffentlichen hier nur den bestätigten Ablauf – rechtzeitig vor dem Event.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-muted/50" aria-labelledby="finale-foodtruck">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
              Verpflegung am Finaltag
            </p>
            <h2 id="finale-foodtruck" className="mt-3 scroll-mt-28 text-balance font-headline text-3xl leading-tight text-primary md:text-4xl">
              FOODTRUCK VOR ORT
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Herzhaft, süß und komplett vegan: Marla & Mathilda’s Genusswerkstatt versorgt den Finaltag in Altena.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100}>
            <article className="mx-auto grid max-w-6xl overflow-hidden rounded-lg shadow-lg ring-1 ring-border/50 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.92fr)]">
              <figure className="relative aspect-[4/3] min-w-0 overflow-hidden bg-primary sm:aspect-[16/10] lg:aspect-auto lg:min-h-[34rem]">
                <img
                  src="/images/finale/foodtruck-marla-mathildas.webp"
                  alt="Foodtruck von Marla & Mathilda’s Genusswerkstatt mit geöffneter Ausgabetheke"
                  width={1920}
                  height={1440}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <img
                  src="/images/finale/marla-mathildas-logo.png"
                  alt=""
                  width={340}
                  height={336}
                  loading="lazy"
                  decoding="async"
                  className="absolute left-5 top-5 h-24 w-24 object-contain drop-shadow-lg sm:left-6 sm:top-6 sm:h-28 sm:w-28"
                />
              </figure>

              <div className="relative flex min-w-0 flex-col justify-center overflow-hidden bg-gradient-kl p-7 text-primary-foreground sm:p-8 lg:p-12">
                <div
                  className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 -skew-x-6 bg-primary-foreground/10"
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex h-12 w-12 -skew-x-6 items-center justify-center bg-accent">
                    <UtensilsCrossed className="h-6 w-6 skew-x-6 text-primary" />
                  </div>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                    Marla & Mathilda’s Genusswerkstatt
                  </p>
                  <h3 className="mt-3 text-balance font-headline text-2xl leading-tight md:text-3xl">
                    PFLANZLICHE STÄRKUNG AM FINALTAG
                  </h3>
                  <p className="mt-5 text-base leading-7 text-primary-foreground/85 md:text-lg">
                    Marla & Mathilda’s Genusswerkstatt sorgt beim Finale für herzhafte und süße Stärkung. Alle Speisen sind vegan.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-primary-foreground/80 md:text-base">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>Currywurst und Seitan-Döner</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>Classic- und Tschicken-Burger</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>Crêpe und Softeis</span>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-background" aria-labelledby="finale-sale-stand">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
              Hauptsponsor vor Ort
            </p>
            <h2 id="finale-sale-stand" className="mt-3 scroll-mt-28 text-balance font-headline text-3xl leading-tight text-primary md:text-4xl">
              SALE-STAND VOM KLETTERLADEN NRW
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              50 % auf alle Wanderschuhe, bis zu 60 % auf ausgewählte Kletterschuhe und weitere Angebote auf der Empore.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100}>
            <article className="mx-auto grid max-w-6xl overflow-hidden rounded-lg shadow-lg ring-1 ring-secondary/20 lg:grid-cols-[minmax(22rem,.92fr)_minmax(0,1.08fr)]">
              <figure className="relative grid aspect-[4/3] min-w-0 grid-cols-2 grid-rows-[5fr_6fr] overflow-hidden bg-primary sm:aspect-[16/11] lg:order-2 lg:aspect-auto lg:min-h-[36rem]">
                <div className="relative col-span-2 min-h-0 overflow-hidden bg-primary">
                  <img
                    src="/images/finale/kletterladen-wanderschuhe.webp"
                    alt="Wanderschuh-Auswahl im Fachgeschäft kletterladen.nrw"
                    width={1160}
                    height={412}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/35"
                    aria-hidden="true"
                  />
                  <div className="absolute right-3 top-3 w-28 bg-kl-accent px-3 py-2 shadow-lg ring-1 ring-primary/10 sm:right-5 sm:top-5 sm:w-44 sm:px-4 sm:py-3">
                    <img
                      src="/sponsors/kletterladen-nrw-www.svg"
                      alt="kletterladen.nrw"
                      width={702}
                      height={155}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-primary/95 px-4 py-2.5 text-right text-xs font-semibold leading-tight text-primary-foreground backdrop-blur-sm sm:px-5 sm:py-3 sm:text-sm">
                    <strong className="block text-lg text-accent sm:text-2xl">50 %</strong>
                    auf alle Wanderschuhe
                  </div>
                </div>

                <div className="relative isolate min-h-0 overflow-hidden border-r border-t border-primary/15 bg-kl-accent">
                  <img
                    src="/images/finale/kletterladen-kletterschuh.webp"
                    alt="Kletterschuh aus dem Sortiment von kletterladen.nrw"
                    width={1280}
                    height={1251}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-3 pb-12 mix-blend-multiply sm:p-5 sm:pb-16"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-secondary/95 px-3 py-2 text-center text-[10px] font-semibold leading-tight text-secondary-foreground backdrop-blur-sm sm:px-4 sm:py-3 sm:text-sm">
                    <strong className="block text-sm text-accent sm:text-xl">Bis zu 60 %</strong>
                    ausgewählte Kletterschuhe
                  </div>
                </div>
                <div className="relative isolate min-h-0 overflow-hidden border-t border-primary/15 bg-kl-accent">
                  <img
                    src="/images/finale/kletterladen-hardware.webp"
                    alt="GRIGRI aus dem Sortiment von kletterladen.nrw"
                    width={758}
                    height={1200}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-3 pb-12 mix-blend-multiply sm:p-5 sm:pb-16"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-primary/95 px-3 py-2 text-center text-[10px] font-semibold leading-tight text-primary-foreground backdrop-blur-sm sm:px-4 sm:py-3 sm:text-sm">
                    <strong className="block text-sm text-accent sm:text-xl">60 €</strong>
                    GRIGRI
                  </div>
                </div>
                <figcaption className="sr-only">
                  Reale Sortimentsbilder von kletterladen.nrw zu den angekündigten Angeboten für Wanderschuhe, Kletterschuhe und GRIGRI.
                </figcaption>
              </figure>

              <div className="relative flex min-w-0 flex-col justify-center overflow-hidden bg-secondary p-7 text-secondary-foreground sm:p-8 lg:order-1 lg:p-12">
                <div
                  className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 -skew-x-6 bg-secondary-foreground/10"
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex h-12 w-12 -skew-x-6 items-center justify-center bg-accent">
                    <ShoppingBag className="h-6 w-6 skew-x-6 text-primary" />
                  </div>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
                    Auf der Empore
                  </p>
                  <h3 className="mt-3 text-balance font-headline text-2xl leading-tight md:text-3xl">
                    KLETTERLADEN.NRW VOR ORT
                  </h3>
                  <p className="mt-5 text-base leading-7 text-secondary-foreground/85 md:text-lg">
                    Unser Hauptsponsor ist mit einem Sale- und Präsentationsstand beim Finale dabei – direkt auf der Empore.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-secondary-foreground/85 md:text-base">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>50 % auf alle Wanderschuhe</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>Bis zu 60 % auf ausgewählte Kletterschuhe</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>GRIGRI für 60 €</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-accent" />
                      <span>Kletterhosen und Hardware</span>
                    </li>
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    className="mt-8 w-full bg-accent text-primary hover:bg-accent/90 sm:w-auto"
                  >
                    <a href="https://kletterladen.nrw" target="_blank" rel="noopener noreferrer">
                      <span className="skew-x-6">Zum Kletterladen</span>
                      <ExternalLink className="skew-x-6" />
                    </a>
                  </Button>
                </div>
              </div>
            </article>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-muted/50" aria-labelledby="finale-ort">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <h2 id="finale-ort" className="font-headline text-3xl text-primary md:text-4xl">
              ANREISE NACH ALTENA
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Austragungsort ist die Kletterwelt Sauerland im Gewerbepark Rosmart.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100}>
            <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-border/50 bg-card shadow-lg">
              <div className="grid items-stretch lg:grid-cols-2">
                <div className="bg-accent/50 p-7 sm:p-8 md:p-10">
                  <div className="flex h-12 w-12 -skew-x-6 items-center justify-center bg-secondary">
                    <MapPin className="h-6 w-6 skew-x-6 text-secondary-foreground" />
                  </div>
                  <h3 className="mt-6 font-headline text-2xl leading-tight text-primary md:text-3xl">
                    KLETTERWELT SAUERLAND
                  </h3>
                  <p className="mt-4 text-base leading-7 text-primary/75">
                    Die Halle liegt zwischen Altena, Lüdenscheid und Werdohl und ist Austragungsort für Halbfinale, Finals und Siegerehrung.
                  </p>
                  <address className="mt-6 not-italic">
                    <p className="font-headline text-xl text-primary">Rosmarter Allee 12</p>
                    <p className="mt-1 text-primary/70">58762 Altena</p>
                  </address>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild>
                      <a href="https://www.google.com/maps/search/?api=1&query=Rosmarter%20Allee%2012%2C%2058762%20Altena" target="_blank" rel="noopener noreferrer">
                        <span className="skew-x-6">Route planen</span>
                        <ExternalLink className="skew-x-6" />
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="https://www.kletterwelt-sauerland.de/info/kontakt-anfahrt/" target="_blank" rel="noopener noreferrer">
                        <span className="skew-x-6">Anfahrt der Halle</span>
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-7 sm:p-8 md:p-10">
                  <h3 className="font-headline text-2xl leading-tight text-primary md:text-3xl">ANREISE & VOR-ORT-INFOS</h3>
                  <p className="mt-5 text-base leading-7 text-muted-foreground">
                    Die Halle informiert über die reguläre Anfahrt und Parkmöglichkeiten. Eventbezogene Hinweise zu Einlass, Eintritt, Ausrüstung, Gastronomie und Barrierefreiheit ergänzen wir nach der finalen Abstimmung direkt auf dieser Seite.
                  </p>
                  <div className="mt-8 border-t border-border pt-6">
                    <p className="flex items-start gap-3 text-sm leading-6 text-foreground">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-secondary" />
                      Speichere diese Seite – sie bleibt die zentrale öffentliche Informationsquelle für das Finale 2026.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-background" aria-labelledby="finale-faq">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <h2 id="finale-faq" className="font-headline text-3xl text-primary md:text-4xl">
              FAQ ZUM FINALE 2026
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Antworten auf die wichtigsten Fragen von Teilnehmenden und Zuschauer:innen.
            </p>
          </AnimatedSection>
          <AnimatedSection animation="fade-up" delay={100}>
            <Accordion
              type="single"
              collapsible
              className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-border/50 bg-background px-5 shadow-lg sm:px-6"
            >
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`} className="border-border/60 last:border-b-0">
                  <AccordionTrigger className="py-5 text-left font-headline text-base leading-tight text-primary hover:no-underline sm:text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </AnimatedSection>
        </div>
      </section>

      <section className="section-padding bg-gradient-kl text-primary-foreground">
        <div className="container-kl">
          <div className="mx-auto max-w-3xl text-center">
            <AnimatedSection animation="scale">
              <div className="mx-auto mb-6 flex h-16 w-16 -skew-x-6 items-center justify-center bg-accent">
                <Trophy className="h-7 w-7 skew-x-6 text-primary" />
              </div>
              <h2 className="font-headline text-3xl md:text-4xl">BLEIB AUF DEM LAUFENDEN</h2>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={100}>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-primary-foreground/80 md:text-lg">
                Verfolge die Ranglisten und erfahre im Modus, wie Qualifikation und Wildcards funktionieren.
              </p>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={180} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link to="/ranglisten">
                  <span className="skew-x-6">Zu den Ranglisten</span>
                  <ArrowRight className="skew-x-6" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <Link to="/modus">
                  <span className="skew-x-6">Modus ansehen</span>
                </Link>
              </Button>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
