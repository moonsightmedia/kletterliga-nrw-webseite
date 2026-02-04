import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const mockResults = [
  { id: "r1", user: "Lena Fischer", gym: "Kletterhalle Ruhr", route: "T7", points: 10, date: "12.06.2026" },
  { id: "r2", user: "Max Berger", gym: "Boulder City", route: "V3", points: 7.5, date: "11.06.2026" },
];

const LeagueResults = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Ergebnis-Moderation</h1>
        <p className="text-sm text-muted-foreground mt-2">Auffällige Einträge prüfen.</p>
      </div>
      <div className="space-y-3">
        {mockResults.map((item) => (
          <Card key={item.id} className="p-4 border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="font-semibold text-primary">{item.user}</div>
              <div className="text-xs text-muted-foreground">
                {item.gym} · Route {item.route} · {item.date}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-secondary">{item.points} Punkte</span>
              <Button variant="outline" size="sm">
                <span className="skew-x-6">Geprüft</span>
              </Button>
              <Button variant="secondary" size="sm">
                <span className="skew-x-6">Auffällig</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LeagueResults;
