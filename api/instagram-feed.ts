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

const instagramUsername = "kletterliga_nrw";
const allowedImageProxyHosts = ["cdninstagram.com", "fbcdn.net", "lookaside.instagram.com"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

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

  try {
    const url = new URL(req.url || "/api/instagram-feed", "https://kletterliga-nrw.de");
    const imageUrl = url.searchParams.get("image");
    if (imageUrl) {
      await sendWebResponse(res, await proxyImage(imageUrl));
      return;
    }

    const limit = Math.min(Math.max(1, Number.parseInt(url.searchParams.get("limit") || "3", 10)), 12);
    const posts = await fetchPublicProfilePosts(limit);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.status(200).json(posts);
  } catch (error) {
    console.error("instagram-feed api error:", error);
    res.status(502).json({
      error: "Instagram posts could not be loaded",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
