import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { GymLogoBadge } from "@/components/gyms/GymLogoBadge";
import { formatGymNameLines } from "@/components/gyms/formatGymNameLines";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { preparePublicGyms } from "@/lib/publicGyms";
import { listGyms } from "@/services/appApi";
import type { Gym } from "@/services/appTypes";
import { GymDetailDialog } from "@/components/gyms/GymDetailDialog";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

export const GymsSection = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  useEffect(() => {
    let active = true;

    const loadGyms = async () => {
      try {
        const { data } = await listGyms();
        if (active) {
          setGyms(preparePublicGyms(data ?? []));
        }
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Failed to load gyms", error);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadGyms();

    return () => {
      active = false;
    };
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
                  className="card-kl group flex h-full min-h-[160px] cursor-pointer flex-col items-center justify-center p-4 text-center transition-shadow hover:shadow-lg md:min-h-[180px] md:p-6"
                  onClick={() => setSelectedGym(gym)}
                >
                  <GymLogoBadge
                    name={gym.name}
                    logoUrl={gym.logo_url}
                    className="mb-3 h-16 w-16 group-hover:bg-secondary md:h-20 md:w-20"
                    fallbackClassName="text-xl group-hover:text-secondary-foreground md:text-2xl"
                  />

                  <h3 className="mb-2 min-h-[4.35rem] max-w-full flex-shrink-0 pt-[0.08em] font-headline text-[0.92rem] leading-[1.04] tracking-[-0.01em] text-primary sm:min-h-[3.8rem] sm:text-[1.18rem] md:min-h-[3.2rem] md:text-[1.08rem] lg:text-[1.2rem]">
                    {formatGymNameLines(gym.name).map((line) => (
                      <span key={line} className="block text-balance break-words">
                        {line}
                      </span>
                    ))}
                  </h3>
                  <p className="flex-shrink-0 text-sm text-muted-foreground md:text-base">{gym.city ?? ""}</p>
                </div>
              ))}
            </StaggeredAnimation>

            <AnimatedSection animation="fade-in" delay={400} className="text-center">
              <a
                href="/hallen"
                className="inline-flex min-h-11 items-center gap-2 px-4 py-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                Alle Hallen anzeigen
                <ExternalLink size={16} />
              </a>
            </AnimatedSection>
          </>
        )}

        {/* Gym Detail Dialog */}
        <GymDetailDialog
          gym={selectedGym}
          open={selectedGym !== null}
          onOpenChange={(open) => !open && setSelectedGym(null)}
        />
      </div>
    </section>
  );
};
