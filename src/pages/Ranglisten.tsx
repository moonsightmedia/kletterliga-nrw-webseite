import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { ExternalLink, Trophy, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getPublicRankings } from "@/services/appApi";

const ageGroups = ["U15", "Ü15", "Ü40"] as const;
const getCategoryFromFilters = (age: typeof ageGroups[number], gender: "m" | "w") => {
  const ageApi = age === "U15" ? "u15" : age === "Ü15" ? "ue15" : "ue40";
  return `${ageApi}-${gender}`;
};
const getCategoryLabel = (age: typeof ageGroups[number], gender: "m" | "w") => {
  const g = gender === "m" ? "männlich" : "weiblich";
  return `${age} ${g}`;
};

type LeaderboardEntry = {
  rank: number;
  name: string;
  points: number;
  icon?: typeof Trophy;
};

const Ranglisten = () => {
  usePageMeta({
    title: "Ranglisten",
    description:
      "Aktuelle Platzierungen der Kletterliga NRW und Zugang zum Teilnehmerbereich.",
    canonicalPath: "/ranglisten",
  });

  const [league, setLeague] = useState<"toprope" | "vorstieg">("toprope");
  const [genderFilter, setGenderFilter] = useState<"m" | "w">("m");
  const [ageFilter, setAgeFilter] = useState<typeof ageGroups[number]>("Ü15");
  const [currentData, setCurrentData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiLeague = league === "vorstieg" ? "lead" : "toprope";
  const category = getCategoryFromFilters(ageFilter, genderFilter);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPublicRankings(apiLeague, category)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message ?? "Rangliste konnte nicht geladen werden.");
          setCurrentData([]);
        } else {
          const rows = (data ?? []).slice(0, 20).map((row, index) => ({
            rank: row.rank,
            name: row.display_name,
            points: Number(row.points),
            icon: index === 0 ? Trophy : index === 1 ? Medal : index === 2 ? Award : undefined,
          }));
          setCurrentData(rows);
        }
      })
      .finally(() => setLoading(false));
  }, [apiLeague, category]);

  const categoryLabel = getCategoryLabel(ageFilter, genderFilter);

  return (
    <PageLayout>
      <PageHeader
        title="RANGLISTEN"
        subtitle="Die aktuellen Platzierungen der Kletterliga NRW."
      />

      {/* Notice Section */}
      <section className="section-padding bg-background">
        <div className="container-kl">
          <AnimatedSection animation="fade-up">
            <div className="max-w-4xl mx-auto bg-accent/30 p-8 text-center -skew-x-3">
              <div className="skew-x-3">
                <h2 className="font-headline text-2xl md:text-3xl text-primary mb-4">
                  VOLLSTÄNDIGE RANGLISTEN IM TEILNEHMERBEREICH
                </h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Die detaillierten Ranglisten mit allen Teilnehmer:innen, Filter-Optionen
                  nach Wertungsklasse und Halle sowie deine persönlichen Statistiken
                  findest du im Teilnehmerbereich.
                </p>
                <Button asChild variant="secondary" size="lg" className="px-8">
                  <a href="/app/ranglisten" className="flex items-center gap-2">
                    <span className="skew-x-6">Zum Teilnehmerbereich</span>
                    <ExternalLink className="skew-x-6" size={18} />
                  </a>
                </Button>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Preview Leaderboard */}
      <section className="section-padding bg-muted/50">
        <div className="container-kl">
          <AnimatedSection animation="fade-up" className="text-center mb-8">
            <h2 className="font-headline text-3xl md:text-4xl text-primary mb-4">
              TOP-VORSCHAU
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {loading
                ? "Rangliste wird geladen …"
                : "Aktuelle Spitzenreiter aus der Datenbank"}
            </p>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={50}>
            <div className="max-w-3xl mx-auto mb-8">
              <div className="flex flex-col gap-4 items-center justify-center">
                <Tabs
                  value={league}
                  onValueChange={(v) => setLeague(v as "toprope" | "vorstieg")}
                >
                  <TabsList className="bg-background -skew-x-6 rounded-none p-0 h-auto">
                    <TabsTrigger
                      value="toprope"
                      className="skew-x-6 font-headline rounded-none px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Toprope
                    </TabsTrigger>
                    <TabsTrigger
                      value="vorstieg"
                      className="skew-x-6 font-headline rounded-none px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Vorstieg
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex flex-wrap gap-4 items-center justify-center">
                  <div className="inline-flex border border-border/60 bg-background -skew-x-6 overflow-hidden">
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide skew-x-6 ${
                        genderFilter === "m" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                      onClick={() => setGenderFilter("m")}
                    >
                      <span className="inline-block">Männlich</span>
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide skew-x-6 ${
                        genderFilter === "w" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                      onClick={() => setGenderFilter("w")}
                    >
                      <span className="inline-block">Weiblich</span>
                    </button>
                  </div>
                  <div className="inline-flex border border-border/60 bg-background -skew-x-6 overflow-hidden">
                    {ageGroups.map((age) => (
                      <button
                        key={age}
                        type="button"
                        className={`px-5 py-2 text-sm font-semibold uppercase tracking-wide skew-x-6 ${
                          ageFilter === age ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                        onClick={() => setAgeFilter(age)}
                      >
                        <span className="inline-block">{age}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {error && (
            <div className="max-w-3xl mx-auto text-center text-destructive mb-4">
              {error}
            </div>
          )}

          <AnimatedSection animation="fade-up" delay={100}>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-4">
                <span className="font-headline text-lg text-secondary">
                  {league === "toprope" ? "Toprope-Liga" : "Vorstiegs-Liga"} · {categoryLabel}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Lade Rangliste …
                </div>
              ) : (
                currentData.map((entry, index) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-4 p-4 mb-2 ${
                      index === 0
                        ? "bg-gradient-kl text-primary-foreground"
                        : index === 1
                          ? "bg-secondary/20"
                          : index === 2
                            ? "bg-accent/50"
                            : "bg-background"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 flex-shrink-0 -skew-x-6 flex items-center justify-center ${
                        index === 0
                          ? "bg-accent"
                          : index === 1
                            ? "bg-secondary"
                            : index === 2
                              ? "bg-primary"
                              : "bg-muted"
                      }`}
                    >
                      {entry.icon ? (
                        <entry.icon
                          className={
                            index === 0
                              ? "text-primary"
                              : index === 1
                                ? "text-secondary-foreground"
                                : "text-primary-foreground"
                          }
                          size={20}
                        />
                      ) : (
                        <span
                          className={`skew-x-6 font-headline text-lg ${
                            index < 3 ? "text-primary-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-headline text-lg ${
                          index === 0 ? "text-primary-foreground" : "text-primary"
                        }`}
                      >
                        {entry.name}
                      </h3>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-headline text-2xl ${
                          index === 0 ? "text-accent" : "text-secondary"
                        }`}
                      >
                        {entry.points}
                      </span>
                      <p
                        className={`text-xs ${
                          index === 0 ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        Punkte
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-in" delay={300} className="text-center mt-8">
            <p className="text-muted-foreground text-sm italic">
              Vollständige Ranglisten und persönliche Auswertung im Teilnehmerbereich.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Ranglisten;
