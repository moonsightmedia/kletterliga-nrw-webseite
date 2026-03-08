import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { CheckCircle, Star, Users, Trophy, Calendar, Award, MapPin, Clock, Target, BookOpen } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useSeasonSettings } from "@/services/seasonSettings";
import { Button } from "@/components/ui/button";

// Main categories (finalrelevant)
const mainCategories = [
  { name: "U15 weiblich", description: "Unter 15 Jahre", finalRelevant: true },
  { name: "U15 männlich", description: "Unter 15 Jahre", finalRelevant: true },
  { name: "Ü15 weiblich", description: "15–39 Jahre", finalRelevant: true },
  { name: "Ü15 männlich", description: "15–39 Jahre", finalRelevant: true },
  { name: "Ü40 weiblich", description: "Ab 40 Jahre", finalRelevant: true },
  { name: "Ü40 männlich", description: "Ab 40 Jahre", finalRelevant: true },
];

// Additional age group rankings
const additionalCategories = [
  { name: "U9", description: "Unter 9 Jahre" },
  { name: "U11", description: "9-11 Jahre" },
  { name: "U13", description: "12-13 Jahre" },
  { name: "U15", description: "14-15 Jahre" },
  { name: "Ü15", description: "15-39 Jahre" },
  { name: "Ü40", description: "40-49 Jahre" },
  { name: "Ü50", description: "Ab 50 Jahre" },
];

