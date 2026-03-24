import type { Gym } from "@/services/appTypes";

const normalizeWebsite = (website: string | null) => {
  if (!website) return null;
  return website.startsWith("http") ? website : `https://${website}`;
};

export const preparePublicGyms = (gyms: Gym[]) =>
  [...gyms]
    .map((gym) => ({
      ...gym,
      website: normalizeWebsite(gym.website),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
