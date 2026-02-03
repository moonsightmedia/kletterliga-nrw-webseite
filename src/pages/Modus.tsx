import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { CheckCircle, Star, Users, Trophy, Calculator } from "lucide-react";

const scoringRules = [
  {
    difficulty: "4 – 5",
    points: "10 Punkte",
    flash: "+2 Punkte",
  },
  {
    difficulty: "5+ – 6a",
    points: "15 Punkte",
    flash: "+3 Punkte",
  },
  {
    difficulty: "6a+ – 6c",
    points: "25 Punkte",
    flash: "+5 Punkte",
  },
  {
    difficulty: "6c+ – 7a+",
    points: "40 Punkte",
    flash: "+8 Punkte",
  },
  {
    difficulty: "7b – 7c+",
    points: "60 Punkte",
    flash: "+12 Punkte",
  },
  {
    difficulty: "8a+",
    points: "80+ Punkte",
    flash: "+16 Punkte",
  },
];

const categories = [
  { name: "Damen U18", description: "Weiblich, unter 18 Jahre" },
  { name: "Herren U18", description: "Männlich, unter 18 Jahre" },
  { name: "Damen", description: "Weiblich, ab 18 Jahre" },
  { name: "Herren", description: "Männlich, ab 18 Jahre" },
  { name: "Damen Ü40", description: "Weiblich, ab 40 Jahre" },
  { name: "Herren Ü40", description: "Männlich, ab 40 Jahre" },
];

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
            <AnimatedSection animation="slide-left">
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

            <AnimatedSection animation="slide-right">
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
                <ul className="space-y-2 text-sm text-secondary-foreground/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Klassischer Wettkampfmodus
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-accent" />
                    Höhere Punktwertung
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

      {/* Scoring Section */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-12">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              PUNKTEVERGABE
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Je schwieriger die Route, desto mehr Punkte. Flash-Bonus für Routen im ersten Versuch!
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100}>
            <div className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="px-6 py-4 text-left font-headline">Schwierigkeit</th>
                    <th className="px-6 py-4 text-left font-headline">Punkte</th>
                    <th className="px-6 py-4 text-left font-headline">Flash-Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {scoringRules.map((rule, index) => (
                    <tr 
                      key={rule.difficulty}
                      className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                    >
                      <td className="px-6 py-4 font-medium">{rule.difficulty}</td>
                      <td className="px-6 py-4">{rule.points}</td>
                      <td className="px-6 py-4 text-secondary font-medium">{rule.flash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={200} className="mt-8 max-w-3xl mx-auto">
            <div className="bg-accent/50 p-6 rounded-lg flex items-start gap-4">
              <Star className="text-secondary flex-shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-headline text-lg text-primary mb-2">Flash-Bonus</h4>
                <p className="text-muted-foreground text-sm">
                  Schaffst du eine Route im ersten Versuch, erhältst du automatisch den 
                  Flash-Bonus obendrauf. Das macht strategisches Klettern noch spannender!
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

          <StaggeredAnimation 
            className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
            staggerDelay={75}
            animation="scale"
          >
            {categories.map((category) => (
              <div 
                key={category.name}
                className="card-kl text-center p-6"
              >
                <h3 className="font-headline text-lg text-primary mb-1">{category.name}</h3>
                <p className="text-muted-foreground text-xs">{category.description}</p>
              </div>
            ))}
          </StaggeredAnimation>
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
                    Die Registrierung erfolgt über den Teilnehmerbereich. Ein gültiger 
                    Hallenausweis in mindestens einer der teilnehmenden Hallen ist erforderlich.
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
                    Die Qualifikationsphase läuft von März bis Oktober. Nur Routen, die 
                    in diesem Zeitraum geklettert werden, zählen für die Rangliste.
                  </p>
                </div>

                <div className="bg-background p-6 rounded-lg">
                  <h3 className="font-headline text-xl text-primary mb-3">Finale</h3>
                  <p className="text-muted-foreground">
                    Die bestplatzierten Kletterer:innen jeder Wertungsklasse qualifizieren 
                    sich für das Finale im November. Details werden rechtzeitig bekannt gegeben.
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
