export type SponsorTier = "Gold" | "Silber" | "Bronze";

export type Sponsor = {
  name: string;
  tier: SponsorTier;
  website?: string;
  logoUrl?: string;
  details?: string;
  isPlaceholder?: boolean;
};

export const mainSponsors: Sponsor[] = [
  {
    name: "Kletterladen NRW",
    tier: "Gold",
    website: "https://kletterladen.nrw",
    logoUrl:
      "https://kletterladen.nrw/themes/Frontend/Kletterladen/frontend/_public/src/img/logos/apple-touch-icon-152x152.png",
    details: "Süllenstraße 28, 40599 Düsseldorf • Di-Fr 11:00-19:00 • Sa 10:00-16:00",
  },
];

export const partnerSponsors: Sponsor[] = [];