const Modus = () => {
  const { getQualificationStart, getQualificationEnd, getFinaleDate, getFinaleRegistrationDeadline, getTop30PerClass, getWildcardsPerClass } = useSeasonSettings();
  const qualStart = getQualificationStart();
  const qualEnd = getQualificationEnd();
  const finaleDate = getFinaleDate();
  const registrationDeadline = getFinaleRegistrationDeadline();
  const top30 = getTop30PerClass();
  const wildcards = getWildcardsPerClass();

  const formatDate = (date: string | null) => {
    if (!date) return "Termin folgt";
    return new Date(date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  usePageMeta({
    title: "Modus & Regeln",
    description:
      "Wertung, Punktevergabe, Wertungsklassen und Teilnahmebedingungen der Kletterliga NRW.",
    canonicalPath: "/modus",
  });

  return (
    <PageLayout>
      <PageHeader 
        title="MODUS & REGELN" 
        subtitle="Alles was du über die Wertung, Punktevergabe und Teilnahmebedingungen wissen musst."
      />

      {/* Leagues Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-4 [overflow-wrap:anywhere]">
              ZWEI LIGEN
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Wähle die Liga, die zu deinem Kletterstil passt
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <AnimatedSection animation="fade-up">
              <div className="bg-gradient-kl rounded-lg p-8 text-primary-foreground h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center">
                    <Users className="skew-x-6 text-primary" size={24} />
                  </div>
                  <span className="font-headline text-xl sm:text-2xl leading-tight [overflow-wrap:anywhere]">TOPROPE</span>
                </div>
                <p className="text-primary-foreground/80 mb-4">
                  Ideal für Einsteiger und alle, die entspannt klettern möchten. 
                  Das Seil läuft bereits durch die Umlenkung – du kannst dich voll 
                  auf die Route konzentrieren.
                </p>
                <div className="bg-primary-foreground/10 p-3 rounded mb-4">
                  <span className="font-headline text-accent text-sm md:text-base break-words">Schwierigkeitsbereich: UIAA 5–9</span>
                </div>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Perfekt für Anfänger
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Fokus auf Technik
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Perfekt zum Erfahrungen sammeln
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <div className="bg-secondary rounded-lg p-8 text-secondary-foreground h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center">
                    <Trophy className="skew-x-6 text-primary" size={24} />
                  </div>
                  <span className="font-headline text-xl sm:text-2xl leading-tight [overflow-wrap:anywhere]">VORSTIEG</span>
                </div>
                <p className="text-secondary-foreground/80 mb-4">
                  Für erfahrene Kletterer:innen, die den klassischen Wettkampfstil 
                  bevorzugen. Du klippst das Seil selbst ein – echtes Kletterfeeling 
                  garantiert. Lead-Klettern (Vorstieg) im professionellen Wettkampfmodus.
                </p>
                <div className="bg-secondary-foreground/10 p-3 rounded mb-4">
                  <span className="font-headline text-accent text-sm md:text-base break-words">Schwierigkeitsbereich: UIAA 5–10</span>
                </div>
                <ul className="space-y-2 text-sm text-secondary-foreground/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Klassischer Wettkampfmodus
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Höhere Schwierigkeitsgrade
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Mehr Adrenalin
                  </li>
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Zone Scoring Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-4 [overflow-wrap:anywhere]">
              ZONENWERTUNG
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Punkte werden pro erreichter Zone vergeben – je höher du kommst, desto mehr Punkte!
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100} className="max-w-md mx-auto">
            <div className="bg-background p-8 rounded-lg">
              <h3 className="font-headline text-lg sm:text-xl leading-tight text-primary mb-6 text-center [overflow-wrap:anywhere]">Zoneneinteilung einer Route</h3>
              <div className="relative">
                {/* Route visualization */}
                <div className="space-y-0">
                  {[
                    { label: "TOP", points: "10", color: "bg-secondary text-secondary-foreground" },
                    { label: "Zone 3", points: "7,5", color: "bg-secondary/70 text-secondary-foreground" },
                    { label: "Zone 2", points: "5", color: "bg-secondary/50 text-primary" },
                    { label: "Zone 1", points: "2,5", color: "bg-secondary/30 text-primary" },
                    { label: "Start", points: "0", color: "bg-muted text-muted-foreground" },
                  ].map((zone, index) => (
                    <div 
                      key={zone.label}
                      className={`${zone.color} p-4 flex justify-between items-center ${
                        index === 0 ? 'rounded-t-lg' : ''
                      } ${index === 4 ? 'rounded-b-lg' : ''}`}
                    >
                      <span className="font-headline">{zone.label}</span>
                      <span className="font-bold">{zone.points} Pkt</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Flash Bonus */}
          <AnimatedSection animation="fade-up" delay={200} className="mt-8 max-w-3xl mx-auto">
            <div className="bg-accent/50 p-6 rounded-lg flex items-start gap-4">
              <Star className="text-secondary flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-headline text-lg leading-tight text-primary mb-2 [overflow-wrap:anywhere]">Flash-Bonus: +1 Punkt</h4>
                <p className="text-muted-foreground text-sm">
                  Schaffst du eine Route im ersten Versuch (Flash), erhältst du pauschal 
                  <strong className="text-secondary"> +1 Punkt</strong> obendrauf. Das belohnt sauberes, 
                  überlegtes Klettern von Anfang an!
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Categories Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-4 [overflow-wrap:anywhere]">
              WERTUNGSKLASSEN
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Faire Wertung durch alters- und geschlechtergetrennte Kategorien
            </p>
          </AnimatedSection>

          {/* Main Categories */}
          <AnimatedSection animation="fade-up" delay={100} className="mb-8">
            <h3 className="font-headline text-lg sm:text-xl leading-tight text-primary mb-4 text-center [overflow-wrap:anywhere]">
              Hauptwertungsklassen <span className="text-secondary">(finalrelevant)</span>
            </h3>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto mb-12">
            {/* Weibliche Kategorien */}
            <div className="mb-6">
              <StaggeredAnimation 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                staggerDelay={75}
                animation="scale"
              >
                {mainCategories.filter(cat => cat.name.includes("weiblich")).map((category) => (
                  <div 
                    key={category.name}
                    className="card-kl text-center p-6 border-2 border-secondary/30"
                  >
                    <Trophy className="mx-auto mb-2 text-secondary" size={20} />
                    <h3 className="font-headline text-base sm:text-lg leading-tight text-primary mb-1 [overflow-wrap:anywhere]">{category.name}</h3>
                    <p className="text-muted-foreground text-xs">{category.description}</p>
                  </div>
                ))}
              </StaggeredAnimation>
            </div>
            
            {/* Männliche Kategorien */}
            <div>
              <StaggeredAnimation 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                staggerDelay={75}
                animation="scale"
              >
                {mainCategories.filter(cat => cat.name.includes("männlich")).map((category) => (
                  <div 
                    key={category.name}
                    className="card-kl text-center p-6 border-2 border-secondary/30"
                  >
                    <Trophy className="mx-auto mb-2 text-secondary" size={20} />
                    <h3 className="font-headline text-base sm:text-lg leading-tight text-primary mb-1 [overflow-wrap:anywhere]">{category.name}</h3>
                    <p className="text-muted-foreground text-xs">{category.description}</p>
                  </div>
                ))}
              </StaggeredAnimation>
            </div>
          </div>

          {/* Additional Rankings */}
          <AnimatedSection animation="fade-up" delay={200}>
            <div className="max-w-3xl mx-auto bg-muted/50 p-6 rounded-lg">
              <h3 className="font-headline text-lg leading-tight text-primary mb-3 text-center [overflow-wrap:anywhere]">
                Zusätzliche Altersklassenranglisten
              </h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Ohne Finalrelevanz – für detailliertere Vergleiche innerhalb der Altersgruppen
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {additionalCategories.map((cat) => (
                  <div 
                    key={cat.name}
                    className="inline-block bg-background text-muted-foreground text-sm px-4 py-2 -skew-x-6 border border-border text-center"
                  >
                    <div className="skew-x-6">
                      <div className="font-headline">{cat.name}</div>
                      <div className="text-xs text-muted-foreground/70">{cat.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Stage/Monthly Ranking Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-4 [overflow-wrap:anywhere]">
              ETAPPENWERTUNG
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monatliche Zwischenstände für noch mehr Spannung
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <AnimatedSection animation="fade-up" delay={100}>
              <div className="card-kl p-6 text-center h-full">
                <Calendar className="mx-auto mb-4 text-secondary" size={32} />
                <h3 className="font-headline text-lg leading-tight text-primary mb-2 [overflow-wrap:anywhere]">Monatliche Etappen</h3>
                <p className="text-muted-foreground text-sm">
                  Jeden Monat werden Zwischenstände ermittelt und veröffentlicht.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={150}>
              <div className="card-kl p-6 text-center h-full">
                <Award className="mx-auto mb-4 text-secondary" size={32} />
                <h3 className="font-headline text-lg leading-tight text-primary mb-2 [overflow-wrap:anywhere]">Etappensieger</h3>
                <p className="text-muted-foreground text-sm">
                  Pro Liga und Wertungsklasse werden monatliche Etappensieger:innen gekürt.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <div className="card-kl p-6 text-center h-full">
                <Trophy className="mx-auto mb-4 text-secondary" size={32} />
                <h3 className="font-headline text-lg leading-tight text-primary mb-2 [overflow-wrap:anywhere]">Kleine Preise</h3>
                <p className="text-muted-foreground text-sm">
                  Etappensieger:innen erhalten kleine Preise als Anerkennung.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Wildcard Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-4 [overflow-wrap:anywhere]">
              WILDCARD-PLÄTZE
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Eine besondere Chance für alle fleißigen Kletterer:innen
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100} className="max-w-3xl mx-auto">
            <>
              <div className="bg-gradient-kl rounded-lg px-5 py-6 text-primary-foreground sm:hidden">
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center flex-shrink-0">
                      <Award className="skew-x-6 text-primary" size={24} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-headline text-xl leading-tight mb-3 [overflow-wrap:anywhere]">Was ist eine Wildcard?</h3>
                      <p className="text-base leading-7 text-primary-foreground/85">
                        Die Wildcard ist unsere Art, Engagement und Fleiß zu belohnen. Nicht nur die
                        besten Kletterer:innen haben eine Chance auf das Halbfinale, sondern auch die,
                        die die Liga konstant und aktiv mittragen.
                      </p>
                    </div>

                    <div className="bg-primary-foreground/10 rounded-lg p-4">
                      <h4 className="font-headline text-lg leading-tight text-accent mb-4 text-center [overflow-wrap:anywhere]">Wie erhält man eine Wildcard?</h4>

                      <div className="grid gap-3">
                        <div className="rounded-lg bg-primary-foreground/10 p-4 text-center">
                          <p className="font-headline text-2xl text-accent mb-1">10</p>
                          <p className="text-sm leading-6 text-primary-foreground/80">
                            Wildcard-Plätze pro Wertungsklasse und Geschlecht
                          </p>
                        </div>

                        <div className="rounded-lg bg-primary-foreground/10 p-4 text-center">
                          <p className="font-headline text-2xl text-accent mb-1">8</p>
                          <p className="text-sm leading-6 text-primary-foreground/80">
                            besuchte Hallen während der Qualifikationsphase
                          </p>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2 text-sm leading-7 text-primary-foreground/80">
                        <li>Du bist <strong className="text-accent">nicht unter den Top 30</strong> deiner Wertungsklasse.</li>
                        <li>Du hast trotzdem <strong className="text-accent">mindestens 8 Hallen</strong> besucht.</li>
                        <li>Die Plätze werden anschließend <strong className="text-accent">fair ausgelost</strong>.</li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                      <p className="text-sm leading-7 text-primary-foreground/80">
                        <strong className="text-accent">Fairness und Vielfalt:</strong> Die Wildcard belohnt nicht nur Leistung,
                        sondern auch Einsatz und die Bereitschaft, verschiedene Hallen kennenzulernen. So bleibt die Liga
                        offen für engagierte Kletterer:innen, auch wenn der direkte Weg über die Top-Platzierungen knapp verpasst wird.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden bg-gradient-kl rounded-lg p-8 text-primary-foreground sm:block">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center flex-shrink-0">
                    <Award className="skew-x-6 text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-headline text-xl leading-tight mb-4 [overflow-wrap:anywhere]">Was ist eine Wildcard?</h3>
                    <p className="text-primary-foreground/80 mb-4">
                      Die Wildcard ist unsere Art, Engagement und Fleiß zu belohnen. Nicht nur die 
                      besten Kletterer:innen haben eine Chance auf das Halbfinale – auch die fleißigsten!
                    </p>
                    <div className="bg-primary-foreground/10 p-4 rounded-lg mb-4">
                      <h4 className="font-headline text-lg leading-tight text-accent mb-2 [overflow-wrap:anywhere]">Wie erhält man eine Wildcard?</h4>
                      <p className="text-primary-foreground/80 text-sm">
                        Pro Wertungsklasse und Geschlecht werden <strong className="text-accent">10 Wildcard-Plätze verlost</strong>. 
                        Teilnahmeberechtigt sind alle Kletterer:innen, die:
                      </p>
                      <ul className="text-primary-foreground/80 text-sm mt-2 ml-4 list-disc space-y-1">
                        <li>Es <strong className="text-accent">nicht unter die Top 30</strong> ihrer Wertungsklasse geschafft haben</li>
                        <li>Aber trotzdem <strong className="text-accent">8 Hallen</strong> während der Qualifikationsphase besucht haben</li>
                      </ul>
                      <p className="text-primary-foreground/80 text-sm mt-3">
                        Die Verlosung erfolgt fair und transparent unter allen berechtigten Teilnehmer:innen. 
                        So haben auch die fleißigsten Kletterer:innen eine Chance, beim Halbfinale dabei zu sein!
                      </p>
                    </div>
                    <p className="text-primary-foreground/80 text-sm">
                      <strong className="text-accent">Fairness und Vielfalt:</strong> Die Wildcard belohnt nicht nur Leistung, 
                      sondern auch die Bereitschaft, verschiedene Hallen zu erkunden. So schaffen wir eine inklusive 
                      Wettkampfatmosphäre, in der Engagement genauso zählt wie Talent.
                    </p>
                  </div>
                </div>
              </div>
            </>
          </AnimatedSection>
        </div>
      </section>

      {/* Finale Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-4 [overflow-wrap:anywhere]">
              HALBFINALE & FINALE
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Der Höhepunkt der Saison – Halbfinale und Finale am <strong className="text-secondary">{finaleDate ? new Date(finaleDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }) : "Termin folgt"}</strong>
            </p>
          </AnimatedSection>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Qualification */}
            <AnimatedSection animation="fade-up" delay={100}>
              <div className="bg-gradient-kl rounded-lg p-6 text-primary-foreground">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center flex-shrink-0">
                    <Target className="skew-x-6 text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-headline text-xl leading-tight mb-2 [overflow-wrap:anywhere]">Qualifikation</h3>
                    <ul className="space-y-2 text-primary-foreground/80 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span>Die <strong className="text-accent">Top 30</strong> je Wertungsklasse qualifizieren sich</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span><strong className="text-accent">10 Wildcard-Plätze</strong> werden pro Wertungsklasse und Geschlecht verlost unter denen, die nicht Top 30 sind, aber <strong className="text-accent">8 Hallen</strong> besucht haben – <strong className="text-accent">nicht nur die besten, sondern auch die fleißigsten Kletterer haben eine Chance!</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span>Verbindliche Anmeldung bis <strong className="text-accent">27.09.2026</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Semi-Final */}
            <AnimatedSection animation="fade-up" delay={150}>
              <div className="bg-secondary rounded-lg p-6 text-secondary-foreground">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center flex-shrink-0">
                    <Clock className="skew-x-6 text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-headline text-xl leading-tight mb-2 [overflow-wrap:anywhere]">Halbfinale</h3>
                    <ul className="space-y-2 text-secondary-foreground/80 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span><strong className="text-accent">5 Routen</strong> müssen geklettert werden</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span>Maximal <strong className="text-accent">5 Minuten</strong> pro Route</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span>Zeitfenster: <strong className="text-accent">10:00 – 16:00 Uhr</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Final */}
            <AnimatedSection animation="fade-up" delay={200}>
              <div className="bg-accent/50 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 -skew-x-6 bg-secondary flex items-center justify-center flex-shrink-0">
                    <Trophy className="skew-x-6 text-secondary-foreground" size={24} />
                  </div>
                  <div>
                    <h3 className="font-headline text-xl leading-tight text-primary mb-2 [overflow-wrap:anywhere]">Finale</h3>
                    <ul className="space-y-2 text-muted-foreground text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                        <span>Die <strong className="text-secondary">Top 6</strong> aus dem Halbfinale ziehen ins Finale ein</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                        <span>Je <strong className="text-secondary">eine Finalroute</strong> pro Wertungsklasse</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                        <span>Live-Wettkampf mit Publikum und Siegerehrung</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl leading-tight text-primary mb-8 text-center [overflow-wrap:anywhere]">
                TEILNAHMEBEDINGUNGEN
              </h2>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <div className="space-y-6">
                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl leading-tight text-primary mb-3 [overflow-wrap:anywhere]">Anmeldung</h3>
                  <p className="text-muted-foreground">
                    Die Registrierung erfolgt über den Teilnehmerbereich. Du erstellst einen 
                    Account mit deinen persönlichen Daten (Name, Geburtsdatum, Geschlecht, Liga).
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg border-2 border-accent/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Award className="text-accent" size={24} />
                    <h3 className="font-headline text-xl leading-tight text-primary [overflow-wrap:anywhere]">Teilnahmegebühr & Mastercode</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Um an der Liga teilzunehmen und in den Ranglisten zu erscheinen, musst du zunächst 
                    deine <strong className="text-accent">Teilnahme freischalten</strong>. Dafür benötigst du einen 
                    <strong className="text-accent"> Mastercode</strong>, den du nach Zahlung der Teilnahmegebühr 
                    (15 €) in einer der teilnehmenden Hallen erhältst. Den Mastercode löst du einmalig in deinem 
                    Account ein. Erst danach werden deine Ergebnisse in den Ranglisten gezählt.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg border-2 border-secondary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="text-secondary" size={24} />
                    <h3 className="font-headline text-xl leading-tight text-primary [overflow-wrap:anywhere]">Hallen-Code System</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Um Ergebnisse für eine Halle eintragen zu können, musst du zunächst den jeweiligen 
                    <strong className="text-secondary"> hallenspezifischen Code</strong> vor Ort in der Halle erhalten 
                    (kostenfrei). Diesen Code gibst du einmalig in deinem Account ein, um die Halle freizuschalten. 
                    Erst dann kannst du Routen aus dieser Halle werten lassen.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl leading-tight text-primary mb-3 [overflow-wrap:anywhere]">Ergebniseintragung</h3>
                  <p className="text-muted-foreground">
                    Routen werden selbstständig über die App eingetragen. Fairness und 
                    Ehrlichkeit sind die Grundlage der Liga – wir vertrauen auf die 
                    Integrität aller Teilnehmer:innen.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl leading-tight text-primary mb-3 [overflow-wrap:anywhere]">Wertungszeitraum</h3>
                  <p className="text-muted-foreground">
                    Die Qualifikationsphase läuft vom <strong className="text-secondary">{formatDate(qualStart)}</strong> bis zum <strong className="text-secondary">{formatDate(qualEnd)}</strong>. 
                    Nur Routen, die in diesem Zeitraum geklettert werden, zählen für die Rangliste.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Regelwerk-Abschnitt */}
      <section className="section-padding bg-background border-t border-border/60">
        <div className="container-kl">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection animation="fade-up">
              <h2 className="font-headline text-lg sm:text-xl md:text-2xl leading-tight text-primary mb-3 [overflow-wrap:anywhere]">
                Vollständiges Regelwerk
              </h2>
              <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-xl mx-auto">
                Alle offiziellen Bestimmungen, Wertungsregeln und Teilnahmebedingungen im Detail.
              </p>
              <Button asChild className="-skew-x-6">
                <Link to="/regelwerk" className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 skew-x-6" />
                  <span className="skew-x-6">Regelwerk ansehen</span>
                </Link>
              </Button>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Modus;
