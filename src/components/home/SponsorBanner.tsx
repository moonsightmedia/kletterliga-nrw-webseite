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
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary py-1.5 overflow-hidden">
      <div className="flex animate-scroll-left">
        {/* Triple the sponsors for seamless loop */}
        {[...sponsors, ...sponsors, ...sponsors].map((sponsor, index) => (
          <div
            key={`${sponsor.name}-${index}`}
            className="flex items-center gap-2 flex-shrink-0 mx-6"
          >
            <div className="w-6 h-6 -skew-x-6 bg-accent flex items-center justify-center">
              <span className="skew-x-6 font-headline text-xs text-primary">
                {sponsor.logo}
              </span>
            </div>
            <span className="text-primary-foreground font-medium text-xs whitespace-nowrap">
              {sponsor.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
