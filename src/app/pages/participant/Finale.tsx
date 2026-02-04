import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Finale = () => {
  const finaleOpen = false;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-2xl text-primary">Finale 2026</h2>
        <p className="text-sm text-muted-foreground">
          Alle Infos zum Finalevent und zur Anmeldung.
        </p>
      </div>

      <Card className="p-5 border-border/60 space-y-3">
        <div className="text-xs uppercase tracking-widest text-secondary">Termin</div>
        <div className="text-lg font-semibold text-primary">03.10.2026</div>
        <p className="text-sm text-muted-foreground">
          Finale der Kletterliga NRW. Qualifikation endet am 13.09.2026.
        </p>
      </Card>

      <Card className="p-5 border-border/60 space-y-3">
        <div className="text-xs uppercase tracking-widest text-secondary">Anmeldung</div>
        <p className="text-sm text-muted-foreground">
          Die Finale‑Anmeldung wird nach Abschluss der Auswertung freigeschaltet.
        </p>
        <Button className="w-full" disabled={!finaleOpen}>
          <span className="skew-x-6">{finaleOpen ? "Finale anmelden" : "Finale‑Anmeldung bald"}</span>
        </Button>
      </Card>
    </div>
  );
};

export default Finale;
