export type SponsorTier = "Gold" | "Silber" | "Bronze";

export type Sponsor = {
  name: string;
  tier: SponsorTier;
  website?: string;
  websiteLabel?: string;
  logoSrc?: string;
  claim?: string;
  address?: string;
  openingHours?: string;
  phone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  details?: string;
  isPlaceholder?: boolean;
};

const joinSponsorDetails = (...values: Array<string | undefined>) =>
  values.filter(Boolean).join(" • ");

export const featuredSponsor: Sponsor = {
  name: "kletterladen.nrw",
  tier: "Gold",
  website: "https://kletterladen.nrw",
  websiteLabel: "kletterladen.nrw",
  logoSrc: "/sponsors/kletterladen-nrw-www.svg",
  claim: "Größte Auswahl an Kletterschuhen in NRW",
  address: "Süllenstr. 28, 40599 Düsseldorf",
  openingHours: "Di-Fr 11:00-19:00 • Sa 10:00-16:00",
  phone: "+49 211-731 603 31",
  instagramUrl: "https://www.instagram.com/kletterladen.nrw/",
  facebookUrl: "https://www.facebook.com/kletterladen.nrw/",
};

featuredSponsor.details = joinSponsorDetails(
  featuredSponsor.address,
  featuredSponsor.openingHours,
  featuredSponsor.phone,
);

export const mainSponsors: Sponsor[] = [featuredSponsor];

export const partnerSponsors: Sponsor[] = [
  {
    name: "Proviant",
    tier: "Silber",
    website: "https://www.proviant.de/",
    logoSrc: "/sponsors/proviant.svg",
    instagramUrl: "https://www.instagram.com/proviantberlin/",
    facebookUrl: "https://www.facebook.com/ProviantFruchtmanufaktur/",
  },
  {
    name: "Hillseye Boards",
    tier: "Silber",
    website: "https://www.hillseye-boards.com/",
    logoSrc: "/sponsors/hillseye-boards-mark.png",
    instagramUrl: "https://www.instagram.com/hillseyeboards/",
    facebookUrl: "https://www.facebook.com/hillseye.boards/",
  },
  {
    name: "Mantle Climbing",
    tier: "Bronze",
    website: "https://www.mantle-climbing.de/",
    logoSrc: "/sponsors/mantle-climbing.png",
    instagramUrl: "https://www.instagram.com/mantleclimbing/",
    facebookUrl: "https://de-de.facebook.com/Mantle-Climbing-GmbH-456045974427265/",
  },
];
