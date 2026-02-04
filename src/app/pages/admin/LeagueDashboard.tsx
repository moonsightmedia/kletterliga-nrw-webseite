import { Card } from "@/components/ui/card";

const LeagueDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">Liga-Übersicht</h1>
        <p className="text-sm text-muted-foreground mt-2">Globale Kennzahlen der Saison.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Teilnehmer</div>
          <div className="font-headline text-2xl text-primary mt-2">1.248</div>
          <p className="text-xs text-muted-foreground mt-1">Gesamt</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Hallen</div>
          <div className="font-headline text-2xl text-primary mt-2">28</div>
          <p className="text-xs text-muted-foreground mt-1">Aktiv</p>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="text-xs uppercase tracking-widest text-secondary">Ergebnisse</div>
          <div className="font-headline text-2xl text-primary mt-2">9.420</div>
          <p className="text-xs text-muted-foreground mt-1">Einträge</p>
        </Card>
      </div>
    </div>
  );
};

export default LeagueDashboard;
