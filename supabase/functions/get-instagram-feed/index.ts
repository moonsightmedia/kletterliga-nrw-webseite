import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const allowedImageProxyHosts = [
  "cdninstagram.com",
  ".cdninstagram.com",
  "fbcdn.net",
  ".fbcdn.net",
  "lookaside.instagram.com",
];

function isAllowedInstagramAssetUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "https:") {
      return false;
    }

    return allowedImageProxyHosts.some((candidate) =>
      candidate.startsWith(".") ? hostname.endsWith(candidate) : hostname === candidate,
    );
  } catch {
    return false;
  }
}

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

type InstagramGraphPost = {
  id: string;
  caption?: string | null;
  media_type: InstagramPost["media_type"];
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  username?: string;
};

type InstagramGraphResponse = {
  data?: InstagramGraphPost[];
};

const defaultFallbackPosts: InstagramPost[] = [
  {
    id: "fallback-1",
    caption:
      "Aktuelle Infos, Events und Highlights findest du direkt auf unserem Instagram-Profil.",
    media_type: "IMAGE",
    media_url: "/placeholder.svg",
    permalink: "https://www.instagram.com/kletterliga_nrw/",
    timestamp: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    username: "kletterliga_nrw",
  },
  {
    id: "fallback-2",
    caption:
      "Du willst keine Updates verpassen? Folge uns auf Instagram und bleib bei allen Terminen dabei.",
    media_type: "IMAGE",
    media_url: "/placeholder.svg",
    permalink: "https://www.instagram.com/kletterliga_nrw/",
    timestamp: new Date("2026-01-02T00:00:00.000Z").toISOString(),
    username: "kletterliga_nrw",
  },
  {
    id: "fallback-3",
    caption:
      "Von Quali bis Finale: Alle News und Einblicke laufen ueber @kletterliga_nrw.",
    media_type: "IMAGE",
    media_url: "/placeholder.svg",
    permalink: "https://www.instagram.com/kletterliga_nrw/",
    timestamp: new Date("2026-01-03T00:00:00.000Z").toISOString(),
    username: "kletterliga_nrw",
  },
];

function parseFallbackPosts(limit: number): InstagramPost[] {
  const rawValue = Deno.env.get("INSTAGRAM_FALLBACK_POSTS_JSON");
  if (!rawValue) {
    return defaultFallbackPosts.slice(0, limit);
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return defaultFallbackPosts.slice(0, limit);
    }

    const sanitized: InstagramPost[] = parsed
      .filter((item) => item && typeof item === "object")
      .map((item, index) => {
        const post = item as Record<string, unknown>;
        const permalink =
          typeof post.permalink === "string" && post.permalink.trim().length > 0
            ? post.permalink.trim()
            : "https://www.instagram.com/kletterliga_nrw/";
        const mediaUrl =
          typeof post.media_url === "string" && post.media_url.trim().length > 0
            ? post.media_url.trim()
            : "/placeholder.svg";
        const caption = typeof post.caption === "string" ? post.caption : null;
        const timestamp =
          typeof post.timestamp === "string" && post.timestamp.trim().length > 0
            ? post.timestamp
            : new Date().toISOString();
        const mediaTypeValue =
          typeof post.media_type === "string" ? post.media_type.toUpperCase() : "IMAGE";
        const mediaType: InstagramPost["media_type"] =
          mediaTypeValue === "VIDEO" || mediaTypeValue === "CAROUSEL_ALBUM"
            ? mediaTypeValue
            : "IMAGE";

        return {
          id:
            typeof post.id === "string" && post.id.trim().length > 0
              ? post.id
              : `fallback-${index + 1}`,
          caption,
          media_type: mediaType,
          media_url: mediaUrl,
          permalink,
          thumbnail_url:
            typeof post.thumbnail_url === "string" && post.thumbnail_url.trim().length > 0
              ? post.thumbnail_url
              : undefined,
          timestamp,
          like_count:
            typeof post.like_count === "number" && Number.isFinite(post.like_count)
              ? post.like_count
              : undefined,
          comments_count:
            typeof post.comments_count === "number" && Number.isFinite(post.comments_count)
              ? post.comments_count
              : undefined,
          username:
            typeof post.username === "string" && post.username.trim().length > 0
              ? post.username
              : "kletterliga_nrw",
        };
      });

    if (sanitized.length === 0) {
      return defaultFallbackPosts.slice(0, limit);
    }

    return sanitized.slice(0, limit);
  } catch (error) {
    console.error("Failed to parse INSTAGRAM_FALLBACK_POSTS_JSON:", error);
    return defaultFallbackPosts.slice(0, limit);
  }
}

