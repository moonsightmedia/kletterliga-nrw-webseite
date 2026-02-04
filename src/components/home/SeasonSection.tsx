import { Calendar, MapPin, Trophy } from "lucide-react";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { useSeasonSettings } from "@/services/seasonSettings";

export const SeasonSection = () => {
  const { getSeasonYear, getQualificationStart, getQualificationEnd, getFinaleDate } = useSeasonSettings();
  const seasonYear = getSeasonYear();
  const qualStart = getQualificationStart();
  const qualEnd = getQualificationEnd();
  const finaleDate = getFinaleDate();
  
  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return "Termine folgen";
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${endDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  };
  
  const formatFinaleDate = (date: string | null) => {
    if (!date) return "Termin folgt";
    const d = new Date(date);
    const dayName = d.toLocaleDateString("de-DE", { weekday: "long" });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  };
  
  return (
    <section className="section-padding bg-background">
      <div className="container-kl">
        {/* Section Header */}
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            SAISON {seasonYear}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Die kommende Saison steht in den Startlöchern
          </p>
        </AnimatedSection>

        {/* Timeline Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Qualifikation */}
          <AnimatedSection animation="slide-left" delay={100}>
            <div className="bg-gradient-kl rounded-lg p-8 md:p-10 text-primary-foreground relative overflow-hidden h-full">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 -skew-x-6 bg-primary-foreground/10 -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center">
                    <Calendar className="skew-x-6 text-primary" size={24} />
                  </div>
                  <span className="text-accent font-headline text-lg">QUALIFIKATION</span>
                </div>

                <h3 className="font-headline text-3xl md:text-4xl mb-4">
                  01.05. – 13.09.2026
                </h3>

                <ul className="space-y-3 text-primary-foreground/80">
                  <li className="flex items-start gap-2">
                    <MapPin size={18} className="mt-1 flex-shrink-0 text-accent" />
                    <span>Sammle Punkte in allen teilnehmenden Hallen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin size={18} className="mt-1 flex-shrink-0 text-accent" />
                    <span>Flexible Teilnahme zu deinen Zeiten</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <MapPin size={18} className="mt-1 flex-shrink-0 text-accent" />
                    <span>Laufende Ranglisten-Updates</span>
                  </li>
                </ul>
              </div>
            </div>
          </AnimatedSection>

          {/* Finale */}
          <AnimatedSection animation="slide-right" delay={200}>
            <div className="bg-secondary rounded-lg p-8 md:p-10 text-secondary-foreground relative overflow-hidden h-full">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 -skew-x-6 bg-secondary-foreground/10 -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 -skew-x-6 bg-accent flex items-center justify-center">
                    <Trophy className="skew-x-6 text-primary" size={24} />
                  </div>
                  <span className="text-accent font-headline text-lg">DAS FINALE</span>
                </div>

                <h3 className="font-headline text-3xl md:text-4xl mb-4">
                  {formatFinaleDate(finaleDate)}
                </h3>

                <ul className="space-y-3 text-secondary-foreground/80">
                  <li className="flex items-start gap-2">
                    <Trophy size={18} className="mt-1 flex-shrink-0 text-accent" />
                    <span>Die Top-Platzierten jeder Klasse</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy size={18} className="mt-1 flex-shrink-0 text-accent" />
                    <span>Live-Wettkampf mit Publikum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy size={18} className="mt-1 flex-shrink-0 text-accent" />
                    <span>Siegerehrung & Community-Event</span>
                  </li>
                </ul>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};
