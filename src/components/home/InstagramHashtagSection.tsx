import { useEffect, useState } from "react";
import { Instagram, ExternalLink, Heart, MessageCircle, Hash } from "lucide-react";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { getInstagramFeedByHashtag } from "@/services/appApi";
import type { InstagramPost } from "@/services/appTypes";

interface InstagramHashtagSectionProps {
  hashtag: string;
  title?: string;
  description?: string;
  limit?: number;
}

export const InstagramHashtagSection = ({ 
  hashtag, 
  title,
  description,
  limit = 6 
}: InstagramHashtagSectionProps) => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInstagramFeedByHashtag(hashtag, limit)
      .then(({ data, error: apiError }) => {
        if (apiError) {
          setError(apiError.message);
        } else {
          setPosts(data ?? []);
        }
      })
      .catch((err) => {
        console.error("Failed to load Instagram hashtag feed:", err);
        setError("Hashtag-Feed konnte nicht geladen werden.");
      })
      .finally(() => setLoading(false));
  }, [hashtag, limit]);

  const displayHashtag = hashtag.startsWith("#") ? hashtag : `#${hashtag}`;
  const hashtagUrl = `https://www.instagram.com/explore/tags/${hashtag.replace(/^#/, "")}/`;

  return (
    <section className="section-padding bg-muted/50">
      <div className="container-kl">
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            {title || `BEITRÄGE MIT ${displayHashtag.toUpperCase()}`}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {description || `Teile deine Kletterliga-Momente mit ${displayHashtag}`}
          </p>
        </AnimatedSection>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Lade Instagram-Posts …
          </div>
        ) : error || posts.length === 0 ? (
          <AnimatedSection animation="fade-in" className="text-center">
            <div className="max-w-md mx-auto card-kl p-8">
              <div className="w-16 h-16 mx-auto mb-4 -skew-x-6 bg-accent/50 flex items-center justify-center">
                <Hash className="skew-x-6 text-primary" size={32} />
              </div>
              <h3 className="font-headline text-xl text-primary mb-2">
                {displayHashtag}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {error || `Noch keine Posts mit ${displayHashtag} gefunden.`}
              </p>
              <a
                href={hashtagUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                {displayHashtag} auf Instagram ansehen
                <ExternalLink size={16} />
              </a>
            </div>
          </AnimatedSection>
        ) : (
          <>
            <StaggeredAnimation
              className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-12 max-w-4xl mx-auto"
              staggerDelay={50}
              animation="scale"
            >
              {posts.map((post) => {
                const imageUrl = post.thumbnail_url || post.media_url;
                const caption = post.caption || null;
                const likeCount = post.like_count ?? 0;
                const commentCount = post.comments_count ?? 0;
                const username = post.username || null;

                return (
                  <a
                    key={post.id}
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-background border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {imageUrl ? (
                      <>
                        {/* Bild - Seitenverhältnis 4:5 (Portrait) */}
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={caption || "Instagram Post"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        
                        {/* Instagram-Post-ähnlicher Footer (immer sichtbar) */}
                        <div className="p-4 space-y-3">
                          {/* Likes und Kommentare */}
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Heart className="text-foreground" size={20} />
                              <span className="text-sm font-semibold">{likeCount.toLocaleString("de-DE")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageCircle className="text-foreground" size={20} />
                              <span className="text-sm font-semibold">{commentCount.toLocaleString("de-DE")}</span>
                            </div>
                          </div>
                          
                          {/* Caption */}
                          {caption && (
                            <div className="text-sm text-foreground">
                              {username && (
                                <span className="font-semibold">@{username}</span>
                              )}
                              {username && " "}
                              <span className="whitespace-pre-line line-clamp-3">{caption}</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-muted">
                        <Instagram className="text-muted-foreground" size={32} />
                      </div>
                    )}
                  </a>
                );
              })}
            </StaggeredAnimation>

            <AnimatedSection animation="fade-in" delay={400} className="text-center">
              <a
                href={hashtagUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                Mehr Posts mit {displayHashtag} ansehen
                <ExternalLink size={16} />
              </a>
            </AnimatedSection>
          </>
        )}
      </div>
    </section>
  );
};
