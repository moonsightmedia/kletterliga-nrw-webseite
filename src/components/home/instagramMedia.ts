import { supabaseConfig } from "@/services/supabase";

const PLACEHOLDER_IMAGE_PATHS = new Set(["/placeholder.svg", "placeholder.svg"]);

const INSTAGRAM_ASSET_HOSTS = [
  "cdninstagram.com",
  "fbcdn.net",
  "lookaside.instagram.com",
];

export const getInstagramImageSource = (imageUrl: string | null | undefined) => {
  if (!imageUrl) return null;

  const trimmed = imageUrl.trim();
  if (!trimmed || PLACEHOLDER_IMAGE_PATHS.has(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    const isInstagramAsset = INSTAGRAM_ASSET_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));

    if (!isInstagramAsset) {
      return trimmed;
    }

    return `${supabaseConfig.url}/functions/v1/get-instagram-feed?image=${encodeURIComponent(trimmed)}`;
  } catch {
    return trimmed;
  }
};
