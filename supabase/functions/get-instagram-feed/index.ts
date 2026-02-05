import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Proxy für Bilder: /get-instagram-feed?image=<url>
    const imageUrl = url.searchParams.get("image");
    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          return new Response("Image not found", { status: 404, headers: corsHeaders });
        }
        const imageData = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
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
    const accessToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    const instagramBusinessAccountId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");
    
    if (!accessToken) {
      console.error("INSTAGRAM_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Instagram access token not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get limit from query params (default: 6)
    const limit = parseInt(url.searchParams.get("limit") || "6", 10);
    const validLimit = Math.min(Math.max(1, limit), 12); // Between 1 and 12

    // Check if hashtag search is requested
    const hashtag = url.searchParams.get("hashtag");
    
    let apiUrl: string;
    let response: Response;
    let data: any;

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
      apiUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&limit=${validLimit}&access_token=${accessToken}`;
      
      console.log("Fetching Instagram posts from:", apiUrl.replace(accessToken, "***"));
      response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Instagram API error:", response.status, errorData);
        return new Response(
          JSON.stringify({ error: "Failed to fetch Instagram posts", details: errorData }),
          { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      data = await response.json();
    }
    
    // Debug: Log first post to see what fields are available
    if (data.data && data.data.length > 0) {
      console.log("Sample Instagram post data (first post):", JSON.stringify(data.data[0], null, 2));
      console.log("Available fields:", Object.keys(data.data[0]));
    }
    
    // Extract posts from response
    const posts: InstagramPost[] = (data.data || []).map((post: any) => {
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
