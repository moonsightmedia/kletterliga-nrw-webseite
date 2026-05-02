type InstagramPost = {
  id: string;
  caption: string | null;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  username?: string;
};

type InstagramPublicMediaNode = {
  id?: string;
  shortcode?: string;
  display_url?: string;
  thumbnail_src?: string;
  is_video?: boolean;
  taken_at_timestamp?: number;
  edge_media_to_caption?: {
    edges?: Array<{ node?: { text?: string } }>;
  };
  edge_liked_by?: { count?: number };
  edge_media_to_comment?: { count?: number };
  __typename?: string;
};

type InstagramPublicProfileResponse = {
  data?: {
    user?: {
      edge_owner_to_timeline_media?: {
        edges?: Array<{ node?: InstagramPublicMediaNode }>;
      };
    };
  };
};

type InstagramGraphMediaItem = {
  id?: string;
  caption?: string;
  media_type?: InstagramPost["media_type"];
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  username?: string;
};

type InstagramGraphMediaResponse = {
  data?: InstagramGraphMediaItem[];
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

const instagramUsername = "kletterliga_nrw";
const instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "17841473418662189";
const allowedImageProxyHosts = ["cdninstagram.com", "fbcdn.net", "lookaside.instagram.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const fallbackInstagramPosts: InstagramPost[] = [
  {
    id: "3881655049894941648",
    caption:
      "Das solltest du zur Kletterliga NRW 2026 wissen! Die Saison startet am 1. Mai - und damit ihr bestens vorbereitet seid, haben wir alle wichtigen Infos fuer euch zusammengefasst.",
    media_type: "CAROUSEL_ALBUM",
    media_url: "/instagram/kletterliga-post-1.jpg",
    permalink: "https://www.instagram.com/p/DXeaLO1ltPQ/",
    timestamp: "2026-04-23T13:02:42.000Z",
    like_count: 34,
    comments_count: 0,
    username: instagramUsername,
  },
  {
    id: "3881457859968789793",
    caption:
      "Das ist neu in der Kletterliga NRW 2026! Wir haben die Liga weiterentwickelt - kein Zeitstress, Etappen-Wertungen und ein Starterpaket beim Mastercode.",
    media_type: "IMAGE",
    media_url: "/instagram/kletterliga-post-2.jpg",
    permalink: "https://www.instagram.com/p/DXdtVvaFm0h/",
    timestamp: "2026-04-23T06:30:56.000Z",
    like_count: 55,
    comments_count: 2,
    username: instagramUsername,
  },
  {
    id: "3869278437161441489",
    caption:
      "Jetzt ist es offiziell: Die KletterLiga NRW 2026. Vom 01.05. bis 13.09. laeuft unser Qualizeitraum - mit 8 Hallen, 2 Ligen und 1 grossem Finale.",
    media_type: "IMAGE",
    media_url: "/instagram/kletterliga-post-3.jpg",
    permalink: "https://www.instagram.com/p/DWycD0AFhjR/",
    timestamp: "2026-04-06T11:12:36.000Z",
    like_count: 54,
    comments_count: 0,
    username: instagramUsername,
  },
];

function isAllowedInstagramAssetUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    return (
      parsed.protocol === "https:" &&
      allowedImageProxyHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

function mapPublicProfilePost(node: InstagramPublicMediaNode): InstagramPost | null {
  const shortcode = typeof node.shortcode === "string" ? node.shortcode : "";
  const mediaUrl =
    typeof node.display_url === "string" && node.display_url.trim().length > 0
      ? node.display_url.trim()
      : typeof node.thumbnail_src === "string" && node.thumbnail_src.trim().length > 0
        ? node.thumbnail_src.trim()
        : "";

  if (!shortcode || !mediaUrl) {
    return null;
  }

  const mediaType: InstagramPost["media_type"] =
    node.is_video ? "VIDEO" : node.__typename === "GraphSidecar" ? "CAROUSEL_ALBUM" : "IMAGE";

  return {
    id: typeof node.id === "string" && node.id ? node.id : shortcode,
    caption: node.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
    media_type: mediaType,
    media_url: mediaUrl,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    thumbnail_url:
      typeof node.thumbnail_src === "string" && node.thumbnail_src.trim().length > 0
        ? node.thumbnail_src.trim()
        : undefined,
    timestamp:
      typeof node.taken_at_timestamp === "number"
        ? new Date(node.taken_at_timestamp * 1000).toISOString()
        : new Date().toISOString(),
    like_count: typeof node.edge_liked_by?.count === "number" ? node.edge_liked_by.count : undefined,
    comments_count:
      typeof node.edge_media_to_comment?.count === "number" ? node.edge_media_to_comment.count : undefined,
    username: instagramUsername,
  };
}

function mapGraphApiPost(item: InstagramGraphMediaItem): InstagramPost | null {
  const id = typeof item.id === "string" ? item.id : "";
  const permalink = typeof item.permalink === "string" ? item.permalink : "";
  const mediaUrl = typeof item.media_url === "string" ? item.media_url : "";
  const thumbnailUrl = typeof item.thumbnail_url === "string" ? item.thumbnail_url : undefined;

  if (!id || !permalink || (!mediaUrl && !thumbnailUrl)) {
    return null;
  }

  return {
    id,
    caption: typeof item.caption === "string" ? item.caption : null,
    media_type: item.media_type || "IMAGE",
    media_url: mediaUrl || thumbnailUrl || "",
    permalink,
    thumbnail_url: thumbnailUrl,
    timestamp: typeof item.timestamp === "string" ? item.timestamp : new Date().toISOString(),
    like_count: typeof item.like_count === "number" ? item.like_count : undefined,
    comments_count: typeof item.comments_count === "number" ? item.comments_count : undefined,
    username: item.username || instagramUsername,
  };
}

async function fetchGraphApiPosts(limit: number): Promise<InstagramPost[]> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accessToken || !instagramBusinessAccountId) {
    return [];
  }

  const mediaUrl = new URL(`https://graph.facebook.com/v24.0/${instagramBusinessAccountId}/media`);
  mediaUrl.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,username",
  );
  mediaUrl.searchParams.set("limit", String(limit));

  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = (await response.json()) as InstagramGraphMediaResponse;

  if (!response.ok) {
    throw new Error(`Instagram Graph API request failed with ${response.status}: ${data.error?.message || "Unknown error"}`);
  }

  return (data.data ?? [])
    .map(mapGraphApiPost)
    .filter((post): post is InstagramPost => post !== null)
    .slice(0, limit);
}

