export type LeagueType = "Toprope" | "Vorstieg";

export type Gym = {
  name: string;
  city: string;
  address: string;
  website: string;
  leagues: LeagueType[];
  lat: number;
  lng: number;
  logo?: string;
  shortName?: string;
};

export const gyms: Gym[] = [
  {
    name: "Canyon Chorweiler",
    city: "Köln",
    address: "Weichselring 6a, 50765 Köln",
    website: "https://www.canyon-chorweiler.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 51.0291186,
    lng: 6.8950682,
  },
  {
    name: "2T Lindlar",
    city: "Lindlar",
    address: "Bismarckstraße 1, 51789 Lindlar",
    website: "https://www.2t-lindlar.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 51.0243839,
    lng: 7.3748823,
  },
  {
    name: "DAV Alpinzentrum Bielefeld",
    city: "Bielefeld",
    address: "Meisenstraße 65, 33607 Bielefeld",
    website: "https://www.alpenverein-bielefeld.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 52.0145495,
    lng: 8.5707882,
  },
  {
    name: "Wupperwände Wuppertal",
    city: "Wuppertal",
    address: "Badische Straße 76, 42389 Wuppertal",
    website: "https://www.wupperwaende.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 51.2685586,
    lng: 7.2358009,
  },
  {
    name: "Chimpanzodrome Frechen",
    city: "Frechen",
    address: "Ernst-Heinrich-Geist-Straße 18, 50226 Frechen",
    website: "https://www.chimpanzodrome.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 50.9091415,
    lng: 6.8191283,
  },
  {
    name: "Kletterwelt Sauerland",
    city: "Altena",
    address: "Rosmarter Allee 12, 58762 Altena",
    website: "https://www.kletterwelt-sauerland.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 51.2478512,
    lng: 7.6897915,
  },
  {
    name: "DAV Kletterzentrum Siegerland",
    city: "Siegen",
    address: "Effertsufer 105, 57072 Siegen",
    website: "https://www.dav-siegerland.de",
    leagues: ["Toprope", "Vorstieg"],
    lat: 50.8687707,
    lng: 8.0048834,
  },
];
