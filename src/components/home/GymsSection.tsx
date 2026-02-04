import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";

export const GymsSection = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGyms()
      .then(({ data }) => setGyms(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-muted/50">
      <div className="container-kl">
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            TEILNEHMENDE HALLEN
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Klettere in Hallen in ganz NRW und sammle Punkte
          </p>
        </AnimatedSection>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Lade Hallen …</div>
        ) : (
          <>
            <StaggeredAnimation
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12"
              staggerDelay={75}
              animation="scale"
            >
              {gyms.map((gym) => (
                <div
                  key={gym.id}
                  className="card-kl flex flex-col items-center justify-center text-center p-4 md:p-6 group cursor-pointer"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 -skew-x-6 bg-accent/50 flex items-center justify-center mb-3 group-hover:bg-secondary transition-colors duration-300 overflow-hidden">
                    {gym.logo_url ? (
                      <img src={gym.logo_url} alt={gym.name} className="skew-x-6 h-full w-full object-contain p-1" />
                    ) : (
                      <span className="skew-x-6 font-headline text-xl md:text-2xl text-primary group-hover:text-secondary-foreground transition-colors duration-300">
                        {gym.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-medium text-sm text-primary mb-1 line-clamp-2">
                    {gym.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{gym.city ?? ""}</p>
                </div>
              ))}
            </StaggeredAnimation>

            <AnimatedSection animation="fade-in" delay={400} className="text-center">
              <a
                href="/hallen"
                className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                Alle Hallen anzeigen
                <ExternalLink size={16} />
              </a>
            </AnimatedSection>
          </>
        )}
      </div>
    </section>
  );
};
