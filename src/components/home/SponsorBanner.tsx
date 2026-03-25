import { featuredSponsor } from "@/data/sponsors";

const marqueeItems = [
  { type: "logo" as const, value: featuredSponsor.name },
  { type: "text" as const, value: featuredSponsor.name, tone: "name" as const },
  { type: "text" as const, value: featuredSponsor.claim, tone: "default" as const },
  { type: "text" as const, value: featuredSponsor.address, tone: "muted" as const },
  { type: "text" as const, value: featuredSponsor.websiteLabel, tone: "name" as const },
];

const toneClass = {
  name: "font-headline text-xs tracking-[0.12em] text-accent",
  default: "text-primary-foreground/95",
  muted: "text-primary-foreground/70",
};

const SponsorBannerSequence = () => (
  <div className="sponsor-marquee-sequence" aria-hidden="true">
    {marqueeItems.map((item, index) => (
      <span
        key={`${item.type}-${item.value}-${index}`}
        className="flex flex-shrink-0 items-center gap-3 pl-4 pr-1 text-[11px] uppercase tracking-[0.16em]"
      >
        <span className="h-1.5 w-1.5 flex-shrink-0 bg-accent/70 -skew-x-6" />
        {item.type === "logo" ? (
          <img
            src={featuredSponsor.logoSrc}
            alt=""
            aria-hidden="true"
            className="h-4 w-auto object-contain"
            loading="lazy"
          />
        ) : (
          <span className={toneClass[item.tone]}>{item.value}</span>
        )}
      </span>
    ))}
  </div>
);

export const SponsorBanner = () => {
  return (
    <div className="fixed left-0 right-0 top-0 z-[60] h-8 overflow-hidden border-b border-primary-foreground/10 bg-primary">
      <div className="sponsor-marquee-viewport">
        <a
          href={featuredSponsor.website}
          target="_blank"
          rel="noopener noreferrer"
          className="sponsor-marquee-track"
          aria-label={`Laufbanner Hauptsponsor ${featuredSponsor.name}`}
        >
          <SponsorBannerSequence />
          <SponsorBannerSequence />
        </a>
      </div>
    </div>
  );
};
