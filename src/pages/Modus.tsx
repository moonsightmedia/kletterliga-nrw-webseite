import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { CheckCircle, Star, Users, Trophy, Calendar, Award, MapPin, Clock, Target } from "lucide-react";

// Main categories (finalrelevant)
const mainCategories = [
  { name: "U16 weiblich", description: "Unter 16 Jahre", finalRelevant: true },
  { name: "U16 männlich", description: "Unter 16 Jahre", finalRelevant: true },
  { name: "Ü16 weiblich", description: "16–39 Jahre", finalRelevant: true },
  { name: "Ü16 männlich", description: "16–39 Jahre", finalRelevant: true },
  { name: "Ü40 weiblich", description: "Ab 40 Jahre", finalRelevant: true },
  { name: "Ü40 männlich", description: "Ab 40 Jahre", finalRelevant: true },
];

// Additional age group rankings
const additionalCategories = ["U10", "U12", "U16", "Ü16", "Ü40", "Ü50"];

const Modus = () => {
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
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
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
                  <span className="font-headline text-2xl">TOPROPE</span>
                </div>
                <p className="text-primary-foreground/80 mb-4">
                  Ideal für Einsteiger und alle, die entspannt klettern möchten. 
                  Das Seil läuft bereits durch die Umlenkung – du kannst dich voll 
                  auf die Route konzentrieren.
                </p>
                <div className="bg-primary-foreground/10 p-3 rounded mb-4">
                  <span className="font-headline text-accent">Schwierigkeitsbereich: UIAA 5–9</span>
                </div>
                <ul className="space-y-2 text-sm text-primary-foreground/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Perfekt für Anfänger
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Geringeres Sturzrisiko
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Fokus auf Technik
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
                  <span className="font-headline text-2xl">VORSTIEG</span>
                </div>
                <p className="text-secondary-foreground/80 mb-4">
                  Für erfahrene Kletterer:innen, die den klassischen Wettkampfstil 
                  bevorzugen. Du klippst das Seil selbst ein – echtes Kletterfeeling 
                  garantiert.
                </p>
                <div className="bg-secondary-foreground/10 p-3 rounded mb-4">
                  <span className="font-headline text-accent">Schwierigkeitsbereich: UIAA 5–10</span>
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
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              ZONENWERTUNG
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Punkte werden pro erreichter Zone vergeben – je höher du kommst, desto mehr Punkte!
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100} className="max-w-md mx-auto">
            <div className="bg-background p-8 rounded-lg">
              <h3 className="font-headline text-xl text-primary mb-6 text-center">Zoneneinteilung einer Route</h3>
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
                <h4 className="font-headline text-lg text-primary mb-2">Flash-Bonus: +1 Punkt</h4>
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
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              WERTUNGSKLASSEN
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Faire Wertung durch alters- und geschlechtergetrennte Kategorien
            </p>
          </AnimatedSection>

          {/* Main Categories */}
          <AnimatedSection animation="fade-up" delay={100} className="mb-8">
            <h3 className="font-headline text-xl text-primary mb-4 text-center">
              Hauptwertungsklassen <span className="text-secondary">(finalrelevant)</span>
            </h3>
          </AnimatedSection>

          <StaggeredAnimation 
            className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12"
            staggerDelay={75}
            animation="scale"
          >
            {mainCategories.map((category) => (
              <div 
                key={category.name}
                className="card-kl text-center p-6 border-2 border-secondary/30"
              >
                <Trophy className="mx-auto mb-2 text-secondary" size={20} />
                <h3 className="font-headline text-lg text-primary mb-1">{category.name}</h3>
                <p className="text-muted-foreground text-xs">{category.description}</p>
              </div>
            ))}
          </StaggeredAnimation>

          {/* Additional Rankings */}
          <AnimatedSection animation="fade-up" delay={200}>
            <div className="max-w-3xl mx-auto bg-muted/50 p-6 rounded-lg">
              <h3 className="font-headline text-lg text-primary mb-3 text-center">
                Zusätzliche Altersklassenranglisten
              </h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Ohne Finalrelevanz – für detailliertere Vergleiche innerhalb der Altersgruppen
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {additionalCategories.map((cat) => (
                  <span 
                    key={cat}
                    className="inline-block bg-background text-muted-foreground text-sm px-4 py-2 -skew-x-6 border border-border"
                  >
                    <span className="skew-x-6 inline-block">{cat}</span>
                  </span>
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
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
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
                <h3 className="font-headline text-lg text-primary mb-2">Monatliche Etappen</h3>
                <p className="text-muted-foreground text-sm">
                  Jeden Monat werden Zwischenstände ermittelt und veröffentlicht.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={150}>
              <div className="card-kl p-6 text-center h-full">
                <Award className="mx-auto mb-4 text-secondary" size={32} />
                <h3 className="font-headline text-lg text-primary mb-2">Etappensieger</h3>
                <p className="text-muted-foreground text-sm">
                  Pro Liga und Wertungsklasse werden monatliche Etappensieger:innen gekürt.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={200}>
              <div className="card-kl p-6 text-center h-full">
                <Trophy className="mx-auto mb-4 text-secondary" size={32} />
                <h3 className="font-headline text-lg text-primary mb-2">Kleine Preise</h3>
                <p className="text-muted-foreground text-sm">
                  Etappensieger:innen erhalten kleine Preise als Anerkennung.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Finale Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              DAS FINALE
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Der Höhepunkt der Saison – <strong className="text-secondary">Samstag, 03.10.2026</strong>
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
                    <h3 className="font-headline text-xl mb-2">Qualifikation</h3>
                    <ul className="space-y-2 text-primary-foreground/80 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span>Die <strong className="text-accent">Top 30</strong> je Wertungsklasse qualifizieren sich</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-accent mt-0.5 flex-shrink-0" />
                        <span><strong className="text-accent">Wildcard-Plätze</strong> für alle, die alle teilnehmenden Hallen besucht haben</span>
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
                    <h3 className="font-headline text-xl mb-2">Halbfinale</h3>
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
                    <h3 className="font-headline text-xl text-primary mb-2">Finale</h3>
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
              <h2 className="font-headline text-3xl md:text-4xl text-primary mb-8 text-center">
                TEILNAHMEBEDINGUNGEN
              </h2>
            </AnimatedSection>

            <AnimatedSection animation="fade-up" delay={100}>
              <div className="space-y-6">
                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl text-primary mb-3">Anmeldung</h3>
                  <p className="text-muted-foreground">
                    Die Registrierung erfolgt über den Teilnehmerbereich. Du benötigst einen 
                    Account und Zugang zu mindestens einer der teilnehmenden Hallen.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg border-2 border-secondary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="text-secondary" size={24} />
                    <h3 className="font-headline text-xl text-primary">Hallen-Code System</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Um Ergebnisse eintragen zu können, musst du zunächst einen <strong className="text-secondary">hallenspezifischen Code</strong> vor Ort 
                    in der Halle erhalten. Diesen Code gibst du einmalig in deinem Account ein, um die 
                    Halle freizuschalten. Erst dann kannst du Routen aus dieser Halle werten lassen.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl text-primary mb-3">Ergebniseintragung</h3>
                  <p className="text-muted-foreground">
                    Routen werden selbstständig über die App eingetragen. Fairness und 
                    Ehrlichkeit sind die Grundlage der Liga – wir vertrauen auf die 
                    Integrität aller Teilnehmer:innen.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl text-primary mb-3">Wertungszeitraum</h3>
                  <p className="text-muted-foreground">
                    Die Qualifikationsphase läuft vom <strong className="text-secondary">01.05.2026</strong> bis zum <strong className="text-secondary">13.09.2026</strong>. 
                    Nur Routen, die in diesem Zeitraum geklettert werden, zählen für die Rangliste.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default Modus;
