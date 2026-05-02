import { useEffect, useState } from "react";
import { Instagram, ExternalLink, Heart, MessageCircle } from "lucide-react";
import { AnimatedSection, StaggeredAnimation } from "@/hooks/useScrollAnimation";
import { getInstagramFeed } from "@/services/appApi";
import { getInstagramImageSource } from "@/components/home/instagramMedia";
import type { InstagramPost } from "@/services/appTypes";

export const InstagramSection = () => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInstagramFeed(3)
      .then(({ data, error: apiError }) => {
        if (apiError) {
          setError(apiError.message);
        } else {
          setPosts(data ?? []);
        }
      })
      .catch((err) => {
        console.error("Failed to load Instagram feed:", err);
        setError("Instagram-Feed konnte nicht geladen werden.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-background">
      <div className="container-kl">
        <AnimatedSection animation="fade-up" className="text-center mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl text-primary mb-4">
            FOLGE UNS AUF INSTAGRAM
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Bleibe auf dem Laufenden mit den neuesten Updates, Events und Highlights
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
                <Instagram className="skew-x-6 text-primary" size={32} />
              </div>
              <h3 className="font-headline text-xl text-primary mb-2">
                Folge uns auf Instagram
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {error || "Instagram-Posts konnten nicht geladen werden."}
              </p>
              <a
                href="https://www.instagram.com/kletterliga_nrw/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 px-4 py-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                @kletterliga_nrw besuchen
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
                const imageUrl = getInstagramImageSource(post.thumbnail_url || post.media_url);
                const caption = post.caption || null;
                const likeCount = post.like_count ?? 0;
                const commentCount = post.comments_count ?? 0;
                const username = "kletterliga_nrw";

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
                        <div className="relative aspect-[5/4] overflow-hidden bg-muted/40">
                          <img
                            src={imageUrl}
                            alt={caption || "Instagram Post"}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        
                        <div className="p-4 space-y-3">
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
                          
                          {caption && (
                            <div className="text-sm text-foreground">
                              <span className="font-semibold">@{username}</span>{" "}
                              <span className="whitespace-pre-line line-clamp-3">{caption}</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative aspect-[5/4] overflow-hidden bg-[radial-gradient(circle_at_24%_18%,rgba(242,220,171,0.72),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(161,85,35,0.32),transparent_26%),linear-gradient(145deg,#003d55_0%,#002637_100%)]">
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_34%,rgba(242,220,171,0.12)_100%)]" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center text-[#f2dcab]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur">
                              <Instagram size={34} />
                            </div>
                            <div>
                              <div className="font-headline text-2xl uppercase leading-none">@kletterliga_nrw</div>
                              <div className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f2dcab]/72">
                                Auf Instagram ansehen
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
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
                          {caption && (
                            <div className="text-sm text-foreground">
                              <span className="font-semibold">@{username}</span>{" "}
                              <span className="whitespace-pre-line line-clamp-3">{caption}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </a>
                );
              })}
            </StaggeredAnimation>

            <AnimatedSection animation="fade-in" delay={400} className="text-center">
              <a
                href="https://www.instagram.com/kletterliga_nrw/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 px-4 py-2 text-secondary hover:text-secondary/80 font-medium transition-colors"
              >
                Mehr auf Instagram sehen
                <ExternalLink size={16} />
              </a>
            </AnimatedSection>
          </>
        )}
      </div>
    </section>
  );
};
