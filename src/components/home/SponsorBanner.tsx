const sponsor = {
  name: "Kletterladen NRW",
  label: "Hauptsponsor",
  website: "kletterladen.nrw",
  logoShort: "KL",
};

export const SponsorBanner = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary py-1.5 overflow-hidden">
      <div className="flex animate-scroll-left">
        {Array.from({ length: 12 }).map((_, index) => (
          <a
            key={`kletterladen-${index}`}
            href={`https://${sponsor.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 flex-shrink-0 mx-6"
            aria-label="Hauptsponsor Kletterladen NRW"
          >
            <div className="w-6 h-6 -skew-x-6 bg-accent flex items-center justify-center">
              <span className="skew-x-6 font-headline text-xs text-primary">
                {sponsor.logoShort}
              </span>
            </div>
            <span className="text-primary-foreground font-medium text-xs whitespace-nowrap">
              {sponsor.label}: {sponsor.name} • {sponsor.website}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
