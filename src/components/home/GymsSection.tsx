import { ExternalLink } from "lucide-react";

// Placeholder gyms - will be replaced with real data
const gyms = [
  { name: "Kletterhalle Köln", city: "Köln" },
  { name: "Boulderbar Düsseldorf", city: "Düsseldorf" },
  { name: "Kletterzentrum Essen", city: "Essen" },
  { name: "Boulderwelt Dortmund", city: "Dortmund" },
  { name: "Klettermax Münster", city: "Münster" },
  { name: "DAV Kletterzentrum Bonn", city: "Bonn" },
  { name: "Kletterfabrik Wuppertal", city: "Wuppertal" },
  { name: "Stuntwerk Köln", city: "Köln" },
];

export const GymsSection = () => {
  return (
    <section className="section-padding bg-muted/50">
      <div className="container-kl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            TEILNEHMENDE HALLEN
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Klettere in Hallen in ganz NRW und sammle Punkte
          </p>
        </div>

        {/* Gyms Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {gyms.map((gym) => (
            <div
              key={gym.name}
              className="card-kl flex flex-col items-center justify-center text-center p-4 md:p-6 group cursor-pointer"
            >
              {/* Logo Placeholder */}
              <div className="w-16 h-16 md:w-20 md:h-20 -skew-x-6 bg-accent/50 flex items-center justify-center mb-3 group-hover:bg-secondary transition-colors">
                <span className="skew-x-6 font-headline text-xl md:text-2xl text-primary group-hover:text-secondary-foreground transition-colors">
                  {gym.name.charAt(0)}
                </span>
              </div>
              
              <h3 className="font-medium text-sm text-primary mb-1 line-clamp-2">
                {gym.name}
              </h3>
              <p className="text-xs text-muted-foreground">{gym.city}</p>
            </div>
          ))}
        </div>

        {/* More Gyms Link */}
        <div className="text-center">
          <a
            href="/hallen"
            className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
          >
            Alle Hallen anzeigen
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};
