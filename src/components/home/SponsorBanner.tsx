import { useEffect, useRef } from "react";

// Placeholder sponsors - will be replaced with real data
const sponsors = [
  { name: "Sponsor 1", logo: "S1" },
  { name: "Sponsor 2", logo: "S2" },
  { name: "Sponsor 3", logo: "S3" },
  { name: "Sponsor 4", logo: "S4" },
  { name: "Sponsor 5", logo: "S5" },
  { name: "Sponsor 6", logo: "S6" },
];

export const SponsorBanner = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;

    const scroll = () => {
      scrollPosition += 0.5;
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }
      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary py-1.5 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-hidden whitespace-nowrap"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Double the sponsors for seamless loop */}
        {[...sponsors, ...sponsors].map((sponsor, index) => (
          <div
            key={`${sponsor.name}-${index}`}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-6 h-6 -skew-x-6 bg-accent flex items-center justify-center">
              <span className="skew-x-6 font-headline text-xs text-primary">
                {sponsor.logo}
              </span>
            </div>
            <span className="text-primary-foreground font-medium text-xs">
              {sponsor.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
