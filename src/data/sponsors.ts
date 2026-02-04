export type SponsorTier = "Gold" | "Silber" | "Bronze";

export type Sponsor = {
  name: string;
  tier: SponsorTier;
  website?: string;
  logo?: string;
  isPlaceholder?: boolean;
};

export const mainSponsors: Sponsor[] = [
  { name: "Hauptsponsor 1", tier: "Gold", isPlaceholder: true },
  { name: "Hauptsponsor 2", tier: "Gold", isPlaceholder: true },
];

export const partnerSponsors: Sponsor[] = [
  { name: "Sponsor 1", tier: "Silber", isPlaceholder: true },
  { name: "Sponsor 2", tier: "Silber", isPlaceholder: true },
  { name: "Sponsor 3", tier: "Silber", isPlaceholder: true },
  { name: "Sponsor 4", tier: "Bronze", isPlaceholder: true },
  { name: "Sponsor 5", tier: "Bronze", isPlaceholder: true },
  { name: "Sponsor 6", tier: "Bronze", isPlaceholder: true },
];
