export type SponsorTier = "Gold" | "Silber" | "Bronze" | "Partner";

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

export const polytalonSponsor: Sponsor = {
  name: "POLYTALON",
  tier: "Silber",
  website: "https://polytalon.com/",
  websiteLabel: "polytalon.com",
  logoSrc: "/sponsors/polytalon.png",
  claim: "Engineered Climbing Holds",
  address: "Zähringerplatz 22, 78464 Konstanz",
  instagramUrl: "https://www.instagram.com/polytalon_climbing/",
};

export const partnerSponsors: Sponsor[] = [
  polytalonSponsor,
  {
    name: "Proviant",
    tier: "Silber",
    website: "https://www.proviant.de/",
    logoSrc: "/sponsors/proviant.svg",
    claim: "Bio-Limonaden, Schorlen und Colas",
    instagramUrl: "https://www.instagram.com/proviantberlin/",
    facebookUrl: "https://www.facebook.com/ProviantFruchtmanufaktur/",
  },
  {
    name: "Hillseye Boards",
    tier: "Silber",
    website: "https://www.hillseye-boards.com/",
    logoSrc: "/sponsors/hillseye-boards-mark.png",
    claim: "Handgefertigte Hightech-Balanceboards",
    instagramUrl: "https://www.instagram.com/hillseyeboards/",
    facebookUrl: "https://www.facebook.com/hillseye.boards/",
  },
  {
    name: "Art by Glöckchen",
    tier: "Silber",
    website: "https://www.etsy.com/de/shop/artbyGloeckchen",
    logoSrc: "/sponsors/art-by-gloeckchen.png",
    claim: "Handbemalte und lasergravierte Bürsten für Kletterer",
    instagramUrl: "https://www.instagram.com/art.by.gloeckchen/",
  },
  {
    name: "Goodgrip",
    tier: "Silber",
    website: "https://www.goodgrip.info/",
    logoSrc: "/sponsors/goodgrip-white.png",
    claim: "Boulderbürsten aus Deutschland – neu: Big Betty mit Stiel",
    instagramUrl: "https://www.instagram.com/goodgripinfo/",
    facebookUrl: "https://www.facebook.com/goodgrip.bouldering/",
  },
  {
    name: "Mantle Climbing",
    tier: "Bronze",
    website: "https://www.mantle-climbing.de/",
    logoSrc: "/sponsors/mantle-climbing.png",
    claim: "Ausrüstung zum Klettern und Bouldern",
    instagramUrl: "https://www.instagram.com/mantleclimbing/",
    facebookUrl: "https://de-de.facebook.com/Mantle-Climbing-GmbH-456045974427265/",
  },
];
