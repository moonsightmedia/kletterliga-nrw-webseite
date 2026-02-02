import { UserPlus, MapPin, TrendingUp, Award } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Registrieren",
    description: "Erstelle dein Profil im Teilnehmerbereich und wähle deine Liga (Toprope oder Vorstieg).",
  },
  {
    icon: MapPin,
    number: "02",
    title: "Hallen besuchen",
    description: "Klettere in den teilnehmenden Hallen und sammle Punkte für jede geschaffte Route.",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Punkte sammeln",
    description: "Deine besten Ergebnisse zählen für die Rangliste. Flash-Bonus für Routen im ersten Versuch!",
  },
  {
    icon: Award,
    number: "04",
    title: "Finale erreichen",
    description: "Qualifiziere dich für das große Finale und klettere um die Landesmeisterschaft.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="so-funktionierts" className="section-padding bg-muted/50">
      <div className="container-kl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            SO FUNKTIONIERT'S
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            In vier einfachen Schritten zum Liga-Erlebnis
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative group"
            >
              {/* Connector Line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-border z-0">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-secondary -skew-x-6" />
                </div>
              )}

              <div className="card-kl text-center relative z-10 h-full">
                {/* Number Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-secondary text-secondary-foreground font-headline text-sm px-3 py-1 -skew-x-6">
                    <span className="skew-x-6 inline-block">{step.number}</span>
                  </span>
                </div>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-4 mt-4 bg-accent -skew-x-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <step.icon className="text-primary skew-x-6" size={28} />
                </div>

                {/* Content */}
                <h3 className="font-headline text-xl text-primary mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