async function fetchInstagramMedia(
  accessToken: string,
  validLimit: number,
): Promise<{ data: InstagramGraphResponse | null; errorResponse: Response | null }> {
  const fieldsWithInsights =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";
  const baseFields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";

  const primaryUrl = `https://graph.instagram.com/me/media?fields=${fieldsWithInsights}&limit=${validLimit}&access_token=${accessToken}`;
  console.log("Fetching Instagram posts from:", primaryUrl.replace(accessToken, "***"));
  const primaryResponse = await fetch(primaryUrl);

  if (primaryResponse.ok) {
    return { data: await primaryResponse.json(), errorResponse: null };
  }

  const primaryError = await primaryResponse.json().catch(() => ({}));
  console.warn(
    "Instagram API request with insights fields failed, retrying without insights fields",
    primaryResponse.status,
    primaryError,
  );

  const fallbackUrl = `https://graph.instagram.com/me/media?fields=${baseFields}&limit=${validLimit}&access_token=${accessToken}`;
  console.log("Retry Instagram posts without insights fields:", fallbackUrl.replace(accessToken, "***"));
  const fallbackResponse = await fetch(fallbackUrl);

  if (!fallbackResponse.ok) {
    const fallbackError = await fallbackResponse.json().catch(() => ({}));
    console.error("Instagram API error:", fallbackResponse.status, fallbackError);

    const errorCode = String((fallbackError as { error?: { code?: number | string } })?.error?.code ?? "");
    const errorMessage = String(
      (fallbackError as { error?: { message?: string } })?.error?.message ?? "",
    ).toLowerCase();
    const tokenInvalid = errorCode === "190" || errorMessage.includes("access token");

    // If token is currently invalid, keep endpoint stable and return fallback posts.
    if (tokenInvalid) {
      console.warn("Instagram token invalid. Returning fallback feed instead of hard error.");
      return { data: { data: parseFallbackPosts(validLimit) }, errorResponse: null };
    }

    return {
      data: null,
      errorResponse: new Response(
        JSON.stringify({ error: "Failed to fetch Instagram posts", details: fallbackError }),
        { status: fallbackResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders } },
      ),
    };
  }

  return { data: await fallbackResponse.json(), errorResponse: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Proxy für Bilder: /get-instagram-feed?image=<url>
    const imageUrl = url.searchParams.get("image");
    if (imageUrl) {
      if (!isAllowedInstagramAssetUrl(imageUrl)) {
        return new Response("Image host not allowed", { status: 400, headers: corsHeaders });
      }

      try {
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

        const imageData = await imageResponse.arrayBuffer();
        return new Response(imageData, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch (err) {
        console.error("Image proxy error:", err);
        return new Response("Failed to fetch image", { status: 500, headers: corsHeaders });
      }
    }

    // Normale Feed-Anfrage
    // Get limit from query params (default: 6)
    const limit = parseInt(url.searchParams.get("limit") || "6", 10);
    const validLimit = Math.min(Math.max(1, limit), 12); // Between 1 and 12

    const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const instagramBusinessAccountId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");

    if (!accessToken) {
      console.warn("INSTAGRAM_ACCESS_TOKEN not configured. Returning fallback feed.");
      return new Response(JSON.stringify(parseFallbackPosts(validLimit)), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if hashtag search is requested
    const hashtag = url.searchParams.get("hashtag");
    
    let apiUrl: string;
    let response: Response;
    let data: InstagramGraphResponse;

    if (hashtag) {
      // Hashtag-basierte Suche
      if (!instagramBusinessAccountId) {
        console.error("INSTAGRAM_BUSINESS_ACCOUNT_ID not configured for hashtag search");
        return new Response(
          JSON.stringify({ error: "Instagram Business Account ID not configured for hashtag search" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Schritt 1: Hashtag-ID finden (ohne #)
      const hashtagName = hashtag.replace(/^#/, "");
      const searchUrl = `https://graph.facebook.com/v21.0/ig_hashtag_search?q=${encodeURIComponent(hashtagName)}&user_id=${instagramBusinessAccountId}&access_token=${accessToken}`;
      
      console.log("Searching for hashtag:", searchUrl.replace(accessToken, "***"));
      console.log("Using Instagram Business Account ID:", instagramBusinessAccountId);
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        const errorData = await searchResponse.json().catch(() => ({}));
        console.error("Hashtag search error:", searchResponse.status, JSON.stringify(errorData, null, 2));
        return new Response(
          JSON.stringify({ 
            error: "Failed to search hashtag", 
            status: searchResponse.status,
            details: errorData,
            message: errorData.error?.message || "Unknown error"
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const searchData = await searchResponse.json();
      const hashtagId = searchData.data?.[0]?.id;

      if (!hashtagId) {
        console.error("Hashtag not found:", hashtagName);
        return new Response(
          JSON.stringify({ error: `Hashtag #${hashtagName} not found` }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Schritt 2: Posts zum Hashtag abrufen
      apiUrl = `https://graph.instagram.com/${hashtagId}/recent_media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,username&limit=${validLimit}&access_token=${accessToken}`;
      
      console.log("Fetching hashtag posts from:", apiUrl.replace(accessToken, "***"));
      response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Hashtag media error:", response.status, errorData);
        return new Response(
          JSON.stringify({ error: "Failed to fetch hashtag posts", details: errorData }),
          { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      data = await response.json();
    } else {
      // Normale Feed-Anfrage (eigene Posts)
      const mediaFetch = await fetchInstagramMedia(accessToken, validLimit);
      if (mediaFetch.errorResponse) {
        return mediaFetch.errorResponse;
      }

      data = mediaFetch.data ?? { data: [] };
    }
    
    // Debug: Log first post to see what fields are available
    if (data.data && data.data.length > 0) {
      console.log("Sample Instagram post data (first post):", JSON.stringify(data.data[0], null, 2));
      console.log("Available fields:", Object.keys(data.data[0]));
    }
    
    // Extract posts from response
    const posts: InstagramPost[] = (data.data || []).map((post) => {
      // Die Instagram Graph API gibt like_count und comments_count nur zurück,
      // wenn der Account ein Business/Creator Account ist und die Berechtigungen vorhanden sind
      // Falls die Felder fehlen, werden sie als undefined gesetzt
      const likeCount = post.like_count;
      const commentCount = post.comments_count;
      
      if (likeCount === undefined && commentCount === undefined && !hashtag) {
        console.log(`Post ${post.id}: like_count und comments_count nicht verfügbar. Möglicherweise fehlen Berechtigungen oder Account ist kein Business/Creator Account.`);
      }
      
      return {
        id: post.id,
        caption: post.caption || null,
        media_type: post.media_type,
        media_url: post.media_url,
        permalink: post.permalink,
        thumbnail_url: post.thumbnail_url || undefined,
        timestamp: post.timestamp,
        like_count: likeCount,
        comments_count: commentCount,
        username: post.username || (hashtag ? null : "kletterliga_nrw"), // Username wird bei Hashtag-Posts zurückgegeben
      };
    });

    return new Response(JSON.stringify(posts), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("get-instagram-feed error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
