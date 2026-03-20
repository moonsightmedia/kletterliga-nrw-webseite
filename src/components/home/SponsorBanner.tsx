const sponsor = {
  name: "Kletterladen NRW",
  label: "Hauptsponsor",
  website: "kletterladen.nrw",
  address: "Süllenstraße 28, 40599 Düsseldorf",
  phone: "+49 211-731 603 31",
  openingHours: "Di-Fr 11:00-19:00 • Sa 10:00-16:00",
  logoUrl:
    "https://kletterladen.nrw/themes/Frontend/Kletterladen/frontend/_public/src/img/logos/apple-touch-icon-152x152.png",
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
            <div className="w-6 h-6 -skew-x-6 bg-accent overflow-hidden flex items-center justify-center">
              <img
                src={sponsor.logoUrl}
                alt="Logo Kletterladen NRW"
                className="skew-x-6 w-5 h-5 object-contain"
                loading="lazy"
              />
            </div>
            <span className="text-primary-foreground font-medium text-xs whitespace-nowrap">
              {sponsor.label}: {sponsor.name} • {sponsor.address} • {sponsor.phone} • {sponsor.openingHours} • {sponsor.website}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
