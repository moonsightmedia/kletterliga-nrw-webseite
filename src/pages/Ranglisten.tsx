import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedSection } from "@/hooks/useScrollAnimation";
import { ExternalLink, Trophy, Medal, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Placeholder leaderboard data per league and category
const leaderboardData: Record<string, Record<string, Array<{ rank: number; name: string; points: number; icon?: typeof Trophy }>>> = {
  toprope: {
    "u16-w": [
      { rank: 1, name: "Emma S.", points: 248, icon: Trophy },
      { rank: 2, name: "Lena K.", points: 235, icon: Medal },
      { rank: 3, name: "Mia R.", points: 221, icon: Award },
      { rank: 4, name: "Sophie M.", points: 208 },
      { rank: 5, name: "Hannah B.", points: 195 },
    ],
    "u16-m": [
      { rank: 1, name: "Finn L.", points: 252, icon: Trophy },
      { rank: 2, name: "Noah W.", points: 238, icon: Medal },
      { rank: 3, name: "Leon T.", points: 225, icon: Award },
      { rank: 4, name: "Paul H.", points: 210 },
      { rank: 5, name: "Ben S.", points: 198 },
    ],
    "ue16-w": [
      { rank: 1, name: "Sarah K.", points: 260, icon: Trophy },
      { rank: 2, name: "Julia M.", points: 245, icon: Medal },
      { rank: 3, name: "Anna L.", points: 232, icon: Award },
      { rank: 4, name: "Lisa R.", points: 218 },
      { rank: 5, name: "Marie P.", points: 205 },
    ],
    "ue16-m": [
      { rank: 1, name: "Max M.", points: 268, icon: Trophy },
      { rank: 2, name: "Tim B.", points: 252, icon: Medal },
      { rank: 3, name: "Jonas W.", points: 238, icon: Award },
      { rank: 4, name: "Lukas F.", points: 225 },
      { rank: 5, name: "David K.", points: 212 },
    ],
    "ue40-w": [
      { rank: 1, name: "Claudia H.", points: 245, icon: Trophy },
      { rank: 2, name: "Petra S.", points: 230, icon: Medal },
      { rank: 3, name: "Karin M.", points: 218, icon: Award },
      { rank: 4, name: "Birgit R.", points: 205 },
      { rank: 5, name: "Sabine L.", points: 192 },
    ],
    "ue40-m": [
      { rank: 1, name: "Michael T.", points: 255, icon: Trophy },
      { rank: 2, name: "Stefan B.", points: 240, icon: Medal },
      { rank: 3, name: "Thomas W.", points: 228, icon: Award },
      { rank: 4, name: "Andreas K.", points: 215 },
      { rank: 5, name: "Markus H.", points: 202 },
    ],
  },
  vorstieg: {
    "u16-w": [
      { rank: 1, name: "Clara F.", points: 242, icon: Trophy },
      { rank: 2, name: "Emilia W.", points: 228, icon: Medal },
      { rank: 3, name: "Johanna S.", points: 215, icon: Award },
      { rank: 4, name: "Amelie T.", points: 202 },
      { rank: 5, name: "Charlotte H.", points: 190 },
    ],
    "u16-m": [
      { rank: 1, name: "Elias M.", points: 258, icon: Trophy },
      { rank: 2, name: "Felix K.", points: 244, icon: Medal },
      { rank: 3, name: "Moritz R.", points: 230, icon: Award },
      { rank: 4, name: "Jakob L.", points: 218 },
      { rank: 5, name: "Simon P.", points: 205 },
    ],
    "ue16-w": [
      { rank: 1, name: "Laura S.", points: 265, icon: Trophy },
      { rank: 2, name: "Nina H.", points: 250, icon: Medal },
      { rank: 3, name: "Kathrin M.", points: 238, icon: Award },
      { rank: 4, name: "Melanie B.", points: 225 },
      { rank: 5, name: "Sandra K.", points: 212 },
    ],
    "ue16-m": [
      { rank: 1, name: "Florian W.", points: 275, icon: Trophy },
      { rank: 2, name: "Sebastian L.", points: 260, icon: Medal },
      { rank: 3, name: "Christian T.", points: 248, icon: Award },
      { rank: 4, name: "Patrick S.", points: 235 },
      { rank: 5, name: "Daniel H.", points: 222 },
    ],
    "ue40-w": [
      { rank: 1, name: "Susanne M.", points: 238, icon: Trophy },
      { rank: 2, name: "Monika R.", points: 225, icon: Medal },
      { rank: 3, name: "Gabriele K.", points: 212, icon: Award },
      { rank: 4, name: "Martina L.", points: 200 },
      { rank: 5, name: "Heike S.", points: 188 },
    ],
    "ue40-m": [
      { rank: 1, name: "Jürgen B.", points: 248, icon: Trophy },
      { rank: 2, name: "Wolfgang H.", points: 235, icon: Medal },
      { rank: 3, name: "Rainer K.", points: 222, icon: Award },
      { rank: 4, name: "Uwe M.", points: 210 },
      { rank: 5, name: "Peter S.", points: 198 },
    ],
  },
};

const categories = [
  { value: "u16-w", label: "U16 weiblich" },
  { value: "u16-m", label: "U16 männlich" },
  { value: "ue16-w", label: "Ü16 weiblich" },
  { value: "ue16-m", label: "Ü16 männlich" },
  { value: "ue40-w", label: "Ü40 weiblich" },
  { value: "ue40-m", label: "Ü40 männlich" },
];

const Ranglisten = () => {
  const [league, setLeague] = useState<"toprope" | "vorstieg">("toprope");
  const [category, setCategory] = useState("ue16-m");

  const currentData = leaderboardData[league][category] || [];
  const categoryLabel = categories.find(c => c.value === category)?.label || "";

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
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="px-8"
                >
                  <a 
                    href="https://app.kletterliga-nrw.de/ranglisten" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
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
              TOP 5 VORSCHAU
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ein Blick auf die aktuellen Spitzenreiter (Beispieldaten)
            </p>
          </AnimatedSection>

          {/* Filters */}
          <AnimatedSection animation="fade-up" delay={50}>
            <div className="max-w-3xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                {/* League Tabs */}
                <Tabs value={league} onValueChange={(v) => setLeague(v as "toprope" | "vorstieg")}>
                  <TabsList className="bg-background -skew-x-6">
                    <TabsTrigger value="toprope" className="skew-x-6 font-headline">
                      Toprope
                    </TabsTrigger>
                    <TabsTrigger value="vorstieg" className="skew-x-6 font-headline">
                      Vorstieg
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Category Select */}
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[180px] -skew-x-6 bg-background border-primary/20">
                    <SelectValue placeholder="Wertungsklasse" className="skew-x-6" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-primary/20">
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-up" delay={100}>
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-4">
                <span className="font-headline text-lg text-secondary">
                  {league === "toprope" ? "Toprope-Liga" : "Vorstiegs-Liga"} · {categoryLabel}
                </span>
              </div>
              
              {currentData.map((entry, index) => (
                <div 
                  key={entry.rank}
                  className={`flex items-center gap-4 p-4 mb-2 ${
                    index === 0 ? 'bg-gradient-kl text-primary-foreground' :
                    index === 1 ? 'bg-secondary/20' :
                    index === 2 ? 'bg-accent/50' :
                    'bg-background'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-12 h-12 flex-shrink-0 -skew-x-6 flex items-center justify-center ${
                    index === 0 ? 'bg-accent' :
                    index === 1 ? 'bg-secondary' :
                    index === 2 ? 'bg-primary' :
                    'bg-muted'
                  }`}>
                    {entry.icon ? (
                      <entry.icon className={`skew-x-6 ${
                        index === 0 ? 'text-primary' :
                        index === 1 ? 'text-secondary-foreground' :
                        'text-primary-foreground'
                      }`} size={20} />
                    ) : (
                      <span className={`skew-x-6 font-headline text-lg ${
                        index < 3 ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-headline text-lg ${
                      index === 0 ? 'text-primary-foreground' : 'text-primary'
                    }`}>
                      {entry.name}
                    </h3>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <span className={`font-headline text-2xl ${
                      index === 0 ? 'text-accent' : 'text-secondary'
                    }`}>
                      {entry.points}
                    </span>
                    <p className={`text-xs ${
                      index === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      Punkte
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection animation="fade-in" delay={300} className="text-center mt-8">
            <p className="text-muted-foreground text-sm italic">
              * Dies sind Beispieldaten. Die echten Ranglisten findest du im Teilnehmerbereich.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  );
};

export default Ranglisten;