async function fetchPublicProfilePosts(limit: number): Promise<InstagramPost[]> {
  const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${instagramUsername}`;
  const response = await fetch(profileUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      "X-IG-App-ID": "936619743392459",
      Referer: `https://www.instagram.com/${instagramUsername}/`,
    },
  });

  if (!response.ok) {
    throw new Error(`Instagram profile request failed with ${response.status}`);
  }

  const data = (await response.json()) as InstagramPublicProfileResponse;
  return (data.data?.user?.edge_owner_to_timeline_media?.edges ?? [])
    .map((edge) => (edge.node ? mapPublicProfilePost(edge.node) : null))
    .filter((post): post is InstagramPost => post !== null)
    .slice(0, limit);
}

function getFallbackInstagramPosts(limit: number): InstagramPost[] {
  return fallbackInstagramPosts.slice(0, limit);
}

async function proxyImage(imageUrl: string): Promise<Response> {
  if (!isAllowedInstagramAssetUrl(imageUrl)) {
    return new Response("Image host not allowed", { status: 400, headers: corsHeaders });
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    return new Response("Image not found", { status: 404, headers: corsHeaders });
  }

  if (!isAllowedInstagramAssetUrl(imageResponse.url || imageUrl)) {
    return new Response("Redirect host not allowed", { status: 400, headers: corsHeaders });
  }

  const contentType = imageResponse.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return new Response("Only image responses are allowed", { status: 415, headers: corsHeaders });
  }

  return new Response(await imageResponse.arrayBuffer(), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}

type VercelRequest = {
  method?: string;
  url?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  send: (body?: unknown) => void;
};

async function sendWebResponse(res: VercelResponse, response: Response) {
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const url = new URL(req.url || "/api/instagram-feed", "https://kletterliga-nrw.de");
  const imageUrl = url.searchParams.get("image");
  if (imageUrl) {
    await sendWebResponse(res, await proxyImage(imageUrl));
    return;
  }

  const limit = Math.min(Math.max(1, Number.parseInt(url.searchParams.get("limit") || "3", 10)), 12);

  try {
    const graphPosts = await fetchGraphApiPosts(limit);
    const posts = graphPosts.length > 0 ? graphPosts : await fetchPublicProfilePosts(limit);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).json(posts.length > 0 ? posts : getFallbackInstagramPosts(limit));
  } catch (error) {
    console.warn("instagram-feed api fallback:", error);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).json(getFallbackInstagramPosts(limit));
  }
}
