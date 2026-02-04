import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const mockClasses = ["U16", "U18", "Open", "Ü40"];

const LeagueClasses = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Wertungsklassen</h1>
        <p className="text-sm text-muted-foreground mt-2">Klassen pflegen und erweitern.</p>
      </div>
      <Card className="p-5 border-border/60 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="className">Neue Klasse</Label>
            <Input id="className" placeholder="z. B. U20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="range">Jahrgangsbereich</Label>
            <Input id="range" placeholder="2006–2009" />
          </div>
        </div>
        <Button>Hinzufügen</Button>
      </Card>
      <div className="space-y-3">
        {mockClasses.map((item) => (
          <Card key={item} className="p-4 border-border/60 flex items-center justify-between">
            <div className="font-semibold text-primary">{item}</div>
            <Button variant="outline" size="sm">
              <span className="skew-x-6">Bearbeiten</span>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LeagueClasses;
